import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StatusBar as RNStatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { usePortion } from '../context/PortionContext';
import { ayahsInPortion, portionAt, surahName, type AyahPos } from '../lib/ranges';
import { ayahChipAr, pagesAr, portionRangeAr, portionTitleAr } from '../lib/arabic';
import { EDITIONS, getTafsirBatch, hafsKeysFor, type TafsirLang } from '../lib/tafsir';

type Section = { surah: number; warsh: AyahPos[]; hafs: string[] };

const label = (a: AyahPos) => `${a.surah}:${a.ayah}`;

/**
 * The tafsir source divides verses the Hafs way, the app shows Warsh ayahs. Consecutive Warsh ayahs that
 * are linked through a shared Hafs ayah are grouped into one card (e.g. Warsh 1:6 + 1:7 share Hafs 1:7),
 * and a Warsh ayah spanning two Hafs ayahs keeps both texts under its own number. Only Warsh numbers are shown.
 */
function buildSections(ayahs: AyahPos[]): Section[] {
  const out: Section[] = [];
  for (const a of ayahs) {
    const keys = hafsKeysFor(label(a));
    const last = out[out.length - 1];
    if (last && keys.length && last.surah === a.surah && keys.some((k) => last.hafs.includes(k))) {
      last.warsh.push(a);
      for (const k of keys) if (!last.hafs.includes(k)) last.hafs.push(k);
    } else {
      out.push({ surah: a.surah, warsh: [a], hafs: [...keys] });
    }
  }
  return out;
}

/** Full tafsir (Al-Muyassar / Al-Mukhtasar) of the whole thomon or rub' the Reader is on. */
export default function TafsirScreen() {
  const insets = useSafeAreaInsets();
  const { thumnIndex, mode } = usePortion(); // follows the Reader and the portion setting
  const [lang, setLang] = useState<TafsirLang>('ar');
  const [texts, setTexts] = useState<Record<string, string> | null>(null);

  const portion = useMemo(() => portionAt(mode, thumnIndex), [mode, thumnIndex]);
  const sections = useMemo(() => buildSections(ayahsInPortion(portion)), [portion]);
  const hafsKeys = useMemo(() => [...new Set(sections.flatMap((s) => s.hafs))], [sections]);

  useEffect(() => {
    let cancelled = false;
    setTexts(null);
    getTafsirBatch(lang, hafsKeys)
      .then((t) => !cancelled && setTexts(t))
      .catch(() => !cancelled && setTexts({}));
    return () => {
      cancelled = true;
    };
  }, [lang, hafsKeys]);

  const topPad = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0) + 12;
  const rtl = lang === 'ar';
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: 32 }]}>
      <View style={styles.hero}>
        <Text style={styles.title}>{portionTitleAr(portion)}</Text>
        <Text style={styles.range}>{portionRangeAr(portion)}</Text>
        <Text style={styles.meta}>{pagesAr(portion)}</Text>
        <View style={styles.row}>
          <Segmented
            value={lang}
            onChange={(v) => setLang(v as TafsirLang)}
            options={[
              { id: 'ar', text: 'عربي' },
              { id: 'en', text: 'EN' },
            ]}
          />
        </View>
      </View>

      {!texts && <ActivityIndicator color={colors.accent} style={{ marginTop: 28 }} />}

      {texts &&
        sections.map((sec, i) => {
          const newSurah = i === 0 || sections[i - 1].surah !== sec.surah;
          const text = sec.hafs
            .map((k) => texts[k])
            .filter(Boolean)
            .join('\n\n');
          return (
            <View key={label(sec.warsh[0])}>
              {newSurah && (
                <Text style={styles.surah}>سورة {surahName(sec.surah).ar}</Text>
              )}
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.chip}>{ayahChipAr(sec.warsh)}</Text>
                </View>
                {text ? (
                  <Text style={[styles.text, rtl && styles.rtl]}>{text}</Text>
                ) : (
                  <Text style={styles.missing}>
                    {sec.hafs.length
                      ? 'لا يوجد تفسير لهذه الآية.'
                      : 'التفسير غير متوفر بعد لهذه الآية (يغطي الربط حتى سورة البقرة، الآية ١١٠).'}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      {texts && (
        <Text style={styles.note}>
          {lang === 'ar'
            ? `${EDITIONS.ar.label}. عند اختلاف عدّ الآيات بين ورش وحفص يُجمع التفسير تحت آيات ورش التي يغطيها.`
            : `${EDITIONS.en.label}. Where Warsh and Hafs divide the verses differently, the tafsir is grouped under the Warsh ayahs it covers.`}
        </Text>
      )}
    </ScrollView>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; text: string }[];
}) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable key={o.id} onPress={() => onChange(o.id)} style={[styles.segItem, value === o.id && styles.segActive]}>
          <Text style={[styles.segText, value === o.id && styles.segTextActive]}>{o.text}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 16 },
  hero: { backgroundColor: colors.paleGreen, borderRadius: 20, padding: 18, marginBottom: 8 },
  title: { fontSize: 30, fontFamily: fonts.arBold, color: colors.darkGreen, textAlign: 'right', writingDirection: 'rtl' },
  range: { marginTop: 6, fontSize: 18, fontFamily: fonts.ar, color: colors.text, textAlign: 'right', writingDirection: 'rtl', lineHeight: 32 },
  meta: { marginTop: 2, fontSize: 15, fontFamily: fonts.ar, color: colors.textMuted, textAlign: 'right', writingDirection: 'rtl' },
  row: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, gap: 10 },
  seg: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 3 },
  segItem: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 11 },
  segActive: { backgroundColor: colors.accent },
  segText: { color: colors.textMuted, fontSize: 14 },
  segTextActive: { color: '#fff', fontWeight: '600' },
  surah: { marginTop: 18, marginBottom: 6, fontSize: 19, fontFamily: fonts.arSemi, color: colors.accent, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1, borderColor: colors.paleGreen },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  chip: { backgroundColor: colors.mint, color: colors.darkGreen, fontFamily: fonts.arSemi, fontSize: 14, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  text: { color: colors.text, fontSize: 16, lineHeight: 26 },
  rtl: { writingDirection: 'rtl', textAlign: 'right', fontFamily: fonts.ar, fontSize: 20, lineHeight: 38 },
  missing: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.ar },
  note: { color: colors.textMuted, fontSize: 11, marginTop: 20, textAlign: 'center' },
});
