import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useFocusMode } from '../context/FocusContext';
import { useSwipeX } from './SwipeNav';

const ICONS: Record<string, ImageSourcePropType> = {
  Garden: require('../../assets/icons/garden.png'),
  Reader: require('../../assets/icons/reader.png'),
  Tafsir: require('../../assets/icons/tafsir.png'),
};

const BAR_HEIGHT = 68;
const BLOB_W = 76;
const BLOB_H = 56;
const ICON = 36;

// Organic blob in a 100x80 box.
const BLOB_PATH =
  'M50 2 C72 0 96 12 98 38 C100 64 78 78 50 78 C22 78 0 66 2 40 C4 14 28 4 50 2 Z';

export default function BlobTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { focused } = useFocusMode();
  const swipeX = useSwipeX();
  // The screens slide on swipe; cancel that offset so the tab bar stays put.
  const holdStill = useRef(swipeX ? Animated.multiply(swipeX, -1) : new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const tabW = width / count;

  const pos = useRef(new Animated.Value(state.index)).current; // spring position
  const stretch = useRef(new Animated.Value(0)).current; // 0..1..0 goo stretch
  const trail = useRef(new Animated.Value(state.index)).current; // lagging droplet
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    Animated.parallel([
      Animated.spring(pos, { toValue: state.index, stiffness: 170, damping: 14, mass: 0.9, useNativeDriver: true }),
      Animated.spring(trail, { toValue: state.index, stiffness: 90, damping: 12, mass: 1.1, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(stretch, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(stretch, { toValue: 0, stiffness: 120, damping: 7, mass: 0.8, useNativeDriver: true }),
      ]),
    ]).start();
  }, [state.index, pos, trail, stretch]);

  const range = state.routes.map((_, i) => i);
  const centers = range.map((i) => (i + 0.5) * tabW - BLOB_W / 2);
  const translateX = width ? pos.interpolate({ inputRange: range, outputRange: centers, extrapolate: 'extend' }) : 0;
  const trailX = width
    ? trail.interpolate({ inputRange: range, outputRange: range.map((i) => (i + 0.5) * tabW - 14), extrapolate: 'extend' })
    : 0;
  const scaleX = stretch.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const scaleY = stretch.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] });
  const trailScale = stretch.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });

  // Focus mode: the Reader hides the tab bar until the page is tapped.
  if (focused && state.routes[state.index].name === 'Reader') return null;

  return (
    <Animated.View style={[styles.wrap, { paddingBottom: insets.bottom, transform: [{ translateX: holdStill }] }]}>
      <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[styles.trail, { transform: [{ translateX: trailX }, { scale: trailScale }] }]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.blob, { transform: [{ translateX }, { scaleX }, { scaleY }] }]}
            >
              <Svg width={BLOB_W} height={BLOB_H} viewBox="0 0 100 80" preserveAspectRatio="none">
                <Path d={BLOB_PATH} fill={colors.mint} fillOpacity={0.85} />
              </Svg>
            </Animated.View>
          </>
        )}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={onPress}
              style={styles.tab}
            >
              <Image source={ICONS[route.name]} style={[styles.icon, { opacity: focused ? 1 : 0.65 }]} />
              <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.paleGreen },
  bar: { height: BAR_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  tab: { flex: 1, height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  icon: { width: ICON, height: ICON, borderRadius: 9 },
  label: { fontSize: 11, marginTop: 2, color: colors.textMuted },
  labelActive: { color: colors.accent, fontWeight: '600' },
  blob: { position: 'absolute', left: 0, top: (BAR_HEIGHT - BLOB_H) / 2 - 2, width: BLOB_W, height: BLOB_H },
  trail: {
    position: 'absolute',
    left: 0,
    top: BAR_HEIGHT / 2 - 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.mint,
    opacity: 0.6,
  },
});
