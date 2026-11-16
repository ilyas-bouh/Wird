import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGarden } from './GardenContext';

/**
 * First-run tour, one step at a time:
 *  ayah   – Reader shows Al-Fatiha: tap an ayah to read its tafsir and hear it recited
 *  read   – the same page with a pulsing "I finished" seal that must be pressed
 *  maple  – Garden: the red maple achievement
 *  plant  – Garden: a pointer asks you to plant the maple
 *  hizbs  – Garden: the empty Hizb fields, "finish more to unlock more flowers"
 *  setup  – choose and download resources
 *  done
 */
export type OnbStep = 'read' | 'maple' | 'plant' | 'hizbs' | 'ayah' | 'setup' | 'done';
const ORDER: OnbStep[] = ['ayah', 'read', 'maple', 'plant', 'hizbs', 'setup', 'done'];
const KEY = 'wird.onboarding.v1';

type Value = { ready: boolean; step: OnbStep; active: boolean; next: () => void; restart: () => void };
const Ctx = createContext<Value>({ ready: true, step: 'done', active: false, next: () => {}, restart: () => {} });

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const garden = useGarden();
  const [step, setStep] = useState<OnbStep | null>(null); // null while loading
  const [saved, setSaved] = useState<OnbStep | null | undefined>(undefined); // undefined = not read yet

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setSaved(ORDER.includes(v as OnbStep) ? (v as OnbStep) : null))
      .catch(() => setSaved(null));
  }, []);

  // Decide the starting step once both the tour progress and the garden are loaded.
  useEffect(() => {
    if (step !== null || saved === undefined || !garden.ready) return;
    // someone who already has the maple is an existing user: skip the tour
    setStep(saved ?? (garden.treeUnlocked ? 'done' : 'ayah'));
  }, [step, saved, garden.ready, garden.treeUnlocked]);

  useEffect(() => {
    if (step) AsyncStorage.setItem(KEY, step).catch(() => {});
  }, [step]);

  const next = useCallback(() => setStep((s) => (s ? ORDER[Math.min(ORDER.indexOf(s) + 1, ORDER.length - 1)] : s)), []);
  const restart = useCallback(() => setStep('ayah'), []);
  const value = useMemo<Value>(
    () => ({ ready: step !== null, step: step ?? 'done', active: step !== null && step !== 'done', next, restart }),
    [step, next, restart],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useOnboarding = () => useContext(Ctx);
