"""Pack resources/ into release bundles: python -I -X utf8 tools/make_bundles.py
Output: resources/bundles/<riwaya>-pages.zip, <riwaya>-audio-NN.zip, tafsir.db, manifest.json
Zips are STORED (no recompression): svg.br and mp3 are already compressed."""
import hashlib, json, os, zipfile
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'resources')
OUT = os.path.join(R, 'bundles'); os.makedirs(OUT, exist_ok=True)
SRC = {'hafs': os.path.join(R, 'hafs', 'kfqc'), 'warsh': os.path.join(R, 'warsh')}
AUDIO = {'hafs': os.path.join(R, 'hafs', 'audio'), 'warsh': os.path.join(R, 'warsh', 'audio')}
PART_MB = 40
manifest = {'version': 1, 'files': []}

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()

def add(name, riwaya, kind):
    p = os.path.join(OUT, name)
    manifest['files'].append({'name': name, 'riwaya': riwaya, 'kind': kind, 'bytes': os.path.getsize(p), 'sha256': sha(p)})

def zipit(name, items):  # items: (path on disk, name in zip)
    with zipfile.ZipFile(os.path.join(OUT, name), 'w', zipfile.ZIP_STORED) as z:
        for p, a in items: z.write(p, a)

for rw, base in SRC.items():
    items = [(os.path.join(base, d, f), f'{d}/{f}') for d in ('svg-br', 'json') for f in sorted(os.listdir(os.path.join(base, d)))]
    zipit(f'{rw}-pages.zip', items); add(f'{rw}-pages.zip', rw, 'pages')
    # audio: consecutive ayahs, ~PART_MB per part, never splitting inside a surah's ordering
    files = sorted(os.listdir(AUDIO[rw])); parts, cur, size = [], [], 0
    for f in files:
        s = os.path.getsize(os.path.join(AUDIO[rw], f))
        if cur and size + s > PART_MB * 1048576: parts.append(cur); cur, size = [], 0
        cur.append(f); size += s
    parts.append(cur)
    for i, fl in enumerate(parts, 1):
        n = f'{rw}-audio-{i:02d}.zip'
        zipit(n, [(os.path.join(AUDIO[rw], f), f) for f in fl]); add(n, rw, 'audio')
        manifest['files'][-1].update(first=fl[0][:-4], last=fl[-1][:-4])
import shutil
shutil.copy(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'db', 'tafsir.db'), os.path.join(OUT, 'tafsir.db')); add('tafsir.db', 'all', 'tafsir')
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
for k in ('pages', 'audio', 'tafsir'):
    for rw in ('hafs', 'warsh', 'all'):
        t = sum(f['bytes'] for f in manifest['files'] if f['kind'] == k and f['riwaya'] == rw)
        if t: print(rw, k, round(t / 1048576, 1), 'MB')
print(len(manifest['files']), 'files')
