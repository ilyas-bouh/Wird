"""Parse the merged text path of a Warsh page SVG into subpaths with absolute bbox."""
import re, xml.etree.ElementTree as ET

TOK = re.compile(r'[mclshvzMCLSHVZ]|-?(?:\d+\.?\d*|\.\d+)(?:[eE]-?\d+)?')
ARGS = {'m': 2, 'l': 2, 'c': 6, 's': 4, 'h': 1, 'v': 1, 'z': 0}

def text_path(svg_file):
    """Return (d, translate_x, translate_y) of the big merged text path, or None."""
    root = ET.parse(svg_file).getroot()
    for g in root.iter():
        if g.tag.endswith('}g') and g.get('transform', '').startswith('translate('):
            for p in g:
                if p.tag.endswith('}path') and len(p.get('d', '')) > 20000:
                    tx, ty = map(float, re.findall(r'-?[\d.]+', g.get('transform'))[:2])
                    return p.get('d'), tx, ty
    return None

def subpaths(d):
    """Yield dicts: start(x,y), bbox, segs, in text-group coordinates (relative commands only)."""
    toks = TOK.findall(d); i = 0; cmd = None
    cx = cy = 0.0; out = []; cur = None
    def add(x, y):
        b = cur['bbox']
        b[0] = min(b[0], x); b[1] = min(b[1], y); b[2] = max(b[2], x); b[3] = max(b[3], y)
    sx = sy = 0.0
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t; i += 1
            if cmd in 'zZ':
                cx, cy = sx, sy; continue
        n = ARGS[cmd.lower()]
        a = [float(v) for v in toks[i:i + n]]; i += n
        c = cmd.lower()
        if c == 'm':
            cx += a[0]; cy += a[1]; sx, sy = cx, cy
            cur = {'start': (cx, cy), 'bbox': [cx, cy, cx, cy], 'segs': 0}; out.append(cur)
            cmd = 'l' if cmd == 'm' else 'L'   # implicit lineto
            continue
        if cur is None:
            cur = {'start': (cx, cy), 'bbox': [cx, cy, cx, cy], 'segs': 0}; out.append(cur)
        if c == 'l': cx += a[0]; cy += a[1]; add(cx, cy)
        elif c == 'h': cx += a[0]; add(cx, cy)
        elif c == 'v': cy += a[0]; add(cx, cy)
        elif c == 'c':
            add(cx + a[0], cy + a[1]); add(cx + a[2], cy + a[3]); cx += a[4]; cy += a[5]; add(cx, cy)
        elif c == 's':
            add(cx + a[0], cy + a[1]); cx += a[2]; cy += a[3]; add(cx, cy)
        cur['segs'] += 1
    return out
