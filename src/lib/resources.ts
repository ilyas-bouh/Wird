import AsyncStorage from '@react-native-async-storage/async-storage';

export type Riwaya = 'hafs' | 'warsh';
export type ResourceChoice = { riwaya: Riwaya; audio: boolean; tafsir: boolean; pages: boolean };

export const DEFAULT_CHOICE: ResourceChoice = { riwaya: 'warsh', audio: true, tafsir: true, pages: true };

/** Approximate download sizes in MB, measured from resources/bundles/ (audio = 32 kbps mp3, pages = svg-br + json). */
const SIZES: Record<Riwaya, { audio: number; pages: number }> = {
  warsh: { audio: 394, pages: 84 },
  hafs: { audio: 410, pages: 74 },
};
const TAFSIR_MB = 6.2;

export const estimateMb = (c: ResourceChoice) =>
  (c.audio ? SIZES[c.riwaya].audio : 0) + (c.pages ? SIZES[c.riwaya].pages : 0) + (c.tafsir ? TAFSIR_MB : 0);

export const sizeOf = (c: ResourceChoice, what: 'audio' | 'pages' | 'tafsir') =>
  what === 'tafsir' ? TAFSIR_MB : SIZES[c.riwaya][what];

const KEY = 'wird.resources.v1';

export async function loadChoice(): Promise<ResourceChoice> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_CHOICE, ...JSON.parse(raw) } : DEFAULT_CHOICE;
  } catch {
    return DEFAULT_CHOICE;
  }
}

export const saveChoice = (c: ResourceChoice) => AsyncStorage.setItem(KEY, JSON.stringify(c)).catch(() => {});

/** Where the resource packs are hosted. Empty until the files are published: downloads are then skipped. */
export const RESOURCE_BASE_URL = '';
