import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Text from './AppText';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';

/** A bouncing arrow that points at something. `dir` is where the arrow points. */
export function Pointer({ dir = 'down', style }: { dir?: 'down' | 'up'; style?: ViewStyle }) {
  const { colors } = useTheme();
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  const y = bob.interpolate({ inputRange: [0, 1], outputRange: [0, dir === 'down' ? 12 : -12] });
  return (
    <Animated.View pointerEvents="none" style={[{ transform: [{ translateY: y }] }, style]}>
      <Svg width={46} height={46} viewBox="0 0 24 24" style={dir === 'up' ? { transform: [{ rotate: '180deg' }] } : undefined}>
        <Path d="M12 3v15M5.5 12.5 12 19l6.5-6.5" stroke={colors.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

/** Bottom card for a tour step: a message and a button. Taps elsewhere pass through to the screen below. */
export function CoachCard({
  title, text, button, onPress, bottom = 24, top, hideButton, onHeight,
}: { onHeight?: (h: number) => void; title: string; text: string; button?: string; onPress?: () => void; bottom?: number; top?: number; hideButton?: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    rise.setValue(0);
    Animated.spring(rise, { toValue: 1, stiffness: 140, damping: 14, useNativeDriver: true }).start();
  }, [title, rise]);
  return (
    <View pointerEvents="box-none" style={[styles.wrap, top !== undefined ? { top } : { bottom }]} onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}>
      <Animated.View
        style={[styles.card, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
        {!hideButton && button && onPress && (
          <Pressable onPress={onPress} style={styles.btn}>
            <Text style={styles.btnText}>{button}</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  card: {
    width: '100%', maxWidth: 440, backgroundColor: colors.card, borderRadius: 24, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: colors.mint, elevation: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
  },
  title: { fontSize: 19, fontWeight: '700', color: colors.darkGreen, textAlign: 'center' },
  text: { fontSize: 14, lineHeight: 22, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
  btn: { marginTop: 16, backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 34 },
  btnText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
});
