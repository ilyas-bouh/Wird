"""Map star positions to ayahs using the page JSON polygons.
usage: python -I -X utf8 tools/map_stars.py <warsh_dir> <stars.json> <out.json>"""
import sys, re, json
warsh, stars_f, out = sys.argv[1:4]
N = r'-?\d+(?:\.\d+)?'
surahs = json.load(open(f"{warsh}/json/surah.json", encoding='utf-8'))
cum = [0]
for s in surahs[:114]: cum.append(cum[-1] + s['ayahCount'])
def gid(s, a): return cum[s - 1] + a       # global Warsh ayah id (1-based)
def rects(poly):
    if re.search('[A-Za-z]', poly):
        return [list(map(float, re.findall(N, sub))) for sub in poly.split('Z') if sub.strip()]
    n = list(map(float, re.findall(N, poly))); return [n]
def inside(pts, x, y):
    xs, ys = pts[0::2], pts[1::2]
    return min(xs) <= x <= max(xs) and min(ys) <= y <= max(ys)
def dist(pts, x, y):
    xs, ys = pts[0::2], pts[1::2]
    dx = max(min(xs) - x, 0, x - max(xs)); dy = max(min(ys) - y, 0, y - max(ys)); return (dx*dx + dy*dy) ** .5
stars = json.load(open(stars_f))
res = []
cache = {}
for st in stars:
    p = st['page']
    if p not in cache: cache[p] = json.load(open(f"{warsh}/json/{p:03d}.json", encoding='utf-8'))
    best = None
    for e in cache[p]:
        for r in rects(e['polygon']):
            d = 0 if inside(r, st['x'], st['y']) else dist(r, st['x'], st['y'])
            if best is None or d < best[0]: best = (d, e['surahNumber'], e['ayahNumber'])
    res.append({**st, 'surah': best[1], 'ayah': best[2], 'gap': round(best[0], 2), 'id': gid(best[1], best[2])})
res.sort(key=lambda r: (r['page'], r['id']))
json.dump(res, open(out, 'w'), indent=0)
print(len(res), 'mapped; max gap', max(r['gap'] for r in res), 'n gap>0:', sum(1 for r in res if r['gap'] > 0))
for r in res[:14]: print(r['page'], f"{r['surah']}:{r['ayah']}", 'id', r['id'], 'x,y', r['x'], r['y'], 'gap', r['gap'])
