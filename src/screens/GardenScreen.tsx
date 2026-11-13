import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Garden3D from '../components/Garden3D';
import GardenStats from '../components/GardenStats';
import PlantShelf from '../components/PlantShelf';
import { RedTreeScene } from '../components/RedTree';
import { plantName, type PlantId } from '../plants/catalog';
import Plant from '../components/Plant';
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
  selected,
  cell,
  onSelect,
}: {
  hizb: number;
  stages: number[];
  selected: number;
  cell: number;
  onSelect: (i: number) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const done = stages.filter((s) => s === MAX_STAGE).length;
  return (
    <View style={styles.hizb}>
      <View style={styles.hizbHead}>
        <Text style={styles.hizbTitle}>Hizb {hizb + 1}</Text>
        <Text style={styles.hizbCount}>{done}/{PER_ROW}</Text>
      </View>
      <View style={styles.row}>
        {stages.map((stage, k) => {
          const i = hizb * PER_ROW + k;
          return (
            <Pressable
              key={i}
              onPress={() => onSelect(i)}
              style={[styles.cell, { width: cell, height: cell }, i === selected && styles.cellSelected]}
            >
              <Plant stage={stage} size={cell - 6} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

export default function GardenScreen() {
  const { colors, dark, toggle } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { ready, treeUnlocked, unlockTree, stageOf, counts, streak, bestStreak, activeDays, growth, placed, plant, uproot } = useGarden();
  const [picked, setPicked] = useState<PlantId | null>(null);
  const [note, setNote] = useState('');
  const armed = picked !== null;
  const placedIds = useMemo(() => new Set(placed.filter((x): x is PlantId => !!x)), [placed]);
  const { thumnIndex } = usePortion();
  const [selected, setSelected] = useState(thumnIndex);

  const cell = Math.floor((width - 32 - 8) / PER_ROW);
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

  // only the hizb being read and the ones already finished, newest first
  const currentHizb = Math.floor(thumnIndex / PER_ROW);
  const visible = useMemo(
    () => hizbs.filter((h) => h === currentHizb || rows[h].every((s) => s === MAX_STAGE)).sort((a, b) => b - a),
    [rows, currentHizb],
  );

  const onSlot = useCallback(
    (slot: number) => {
      if (placed[slot]) {
        uproot(slot);
      } else if (picked) {
        plant(slot, picked);
        setPicked(null);
        setNote('');
      }
    },
    [placed, picked, plant, uproot],
  );

  const onPick = useCallback(
    (id: PlantId, unlocked: boolean) => {
      if (unlocked) {
        setPicked((p) => (p === id ? null : id));
        setNote('');
      } else {
        const h = Number(id.slice(1));
        setPicked(null);
        setNote(`Finish Hizb ${h} to unlock the ${plantName(id)} (${growth[h - 1]}/8 thumns).`);
      }
    },
    [growth],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <FlatList
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>الحديقة</Text>
              <Pressable onPress={toggle} style={styles.themeBtn} accessibilityLabel={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
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
            </View>
            <GardenStats d={stats} />
            <View style={styles.island}>
              <Garden3D placed={placed} width={Math.min(width - 32, 440)} armed={armed} onSlot={onSlot} />
            </View>
            <PlantShelf growth={growth} treeUnlocked={treeUnlocked} placedIds={placedIds} picked={picked} onPick={onPick} />
            <Text style={styles.hint}>
              {note ||
                (armed
                  ? `Tap an empty tile to plant the ${plantName(picked!)}. Tap a planted flower to pick it up.`
                  : 'Finish all 8 thumns of a hizb to unlock its flower.')}
            </Text>
            <Text style={styles.sectionTitle}>Hizb by hizb</Text>
          </View>
        }
        data={visible}
        keyExtractor={(h) => String(h)}
        initialNumToRender={8}
        windowSize={7}
        contentContainerStyle={styles.list}
        renderItem={({ item: h }) => (
          <HizbRow hizb={h} stages={rows[h]} selected={selected} cell={cell} onSelect={setSelected} />
        )}
      />

      <Modal visible={ready && !treeUnlocked} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.unlock}>
          <Text style={styles.unlockKicker}>A gift for your garden</Text>
          <Text style={styles.unlockTitle}>Red maple unlocked</Text>
          <RedTreeScene width={Math.min(width - 24, 460)} />
          <Text style={styles.unlockText}>Every thumn you finish grows your garden. Start with this tree.</Text>
          <Pressable style={styles.unlockBtn} onPress={unlockTree}>
            <Text style={styles.btnText}>Plant it in my garden</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  titleRow: { justifyContent: 'center' },
  themeBtn: { position: 'absolute', right: 16, top: 0, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
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
  hizbTitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  hizbCount: { fontSize: 12, color: colors.textMuted },
  row: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4 },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  cellSelected: { backgroundColor: colors.mint },
  btnText: { color: colors.onAccent, fontWeight: '700' },
});
