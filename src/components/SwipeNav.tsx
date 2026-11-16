import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import { useOnboarding } from '../context/OnboardingContext';
import { goSwipe, registerSwipeAnimator } from '../lib/swipeNav';

/** Horizontal offset of the screen content; the tab bar reads it to stay fixed while screens slide. */
const SwipeX = createContext<Animated.Value | null>(null);
/** the tab bar reports its height so the fade veil can stop above it */
const BarHeight = createContext<(h: number) => void>(() => {});
const BarHeightValue = createContext(0);

export function SwipeProvider({ children }: { children: ReactNode }) {
  const x = useRef(new Animated.Value(0)).current;
  const [barH, setBarH] = useState(0);
  return (
    <SwipeX.Provider value={x}>
      <BarHeight.Provider value={setBarH}>
        <BarHeightValue.Provider value={barH}>{children}</BarHeightValue.Provider>
      </BarHeight.Provider>
    </SwipeX.Provider>
  );
}

export function useReportBarHeight() {
  return useContext(BarHeight);
}

export function useSwipeX() {
  return useContext(SwipeX);
}

/**
 * Horizontal swipes move between the screens (looping). The content follows the finger, then slides out,
 * the screen switches, and the next one slides in from the opposite side. Mostly-vertical drags are left
 * alone so lists keep scrolling. The Reader's WebView reports its own swipes (no finger-follow there).
 */
export default function SwipeNav({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const x = useSwipeX() ?? new Animated.Value(0);
  const { width } = useWindowDimensions();
  const barH = useContext(BarHeightValue);
  const busy = useRef(false);
  const onb = useOnboarding();
  const locked = useRef(false);
  locked.current = onb.active; // no swiping between screens during the first-run tour
  const dist = width * 0.22; // screens only travel a short way: they slide and dissolve instead of leaving a gap

  const run = useCallback(
    (dir: 'left' | 'right') => {
      if (busy.current || locked.current) return;
      busy.current = true;
      const out = dir === 'left' ? -dist : dist;
      Animated.timing(x, { toValue: out, duration: 130, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
        goSwipe(dir);
        x.setValue(-out); // the new screen waits on the opposite side...
        Animated.timing(x, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
          busy.current = false; // ...and slides in
        });
      });
    },
    [dist, x],
  );

  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    registerSwipeAnimator((dir) => runRef.current(dir));
    return () => registerSwipeAnimator(null);
  }, []);

  const back = () =>
    Animated.spring(x, { toValue: 0, stiffness: 220, damping: 22, mass: 0.9, useNativeDriver: true }).start();

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !busy.current && !locked.current && Math.abs(g.dx) > 20 && Math.abs(g.dx) > 2 * Math.abs(g.dy),
      onPanResponderMove: (_, g) => x.setValue(Math.max(-dist, Math.min(dist, g.dx * 0.4))),
      onPanResponderRelease: (_, g) => {
        if ((Math.abs(g.dx) > 70 || (Math.abs(g.dx) > 30 && Math.abs(g.vx) > 0.5)) && Math.abs(g.dx) > 2 * Math.abs(g.dy)) runRef.current(g.dx < 0 ? 'left' : 'right');
        else back();
      },
      onPanResponderTerminate: back,
    }),
  ).current;

  const style = useMemo(() => [styles.fill, { transform: [{ translateX: x }] }], [x, styles]);
  // a veil in the page colour dissolves the screen as it slides, so the switch is a soft crossfade (never a white gap)
  const veil = useMemo(
    () => x.interpolate({ inputRange: [-dist, 0, dist], outputRange: [1, 0, 1], extrapolate: 'clamp' }),
    [x, dist],
  );
  return (
    <View style={styles.root}>
      <Animated.View style={style} {...pan.panHandlers}>
        {children}
        <Animated.View pointerEvents="none" style={[styles.veil, { bottom: barH, opacity: veil }]} />
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  fill: { flex: 1, backgroundColor: colors.paper },
  veil: { position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: colors.paper },
});
