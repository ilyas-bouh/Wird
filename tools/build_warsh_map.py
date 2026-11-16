"""Full Warsh -> Hafs ayah map from quran-ws/quran-text data/ayah-map.csv (Hafs rows carry their Warsh position).
usage: python -I -X utf8 tools/build_warsh_map.py <ayah-map.csv> <out.json>
Output {'surah:warshAyah': [hafsAyah, ...]}, the shape src/lib/tafsir.ts expects."""
import csv, json, sys
out = {}
for r in csv.DictReader(open(sys.argv[1], encoding='utf-8')):
    s, h = int(r['surah']), int(r['ayah'])
    ws = r['warsh'].split(':')[1]
    lo, hi = (int(x) for x in (ws.split('-') if '-' in ws else (ws, ws)))
    for a in range(lo, hi + 1):
        if a > 0: out.setdefault(f'{s}:{a}', []).append(h)
json.dump({k: sorted(set(v)) for k, v in out.items()}, open(sys.argv[2], 'w'), separators=(',', ':'))
print(len(out), 'warsh ayahs  (then hand-set 1:1 -> [1,2] so the basmala tafsir shows with Al-Fatiha)')
