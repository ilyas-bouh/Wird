import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Text from '../components/AppText';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Garden3D from '../components/Garden3D';
import InsectLayer from '../components/InsectLayer';
import GardenStats from '../components/GardenStats';
import PlantShelf from '../components/PlantShelf';
import { MAPLE, plantId, type PlantId } from '../plants/catalog';
import { useI18n } from '../i18n/I18nContext';
import { useOnboarding } from '../context/OnboardingContext';
import { CoachCard, Pointer } from '../components/CoachMark';
import SettingsScreen from './SettingsScreen';
import PlantArt from '../plants/PlantArt';
import AnimatedPlant from '../plants/AnimatedPlant';
import { MAX_STAGE, THUMN_COUNT, useGarden } from '../context/GardenContext';
import { usePortion } from '../context/PortionContext';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';

const PER_ROW = 8;
const HIZB_COUNT = THUMN_COUNT / PER_ROW;
const hizbs = Array.from({ length: HIZB_COUNT }, (_, h) => h);

const HizbRow = memo(function HizbRow({
  hizb,
  stages,
  step,
  selected,
  cell,
  onSelect,
  upcoming,
}: {
  hizb: number;
  /** the next hizb, shown grayed out and not tappable until it is reached */
  upcoming: boolean;
  stages: number[];
  /** thumns per field: 1 in thumn mode (8 fields), 2 in rub' mode (4 fields) */
  step: number;
  selected: number;
  cell: number;
  onSelect: (i: number) => void;
}) {
  const { colors } = useTheme();
  const { t, plantName, rtl } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const groups = Array.from({ length: PER_ROW / step }, (_, j) => stages.slice(j * step, (j + 1) * step));
  const done = groups.filter((g) => g.every((s) => s === MAX_STAGE)).length;
  const id = plantId(hizb);
  const cellH = Math.round(cell * 1.3);
  return (
    <View style={[styles.hizb, upcoming && { opacity: 0.4 }]} pointerEvents={upcoming ? 'none' : 'auto'}>
      <View style={[styles.hizbHead, rtl && { flexDirection: 'row-reverse' }]}>
        <Text style={styles.hizbTitle} numberOfLines={1}>{t('garden.hizbTitle', { n: hizb + 1, name: plantName(id) })}</Text>
        <Text style={styles.hizbCount}>{done}/{groups.length}</Text>
      </View>
      {/* the hizb's own flower as a progression: with thumns, 8 fields (stages 1..8); with rub', 4 fields that show
          stages 2, 4, 6, 8. The last is the full bouquet (swaying once the whole hizb is finished). Unfinished
          fields wait as faint ghosts. */}
      <View style={styles.row}>
        {groups.map((g, k) => {
          const i = hizb * PER_ROW + k * step; // first thumn of this field
          const finished = g.every((s) => s === MAX_STAGE);
          const bloom = k === groups.length - 1 && finished;
          const grow = g.reduce((a, s) => a + s, 0) / (g.length * MAX_STAGE); // 0 unread .. 1 finished
          return (
            <Pressable
              key={i}
              onPress={() => onSelect(i)}
              style={[styles.cell, { width: cell, height: cellH }, selected >= i && selected < i + step && styles.cellSelected]}
            >
              {bloom ? (
                <AnimatedPlant id={id} width={cell + 2} />
              ) : (
                <View style={{ opacity: finished ? 1 : 0.28 + grow * 0.4, filter: `grayscale(${finished ? 0 : 1 - grow * 0.6})` }}>
                  <Svg width={cell - 2} height={cellH - 4} viewBox="-65 -138 130 140">
                    <PlantArt id={id} stage={(k + 1) * step} />
                  </Svg>
                </View>
              )}
              <View style={[styles.dot, finished && styles.dotOn]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

export default function GardenScreen() {
  const { colors, dark, toggle } = useTheme();
  const { t, plantName, rtl } = useI18n();
  const rtlAlign = rtl ? ({ textAlign: 'right' } as const) : undefined;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { ready, treeUnlocked, unlockTree, stageOf, counts, streak, bestStreak, activeDays, growth, placed, plant, uproot } = useGarden();
  const onb = useOnboarding();
  const listRef = useRef<FlatList<number>>(null);
  const [island, setIsland] = useState({ y: 0, h: 0 });
  const islandY = useRef(0);
  const [scrollY, setScrollY] = useState(0);
  const [picked, setPicked] = useState<PlantId | null>(null);
  // tour: the maple is picked up for you so the island tiles light up
  useEffect(() => {
    if (onb.step === 'plant') {
      setPicked(MAPLE);
      // bring the island to the top: the list can't be scrolled while planting
      setTimeout(() => listRef.current?.scrollToOffset({ offset: Math.max(0, islandY.current - 8), animated: true }), 250);
    }
    if (onb.step === 'hizbs') setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 450);
  }, [onb.step]);
  const stepRef = useRef(onb.step);
  stepRef.current = onb.step;
  const nextRef = useRef(onb.next);
  nextRef.current = onb.next;
  const [note, setNote] = useState('');
  const armed = picked !== null;
  const placedIds = useMemo(() => new Set(placed.filter((x): x is PlantId => !!x)), [placed]);
  const { thumnIndex, mode } = usePortion();
  const step = mode === 'rub' ? 2 : 1;
  const [selected, setSelected] = useState(thumnIndex);

  const cell = Math.floor((width - 32 - 8) / (PER_ROW / step));
  const planted = placed.filter(Boolean).length;
  const stats = useMemo(
    () => ({
      blooming: counts[MAX_STAGE],
      totalThumns: THUMN_COUNT,
      growing: counts[1] + counts[2] + counts[3],
      hizbsDone: growth.filter((g) => g === PER_ROW).length,
      hizbTotal: HIZB_COUNT,
      planted,
      slots: placed.length,
      streak,
      bestStreak,
      activeDays,
    }),
    [counts, growth, planted, placed.length, streak, bestStreak, activeDays],
  );

  // one stages array per hizb; only rows whose plants changed get new arrays
  const rows = useMemo(
    () => hizbs.map((h) => Array.from({ length: PER_ROW }, (_, k) => stageOf(h * PER_ROW + k))),
    [stageOf],
  );

  // the hizb being read and the ones already finished, newest first. Once you reach the end of the current hizb
  // (its last portion, or all of it done) the next hizb appears too, grayed out until you get there.
  const currentHizb = Math.floor(thumnIndex / PER_ROW);
  const atEnd = thumnIndex % PER_ROW >= PER_ROW - step || rows[currentHizb].every((s) => s === MAX_STAGE);
  const upcoming = atEnd && currentHizb + 1 < HIZB_COUNT ? currentHizb + 1 : -1;
  const visible = useMemo(
    () => hizbs.filter((h) => h === currentHizb || h === upcoming || rows[h].every((s) => s === MAX_STAGE)).sort((a, b) => b - a),
    [rows, currentHizb, upcoming],
  );

  // read through a ref so onSlot never changes: the island (and every planted flower) then skips re-rendering
  const live = useRef({ placed, picked });
  live.current = { placed, picked };
  const onSlot = useCallback(
    (slot: number) => {
      const { placed: cur, picked: pk } = live.current;
      if (cur[slot]) {
        uproot(slot);
      } else if (pk) {
        plant(slot, pk);
        setPicked(null);
        setNote('');
        if (stepRef.current === 'plant') setTimeout(() => nextRef.current(), 700);
      }
    },
    [plant, uproot],
  );

  const onPick = useCallback(
    (id: PlantId, unlocked: boolean) => {
      if (stepRef.current === 'plant') return; // the tour keeps the maple in hand until it is planted
      if (unlocked) {
        setPicked((p) => (p === id ? null : id));
        setNote('');
      } else {
        const h = Number(id.slice(1));
        setPicked(null);
        setNote(t('garden.locked', { h, name: plantName(id), g: growth[h - 1] }));
      }
    },
    [growth, t, plantName],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <FlatList
        ref={listRef}
        scrollEnabled={onb.step !== 'plant'}
        scrollEventThrottle={16}
        onScroll={(e) => onb.step === 'plant' && setScrollY(e.nativeEvent.contentOffset.y)}
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{t('garden.title')}</Text>
              <View style={styles.topBtns}>
              <Pressable onPress={toggle} style={styles.themeBtn} accessibilityLabel={dark ? t('garden.toLight') : t('garden.toDark')}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  {dark ? (
                    <>
                      <Circle cx={12} cy={12} r={4.2} fill={colors.accent} />
                      <Path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
                    </>
                  ) : (
                    <Path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.7 6.7 0 0 0 10.6 10.6z" fill={colors.accent} />
                  )}
                </Svg>
              </Pressable>
              <Pressable onPress={() => setSettingsOpen(true)} style={styles.themeBtn} accessibilityLabel={t('garden.settings')}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
                  <Circle cx={16} cy={7} r={2.4} stroke={colors.accent} strokeWidth={2} fill="none" />
                  <Circle cx={8} cy={17} r={2.4} stroke={colors.accent} strokeWidth={2} fill="none" />
                </Svg>
              </Pressable>
              </View>
            </View>
            <GardenStats d={stats} />
            <View style={styles.island} onLayout={(e) => { islandY.current = e.nativeEvent.layout.y; setIsland({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height }); }}>
              <Garden3D placed={placed} width={Math.min(width - 32, 440)} armed={armed} onSlot={onSlot} />
            </View>
            <PlantShelf growth={growth} treeUnlocked={treeUnlocked} placedIds={placedIds} picked={picked} onPick={onPick} />
            <Text style={styles.hint}>
              {note || (armed ? t('garden.hintPlant', { name: plantName(picked!) }) : t('garden.hintDefault'))}
            </Text>
            <Text style={[styles.sectionTitle, rtlAlign]}>{t('garden.byHizb')}</Text>
          </View>
        }
        data={visible}
        keyExtractor={(h) => String(h)}
        initialNumToRender={8}
        windowSize={7}
        contentContainerStyle={styles.list}
        renderItem={({ item: h }) => (
          <HizbRow hizb={h} stages={rows[h]} step={step} selected={selected} cell={cell} onSelect={setSelected} upcoming={h === upcoming} />
        )}
      />

      {onb.step === 'plant' && (
        <>
          {island.h > 0 && <Pointer style={{ position: 'absolute', alignSelf: 'center', top: insets.top + 8 + island.y - scrollY + island.h * 0.12 }} />}
        </>
      )}
      {onb.step === 'hizbs' && (
        <CoachCard
          title={t('onb.hizbs.title')}
          text={t('onb.hizbs.text')}
          button={t('onb.gotIt')}
          onPress={onb.next}
        />
      )}
      <InsectLayer />
      <SettingsScreen visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  titleRow: { justifyContent: 'center' },
  topBtns: { position: 'absolute', left: 16, top: 0, flexDirection: 'row', gap: 8 },
  themeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, color: colors.accent, textAlign: 'center', fontWeight: '600' },
  island: { marginHorizontal: 16, marginBottom: 8, alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.darkGreen, marginHorizontal: 20, marginTop: 8, marginBottom: 8 },
  unlock: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, paddingHorizontal: 12 },
  unlockKicker: { fontSize: 13, letterSpacing: 1, color: colors.textMuted, textTransform: 'uppercase' },
  unlockTitle: { fontSize: 28, fontWeight: '700', color: '#B71C1C', marginTop: 4, marginBottom: 8 },
  unlockText: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginHorizontal: 28, marginTop: 8 },
  unlockBtn: { backgroundColor: colors.accent, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 18, marginTop: 24 },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginHorizontal: 24, marginTop: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  hizb: { marginBottom: 10 },
  hizbHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 2 },
  hizbTitle: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.textMuted },
  hizbCount: { flexShrink: 0, marginStart: 8, fontSize: 12, color: colors.textMuted },
  row: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4 },
  cell: { alignItems: 'center', justifyContent: 'flex-end', borderRadius: 10, paddingBottom: 3 },
  cellSelected: { backgroundColor: colors.mint },
  dot: { position: 'absolute', bottom: 1, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.paleGreen },
  dotOn: { backgroundColor: colors.accent },
  btnText: { color: colors.onAccent, fontWeight: '700' },
});
