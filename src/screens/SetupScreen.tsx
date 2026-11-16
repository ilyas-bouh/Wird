import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import { swipeNavigateTo } from '../lib/swipeNav';
import { downloadResources } from '../lib/localResources';
import { DEFAULT_CHOICE, RESOURCE_BASE_URL, estimateMb, loadChoice, saveChoice, sizeOf, type ResourceChoice, type Riwaya } from '../lib/resources';

/** The last onboarding step: choose the riwaya and which resources to keep on the device. */
export default function SetupScreen({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const { colors } = useTheme();
  const { t, rtl } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [choice, setChoice] = useState<ResourceChoice>(DEFAULT_CHOICE);
  const row = rtl ? 'row-reverse' : 'row';
  const align = rtl ? 'right' : 'left';

  useEffect(() => {
    if (visible) loadChoice().then((c) => setChoice({ ...c, pages: true, tafsir: true }));
  }, [visible]);

  const patch = (p: Partial<ResourceChoice>) => setChoice((c) => ({ ...c, ...p }));
  const [prog, setProg] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const finish = async (save: boolean) => {
    if (!save) return onDone();
    await saveChoice(choice);
    if (Platform.OS === 'web' || !RESOURCE_BASE_URL) return onDone();
    setFailed(false);
    setProg({ done: 0, total: 1 });
    try {
      await downloadResources(choice, (p) => setProg({ done: p.done, total: Math.max(p.total, 1) }));
      setProg(null);
      swipeNavigateTo('Reader');
      onDone();
    } catch {
      setProg(null);
      setFailed(true);
    }
  };
  const mb = estimateMb(choice);
  // pages and tafsir are always needed, so they are locked on
  const required = (k: string) => k === 'pages' || k === 'tafsir';

  const riwayas: { id: Riwaya; label: string }[] = [
    { id: 'warsh', label: t('setup.warsh') },
    { id: 'hafs', label: t('setup.hafs') },
  ];
  const items = [
    { k: 'pages', title: t('setup.pages'), sub: t('setup.pagesSub') },
    { k: 'audio', title: t('setup.audio'), sub: t('setup.audioSub') },
    { k: 'tafsir', title: t('setup.tafsir'), sub: t('setup.tafsirSub') },
  ] as const;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={() => {}}>
      <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
        {prog ? (
          <View style={[styles.progressScreen, { direction: rtl ? 'rtl' : 'ltr' }]}>
            <Text style={[styles.title, { textAlign: 'center', writingDirection: rtl ? 'rtl' : 'ltr' }]}>{t('setup.downloadingTitle')}</Text>
            <View style={[styles.bar, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
              <View style={{ height: 10, width: `${Math.round((prog.done / prog.total) * 100)}%`, backgroundColor: colors.accent }} />
            </View>
            <Text style={styles.pct}>{Math.round((prog.done / prog.total) * 100)}%</Text>
            <Text style={styles.note}>{t('setup.downloading', { mb: Math.round(prog.done / 1048576), total: Math.round(prog.total / 1048576) })}</Text>
            <Text style={styles.note}>{t('setup.keepOpen')}</Text>
          </View>
        ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.title, { textAlign: align }]}>{t('setup.title')}</Text>
          <Text style={[styles.sub, { textAlign: align }]}>{t('setup.sub')}</Text>

          <Text style={[styles.section, { textAlign: align }]}>{t('setup.riwaya')}</Text>
          <View style={styles.card}>
            {riwayas.map((r, i) => (
              <Pressable key={r.id} onPress={() => patch({ riwaya: r.id })} style={[styles.option, { flexDirection: row }, i > 0 && styles.border]}>
                <Text style={[styles.optionText, { textAlign: align }]}>{r.label}</Text>
                <View style={[styles.radio, choice.riwaya === r.id && styles.radioOn]}>{choice.riwaya === r.id && <View style={styles.dot} />}</View>
              </Pressable>
            ))}
          </View>

          <View style={[styles.card, { marginTop: 18 }]}>
            {items.map((it, i) => (
              <View key={it.k} style={[styles.option, { flexDirection: row }, i > 0 && styles.border]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionText, { textAlign: align }]}>{it.title}</Text>
                  <Text style={[styles.optionSub, { textAlign: align }]}>{it.sub} · {sizeOf(choice, it.k)} MB</Text>
                  {required(it.k) && <Text style={[styles.required, { textAlign: align }]}>{t('setup.required')}</Text>}
                </View>
                <Switch
                  value={required(it.k) ? true : choice[it.k]}
                  disabled={required(it.k)}
                  onValueChange={(v) => patch({ [it.k]: v } as Partial<ResourceChoice>)}
                  trackColor={{ true: colors.accent, false: colors.mint }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>

          <Text style={styles.total}>{t('setup.total', { mb })}</Text>
          {!RESOURCE_BASE_URL && <Text style={styles.note}>{t('setup.notReady')}</Text>}
          {failed && <Text style={[styles.note, { color: colors.accent }]}>{t('setup.failed')}</Text>}
        </ScrollView>
        )}

        {!prog && <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable onPress={() => finish(true)} disabled={!!prog} style={[styles.btn, !!prog && { opacity: 0.5 }]}>
            <Text style={styles.btnText}>{failed ? t('setup.retry') : t('setup.download')}</Text>
          </Pressable>
          <Pressable onPress={() => finish(false)} disabled={!!prog} hitSlop={8} style={styles.skip}>
            <Text style={styles.skipText}>{t('setup.skip')}</Text>
          </Pressable>
        </View>}
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  body: { paddingHorizontal: 18, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: colors.accent },
  sub: { fontSize: 14, lineHeight: 22, color: colors.textMuted, marginTop: 6 },
  section: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 22, marginBottom: 8, marginHorizontal: 6, letterSpacing: 0.5 },
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.paleGreen, overflow: 'hidden' },
  option: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  border: { borderTopWidth: 1, borderTopColor: colors.paleGreen },
  optionText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  required: { fontSize: 11, color: colors.accent, marginTop: 3, fontWeight: '600' },
  optionSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.accent },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  progressScreen: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 14 },
  bar: { height: 10, borderRadius: 5, backgroundColor: colors.mint, overflow: 'hidden' },
  pct: { textAlign: 'center', fontSize: 36, fontWeight: '700', color: colors.darkGreen },
  total: { marginTop: 18, textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.darkGreen },
  note: { marginTop: 8, textAlign: 'center', fontSize: 12, lineHeight: 18, color: colors.textMuted, marginHorizontal: 12 },
  footer: { paddingHorizontal: 18, paddingTop: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.paleGreen, backgroundColor: colors.paper },
  btn: { alignSelf: 'stretch', backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: colors.onAccent, fontWeight: '700', fontSize: 17 },
  skip: { paddingVertical: 12 },
  skipText: { color: colors.textMuted, fontSize: 14 },
});
