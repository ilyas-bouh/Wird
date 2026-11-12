import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HIZB_COUNT, MAPLE, THUMNS_PER_HIZB, hizbOf, type PlantId } from '../plants/catalog';

export const THUMN_COUNT = HIZB_COUNT * THUMNS_PER_HIZB; // 480
/** 0 = unread ... 4 = finished. A hizb's plant grows one step per finished thumn. */
export const MAX_STAGE = 4;
export const SLOTS = 25; // 5x5 island
const KEY = 'garden.v3';
const OLD_KEY = 'garden.v2';

type Placed = (PlantId | null)[];
type Saved = { treeUnlocked: boolean; stages: Record<number, number>; placed: Placed; days: string[] };

type Value = {
  ready: boolean;
  /** the red maple gift is given the first time the garden is opened */
  treeUnlocked: boolean;
  unlockTree: () => void;
  stageOf: (thumnIndex: number) => number;
  /** advance one stage (wraps back to 0 after finishing so a mistake can be undone) */
  water: (thumnIndex: number) => void;
  /** number of thumns at each stage, index = stage */
  counts: number[];
  streak: number;
  /** longest run of consecutive days with progress, and the number of days with any progress */
  bestStreak: number;
  activeDays: number;
  /** finished thumns (0..8) in each hizb: the growth step of that hizb's plant */
  growth: number[];
  /** the maple is always yours once gifted; a flower unlocks when its whole hizb is finished */
  isUnlocked: (id: PlantId) => boolean;
  /** what is planted on each island slot (each plant can be planted once) */
  placed: Placed;
  plant: (slot: number, id: PlantId) => void;
  uproot: (slot: number) => void;
};

const emptyPlaced = (): Placed => Array(SLOTS).fill(null);

const Ctx = createContext<Value>({
  ready: false,
  treeUnlocked: true,
  unlockTree: () => {},
  stageOf: () => 0,
  water: () => {},
  counts: [THUMN_COUNT, 0, 0, 0, 0],
  streak: 0,
  bestStreak: 0,
  activeDays: 0,
  growth: Array(HIZB_COUNT).fill(0),
  isUnlocked: () => false,
  placed: emptyPlaced(),
  plant: () => {},
  uproot: () => {},
});

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function computeBest(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0, run = 0, prev: Date | null = null;
  for (const k of sorted) {
    const [y, m, d] = k.split('-').map(Number);
    const cur = new Date(y, m - 1, d);
    run = prev && Math.round((cur.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = cur;
  }
  return best;
}

function computeStreak(days: string[]): number {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function GardenProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Saved>({ treeUnlocked: false, stages: {}, placed: emptyPlaced(), days: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = (await AsyncStorage.getItem(KEY)) ?? (await AsyncStorage.getItem(OLD_KEY));
      if (!raw) return;
      const v = JSON.parse(raw);
      setS({
        treeUnlocked: v.treeUnlocked ?? false,
        stages: v.stages ?? {},
        // earlier saves held the old flower species; only the maple carries over
        placed: Array.isArray(v.placed) && v.placed.length === SLOTS ? v.placed.map((p: string | null) => (p === MAPLE || (p && /^h\d+$/.test(p)) ? p : null)) : emptyPlaced(),
        days: v.days ?? [],
      });
    })()
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
  }, [s, ready]);

  const water = useCallback((i: number) => {
    setS((p) => {
      const next = ((p.stages[i] ?? 0) + 1) % (MAX_STAGE + 1);
      const stages = { ...p.stages };
      if (next === 0) delete stages[i];
      else stages[i] = next;
      let { days } = p;
      if (next > 0) {
        const today = dayKey(new Date());
        if (!days.includes(today)) days = [...days.slice(-400), today];
      }
      return { ...p, stages, days };
    });
  }, []);

  const unlockTree = useCallback(() => {
    setS((p) => {
      if (p.treeUnlocked) return p;
      const centre = Math.floor(SLOTS / 2);
      const placed = [...p.placed];
      if (!placed[centre] && !placed.includes(MAPLE)) placed[centre] = MAPLE;
      return { ...p, treeUnlocked: true, placed };
    });
  }, []);

  const value = useMemo<Value>(() => {
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < THUMN_COUNT; i++) counts[s.stages[i] ?? 0]++;
    const growth = Array.from({ length: HIZB_COUNT }, (_, h) => {
      let n = 0;
      for (let k = 0; k < THUMNS_PER_HIZB; k++) if ((s.stages[h * THUMNS_PER_HIZB + k] ?? 0) === MAX_STAGE) n++;
      return n;
    });
    const isUnlocked = (id: PlantId) => (id === MAPLE ? s.treeUnlocked : growth[hizbOf(id)] === THUMNS_PER_HIZB);
    return {
      ready,
      treeUnlocked: s.treeUnlocked,
      unlockTree,
      stageOf: (i) => s.stages[i] ?? 0,
      water,
      counts,
      streak: computeStreak(s.days),
      bestStreak: computeBest(s.days),
      activeDays: new Set(s.days).size,
      growth,
      isUnlocked,
      placed: s.placed,
      plant: (slot, id) =>
        setS((p) => {
          const done = id === MAPLE ? p.treeUnlocked : (() => {
            let n = 0;
            for (let k = 0; k < THUMNS_PER_HIZB; k++) if ((p.stages[hizbOf(id) * THUMNS_PER_HIZB + k] ?? 0) === MAX_STAGE) n++;
            return n === THUMNS_PER_HIZB;
          })();
          if (!done) return p;
          // one of each: planting it somewhere new moves it
          const placed = p.placed.map((x) => (x === id ? null : x));
          placed[slot] = id;
          return { ...p, placed };
        }),
      uproot: (slot) =>
        setS((p) => {
          if (!p.placed[slot]) return p;
          const placed = [...p.placed];
          placed[slot] = null;
          return { ...p, placed };
        }),
    };
  }, [s, ready, water, unlockTree]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useGarden = () => useContext(Ctx);
