"""Locate the thumn star (a ring of 8 tiny glyphs) on every Warsh page.
usage: python -I -X utf8 tools/extract_stars.py <svg_dir> <out_json>
Reference star: page 4, subpaths 1285..1292: eight ~1-1.6 unit glyphs in a ~4x4 unit ring."""
import sys, re, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgglyphs import text_path, subpaths
svg_dir, out = sys.argv[1], sys.argv[2]
SEGS = [4, 9, 8, 9, 9, 9, 9, 9]
found = []
for p in range(1, 605):
    f = f"{svg_dir}/{p:03d}.svg"
    tp = text_path(f)
    if not tp: continue
    svg = open(f, encoding='utf-8').read(3000)
    m = re.search(r'<g transform="matrix\(([^)]*)\)"', svg)
    if not m:
        m = re.search(r'matrix\(([^)]*)\)', open(f, encoding='utf-8').read())
    a, b, c, d, e, fy = map(float, m.group(1).split())
    sp = subpaths(tp[0])
    n = len(sp)
    for i in range(n - 7):
        win = sp[i:i + 8]
        if any((s['bbox'][2] - s['bbox'][0]) > 2.3 or (s['bbox'][3] - s['bbox'][1]) > 2.3 for s in win): continue
        x0 = min(s['bbox'][0] for s in win); x1 = max(s['bbox'][2] for s in win)
        y0 = min(s['bbox'][1] for s in win); y1 = max(s['bbox'][3] for s in win)
        if not (4.0 <= x1 - x0 <= 6.5 and 4.0 <= y1 - y0 <= 6.5): continue
        if i > 0 and (lambda q: (q['bbox'][2]-q['bbox'][0] < 2.3 and q['bbox'][3]-q['bbox'][1] < 2.3 and x0-2 < q['start'][0] < x1+2 and y0-2 < q['start'][1] < y1+2))(sp[i-1]): continue  # not the window's start
        xs = [(s['bbox'][0] + s['bbox'][2]) / 2 + tp[1] for s in win]
        ys = [(s['bbox'][1] + s['bbox'][3]) / 2 + tp[2] for s in win]
        cx, cy = sum(xs) / 8, sum(ys) / 8
        found.append({'page': p, 'x': round(a * cx + e, 2), 'y': round(d * cy + fy, 2), 'idx': i})
json.dump(found, open(out, 'w'), indent=0)
print(len(found), 'stars on', len({s['page'] for s in found}), 'pages')
print(found[:6])
