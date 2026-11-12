import { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { ClipPath, Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import AnimatedPlant from '../plants/AnimatedPlant';
import { MAPLE, type PlantId } from '../plants/catalog';
import { RedTreeScene } from './RedTree';

const N = 5; // 5x5 island

// deterministic scatter, so the island doesn't change on every render
const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 31.7) * 43758.5453;
  return x - Math.floor(x);
};

type Pt = { x: number; y: number };
const lerp = (p: Pt, q: Pt, t: number): Pt => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
const pts = (list: Pt[]) => list.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');

type Props = {
  placed: (PlantId | null)[];
  width: number;
  /** a plant is selected, so empty tiles show where it can go */
  armed: boolean;
  onSlot: (slot: number) => void;
};

/** Isometric grass island. Every tile is a slot you can plant one of your flowers in. */
function Garden3D({ placed, width, armed, onSlot }: Props) {
  const a = Math.floor(width / (2 * N)); // half tile width
  const h = a / 2;
  const cx = width / 2;
  const top = a * 2.9; // headroom for tall plants
  const depth = a * 0.95; // thickness of the block
  const height = top + N * a + depth + 20;
  const k = a / 46; // plant art scale

  const pt = (i: number, j: number): Pt => ({ x: cx + (i - j) * a, y: top + (i + j) * h });
  const W = pt(0, N), S = pt(N, N), E = pt(N, 0), Nn = pt(0, 0);

  /** A side face: its top edge runs p0 -> p1, its lower boundary hangs `drop(t)` pixels below that edge. */
  const face = (p0: Pt, p1: Pt, drop: (t: number, n: number) => number, steps = 48) => {
    const list: Pt[] = [p0, p1];
    for (let n = steps; n >= 0; n--) {
      const t = n / steps;
      const q = lerp(p0, p1, t);
      list.push({ x: q.x, y: q.y + drop(t, n) });
    }
    return pts(list);
  };

  const wave = (base: number, ph: number) => (t: number) =>
    depth * base + Math.sin(t * 15 + ph) * depth * 0.07 + Math.sin(t * 6 + ph * 2) * depth * 0.05;
  const jag = (base: number, seed: number) => (_t: number, n: number) =>
    depth * (n % 2 ? base + 0.16 * (0.5 + rnd(n + seed)) : base - 0.04);

  const sideFlowers = (p0: Pt, p1: Pt, seed: number, petal: string) =>
    Array.from({ length: 6 }, (_, n) => {
      const t = 0.1 + n * 0.15 + rnd(seed + n) * 0.05;
      const q = lerp(p0, p1, t);
      const y = q.y + depth * (0.14 + rnd(seed + n * 3) * 0.08);
      const big = n % 2 === 0;
      const r = a * (big ? 0.085 : 0.055);
      return (
        <G key={`${seed}${n}`}>
          {[0, 72, 144, 216, 288].map((deg) => (
            <G key={deg} rotation={deg} originX={q.x} originY={y}>
              <Ellipse cx={q.x} cy={y - r} rx={r * 0.62} ry={r} fill={big ? petal : '#F4B942'} />
            </G>
          ))}
          <Circle cx={q.x} cy={y} r={r * 0.5} fill={big ? '#F4B942' : '#E08A1E'} />
        </G>
      );
    });

  const order = useMemo(() => {
    const out: { i: number; j: number; slot: number }[] = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) out.push({ i, j, slot: i * N + j });
    return out.sort((p, q) => p.i + p.j - (q.i + q.j) || p.i - q.i);
  }, []);

  // light and dark patches in the grass, clipped to the top face
  const patches = useMemo(
    () =>
      Array.from({ length: 22 }, (_, n) => {
        const c = pt(rnd(n + 1) * N, rnd(n + 77) * N);
        const rx = a * (0.5 + rnd(n + 9) * 0.8);
        return { ...c, rx, ry: rx * 0.5, light: n % 2 === 0 };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width],
  );

  // grass tufts on every tile, and a little flower cluster on some
  const tileDecor = useMemo(() => {
    const out: { tufts: Pt[]; flowers: Pt | null; key: number }[] = [];
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const seed = i * 13 + j * 7 + 3;
        const c = pt(i + 0.5, j + 0.5);
        const at = (n: number): Pt => ({ x: c.x + (rnd(seed + n) - 0.5) * a * 1.2, y: c.y + (rnd(seed + n + 40) - 0.5) * h * 1.2 });
        out.push({ key: i * N + j, tufts: [at(1), at(2)], flowers: rnd(seed + 9) > 0.45 ? at(5) : null });
      }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  // spiky grass fringe along the two far edges
  const fringe = (p0: Pt, p1: Pt, seed: number) => {
    const list: Pt[] = [p0];
    const n = 26;
    for (let m = 1; m < n; m++) {
      const q = lerp(p0, p1, m / n);
      list.push({ x: q.x, y: q.y - (m % 2 ? 2 + rnd(seed + m) * 4 : 0.5) });
    }
    list.push(p1, lerp(p1, p0, 0.5), p0);
    return pts(list);
  };

  const s = 0.4 * k; // maple art scale: its 340x300 box shrunk to island size
  const viewBox = `-20 0 ${width + 40} ${height}`;
  const diamond = pts([Nn, E, S, W]);

  return (
    <View style={{ width: width + 40, height }}>
      <Svg width={width + 40} height={height} viewBox={viewBox}>
        <Defs>
          <LinearGradient id="grass" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#6FD27F" />
            <Stop offset="1" stopColor="#4DBF68" />
          </LinearGradient>
          <ClipPath id="topface">
            <Polygon points={diamond} />
          </ClipPath>
        </Defs>

        {/* sides: sand, then an olive layer with a wavy edge, then a green fringe with a ragged edge */}
        <Polygon points={face(W, S, () => depth)} fill="#D9C896" />
        <Polygon points={face(S, E, () => depth)} fill="#EAD9B4" />
        <Polygon points={face(W, S, wave(0.66, 1))} fill="#B3A468" />
        <Polygon points={face(S, E, wave(0.66, 4))} fill="#C9B980" />
        <Polygon points={face(W, S, jag(0.3, 11))} fill="#3FB567" />
        <Polygon points={face(S, E, jag(0.3, 71))} fill="#58C77A" />
        {sideFlowers(W, S, 5, '#FFFFFF')}
        {sideFlowers(S, E, 25, '#FFF8E1')}

        <Polygon points={fringe(Nn, W, 3)} fill="#5BCB6E" />
        <Polygon points={fringe(Nn, E, 33)} fill="#5BCB6E" />
        <Polygon points={diamond} fill="url(#grass)" />

        <G clipPath="url(#topface)">
          {patches.map((p, n) => (
            <Ellipse key={n} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={p.light ? '#9BE8A8' : '#35A455'} opacity={p.light ? 0.28 : 0.16} />
          ))}
        </G>

        {tileDecor.map((d) => (
          <G key={d.key}>
            {d.tufts.map((t, n) => (
              <Path
                key={n}
                d={`M${t.x - 5} ${t.y} L${t.x - 3} ${t.y - 7} L${t.x - 1.5} ${t.y} L${t.x} ${t.y - 9} L${t.x + 1.5} ${t.y} L${t.x + 3.5} ${t.y - 6} L${t.x + 5} ${t.y}`}
                stroke="#3A9D55"
                strokeWidth={1.3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {d.flowers && (
              <G>
                {[[0, -2.4], [2.4, 0], [0, 2.4], [-2.4, 0]].map(([dx, dy], n) => (
                  <Circle key={n} cx={d.flowers!.x + dx} cy={d.flowers!.y + dy} r={1.7} fill="#FFF9C4" />
                ))}
                <Circle cx={d.flowers.x} cy={d.flowers.y} r={1.5} fill="#F9C74F" />
                <Circle cx={d.flowers.x + 8} cy={d.flowers.y + 2} r={1.1} fill="#FFFFFF" />
                <Circle cx={d.flowers.x + 11} cy={d.flowers.y - 1} r={1} fill="#FFE082" />
                <Circle cx={d.flowers.x - 8} cy={d.flowers.y + 1.5} r={1} fill="#FFFFFF" />
              </G>
            )}
          </G>
        ))}

        {order.map(({ i, j, slot }) => {
          const c = pt(i + 0.5, j + 0.5);
          const id = placed[slot];
          const tile = pts([{ x: c.x, y: c.y - h }, { x: c.x + a, y: c.y }, { x: c.x, y: c.y + h }, { x: c.x - a, y: c.y }]);
          return (
            <G key={slot} onPress={() => onSlot(slot)}>
              <Polygon
                points={tile}
                fill={armed && !id ? '#FFFFFF' : 'transparent'}
                fillOpacity={armed && !id ? 0.28 : 0}
                stroke={armed && !id ? '#FFFFFF' : 'none'}
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            </G>
          );
        })}
      </Svg>

      {/* Everything planted animates (the maple sways, flowers bend in the wind and shed petals), so each lives in its
          own native-driven view. They are drawn back to front so a plant stands in front of the ones behind it. */}
      {order.map(({ i, j, slot }) => {
        const id = placed[slot];
        if (!id) return null;
        const c = pt(i + 0.5, j + 0.5);
        if (id === MAPLE) {
          return (
            <Pressable
              key={slot}
              onPress={() => onSlot(slot)}
              style={{ position: 'absolute', left: c.x + 20 - 170 * s, top: c.y + h * 0.35 - 288 * s }}
            >
              <RedTreeScene width={340 * s} />
            </Pressable>
          );
        }
        const pw = 120 * k;
        return (
          <Pressable
            key={slot}
            onPress={() => onSlot(slot)}
            style={{ position: 'absolute', left: c.x + 20 - 60 * k, top: c.y + h * 0.35 - 122 * k }}
          >
            <AnimatedPlant id={id} width={pw} />
          </Pressable>
        );
      })}
    </View>
  );
}

export default memo(Garden3D);
