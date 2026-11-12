import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Focus = { focused: boolean; setFocused: (v: boolean | ((p: boolean) => boolean)) => void };

const FocusContext = createContext<Focus>({ focused: true, setFocused: () => {} });

/** Reader focus mode: while `focused`, the tab bar and status bar are hidden. A tap toggles it. */
export function FocusProvider({ children }: { children: ReactNode }) {
  const [focused, setFocused] = useState(true);
  const value = useMemo(() => ({ focused, setFocused }), [focused]);
  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export const useFocusMode = () => useContext(FocusContext);
