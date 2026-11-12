import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PortionMode } from '../lib/ranges';

type Value = {
  /** 0-based thumn the Reader is showing */
  thumnIndex: number;
  setThumnIndex: (v: number | ((p: number) => number)) => void;
  /** whether the Tafsir tab shows the thumn or the whole rub' containing it */
  mode: PortionMode;
  setMode: (m: PortionMode) => void;
};

const Ctx = createContext<Value>({ thumnIndex: 0, setThumnIndex: () => {}, mode: 'thumn', setMode: () => {} });

/** The portion being read, shared by the Reader and Tafsir tabs. */
export function PortionProvider({ children }: { children: ReactNode }) {
  const [thumnIndex, setThumnIndex] = useState(0);
  const [mode, setMode] = useState<PortionMode>('thumn');
  const value = useMemo(() => ({ thumnIndex, setThumnIndex, mode, setMode }), [thumnIndex, mode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePortion = () => useContext(Ctx);
