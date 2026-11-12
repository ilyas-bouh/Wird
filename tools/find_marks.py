"""Find rare repeated glyph shapes (candidate hizb/thumn stars) across all pages.
usage: python -I -X utf8 tools/find_marks.py <svg_dir>"""
import sys, collections
sys.path.insert(0, __file__.rsplit('tools', 1)[0] + 'tools')
from svgglyphs import text_path, subpaths
svg_dir = sys.argv[1]
cnt = collections.Counter(); pages = collections.defaultdict(set); sample = {}
for p in range(1, 605):
    tp = text_path(f"{svg_dir}/{p:03d}.svg")
    if not tp: continue
    for s in subpaths(tp[0]):
        b = s['bbox']; w, h = b[2] - b[0], b[3] - b[1]
        sig = (round(w / 0.1), round(h / 0.1), s['segs'])
        cnt[sig] += 1; pages[sig].add(p); sample.setdefault(sig, (p, s['start']))
print(len(cnt), 'signatures')
cands = [(sig, c) for sig, c in cnt.items() if 150 <= c <= 900 and sig[2] >= 20]
cands.sort(key=lambda t: -t[1])
for sig, c in cands[:20]:
    print('w,h(x0.1),segs=', sig, 'count', c, 'pages', len(pages[sig]), 'sample', sample[sig])
