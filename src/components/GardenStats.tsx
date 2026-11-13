import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';

export type StatsData = {
  blooming: number;
  totalThumns: number;
  growing: number;
  hizbsDone: number;
  hizbTotal: number;
  planted: number;
  slots: number;
  streak: number;
  bestStreak: number;
  activeDays: number;
};

type IconName = 'flame' | 'flower' | 'sprout' | 'book' | 'island' | 'trophy' | 'calendar';

function Icon({ name, color, size = 18 }: { name: IconName; color: string; size?: number }) {
  const stroke = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'flame' && <Path d="M12 2.5c.6 4 5.5 6 5.5 11.2a5.5 5.5 0 0 1-11 0c0-2.2 1.1-3.6 2.3-4.8.1 1.8.9 2.8 1.9 3.2C10.3 8.6 10.4 5.6 12 2.5z" fill={color} />}
      {name === 'flower' && (
        <G>
          {[0, 72, 144, 216, 288].map((a) => (
            <Circle key={a} cx={12 + Math.sin((a * Math.PI) / 180) * 5.2} cy={12 - Math.cos((a * Math.PI) / 180) * 5.2} r={3.6} fill={color} />
          ))}
          <Circle cx={12} cy={12} r={2.6} fill="#FFF7D6" />
        </G>
      )}
      {name === 'sprout' && <Path d="M12 21v-9M12 13c0-4.2-3-6.5-7.5-6.5 0 4.2 3 6.5 7.5 6.5zM12 15c0-3.2 2.2-5.2 6.5-5.2 0 3.2-2.2 5.2-6.5 5.2z" {...stroke} />}
      {name === 'book' && <Path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13" {...stroke} />}
      {name === 'island' && <Path d="M12 4l9 5-9 5-9-5 9-5zM3 13.5l9 5 9-5" {...stroke} />}
      {name === 'trophy' && <Path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4zM7.5 6H4.5v1.5A3 3 0 0 0 7.5 10.5M16.5 6h3v1.5a3 3 0 0 1-3 3M12 13.5V17M8.5 20h7M10 17h4" {...stroke} />}
      {name === 'calendar' && (
        <G>
          <Rect x={4} y={5.5} width={16} height={14.5} rx={3} {...stroke} />
          <Path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" {...stroke} />
        </G>
      )}
    </Svg>
  );
}

/** circular progress with the percentage in the middle */
function Ring({ pct, size = 92 }: { pct: number; size?: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#8BD97A" />
            <Stop offset="1" stopColor="#2E9E5B" />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.dark ? '#FFFFFF' : '#FFFFFF'} strokeOpacity={colors.dark ? 0.1 : 0.55} strokeWidth={9} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0.001, c * Math.min(1, pct))} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.ringText}>
          <Text style={styles.ringValue}>{pct >= 0.1 || pct === 0 ? Math.round(pct * 100) : (pct * 100).toFixed(1)}%</Text>
          <Text style={styles.ringLabel}>of Quran</Text>
        </View>
      </View>
    </View>
  );
}

const TILES: { key: keyof StatsData | 'hizbs' | 'garden'; label: string; icon: IconName; tint: string; bg: string }[] = [
  { key: 'hizbs', label: 'Hizbs finished', icon: 'book', tint: '#2E7D32', bg: '#DDF1D8' },
  { key: 'growing', label: 'Growing now', icon: 'sprout', tint: '#6A8F1E', bg: '#EAF3CB' },
  { key: 'garden', label: 'In the garden', icon: 'island', tint: '#1F7A8C', bg: '#D6EEF2' },
  { key: 'bestStreak', label: 'Best streak', icon: 'trophy', tint: '#B8860B', bg: '#FBEFC8' },
  { key: 'activeDays', label: 'Active days', icon: 'calendar', tint: '#7B4FB8', bg: '#E9DFF6' },
  { key: 'blooming', label: 'Thumns in bloom', icon: 'flower', tint: '#D2457A', bg: '#FBDCE8' },
];

function GardenStats({ d }: { d: StatsData }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pct = d.blooming / d.totalThumns;
  const value = (k: (typeof TILES)[number]['key']) =>
    k === 'hizbs' ? `${d.hizbsDone}/${d.hizbTotal}` : k === 'garden' ? `${d.planted}/${d.slots}` : String(d[k as keyof StatsData]);
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Ring pct={pct} />
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Your progress</Text>
          <Text style={styles.heroSub}>
            {d.blooming} of {d.totalThumns} thumns in bloom
          </Text>
          <View style={styles.streak}>
            <Icon name="flame" color="#F57C00" size={20} />
            <Text style={styles.streakValue}>{d.streak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>
      </View>
      <View style={styles.grid}>
        {TILES.map((t) => (
          <View key={t.label} style={styles.tile}>
            <View style={[styles.iconBubble, { backgroundColor: colors.dark ? `${t.tint}33` : t.bg }]}>
              <Icon name={t.icon} color={t.tint} />
            </View>
            <Text style={styles.tileValue}>{value(t.key)}</Text>
            <Text style={styles.tileLabel} numberOfLines={1}>
              {t.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
export default memo(GardenStats);

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { marginHorizontal: 16, marginVertical: 12 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.paleGreen,
    shadowColor: colors.dark ? '#000' : '#1B5E20',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: '700', color: colors.darkGreen },
  heroSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.dark ? '#3A2A18' : '#FFF3E0',
  },
  streakValue: { fontSize: 18, fontWeight: '800', color: colors.dark ? '#FFB74D' : '#E65100' },
  streakLabel: { fontSize: 12, color: colors.dark ? '#E0A860' : '#A1560F', fontWeight: '600' },
  ringText: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontSize: 22, fontWeight: '800', color: colors.darkGreen },
  ringLabel: { fontSize: 10, color: colors.textMuted, marginTop: -1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.paleGreen,
    shadowColor: '#1B5E20',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  iconBubble: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tileValue: { fontSize: 20, fontWeight: '800', color: colors.darkGreen, marginTop: 8 },
  tileLabel: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
