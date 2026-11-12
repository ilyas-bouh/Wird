"""Warsh -> Hafs ayah map by aligning ayah text (test range: surahs 1-3).
usage: python -I -X utf8 tools/build_ayah_map.py <dataset_metadata.csv> <qiraat-ayah-map/dist/mushaf> <out.json> [surahs=1,2,3]

Warsh ayahs come from the recitation dataset (its text has the basmala prepended to ayah 1 of each
surah except 1; stripped here). Hafs ayahs come from qiraat-ayah-map's dist/mushaf/surah-NNN.json.
Both texts are reduced to consonant-ish letters; each Warsh ayah is mapped to every Hafs ayah whose
letter span overlaps it by at least half of the shorter span. Output keys are 'surah:ayah'."""
import csv, json, re, sys

meta_csv, mushaf_dir, out = sys.argv[1:4]
surahs = [int(x) for x in (sys.argv[4] if len(sys.argv) > 4 else '1,2,3').split(',')]

NORM = str.maketrans({'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي', 'ء': ''})
def norm(t):
    t = re.sub(r'[ً-ٰٟۖ-ۭـ]', '', t).translate(NORM)
    return re.sub(r'[^ء-ي]', '', t)

BASMALA = norm('بسم الله الرحمن الرحيم')
BASMALA_WORDS = [norm(x) for x in 'بسم الله الرحمن الرحيم'.split()]

def words(t):
    return [w for w in (norm(x) for x in t.split()) if w]

warsh = {}
warsh_words = {}
for r in csv.DictReader(open(meta_csv, encoding='utf-8')):
    if r['reciter'] != 'Alkazabri': continue
    s, a = int(r['surah_number']), int(r['ayah_number'])
    if s in surahs: warsh[(s, a)] = norm(r['text']); warsh_words[(s, a)] = words(r['text'])

import difflib

def words(t):
    return [w for w in (norm(x) for x in t.split()) if w]

res, report = {}, []
for s in surahs:
    h = json.load(open(f"{mushaf_dir}/surah-{s:03d}.json", encoding='utf-8'))['ayahs']
    hw = [(j, w) for j, x in enumerate(h, 1) for w in words(x['plain_text'])]
    wa = sorted(a for (ss, a) in warsh if ss == s)
    raw = {r['ayah_number']: r['text'] for r in []}
    ww = []
    for a in wa:
        ws_ = warsh_words[(s, a)]
        if s != 1 and a == 1 and ws_[:4] == BASMALA_WORDS: ws_ = ws_[4:]
        ww += [(a, w) for w in ws_]
    sm = difflib.SequenceMatcher(None, [w for _, w in ww], [w for _, w in hw], autojunk=False)
    hits = {a: {} for a in wa}
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            a = ww[blk.a + k][0]; j = hw[blk.b + k][0]
            hits[a][j] = hits[a].get(j, 0) + 1
    nwords = {a: sum(1 for x, _ in ww if x == a) for a in wa}
    hcount = {}
    for j, _ in hw: hcount[j] = hcount.get(j, 0) + 1
    for a in wa:
        h_ = hits[a]
        keep = [j for j, c in h_.items() if c >= max(1, 0.2 * min(nwords[a], hcount[j]))]
        if not keep and h_: keep = [max(h_, key=h_.get)]
        res[f"{s}:{a}"] = sorted(keep)
    covered = {j for a in wa for j in res[f"{s}:{a}"]}
    report.append((s, len(wa), len(h), len(ww), len(hw), sorted(set(range(1, len(h) + 1)) - covered)))

json.dump(res, open(out, 'w'), separators=(',', ':'))
for s, nw, nh, wt, ht, unc in report:
    print(f"surah {s}: warsh {nw} ayahs, hafs {nh} ayahs; words warsh {wt} vs hafs {ht}; hafs uncovered {unc[:8]}")
empty = [k for k, v in res.items() if not v]
print('unmapped:', empty)
print('2:1-2:4 ->', {k: res[k] for k in ['2:1', '2:2', '2:3', '2:4']})
odd = [(k, v) for k, v in res.items() if k.startswith('2:') and v != [int(k.split(':')[1]) + 1]]
print('surah 2 entries that are not n -> n+1:', odd)
