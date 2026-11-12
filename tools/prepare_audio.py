"""Convert the Warsh recitation WAVs to MP3 and emit a metadata index.

usage: python -I -X utf8 tools/prepare_audio.py <raw_dir> <out_dir> [bitrate_kbps=64]
  raw_dir: folder holding data/metadata.csv + data/*.wav (HF dataset checkout)
  out_dir: receives mp3/<file>.mp3 and audio_index.json
"""
import csv, json, os, subprocess, sys, wave, collections
from concurrent.futures import ThreadPoolExecutor

raw, out = sys.argv[1], sys.argv[2]
kbps = int(sys.argv[3]) if len(sys.argv) > 3 else 64
src = os.path.join(raw, "data")
mp3_dir = os.path.join(out, "mp3")
os.makedirs(mp3_dir, exist_ok=True)

# Metadata contains exact duplicate rows (same file listed several times): dedupe by file_name.
rows, seen = [], set()
for r in csv.DictReader(open(os.path.join(src, "metadata.csv"), encoding="utf-8")):
    if r["file_name"] not in seen:
        seen.add(r["file_name"])
        rows.append(r)

def convert(r):
    wav = os.path.join(src, r["file_name"])
    mp3 = os.path.join(mp3_dir, r["file_name"][:-4] + ".mp3")
    with wave.open(wav) as w:
        dur = round(w.getnframes() * 1000 / w.getframerate())
    if not os.path.exists(mp3):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-ac", "1", "-c:a", "libmp3lame",
                        "-b:a", f"{kbps}k", "-map_metadata", "-1", mp3], check=True)
    return dur, os.path.getsize(wav), os.path.getsize(mp3)

with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as ex:
    res = list(ex.map(convert, rows))

ayahs = []
for r, (dur, _, mp3b) in zip(rows, res):
    s, a = int(r["surah_number"]), int(r["ayah_number"])
    ayahs.append({
        "id": f"{s}:{a}", "surah": s, "ayah": a,
        "reciter": r["reciter"].lower(),
        "file": r["file_name"][:-4] + ".mp3",
        "durationMs": dur, "bytes": mp3b,
        "textVoweled": r["text_voweled"], "text": r["text"],
    })
ayahs.sort(key=lambda x: (x["reciter"], x["surah"], x["ayah"]))

# per-reciter coverage + gaps (ayah numbers missing inside the covered range of each surah)
cov = collections.defaultdict(lambda: collections.defaultdict(list))
for x in ayahs: cov[x["reciter"]][x["surah"]].append(x["ayah"])
reciters = {}
for rec, surahs in cov.items():
    reciters[rec] = {
        "ayahCount": sum(len(v) for v in surahs.values()),
        "surahs": {str(s): {"min": min(v), "max": max(v), "count": len(v),
                            "missing": sorted(set(range(min(v), max(v) + 1)) - set(v))}
                   for s, v in sorted(surahs.items())},
    }

wav_total = sum(x[1] for x in res); mp3_total = sum(x[2] for x in res)
index = {
    "source": "https://huggingface.co/datasets/moukal/warsh-recitation-dataset",
    "license": "MIT", "qiraah": "Warsh",
    "audio": {"format": "mp3", "channels": 1, "bitrateKbps": kbps, "path": "mp3/"},
    "totals": {"files": len(ayahs), "wavBytes": wav_total, "mp3Bytes": mp3_total,
               "durationMs": sum(x["durationMs"] for x in ayahs)},
    "reciters": reciters,
    "ayahs": ayahs,
}
json.dump(index, open(os.path.join(out, "audio_index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(ayahs)} files  wav {wav_total/1e6:.1f} MB -> mp3 {mp3_total/1e6:.1f} MB @ {kbps}kbps")
