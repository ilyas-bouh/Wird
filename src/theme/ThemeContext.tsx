import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type Palette } from './colors';

const KEY = 'wird.theme';
type Mode = 'light' | 'dark';

type Value = { colors: Palette; dark: boolean; toggle: () => void };
const Ctx = createContext<Value>({ colors: lightColors, dark: false, toggle: () => {} });

/** Light or dark for the whole app: follows the phone until you flip it, then remembers your choice. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [chosen, setChosen] = useState<Mode | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => (v === 'light' || v === 'dark') && setChosen(v))
      .catch(() => {});
  }, []);

  const dark = (chosen ?? (system === 'dark' ? 'dark' : 'light')) === 'dark';
  const toggle = useCallback(() => {
    const next: Mode = dark ? 'light' : 'dark';
    setChosen(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  }, [dark]);

  const value = useMemo(() => ({ colors: dark ? darkColors : lightColors, dark, toggle }), [dark, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
