"""Download Tafsir Muyassar (ar) and English Mukhtasar for the whole Quran into a SQLite db.
usage: python -I -X utf8 tools/build_tafsir_db.py <out.db>

Source: spa5k/tafsir_api via jsDelivr, one JSON file per surah: [{surah, ayah, text}, ...].
Numbering is Hafs (the source's); src/data/warshToHafs.json converts Warsh ayahs at read time.
Schema: tafsir(edition, surah, ayah, text, PRIMARY KEY(edition, surah, ayah)) WITHOUT ROWID."""
import json, os, re, sqlite3, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

# jsDelivr refuses some files (repo exceeds its 50 MB package limit): fall back to raw GitHub.
BASES = ['https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir', 'https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir']
EDITIONS = {'ar-muyassar': 'ar-tafsir-muyassar', 'en-mukhtasar': 'en-tafsir-al-mukhtasar'}
AYAH_COUNT = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6]

def clean(t):
    t = re.sub(r'<br\s*/?>', '\n', t, flags=re.I)
    t = re.sub(r'</p>', '\n\n', t, flags=re.I)
    t = re.sub(r'<[^>]+>', '', t).replace('&nbsp;', ' ')
    t = re.sub(r'\n*\[التفسير\]\n*', '\n\n', t)  # stray heading line in some Muyassar entries
    return re.sub(r'\n{3,}', '\n\n', t).strip()

def fetch(job):
    edition, slug, s = job
    for attempt in range(3):
        for base in BASES:
            try:
                with urllib.request.urlopen(f'{base}/{slug}/{s}.json', timeout=60) as r:
                    return edition, s, json.load(r)
            except Exception:
                pass
        time.sleep(1 + attempt)
    raise RuntimeError(f'failed {slug}/{s}')

out = sys.argv[1]
if os.path.exists(out): os.remove(out)
jobs = [(e, slug, s) for e, slug in EDITIONS.items() for s in range(1, 115)]
with ThreadPoolExecutor(8) as ex:
    results = list(ex.map(fetch, jobs))

db = sqlite3.connect(out)
db.execute('CREATE TABLE tafsir (edition TEXT NOT NULL, surah INTEGER NOT NULL, ayah INTEGER NOT NULL, text TEXT NOT NULL, '
           'PRIMARY KEY (edition, surah, ayah)) WITHOUT ROWID')
db.execute('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)')
for edition, s, rows in results:
    for r in rows:
        db.execute('INSERT OR REPLACE INTO tafsir VALUES (?,?,?,?)', (edition, r['surah'], r['ayah'], clean(r['text'])))
db.executemany('INSERT INTO meta VALUES (?,?)', [
    ('source', 'https://github.com/spa5k/tafsir_api'), ('numbering', 'hafs'),
    ('editions', json.dumps({'ar-muyassar': 'Tafsir al-Muyassar (Arabic)', 'en-mukhtasar': 'Al-Mukhtasar (English)'}))])
db.commit()
db.execute('VACUUM')

for e in EDITIONS:
    n = db.execute('SELECT COUNT(*) FROM tafsir WHERE edition=?', (e,)).fetchone()[0]
    missing = [(s, a) for s in range(1, 115) for a in range(1, AYAH_COUNT[s - 1] + 1)
               if not db.execute('SELECT 1 FROM tafsir WHERE edition=? AND surah=? AND ayah=?', (e, s, a)).fetchone()]
    empty = db.execute("SELECT COUNT(*) FROM tafsir WHERE edition=? AND trim(text)=''", (e,)).fetchone()[0]
    print(f'{e}: {n} rows (expected {sum(AYAH_COUNT)}), missing {len(missing)} {missing[:5]}, empty {empty}')
print('db size', round(os.path.getsize(out) / 1e6, 2), 'MB')
