import csv, os, sys, collections
raw = sys.argv[1]
rows = list(csv.DictReader(open(os.path.join(raw, "data/metadata.csv"), encoding="utf-8")))
files = set(os.listdir(os.path.join(raw, "data")))
have = [r for r in rows if r["file_name"] in files]
print("rows", len(rows), "with wav", len(have), "wav without row", len(files - {r["file_name"] for r in rows} - {"metadata.csv"}))
by = collections.defaultdict(list)
for r in rows: by[r["reciter"]].append(r)
for rec, rs in by.items():
    h = [r for r in rs if r["file_name"] in files]
    sur = collections.Counter(int(r["surah_number"]) for r in rs)
    hs = collections.Counter(int(r["surah_number"]) for r in h)
    print(rec, "rows", len(rs), "wav", len(h), "surahs(rows)", dict(sur), "surahs(wav)", dict(hs))
print(set(r["qiraah"] for r in rows))
