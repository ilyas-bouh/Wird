import { memo, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import PlantArt from '../plants/PlantArt';
import { FULL_GROWTH, HIZB_COUNT, MAPLE, THUMNS_PER_HIZB, plantId, plantName, type PlantId } from '../plants/catalog';
import RedTreeArt from './RedTree';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';

type Props = {
  /** finished thumns (0..8) per hizb */
  growth: number[];
  treeUnlocked: boolean;
  placedIds: Set<PlantId>;
  picked: PlantId | null;
  onPick: (id: PlantId, unlocked: boolean) => void;
};

const IDS: PlantId[] = [MAPLE, ...Array.from({ length: HIZB_COUNT }, (_, h) => plantId(h))];

function Lock() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="#5E7463" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <Rect x={4.5} y={11} width={15} height={11} rx={3} fill="#5E7463" />
      <Circle cx={12} cy={16.5} r={1.8} fill="#E8F5E9" />
    </Svg>
  );
}

const Card = memo(function Card({
  id,
  grown,
  unlocked,
  placed,
  picked,
  onPick,
}: {
  id: PlantId;
  grown: number;
  unlocked: boolean;
  placed: boolean;
  picked: boolean;
  onPick: (id: PlantId, unlocked: boolean) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable onPress={() => onPick(id, unlocked)} style={[styles.card, picked && styles.cardOn, !unlocked && styles.cardLocked]}>
      <View style={!unlocked && styles.dim}>
        <Svg width={54} height={58} viewBox="-65 -138 130 140">
          {id === MAPLE ? (
            <G transform="scale(0.4) translate(-150 -288)">
              <RedTreeArt t={0} />
            </G>
          ) : <PlantArt id={id} stage={FULL_GROWTH} />}
        </Svg>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {plantName(id)}
      </Text>
      {!unlocked && <Text style={styles.progress}>{grown}/{THUMNS_PER_HIZB}</Text>}
      {!unlocked && (
        <View style={styles.lock}>
          <Lock />
        </View>
      )}
      {placed && <View style={styles.planted} />}
    </Pressable>
  );
});

/** Horizontal list of every plant. The maple comes first; flowers unlock one hizb at a time. */
export default function PlantShelf({ growth, treeUnlocked, placedIds, picked, onPick }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={IDS}
      keyExtractor={(id) => id}
      initialNumToRender={7}
      windowSize={5}
      contentContainerStyle={styles.list}
      renderItem={({ item: id }) => {
        const unlocked = id === MAPLE ? treeUnlocked : growth[Number(id.slice(1)) - 1] === THUMNS_PER_HIZB;
        const grown = id === MAPLE ? 0 : growth[Number(id.slice(1)) - 1];
        return <Card id={id} grown={grown} unlocked={unlocked} placed={placedIds.has(id)} picked={picked === id} onPick={onPick} />;
      }}
    />
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  list: { paddingHorizontal: 16, gap: 8 },
  card: { width: 78, alignItems: 'center', paddingVertical: 8, borderRadius: 16, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.paleGreen },
  cardOn: { borderColor: colors.accent, backgroundColor: colors.paleGreen },
  cardLocked: { backgroundColor: colors.dark ? '#131C28' : '#F4F7F2' },
  dim: { opacity: 0.8, filter: 'grayscale(0.8)' },
  name: { fontSize: 11, color: colors.textMuted, marginTop: 2, maxWidth: 70 },
  progress: { fontSize: 11, fontWeight: '700', color: colors.darkGreen },
  lock: { position: 'absolute', top: 6, right: 6 },
  planted: { position: 'absolute', top: 6, left: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
});
