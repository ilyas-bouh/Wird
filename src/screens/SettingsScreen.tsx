import { useMemo } from 'react';
import { Alert, DevSettings, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n, type Lang } from '../i18n/I18nContext';
import { useOnboarding } from '../context/OnboardingContext';
import { swipeNavigateTo } from '../lib/swipeNav';
import { usePortion } from '../context/PortionContext';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';

const LANGS: { id: Lang; label: string }[] = [
  { id: 'ar', label: 'العربية' },
  { id: 'en', label: 'English' },
];

/** App settings, opened from the Garden header. More sections will be added here later. */
export default function SettingsScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, dark, toggle } = useTheme();
  const { t, lang, rtl, setLang } = useI18n();
  const { mode, setMode } = usePortion();
  const onb = useOnboarding();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const row = rtl ? 'row-reverse' : 'row';
  const align = rtl ? 'right' : 'left';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.header, { flexDirection: row }]}>
          <Text style={[styles.title, { textAlign: align }]}>{t('settings.title')}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('settings.close')} style={styles.closeBtn}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={[styles.section, { textAlign: align }]}>{t('settings.language')}</Text>
          <View style={styles.card}>
            {LANGS.map((l, i) => (
              <Pressable
                key={l.id}
                onPress={() => setLang(l.id)}
                style={[styles.option, { flexDirection: row }, i > 0 && styles.optionBorder]}
              >
                <Text style={[styles.optionText, { textAlign: align }]}>{l.label}</Text>
                <View style={[styles.radio, lang === l.id && styles.radioOn]}>{lang === l.id && <View style={styles.radioDot} />}</View>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.section, { textAlign: align }]}>{t('settings.portion')}</Text>
          <View style={styles.card}>
            {([['rub', t('settings.rub')], ['thumn', t('settings.thumn')]] as const).map(([id, label], i) => (
              <Pressable
                key={id}
                onPress={() => setMode(id)}
                style={[styles.option, { flexDirection: row }, i > 0 && styles.optionBorder]}
              >
                <Text style={[styles.optionText, { textAlign: align }]}>{label}</Text>
                <View style={[styles.radio, mode === id && styles.radioOn]}>{mode === id && <View style={styles.radioDot} />}</View>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.section, { textAlign: align }]}>{t('settings.appearance')}</Text>
          <View style={styles.card}>
            {[
              { id: 'light', label: t('settings.light'), on: !dark },
              { id: 'dark', label: t('settings.dark'), on: dark },
            ].map((o, i) => (
              <Pressable
                key={o.id}
                onPress={() => !o.on && toggle()}
                style={[styles.option, { flexDirection: row }, i > 0 && styles.optionBorder]}
              >
                <Text style={[styles.optionText, { textAlign: align }]}>{o.label}</Text>
                <View style={[styles.radio, o.on && styles.radioOn]}>{o.on && <View style={styles.radioDot} />}</View>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => { onClose(); onb.restart(); swipeNavigateTo('Reader'); }}
            style={[styles.card, styles.option, { marginTop: 22, flexDirection: row }]}
          >
            <Text style={[styles.optionText, { textAlign: align }]}>{t('onb.replay')}</Text>
          </Pressable>

          {/* testing only: wipes every saved setting, the garden and the tour, then restarts the app */}
          <Pressable
            onPress={() =>
              Alert.alert(t('settings.clearTitle'), t('settings.clearText'), [
                { text: t('settings.cancel'), style: 'cancel' },
                {
                  text: t('settings.clearConfirm'),
                  style: 'destructive',
                  onPress: async () => {
                    await AsyncStorage.clear();
                    if (__DEV__) DevSettings.reload();
                    else Alert.alert(t('settings.clearDone'));
                  },
                },
              ])
            }
            style={[styles.card, styles.option, { marginTop: 12, flexDirection: row, borderColor: '#B71C1C' }]}
          >
            <Text style={[styles.optionText, { textAlign: align, color: '#B71C1C' }]}>{t('settings.clearTitle')}</Text>
          </Pressable>

          <Text style={styles.more}>{t('settings.more')}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  title: { flex: 1, fontSize: 26, fontWeight: '700', color: colors.accent },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
  close: { fontSize: 16, color: colors.textMuted },
  body: { paddingHorizontal: 16, paddingTop: 8 },
  section: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 18, marginBottom: 8, marginHorizontal: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.paleGreen, overflow: 'hidden' },
  option: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  optionBorder: { borderTopWidth: 1, borderTopColor: colors.paleGreen },
  optionText: { flex: 1, fontSize: 17, color: colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  more: { marginTop: 28, textAlign: 'center', color: colors.textMuted, fontSize: 13 },
});
