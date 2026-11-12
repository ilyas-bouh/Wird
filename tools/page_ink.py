"""Top of the drawn text ink (page coordinates) for every Warsh page: includes surah banners.
usage: python -I -X utf8 tools/page_ink.py <svg_dir> <out_json>"""
import sys, re, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgglyphs import text_path, subpaths
svg_dir, out = sys.argv[1:3]
res = {}
for p in range(1, 605):
    f = f"{svg_dir}/{p:03d}.svg"
    tp = text_path(f)
    if not tp: continue
    m = re.search(r'<g transform="matrix\(([^)]*)\)"', open(f, encoding='utf-8').read())
    a, b, c, d, e, fy = map(float, m.group(1).split())
    maxy = max(s['bbox'][3] for s in subpaths(tp[0]))
    res[p] = round(d * (maxy + tp[2]) + fy, 2)
json.dump(res, open(out, 'w'))
print(len(res), 'pages; page 1:', res[1], 'page 2:', res[2], 'page 3:', res[3])
