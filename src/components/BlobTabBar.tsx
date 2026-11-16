import { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import { useFocusMode } from '../context/FocusContext';
import { useReportBarHeight, useSwipeX } from './SwipeNav';
import { fonts } from '../theme/fonts';
import { useOnboarding } from '../context/OnboardingContext';
import { useI18n } from '../i18n/I18nContext';

const ICONS: Record<string, ImageSourcePropType> = {
  Garden: require('../../assets/icons/garden.png'),
  Reader: require('../../assets/icons/reader.png'),
  Tafsir: require('../../assets/icons/tafsir.png'),
};

const BAR_HEIGHT = 80;
const BLOB_W = 92;
const BLOB_H = 68;
const ICON = 34;

// Organic blob in a 100x80 box.
const BLOB_PATH =
  'M50 2 C72 0 96 12 98 38 C100 64 78 78 50 78 C22 78 0 66 2 40 C4 14 28 4 50 2 Z';

export default function BlobTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { focused } = useFocusMode();
  const swipeX = useSwipeX();
  const reportH = useReportBarHeight();
  const { t, lang } = useI18n();
  const onb = useOnboarding();
  const hidden = onb.active || (focused && state.routes[state.index].name === 'Reader');
  // focus mode hides the bar, so the fade veil should then cover the whole screen
  useEffect(() => {
    if (hidden) reportH(0);
  }, [hidden, reportH]);
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
  if (hidden) return null;

  return (
    <Animated.View
      onLayout={(e) => reportH(e.nativeEvent.layout.height)}
      style={[styles.wrap, { paddingBottom: insets.bottom, transform: [{ translateX: holdStill }] }]}
    >
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
                <Path d={BLOB_PATH} fill={colors.mint} fillOpacity={0.55} />
              </Svg>
            </Animated.View>
          </>
        )}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = t(`tab.${route.name}` as 'tab.Garden');
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
              <Image source={ICONS[route.name]} style={[styles.icon, { opacity: focused ? 1 : 0.6, transform: [{ scale: focused ? 1.06 : 0.94 }] }]} />
              <Text style={[styles.label, focused && styles.labelActive, lang === 'ar' && { fontFamily: focused ? fonts.arBold : fonts.ar, fontSize: 13, letterSpacing: 0 }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.mint,
    paddingTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 18,
  },
  bar: { height: BAR_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  tab: { flex: 1, height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  icon: { width: ICON, height: ICON, borderRadius: 9 },
  label: { fontSize: 11, marginTop: 4, letterSpacing: 0.4, fontFamily: fonts.ui, color: colors.textMuted },
  labelActive: { color: colors.accent, fontFamily: fonts.uiBold },
  blob: { position: 'absolute', left: 0, top: (BAR_HEIGHT - BLOB_H) / 2, width: BLOB_W, height: BLOB_H },
  trail: {
    position: 'absolute',
    left: 0,
    top: BAR_HEIGHT / 2 - 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.mint,
    opacity: 0.5,
  },
});
