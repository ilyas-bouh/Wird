"""Compile Warsh thumn (480) / rub' (240) / hizb (60) start lists.
usage: python -I -X utf8 tools/build_portions.py <warsh_dir> <stars_mapped.json> <WarshLists.ts> <out.json>
Source of truth: star glyphs printed in the page SVGs (stars_mapped.json).
Gaps (surah starts have no star; a few unmatched stars) fall back to quran-meta's Warsh list,
which its authors copied from Qalun data: those entries are flagged source='fallback'."""
import sys, re, json
warsh, stars_f, lists_f, out = sys.argv[1:5]
sur = json.load(open(f"{warsh}/json/surah.json", encoding='utf-8'))
cum = [0]
for s in sur[:114]: cum.append(cum[-1] + s['ayahCount'])
TOTAL = cum[-1]
def sa(i):
    for s in range(114, 0, -1):
        if i > cum[s - 1]: return s, i - cum[s - 1]
# ayah id -> first page
page_of = {}
for p in range(1, 605):
    for e in json.load(open(f"{warsh}/json/{p:03d}.json", encoding='utf-8')):
        page_of.setdefault(cum[e['surahNumber'] - 1] + e['ayahNumber'], p)
stars = json.load(open(stars_f))
star_ids = sorted({s['id'] for s in stars})
src = open(lists_f, encoding='utf-8').read()
i = src.index('HizbEighthList: AyahId[] = [') + len('HizbEighthList: AyahId[] = [')
q = [int(x) for x in re.findall(r'\d+', src[i:src.index(']', i)])][1:-1]   # drop leading 0 and end sentinel
assert len(q) == 480, len(q)
used = set(); starts = []; prev = 0
for k, qi in enumerate(q):
    near = [s for s in star_ids if abs(s - qi) <= 6 and s not in used and s > prev]
    if qi == 1: sid, how = 1, 'start'
    elif near:
        sid = min(near, key=lambda s: abs(s - qi)); used.add(sid); how = 'star'
    else: sid, how = qi, 'fallback'
    if sid <= prev: sid, how = max(qi, prev + 1), 'fallback'
    prev = sid
    starts.append((sid, how))
# enforce monotonic
for k in range(1, 480): assert starts[k][0] > starts[k - 1][0], (k, starts[k - 1], starts[k])
thumn = []
for k, (sid, how) in enumerate(starts):
    end = (starts[k + 1][0] - 1) if k < 479 else TOTAL
    s, a = sa(sid); es, ea = sa(end)
    thumn.append({'n': k + 1, 'hizb': k // 8 + 1, 'rub': k // 2 + 1, 'start': {'surah': s, 'ayah': a, 'id': sid, 'page': page_of[sid]},
                  'end': {'surah': es, 'ayah': ea, 'id': end, 'page': page_of[end]}, 'source': how})
rub = [{'n': r + 1, 'hizb': r // 4 + 1, 'start': thumn[2 * r]['start'], 'end': thumn[2 * r + 1]['end'],
        'source': 'fallback' if 'fallback' in (thumn[2 * r]['source'], thumn[2 * r + 1]['source']) else thumn[2 * r]['source']} for r in range(240)]
res = {'riwaya': 'Warsh', 'ayahCount': TOTAL, 'note': "ids are global Warsh ayah numbers (1..6214). 'star' = detected from the printed star glyph; 'fallback' = quran-meta (Qalun-derived) value.",
       'counts': {'thumn': 480, 'rub': 240, 'hizb': 60, 'fromStars': sum(1 for s in starts if s[1] == 'star'), 'fallback': sum(1 for s in starts if s[1] == 'fallback'),
                  'unusedStars': len(set(star_ids) - used)},
       'thumn': thumn, 'rub': rub}
json.dump(res, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(res['counts'])
for t in thumn[:3]: print(t)
