import surahs from '../data/surahs.json';
import portions from '../data/portions.json';

export type PortionMode = 'thumn' | 'rub';
export type AyahPos = { surah: number; ayah: number };
export type Portion = {
  mode: PortionMode;
  /** 1-based thumn (1..480) or rub' (1..240) number */
  n: number;
  start: AyahPos & { page: number; id: number };
  end: AyahPos & { page: number; id: number };
};

// cumulative Warsh ayah counts: cum[s-1] ayahs precede surah s
const cum: number[] = [0];
for (const s of surahs) cum.push(cum[cum.length - 1] + s.count);

export const surahName = (n: number) => surahs[n - 1];

/** Global Warsh ayah id (1..6214) -> surah:ayah. */
export function refFromId(id: number): AyahPos {
  let s = surahs.length;
  while (s > 1 && id <= cum[s - 1]) s--;
  return { surah: s, ayah: id - cum[s - 1] };
}

/** The thumn (or the rub' containing it) at a 0-based thumn index. */
export function portionAt(mode: PortionMode, thumnIndex: number): Portion {
  if (mode === 'rub') {
    const r = portions.rub[Math.floor(thumnIndex / 2)];
    return { mode, n: r.n, start: r.start, end: r.end };
  }
  const t = portions.thumn[thumnIndex];
  return { mode, n: t.n, start: t.start, end: t.end };
}

export function ayahsInPortion(p: Portion): AyahPos[] {
  const out: AyahPos[] = [];
  for (let id = p.start.id; id <= p.end.id; id++) out.push(refFromId(id));
  return out;
}
