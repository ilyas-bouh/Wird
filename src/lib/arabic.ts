import { surahName, type AyahPos, type Portion } from './ranges';

const DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Digits used in Arabic text: Western digits 0-9 (the Maghrebi / Moroccan convention). Set to true for ١٢٣. */
const EASTERN_DIGITS = false;

export const arDigits = (n: number | string) =>
  EASTERN_DIGITS ? String(n).replace(/\d/g, (d) => DIGITS[Number(d)]) : String(n);

/** e.g. 'الربع ١' / 'الثمن ٣'. */
export const portionTitleAr = (p: Portion) => `${p.mode === 'rub' ? 'الربع' : 'الثمن'} ${arDigits(p.n)}`;

/** 'الآية ٥' or 'الآيات ٦ – ٧' for the Warsh ayahs of one card. */
export function ayahChipAr(ayahs: AyahPos[]) {
  const first = ayahs[0].ayah;
  const last = ayahs[ayahs.length - 1].ayah;
  return ayahs.length === 1 ? `الآية ${arDigits(first)}` : `الآيات ${arDigits(first)} – ${arDigits(last)}`;
}

/** 'سورة الفاتحة · من الآية ١ إلى الآية ٧', or across surahs 'من سورة الفاتحة، الآية ١ إلى سورة البقرة، الآية ٢٤'. */
export function portionRangeAr(p: Portion) {
  const s = surahName(p.start.surah).ar;
  if (p.start.surah === p.end.surah) {
    return p.start.ayah === p.end.ayah
      ? `سورة ${s} · الآية ${arDigits(p.start.ayah)}`
      : `سورة ${s} · من الآية ${arDigits(p.start.ayah)} إلى الآية ${arDigits(p.end.ayah)}`;
  }
  const e = surahName(p.end.surah).ar;
  return `من سورة ${s}، الآية ${arDigits(p.start.ayah)} إلى سورة ${e}، الآية ${arDigits(p.end.ayah)}`;
}

export const pagesAr = (p: Portion) =>
  p.start.page === p.end.page ? `الصفحة ${arDigits(p.start.page)}` : `الصفحات ${arDigits(p.start.page)}–${arDigits(p.end.page)}`;
