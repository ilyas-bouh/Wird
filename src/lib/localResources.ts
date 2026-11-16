import { useSyncExternalStore } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import { unzipSync } from 'fflate';
import { loadChoice, RESOURCE_BASE_URL, type ResourceChoice, type Riwaya } from './resources';
import { svgFromBr } from './brotli';
import { hafsKeysFor } from './tafsir';
import type { PagePolygon } from './cropSvg';

/**
 * Downloaded resources live in <documents>/resources/<riwaya>/{svg-br,json,audio}.
 * They come from the GitHub release (tools/make_bundles.py builds the zips + manifest.json).
 * Hafs and Warsh are kept in separate folders: they never share a file.
 */
type ManifestFile = { name: string; riwaya: string; kind: 'pages' | 'audio' | 'tafsir'; bytes: number };
export type Progress = { done: number; total: number; label: string };

const root = () => new Directory(Paths.document, 'resources');
const dir = (r: Riwaya, ...p: string[]) => new Directory(root(), r, ...p);
// audio.done (v1) marked audio unpacked into the wrong folder, so audio uses a new marker name to force a re-download
const marker = (r: Riwaya, kind: 'pages' | 'audio') => new File(root(), r, kind === 'audio' ? 'audio-v2.done' : 'pages.done');

type Installed = { riwaya: Riwaya; pages: boolean; audio: boolean };
let installed: Installed | null = null;
let version = 0;
const listeners = new Set<() => void>();
/** Changes whenever the installed packs change, so screens can reload their pages. */
export const useResourcesVersion = () =>
  useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => version);

/** Reads which riwaya was chosen and which packs are fully installed. Call at start and after a download. */
export async function refreshInstalled(): Promise<Installed | null> {
  try {
    const c = await loadChoice();
    installed = { riwaya: c.riwaya, pages: marker(c.riwaya, 'pages').exists, audio: marker(c.riwaya, 'audio').exists };
  } catch {
    installed = null;
  }
  version++;
  listeners.forEach((l) => l());
  return installed;
}
export const hasLocalPages = () => !!installed?.pages;
export const hasLocalAudio = () => !!installed?.audio;

const pad = (n: number, w = 3) => String(n).padStart(w, '0');

/**
 * Local mp3 files to play for one ayah as the Reader numbers it. Audio files are cut at Hafs ayah boundaries
 * (6236 per reciter) even for Warsh, so a Warsh ayah is converted to the Hafs ayah(s) it covers
 * (e.g. Warsh 2:1 = Hafs 2:1 + 2:2, Warsh 2:56 = Hafs 2:57). Hafs needs no conversion.
 */
export function localAudioUris(surah: number, ayah: number): string[] {
  if (!installed?.audio) return [];
  const files = installed.riwaya === 'warsh' ? hafsKeysFor(`${surah}:${ayah}`).map((k) => k.split(':').map(Number)) : [[surah, ayah]];
  return files.map(([s, a]) => new File(dir(installed!.riwaya, 'audio'), `${pad(s)}${pad(a)}.mp3`).uri);
}

/** A downloaded mushaf page (SVG text inflated from .svg.br, plus its ayah polygons), or null. */
export async function loadLocalPage(page: number): Promise<{ svg: string; json: PagePolygon[] } | null> {
  if (!installed?.pages) return null;
  const br = new File(dir(installed.riwaya, 'svg-br'), `${pad(page)}.svg.br`);
  const js = new File(dir(installed.riwaya, 'json'), `${pad(page)}.json`);
  if (!br.exists || !js.exists) return null;
  return { svg: svgFromBr(new Uint8Array(await br.arrayBuffer())), json: JSON.parse(await js.text()) };
}

async function getManifest(): Promise<ManifestFile[]> {
  const res = await fetch(`${RESOURCE_BASE_URL}/manifest.json`);
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return (await res.json()).files;
}

async function fetchZip(name: string, bytes: number, onBytes: (n: number) => void, target: Directory) {
  const tmp = new File(Paths.cache, name);
  if (tmp.exists) tmp.delete();
  const task = File.createDownloadTask(`${RESOURCE_BASE_URL}/${name}`, tmp, {
    onProgress: ({ bytesWritten }: { bytesWritten: number }) => onBytes(bytesWritten),
  });
  await task.downloadAsync();
  if (tmp.size !== bytes) throw new Error(`${name}: size ${tmp.size} != ${bytes}`);
  if (!target.exists) target.create({ intermediates: true });
  const entries = unzipSync(new Uint8Array(await tmp.arrayBuffer()));
  for (const [path, data] of Object.entries(entries)) {
    const parts = path.split('/');
    const sub = parts.length > 1 ? new Directory(target, ...parts.slice(0, -1)) : target;
    if (!sub.exists) sub.create({ intermediates: true });
    const f = new File(sub, parts[parts.length - 1]);
    if (f.exists) f.delete();
    f.create();
    f.write(data);
  }
  tmp.delete();
}

/**
 * Downloads and unpacks the chosen packs. Zips that are already installed are skipped, so an interrupted
 * run resumes where it stopped (a pack is marked done only after all of its parts are unpacked).
 * Tafsir is not downloaded: tafsir.db already ships inside the app.
 */
export async function downloadResources(choice: ResourceChoice, onProgress: (p: Progress) => void) {
  if (!RESOURCE_BASE_URL) throw new Error('no base url');
  const files = (await getManifest()).filter(
    (f) => f.riwaya === choice.riwaya && ((f.kind === 'pages' && choice.pages) || (f.kind === 'audio' && choice.audio)),
  );
  const todo = files.filter((f) => !marker(choice.riwaya, f.kind as 'pages' | 'audio').exists);
  const total = todo.reduce((s, f) => s + f.bytes, 0);
  let done = 0;
  const target = dir(choice.riwaya);
  if (!target.exists) target.create({ intermediates: true });
  for (const kind of ['pages', 'audio'] as const) {
    const parts = todo.filter((f) => f.kind === kind);
    for (const f of parts) {
      let last = 0;
      // page zips carry their own svg-br/ and json/ folders; audio zips are flat mp3s that belong in audio/
      const dest = kind === 'audio' ? dir(choice.riwaya, 'audio') : target;
      await fetchZip(f.name, f.bytes, (n) => { done += n - last; last = n; onProgress({ done, total, label: f.name }); }, dest);
      done += f.bytes - last;
      onProgress({ done, total, label: f.name });
    }
    if (parts.length) { const m = marker(choice.riwaya, kind); if (!m.exists) m.create(); }
  }
  await refreshInstalled();
}
