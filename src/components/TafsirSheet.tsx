import { useEffect, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useI18n } from '../i18n/I18nContext';
import { EDITIONS, getTafsir, type TafsirLang, type TafsirSection } from '../lib/tafsir';

export const SHEET_HEIGHT = 340;

type Props = { ayahKey: string | null; onClose: () => void };

/** Bottom drawer with the tafsir of the tapped ayah: Al-Muyassar (Arabic) or Al-Mukhtasar (English). */
export default function TafsirSheet({ ayahKey, onClose }: Props) {
  const { colors } = useTheme();
  const { t, rtl: uiRtl, lang: uiLang } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState<TafsirLang>(uiLang);
  const [sections, setSections] = useState<TafsirSection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null); // keeps the title while sliding out
  const slide = useRef(new Animated.Value(SHEET_HEIGHT + 80)).current;

  useEffect(() => {
    if (ayahKey) setShown(ayahKey);
    Animated.timing(slide, {
      toValue: ayahKey ? 0 : SHEET_HEIGHT + 80,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [ayahKey, slide]);

  useEffect(() => {
    if (!ayahKey) return;
    let cancelled = false;
    setSections(null);
    setError(null);
    getTafsir(lang, ayahKey)
      .then((s) => !cancelled && setSections(s))
      .catch(() => !cancelled && setError(t('tafsir.unavailable')));
    return () => {
      cancelled = true;
    };
  }, [ayahKey, lang, t]);

  const rtl = lang === 'ar';

  return (
    <Animated.View
      pointerEvents={ayahKey ? 'auto' : 'none'}
      style={[styles.sheet, { height: SHEET_HEIGHT + insets.bottom, paddingBottom: insets.bottom, transform: [{ translateY: slide }] }]}
    >
      <View style={styles.handle} />
      <View style={[styles.header, uiRtl && { flexDirection: 'row-reverse' }]}>
        <Text style={[styles.title, uiRtl && { textAlign: 'right' }]}>{t('tafsir.sheetTitle', { key: shown?.replace(':', ' : ') ?? '' })}</Text>
        <View style={styles.langs}>
          {(['ar', 'en'] as const).map((l) => (
            <Pressable key={l} onPress={() => setLang(l)} style={[styles.pill, lang === l && styles.pillActive]}>
              <Text style={[styles.pillText, lang === l && styles.pillTextActive]}>{l === 'ar' ? 'عربي' : 'EN'}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('tafsir.close')}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {!sections && !error && <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />}
        {error && <Text style={styles.error}>{error}</Text>}
        {sections?.map((s, i) => (
          <View key={s.hafs} style={i > 0 && styles.gap}>
            <Text style={[styles.text, rtl && styles.rtl]}>{s.text}</Text>
          </View>
        ))}
        {sections && (
          <Text style={styles.note}>
            {EDITIONS[lang].label}. {t('tafsir.sheetNote')}
          </Text>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.paleGreen,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.mint, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, gap: 10 },
  title: { flex: 1, color: colors.darkGreen, fontWeight: '600', fontSize: 15 },
  langs: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.card },
  pillActive: { backgroundColor: colors.accent },
  pillText: { color: colors.textMuted, fontSize: 13 },
  pillTextActive: { color: colors.onAccent },
  close: { fontSize: 18, color: colors.textMuted, paddingLeft: 6 },
  body: { paddingHorizontal: 18, paddingBottom: 24 },
  text: { color: colors.text, fontSize: 16, lineHeight: 26 },
  rtl: { writingDirection: 'rtl', textAlign: 'right', fontFamily: fonts.ar, fontSize: 20, lineHeight: 38 },
  gap: { marginTop: 18 },
  note: { color: colors.textMuted, fontSize: 11, marginTop: 20 },
  error: { color: colors.textMuted, marginTop: 16 },
});
