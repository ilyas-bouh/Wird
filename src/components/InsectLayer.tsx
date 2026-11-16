import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

const SIZE = 34;
const BW = 124;
const BH = 54;
const STEPS = 48;
const CONFETTI = ['#FF2E93', '#FF8CC6', '#F2D58E', '#B05CE0', '#4FD1C5', '#FFD54A', '#FFFFFF'];

/** Smashed insects say these, always in this order. */
const PHRASES = [
  { ar: 'سبحان الله', en: 'SubhanAllah' },
  { ar: 'الحمد لله', en: 'Alhamdulillah' },
  { ar: 'الله أكبر', en: 'Allahu Akbar' },
];

const PALETTES: [string, string][] = [
  ['#FF2E93', '#FF8CC6'],
  ['#B05CE0', '#E3B8FF'],
  ['#FFB347', '#FFD98A'],
  ['#4FD1C5', '#A8F0E8'],
];

type Kind = 'butterfly' | 'bee';

function ButterflyWings({ a, b }: { a: string; b: string }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40">
      <Path d="M20 18 C12 3 0 5 3 14 C5 20 13 21 20 19 Z" fill={a} />
      <Path d="M20 18 C28 3 40 5 37 14 C35 20 27 21 20 19 Z" fill={a} />
      <Path d="M20 20 C12 21 5 25 8 33 C11 38 18 33 20 24 Z" fill={b} />
      <Path d="M20 20 C28 21 35 25 32 33 C29 38 22 33 20 24 Z" fill={b} />
      <Circle cx={9} cy={12} r={2} fill="#FFFFFF" opacity={0.75} />
      <Circle cx={31} cy={12} r={2} fill="#FFFFFF" opacity={0.75} />
    </Svg>
  );
}

function ButterflyBody() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Line x1={20} y1={13} x2={16} y2={6} stroke="#5A2A6E" strokeWidth={0.9} strokeLinecap="round" />
      <Line x1={20} y1={13} x2={24} y2={6} stroke="#5A2A6E" strokeWidth={0.9} strokeLinecap="round" />
      <Ellipse cx={20} cy={21} rx={1.5} ry={8} fill="#5A2A6E" />
      <Circle cx={20} cy={13} r={1.8} fill="#5A2A6E" />
    </Svg>
  );
}

function BeeWings() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40">
      <Ellipse cx={10} cy={17} rx={9} ry={5.5} fill="#DDF3FF" opacity={0.85} transform="rotate(-25 10 17)" />
      <Ellipse cx={30} cy={17} rx={9} ry={5.5} fill="#DDF3FF" opacity={0.85} transform="rotate(25 30 17)" />
    </Svg>
  );
}

function BeeBody() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Line x1={18} y1={9} x2={16} y2={4} stroke="#3B2A10" strokeWidth={0.9} strokeLinecap="round" />
      <Line x1={22} y1={9} x2={24} y2={4} stroke="#3B2A10" strokeWidth={0.9} strokeLinecap="round" />
      <Ellipse cx={20} cy={22} rx={6.2} ry={10} fill="#FFC72C" />
      <Rect x={14} y={19} width={12} height={2.6} fill="#3B2A10" />
      <Rect x={14.4} y={24.5} width={11.2} height={2.6} fill="#3B2A10" />
      <Circle cx={20} cy={11.5} r={4} fill="#3B2A10" />
      <Circle cx={18.6} cy={10.8} r={0.9} fill="#FFFFFF" />
      <Circle cx={21.4} cy={10.8} r={0.9} fill="#FFFFFF" />
    </Svg>
  );
}

type Flight = { x0: number; y0: number; x1: number; y1: number; ampA: number; ampB: number; cycles: number; duration: number; rest: number; palette: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function newFlight(w: number, h: number, rest: number): Flight {
  const x0 = rand(-20, w);
  const y0 = rand(h * 0.1, h * 0.85);
  let x1 = rand(-20, w);
  const y1 = rand(h * 0.1, h * 0.85);
  if (Math.abs(x1 - x0) + Math.abs(y1 - y0) < w * 0.6) x1 = x0 < w / 2 ? w + 10 : -10;
  return { x0, y0, x1, y1, ampA: rand(30, 70), ampB: rand(20, 50), cycles: rand(1.5, 3), duration: rand(9000, 14000), rest, palette: Math.floor(Math.random() * PALETTES.length) };
}

function pathAt(f: Flight, p: number) {
  const wobble = Math.sin(p * Math.PI * 2 * f.cycles);
  return {
    x: f.x0 + (f.x1 - f.x0) * p + wobble * f.ampA * Math.sin(p * Math.PI),
    y: f.y0 + (f.y1 - f.y0) * p + Math.cos(p * Math.PI * 2 * f.cycles * 0.7) * f.ampB * Math.sin(p * Math.PI),
  };
}

type PopInfo = { x: number; y: number; color: string };

function Insect({ kind, initialDelay, onPop, label }: { kind: Kind; initialDelay: number; onPop: (info: PopInfo) => void; label: string }) {
  const { width, height } = useWindowDimensions();
  const [flight, setFlight] = useState<Flight>(() => newFlight(width, height, initialDelay));
  const progress = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;
  const current = useRef(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      current.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flap, { toValue: 1, duration: kind === 'bee' ? 70 : 170, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(flap, { toValue: 0, duration: kind === 'bee' ? 70 : 170, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flap, kind]);

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(flight.rest),
      Animated.timing(progress, { toValue: 1, duration: flight.duration, easing: Easing.linear, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => {
      if (finished) setFlight(newFlight(width, height, rand(3000, 9000)));
    });
    return () => anim.stop();
  }, [flight, progress, width, height]);

  const { xs, ys, rots, ps } = useMemo(() => {
    const ps: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    const rots: string[] = [];
    let prev = 0;
    for (let i = 0; i <= STEPS; i++) {
      const p = i / STEPS;
      const a = pathAt(flight, p);
      const b = pathAt(flight, Math.min(1, p + 0.01));
      let h = (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI;
      if (i > 0) while (h - prev > 180) h -= 360;
      if (i > 0) while (h - prev < -180) h += 360;
      prev = h;
      ps.push(p);
      xs.push(a.x - SIZE / 2);
      ys.push(a.y - SIZE / 2);
      rots.push(`${h}deg`);
    }
    return { xs, ys, rots, ps };
  }, [flight]);

  const style = {
    opacity: progress.interpolate({ inputRange: [0, 0.0001, 0.06, 0.94, 1], outputRange: [0, 0.9, 0.9, 0.9, 0] }),
    transform: [
      { translateX: progress.interpolate({ inputRange: ps, outputRange: xs }) },
      { translateY: progress.interpolate({ inputRange: ps, outputRange: ys }) },
      { rotate: progress.interpolate({ inputRange: ps, outputRange: rots }) },
    ],
  };
  const wingStyle = { transform: [{ scaleX: flap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) }] };
  const [a, b] = PALETTES[flight.palette];

  const pop = () => {
    const p = current.current;
    if (p <= 0.02 || p >= 0.98) return; // invisible while resting
    const { x, y } = pathAt(flight, p);
    progress.stopAnimation();
    onPop({ x, y, color: kind === 'bee' ? '#FFC72C' : a });
    setFlight(newFlight(width, height, rand(4000, 9000)));
  };

  return (
    <Animated.View style={[styles.insect, style]} pointerEvents="box-none">
      <Pressable onPress={pop} hitSlop={18} accessibilityRole="button" accessibilityLabel={label} style={StyleSheet.absoluteFill}>
        <Animated.View style={wingStyle} pointerEvents="none">
          {kind === 'bee' ? <BeeWings /> : <ButterflyWings a={a} b={b} />}
        </Animated.View>
        {kind === 'bee' ? <BeeBody /> : <ButterflyBody />}
      </Pressable>
    </Animated.View>
  );
}

function Piece({ p, angle, dist, w, h, spin, color }: { p: Animated.Value; angle: number; dist: number; w: number; h: number; spin: number; color: string }) {
  const style = {
    opacity: p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.8, 0] }),
    transform: [
      { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] }) },
      { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist + 70] }) },
      { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spin}deg`] }) },
    ],
  };
  return <Animated.View style={[styles.piece, { width: w, height: h, backgroundColor: color }, style]} />;
}

/** Confetti plus the little "subhan allah" message popping up where the insect was smashed. */
function Burst({ x, y, color, phrase, onDone }: PopInfo & { phrase: (typeof PHRASES)[number]; onDone: () => void }) {
  const p = useRef(new Animated.Value(0)).current;
  const msg = useRef(new Animated.Value(0)).current;
  const pieces = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        angle: (i / 16) * Math.PI * 2 + rand(-0.2, 0.2),
        dist: rand(40, 100),
        w: rand(5, 8),
        h: rand(8, 12),
        spin: rand(-540, 540),
        color: i % 3 === 0 ? color : CONFETTI[i % CONFETTI.length],
      })),
    [color],
  );

  useEffect(() => {
    Animated.timing(p, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.sequence([
      Animated.timing(msg, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(msg, { toValue: 2, duration: 450, useNativeDriver: true }),
    ]).start(({ finished }) => finished && onDone());
  }, [p, msg, onDone]);

  const msgStyle = {
    opacity: msg.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
    transform: [
      { translateY: msg.interpolate({ inputRange: [0, 1, 2], outputRange: [6, -14, -34] }) },
      { scale: msg.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, 1, 1] }) },
    ],
  };

  return (
    <View style={[styles.burst, { left: x, top: y }]} pointerEvents="none">
      {pieces.map((c, i) => (
        <Piece key={i} p={p} {...c} />
      ))}
      <Animated.View style={[styles.msg, msgStyle]}>
        <Svg width={BW} height={BH + 8} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#14604A" />
              <Stop offset="1" stopColor="#082B21" />
            </LinearGradient>
            <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FBE9B0" />
              <Stop offset="0.5" stopColor="#D4A63C" />
              <Stop offset="1" stopColor="#F6DC8E" />
            </LinearGradient>
          </Defs>
          <Path d={`M ${BW / 2 - 7} ${BH - 1} L ${BW / 2} ${BH + 7} L ${BW / 2 + 7} ${BH - 1} Z`} fill="#082B21" stroke="url(#gold)" strokeWidth={1.2} />
          <Rect x={1} y={1} width={BW - 2} height={BH - 2} rx={14} fill="url(#bg)" stroke="url(#gold)" strokeWidth={1.6} />
          <Rect x={4} y={4} width={BW - 8} height={BH - 8} rx={11} fill="none" stroke="#D4A63C" strokeOpacity={0.35} strokeWidth={0.8} />
          <Line x1={16} y1={BH - 16} x2={BW / 2 - 6} y2={BH - 16} stroke="url(#gold)" strokeWidth={0.8} strokeOpacity={0.8} />
          <Line x1={BW / 2 + 6} y1={BH - 16} x2={BW - 16} y2={BH - 16} stroke="url(#gold)" strokeWidth={0.8} strokeOpacity={0.8} />
          <Path d={`M ${BW / 2} ${BH - 19} L ${BW / 2 + 3} ${BH - 16} L ${BW / 2} ${BH - 13} L ${BW / 2 - 3} ${BH - 16} Z`} fill="url(#gold)" />
        </Svg>
        <Text style={styles.msgAr}>{phrase.ar}</Text>
        <Text style={styles.msgEn}>{phrase.en.toUpperCase()}</Text>
      </Animated.View>
    </View>
  );
}

/**
 * Butterflies and bees drifting across the page. Touches pass through except on an insect; smash one and it bursts into
 * confetti and says SubhanAllah, Alhamdulillah, Allahu Akbar — in that order, then around again.
 */
export default function InsectLayer({ onPop }: { onPop?: () => void }) {
  const [bursts, setBursts] = useState<(PopInfo & { id: number; phrase: (typeof PHRASES)[number] })[]>([]);
  const seq = useRef(0);

  const handlePop = useCallback(
    (info: PopInfo) => {
      const phrase = PHRASES[seq.current % PHRASES.length];
      seq.current += 1;
      setBursts((b) => [...b, { ...info, phrase, id: Date.now() + Math.random() }]);
      onPop?.();
    },
    [onPop],
  );

  return (
    // direction: 'ltr' so RTL layouts don't mirror `left` and push insects off-screen.
    <View style={[StyleSheet.absoluteFill, { direction: 'ltr' }]} pointerEvents="box-none">
      <Insect kind="butterfly" initialDelay={2000} onPop={handlePop} label="butterfly" />
      <Insect kind="bee" initialDelay={6500} onPop={handlePop} label="bee" />
      <Insect kind="butterfly" initialDelay={11000} onPop={handlePop} label="butterfly" />
      {bursts.map((b) => (
        <Burst key={b.id} {...b} onDone={() => setBursts((all) => all.filter((x) => x.id !== b.id))} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  insect: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
  burst: { position: 'absolute', width: 0, height: 0 },
  piece: { position: 'absolute', left: 0, top: 0, borderRadius: 2 },
  msg: {
    position: 'absolute',
    left: -BW / 2,
    top: -BH - 8,
    width: BW,
    height: BH + 8,
    alignItems: 'center',
    paddingTop: 4,
    elevation: 8,
    shadowColor: '#D4A63C',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  msgAr: { fontSize: 19, lineHeight: 28, fontWeight: '700', color: '#F6DC8E', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  msgEn: { position: 'absolute', top: BH - 13, fontSize: 7, letterSpacing: 1.6, fontWeight: '600', color: '#BFD9CB' },
});
