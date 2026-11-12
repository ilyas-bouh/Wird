import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../theme/colors';
import { goSwipe, registerSwipeAnimator } from '../lib/swipeNav';

/** Horizontal offset of the screen content; the tab bar reads it to stay fixed while screens slide. */
const SwipeX = createContext<Animated.Value | null>(null);

export function SwipeProvider({ children }: { children: ReactNode }) {
  const x = useRef(new Animated.Value(0)).current;
  return <SwipeX.Provider value={x}>{children}</SwipeX.Provider>;
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
  const x = useSwipeX() ?? new Animated.Value(0);
  const { width } = useWindowDimensions();
  const busy = useRef(false);

  const run = useCallback(
    (dir: 'left' | 'right') => {
      if (busy.current) return;
      busy.current = true;
      const out = dir === 'left' ? -width : width;
      Animated.timing(x, { toValue: out, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
        goSwipe(dir);
        x.setValue(-out); // the new screen waits on the opposite side...
        Animated.timing(x, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
          busy.current = false; // ...and slides in
        });
      });
    },
    [width, x],
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
      onMoveShouldSetPanResponder: (_, g) => !busy.current && Math.abs(g.dx) > 20 && Math.abs(g.dx) > 2 * Math.abs(g.dy),
      onPanResponderMove: (_, g) => x.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 70 && Math.abs(g.dx) > 2 * Math.abs(g.dy)) runRef.current(g.dx < 0 ? 'left' : 'right');
        else back();
      },
      onPanResponderTerminate: back,
    }),
  ).current;

  const style = useMemo(() => [styles.fill, { transform: [{ translateX: x }] }], [x]);
  return (
    <Animated.View style={style} {...pan.panHandlers}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: colors.paper } });
