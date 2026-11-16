import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PortionMode } from '../lib/ranges';

type Value = {
  /** 0-based thumn the Reader is showing */
  thumnIndex: number;
  setThumnIndex: (v: number | ((p: number) => number)) => void;
  /** whether the Tafsir tab shows the thumn or the whole rub' containing it */
  mode: PortionMode;
  setMode: (m: PortionMode) => void;
};

const KEY = 'wird.portion';
const Ctx = createContext<Value>({ thumnIndex: 0, setThumnIndex: () => {}, mode: 'thumn', setMode: () => {} });

/** The portion being read, shared by the Reader and Tafsir tabs. */
export function PortionProvider({ children }: { children: ReactNode }) {
  const [thumnIndex, setThumnIndex] = useState(0);
  const [mode, setModeState] = useState<PortionMode>('thumn'); // a thumn (1/8 hizb) a day by default
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => (v === 'thumn' || v === 'rub') && setModeState(v))
      .catch(() => {});
  }, []);
  const setMode = useCallback((m: PortionMode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  }, []);
  const value = useMemo(() => ({ thumnIndex, setThumnIndex, mode, setMode }), [thumnIndex, mode, setMode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePortion = () => useContext(Ctx);
