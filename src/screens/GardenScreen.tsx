import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';
import Garden3D from '../components/Garden3D';
import SpeciesArt from '../components/SpeciesArt';
import { RedTreeScene } from '../components/RedTree';
import { SPECIES, type SpeciesId } from '../lib/species';
import Plant from '../components/Plant';
import { MAX_STAGE, THUMN_COUNT, useGarden } from '../context/GardenContext';
import { usePortion } from '../context/PortionContext';
import { navigationRef } from '../lib/swipeNav';
import { portionAt, surahName } from '../lib/ranges';
import { colors } from '../theme/colors';

const PER_ROW = 8;
const HIZB_COUNT = THUMN_COUNT / PER_ROW;
const STAGE_LABEL = ['Empty soil', 'Seed', 'Sprout', 'Growing', 'In bloom'];
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { ready, treeUnlocked, unlockTree, stageOf, water, counts, streak, inventory, placed, plant, uproot } = useGarden();
  const [picked, setPicked] = useState<SpeciesId | null>(null);
  const armed = picked !== null && inventory[picked] > 0;
  const { thumnIndex, setThumnIndex, setMode } = usePortion();
  const [selected, setSelected] = useState(thumnIndex);

  const cell = Math.floor((width - 32 - 8) / PER_ROW);
  const stage = stageOf(selected);
  const p = portionAt('thumn', selected);
  const from = surahName(p.start.surah);
  const to = surahName(p.end.surah);
  const planted = THUMN_COUNT - counts[0];

  // one stages array per hizb; only rows whose plants changed get new arrays
  const rows = useMemo(
    () => hizbs.map((h) => Array.from({ length: PER_ROW }, (_, k) => stageOf(h * PER_ROW + k))),
    [stageOf],
  );

  const onSlot = useCallback(
    (slot: number) => {
      if (placed[slot]) uproot(slot);
      else if (picked && inventory[picked] > 0) plant(slot, picked);
    },
    [placed, picked, inventory, plant, uproot],
  );

  const read = useCallback(() => {
    setMode('thumn');
    setThumnIndex(selected);
    navigationRef.isReady() && navigationRef.navigate('Reader');
  }, [selected, setMode, setThumnIndex]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <FlatList
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>الحديقة</Text>
            <View style={styles.stats}>
              <Stat value={counts[MAX_STAGE]} label="Blooming" />
              <Stat value={planted} label="Planted" />
              <Stat value={streak} label="Day streak" />
              <Stat value={`${Math.round((counts[MAX_STAGE] / THUMN_COUNT) * 100)}%`} label="Of Quran" />
            </View>
            <View style={styles.island}>
              <Garden3D placed={placed} width={Math.min(width - 32, 440)} armed={armed} onSlot={onSlot} />
            </View>
            <View style={styles.tray}>
              {SPECIES.map((sp) => {
                const n = inventory[sp.id];
                const on = picked === sp.id && n > 0;
                return (
                  <Pressable
                    key={sp.id}
                    disabled={n === 0}
                    onPress={() => setPicked(on ? null : sp.id)}
                    style={[styles.chip, on && styles.chipOn, n === 0 && styles.chipEmpty]}
                  >
                    <Svg width={44} height={52} viewBox="-50 -118 100 126">
                      <SpeciesArt species={sp.id} />
                    </Svg>
                    <Text style={styles.chipName}>{sp.name}</Text>
                    <Text style={styles.chipCount}>x{n}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {armed ? 'Tap an empty tile to plant it. Tap a planted flower to pick it up.' : 'Finish a thumn below to earn a plant, then choose it here.'}
            </Text>
            <Text style={styles.sectionTitle}>Hizb by hizb</Text>
          </View>
        }
        data={hizbs}
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

      <View style={[styles.sheet, { paddingBottom: 14 }]}>
        <Plant stage={stage} size={52} />
        <View style={styles.sheetText}>
          <Text style={styles.sheetTitle}>Thumn {p.n} · Hizb {Math.floor(selected / PER_ROW) + 1}</Text>
          <Text style={styles.sheetSub} numberOfLines={1}>
            {from.en} {p.start.ayah} → {p.start.surah === p.end.surah ? '' : `${to.en} `}{p.end.ayah}
          </Text>
          <Text style={styles.sheetStage}>{STAGE_LABEL[stage]}</Text>
        </View>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={read}>
          <Text style={styles.btnGhostText}>Read</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => water(selected)}>
          <Text style={styles.btnText}>{stage === MAX_STAGE ? 'Reset' : stage === 3 ? 'Finish' : 'Water'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  title: { fontSize: 28, color: colors.accent, textAlign: 'center', fontWeight: '600' },
  stats: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, backgroundColor: colors.paleGreen, borderRadius: 16, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.darkGreen },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  island: { marginHorizontal: 16, marginBottom: 8, alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.darkGreen, marginHorizontal: 20, marginTop: 8, marginBottom: 8 },
  unlock: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, paddingHorizontal: 12 },
  unlockKicker: { fontSize: 13, letterSpacing: 1, color: colors.textMuted, textTransform: 'uppercase' },
  unlockTitle: { fontSize: 28, fontWeight: '700', color: '#B71C1C', marginTop: 4, marginBottom: 8 },
  unlockText: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginHorizontal: 28, marginTop: 8 },
  unlockBtn: { backgroundColor: colors.accent, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 18, marginTop: 24 },
  tray: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 4 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: colors.paleGreen },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.paleGreen },
  chipEmpty: { opacity: 0.45 },
  chipName: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  chipCount: { fontSize: 14, fontWeight: '700', color: colors.darkGreen },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginHorizontal: 24, marginTop: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  hizb: { marginBottom: 10 },
  hizbHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 2 },
  hizbTitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  hizbCount: { fontSize: 12, color: colors.textMuted },
  row: { flexDirection: 'row', backgroundColor: '#F1F8EC', borderRadius: 12, padding: 4 },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  cellSelected: { backgroundColor: colors.mint },
  sheet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetText: { flex: 1 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sheetSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  sheetStage: { fontSize: 12, color: colors.accent, marginTop: 2, fontWeight: '600' },
  btn: { backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '700' },
  btnGhost: { backgroundColor: colors.paleGreen },
  btnGhostText: { color: colors.accent, fontWeight: '700' },
});
