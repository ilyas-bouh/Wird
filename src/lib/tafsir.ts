import { Platform } from 'react-native';
import { Directory, Paths } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import warshToHafs from '../data/warshToHafs.json';

// Two tafsirs only, both short: Tafsir al-Muyassar (Arabic) and Al-Mukhtasar (English).
// They live in a bundled SQLite database (tools/build_tafsir_db.py, assets/db/tafsir.db), keyed by Hafs
// ayah numbers, so Warsh ayahs are converted with src/data/warshToHafs.json first.
export type TafsirLang = 'ar' | 'en';
export const EDITIONS: Record<TafsirLang, { id: string; label: string }> = {
  ar: { id: 'ar-muyassar', label: 'الميسر' },
  en: { id: 'en-mukhtasar', label: 'Al-Mukhtasar' },
};
const WEB_BASES = [
  'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir',
  'https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir',
];
const WEB_SLUG: Record<string, string> = { 'ar-muyassar': 'ar-tafsir-muyassar', 'en-mukhtasar': 'en-tafsir-al-mukhtasar' };

export type TafsirSection = { hafs: string; text: string };

const MAP = warshToHafs as Record<string, number[]>;

/** Hafs ayah keys ('surah:ayah') covering a Warsh ayah, or [] when unknown. */
export function hafsKeysFor(warshKey: string): string[] {
  const surah = warshKey.split(':')[0];
  return (MAP[warshKey] ?? []).map((a) => `${surah}:${a}`);
}

const DB_NAME = 'tafsir-2.db'; // bump when assets/db/tafsir.db changes: an existing file is never overwritten
const OLD_DB_NAMES = ['tafsir.db'];

/** Some Muyassar entries contain a stray '[التفسير]' heading line (also in the web CDN text). */
const tidy = (t: string) => t.replace(/\n*\[التفسير\]\n*/g, '\n\n').trim();
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  dbPromise ??= (async () => {
    // The first version of the app cached per-ayah downloads here; drop that leftover cache.
    try {
      const old = new Directory(Paths.document, 'tafsir');
      if (old.exists) old.delete();
    } catch {
      /* nothing to clean */
    }
    for (const old of OLD_DB_NAMES) await SQLite.deleteDatabaseAsync(old).catch(() => {});
    await SQLite.importDatabaseFromAssetAsync(DB_NAME, { assetId: require('../../assets/db/tafsir.db') });
    return SQLite.openDatabaseAsync(DB_NAME, { useNewConnection: true });
  })();
  return dbPromise;
}

async function readOne(edition: string, hafsKey: string): Promise<string> {
  const [s, a] = hafsKey.split(':').map(Number);
  if (Platform.OS === 'web') {
    // The SQLite file is native-only here; on web read the same text from the CDN.
    // jsDelivr refuses a few files (repo exceeds its package size limit), so fall back to raw GitHub.
    const path = `${WEB_SLUG[edition]}/${s}/${a}.json`;
    for (const base of WEB_BASES) {
      const res = await fetch(`${base}/${path}`).catch(() => null);
      if (res?.ok) return tidy((await res.json()).text);
    }
    throw new Error('Tafsir not available');
  }
  const db = await getDb();
  const row = await db.getFirstAsync<{ text: string }>('SELECT text FROM tafsir WHERE edition = ? AND surah = ? AND ayah = ?', [edition, s, a]);
  if (!row) throw new Error('Tafsir not found for this ayah');
  return tidy(row.text);
}

export async function getTafsir(lang: TafsirLang, warshKey: string): Promise<TafsirSection[]> {
  const keys = hafsKeysFor(warshKey);
  if (!keys.length) throw new Error('No tafsir mapping for this ayah yet');
  const edition = EDITIONS[lang].id;
  return Promise.all(keys.map(async (hafs) => ({ hafs, text: await readOne(edition, hafs) })));
}

/** Tafsir text for many Hafs ayah keys at once (one SQL query on device). Missing keys are omitted. */
export async function getTafsirBatch(lang: TafsirLang, hafsKeys: string[]): Promise<Record<string, string>> {
  const edition = EDITIONS[lang].id;
  const out: Record<string, string> = {};
  if (!hafsKeys.length) return out;
  if (Platform.OS === 'web') {
    await Promise.all(
      hafsKeys.map(async (k) => {
        try {
          out[k] = await readOne(edition, k);
        } catch {
          /* leave missing */
        }
      }),
    );
    return out;
  }
  const db = await getDb();
  const pairs = hafsKeys.map((k) => k.split(':').map(Number));
  const where = pairs.map(() => '(surah = ? AND ayah = ?)').join(' OR ');
  const rows = await db.getAllAsync<{ surah: number; ayah: number; text: string }>(
    `SELECT surah, ayah, text FROM tafsir WHERE edition = ? AND (${where})`,
    [edition, ...pairs.flat()],
  );
  for (const r of rows) out[`${r.surah}:${r.ayah}`] = r.text;
  return out;
}
