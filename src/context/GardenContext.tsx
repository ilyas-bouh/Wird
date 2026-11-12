import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SPECIES, speciesForThumn, type SpeciesId } from '../lib/species';

export const THUMN_COUNT = 480;
/** 0 = unread ... 4 = finished. Reaching 4 for the first time earns a plant. */
export const MAX_STAGE = 4;
export const SLOTS = 25; // 5x5 island
const KEY = 'garden.v2';

type Inventory = Record<SpeciesId, number>;
type Placed = (SpeciesId | null)[];

type Saved = { stages: Record<number, number>; earned: Record<number, true>; inventory: Inventory; placed: Placed; days: string[] };

type Value = {
  ready: boolean;
  stageOf: (thumnIndex: number) => number;
  water: (thumnIndex: number) => void;
  /** number of thumns at each stage, index = stage */
  counts: number[];
  streak: number;
  /** plants you own but haven't planted */
  inventory: Inventory;
  /** what is planted on each island slot */
  placed: Placed;
  plant: (slot: number, species: SpeciesId) => void;
  /** pick a plant back up into the inventory */
  uproot: (slot: number) => void;
};

const emptyInventory = (): Inventory => ({ daffodil: 0, hydrangea: 0, cosmos: 0 });
const emptyPlaced = (): Placed => Array(SLOTS).fill(null);

const Ctx = createContext<Value>({
  ready: false,
  stageOf: () => 0,
  water: () => {},
  counts: [THUMN_COUNT, 0, 0, 0, 0],
  streak: 0,
  inventory: emptyInventory(),
  placed: emptyPlaced(),
  plant: () => {},
  uproot: () => {},
});

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
  const [s, setS] = useState<Saved>({ stages: {}, earned: {}, inventory: emptyInventory(), placed: emptyPlaced(), days: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const v: Partial<Saved> = JSON.parse(raw);
        setS({
          stages: v.stages ?? {},
          earned: v.earned ?? {},
          inventory: { ...emptyInventory(), ...v.inventory },
          placed: v.placed?.length === SLOTS ? v.placed : emptyPlaced(),
          days: v.days ?? [],
        });
      })
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
      let { earned, inventory, days } = p;
      if (next > 0) {
        const today = dayKey(new Date());
        if (!days.includes(today)) days = [...days.slice(-400), today];
      }
      if (next === MAX_STAGE && !earned[i]) {
        earned = { ...earned, [i]: true };
        const sp = speciesForThumn(i);
        inventory = { ...inventory, [sp]: inventory[sp] + 1 };
      }
      return { ...p, stages, earned, inventory, days };
    });
  }, []);

  const plant = useCallback((slot: number, species: SpeciesId) => {
    setS((p) => {
      if (p.placed[slot] || p.inventory[species] < 1) return p;
      const placed = [...p.placed];
      placed[slot] = species;
      return { ...p, placed, inventory: { ...p.inventory, [species]: p.inventory[species] - 1 } };
    });
  }, []);

  const uproot = useCallback((slot: number) => {
    setS((p) => {
      const sp = p.placed[slot];
      if (!sp) return p;
      const placed = [...p.placed];
      placed[slot] = null;
      return { ...p, placed, inventory: { ...p.inventory, [sp]: p.inventory[sp] + 1 } };
    });
  }, []);

  const value = useMemo<Value>(() => {
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < THUMN_COUNT; i++) counts[s.stages[i] ?? 0]++;
    return {
      ready,
      stageOf: (i) => s.stages[i] ?? 0,
      water,
      counts,
      streak: computeStreak(s.days),
      inventory: s.inventory,
      placed: s.placed,
      plant,
      uproot,
    };
  }, [s, ready, water, plant, uproot]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useGarden = () => useContext(Ctx);
export { SPECIES };
