import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Text from './AppText';
import { RedTreeScene } from './RedTree';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';

/**
 * The red maple achievement. It is an opaque full-screen overlay that fades in over whatever is showing, so the
 * screen behind can switch (to the Garden) unseen, and fades out again to reveal it.
 */
export default function MapleGift({ visible, onPlant }: { visible: boolean; onPlant: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(fade, {
      toValue: visible ? 1 : 0,
      duration: visible ? 420 : 380,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, fade]);

  if (!mounted) return null;
  return (
    <Animated.View style={[styles.fill, { opacity: fade }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Text style={styles.kicker}>{t('garden.giftKicker')}</Text>
      <Text style={styles.title}>{t('garden.giftTitle')}</Text>
      <RedTreeScene width={Math.min(width - 24, 460)} />
      <Text style={styles.text}>{t('garden.giftText')}</Text>
      <Pressable style={styles.btn} onPress={onPlant}>
        <Text style={styles.btnText}>{t('garden.giftButton')}</Text>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, paddingHorizontal: 12, zIndex: 50, elevation: 50 },
  kicker: { fontSize: 13, letterSpacing: 1, color: colors.textMuted, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '700', color: '#B71C1C', marginTop: 4, marginBottom: 8 },
  text: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginHorizontal: 28, marginTop: 8 },
  btn: { backgroundColor: colors.accent, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 18, marginTop: 24 },
  btnText: { color: colors.onAccent, fontWeight: '700' },
});
