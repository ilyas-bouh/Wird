import { memo, useEffect, useMemo, type ReactNode } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import PlantSvg from './art/Art';
import { fxOf, type Fx } from './art/species';
import { hizbOf, type PlantId } from './catalog';

/**
 * A fully grown plant in the wind. Same artwork as the shelf, but split into a steadier lower half and a crown that
 * swings further, with petals (or leaves, or glimmers) drifting off it. Everything is driven natively, so the wind
 * never touches the JS thread. Draws in a 120 x 130 box: the plant's base is at (60, 122).
 */
const VB_W = 120;
const VB_H = 130;
const BASE_Y = 122;
const NATIVE = { useNativeDriver: true } as const;

const rnd = (seed: number) => {
  const x = Math.sin(seed * 78.233 + 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** 0 -> 1 -> 0 forever, eased like a breeze, starting part-way through so plants are out of step. */
function useLoop(ms: number, phase = 0) {
  const v = useMemo(() => new Animated.Value(phase), [phase]);
  useEffect(() => {
    const leg = (to: number, d: number) => Animated.timing(v, { toValue: to, duration: d, easing: Easing.inOut(Easing.sin), ...NATIVE });
    const anim = Animated.sequence([leg(1, (1 - phase) * ms), Animated.loop(Animated.sequence([leg(0, ms), leg(1, ms)]))]);
    anim.start();
    return () => anim.stop();
  }, [v, ms, phase]);
  return v;
}

/** One band of the plant, clipped so the two halves can sway independently. */
const Half = memo(function Half({ index, w, h, from, to, id }: { index: number; w: number; h: number; from: number; to: number; id: string }) {
  return (
    <Svg width={w} height={h} viewBox={`-60 -${BASE_Y} ${VB_W} ${VB_H}`}>
      <Defs>
        <ClipPath id={id}>
          <Rect x={-60} y={from} width={VB_W} height={to - from} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <PlantSvg index={index} stage={8} />
      </G>
    </Svg>
  );
});

function Sway({ children, w, h, ms, deg, dx, phase }: { children: ReactNode; w: number; h: number; ms: number; deg: number; dx: number; phase: number }) {
  const gust = useLoop(ms * 2.1, phase);
  const flutter = useLoop(ms * 0.6, (phase * 3) % 1);
  const sum = useMemo(() => Animated.add(gust, flutter), [gust, flutter]);
  const rotate = sum.interpolate({ inputRange: [0, 2], outputRange: [`${-deg * 0.55}deg`, `${deg * 1.45}deg`] });
  const translateX = sum.interpolate({ inputRange: [0, 2], outputRange: [-dx * 0.55, dx * 1.45] });
  return (
    <Animated.View
      style={{
        position: 'absolute', left: 0, top: 0, width: w, height: h,
        transform: [{ translateX }, { rotate }],
        transformOrigin: `50% ${(BASE_Y / VB_H) * 100}%`,
      }}
    >
      {children}
    </Animated.View>
  );
}

const PetalSvg = memo(function PetalSvg({ fx, size }: { fx: Fx; size: number }) {
  if (fx.kind === 'leaf') {
    return (
      <Svg width={size} height={size * 1.2} viewBox="-6 -7 12 14">
        <Path d="M0 -6 C5 -3 5 3 0 7 C-5 3 -5 -3 0 -6Z" fill={fx.c} />
        <Path d="M0 -5 L0 6" stroke="#00000033" strokeWidth={0.8} />
      </Svg>
    );
  }
  if (fx.kind === 'spark') {
    return (
      <Svg width={size} height={size} viewBox="-6 -6 12 12">
        <Path d="M0 -6 C0.8 -1.5 1.5 -0.8 6 0 C1.5 0.8 0.8 1.5 0 6 C-0.8 1.5 -1.5 0.8 -6 0 C-1.5 -0.8 -0.8 -1.5 0 -6Z" fill={fx.c} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size * 1.25} viewBox="-5 -7 10 14">
      <Path d="M0 -7 C5 -5 6 2 0 7 C-6 2 -5 -5 0 -7Z" fill={fx.c} />
      <Path d="M0 -6 C2 -3 2 2 0 6" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={0.8} fill="none" />
    </Svg>
  );
});

/** A petal that leaves the crown, tumbles on the breeze and fades before it lands (sparks rise and fade instead). */
function Petal({ fx, i, s, seed }: { fx: Fx; i: number; s: number; seed: number }) {
  const r = (n: number) => rnd(seed * 17 + i * 7.3 + n);
  const rise = fx.kind === 'spark';
  const dur = (rise ? 4200 : 5200) + r(1) * 3200;
  const phase = r(2);
  const v = useMemo(() => new Animated.Value(phase), [phase]);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([Animated.timing(v, { toValue: 0, duration: 0, ...NATIVE }), Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.linear, ...NATIVE })]),
    );
    const anim = Animated.sequence([Animated.timing(v, { toValue: 1, duration: (1 - phase) * dur, easing: Easing.linear, ...NATIVE }), loop]);
    anim.start();
    return () => anim.stop();
  }, [v, dur, phase]);

  const x0 = (60 + (r(3) - 0.5) * 56) * s;
  const y0 = (rise ? BASE_Y - 20 - r(4) * 30 : 30 + r(4) * 40) * s;
  const y1 = (rise ? 14 + r(5) * 20 : BASE_Y - 3) * s;
  const wob = (4 + r(6) * 6) * s;
  const drift = (30 + r(7) * 26) * s;
  const spin = (r(8) > 0.5 ? 1 : -1) * (240 + r(9) * 480);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [y0, y1] });
  const translateX = v.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [x0, x0 + wob + drift * 0.2, x0 - wob * 0.4 + drift * 0.45, x0 + wob + drift * 0.65, x0 - wob * 0.3 + drift * 0.85, x0 + drift],
  });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spin}deg`] });
  const opacity = v.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.95, 0.9, 0] });
  const scale = rise ? v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1.1, 0.5] }) : 1;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity, transform: [{ translateX }, { translateY }, { rotate }, { scale }] }}>
      <PetalSvg fx={fx} size={(rise ? 7 : 8 + r(10) * 4) * s} />
    </Animated.View>
  );
}

const PETALS = 6;

/** `width` is the drawn width in px of the plant's 120-unit box. */
function AnimatedPlant({ id, width }: { id: PlantId; width: number }) {
  const index = hizbOf(id);
  const s = width / VB_W;
  const h = VB_H * s;
  const fx = useMemo(() => fxOf(index), [index]);
  const seed = index + 1;
  const phase = rnd(seed * 3.7);
  const ms = 1500 + rnd(seed) * 500;
  return (
    <View style={{ width, height: h }} pointerEvents="none">
      <Sway w={width} h={h} ms={ms} deg={0.7} dx={0.35 * s} phase={phase}>
        <Half index={index} w={width} h={h} from={-40} to={10} id={`lo${seed}`} />
      </Sway>
      <Sway w={width} h={h} ms={ms} deg={2.6} dx={1.1 * s} phase={phase}>
        <Half index={index} w={width} h={h} from={-130} to={-34} id={`hi${seed}`} />
      </Sway>
      {Array.from({ length: PETALS }, (_, i) => (
        <Petal key={i} fx={fx} i={i} s={s} seed={seed} />
      ))}
    </View>
  );
}
export default memo(AnimatedPlant);
