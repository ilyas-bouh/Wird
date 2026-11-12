import { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import SpeciesArt from './SpeciesArt';
import { RedTreeScene } from './RedTree';
import type { SpeciesId } from '../lib/species';

const N = 5; // 5x5 island

// deterministic little grass tufts and flowers, so the island doesn't change on every render
const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

type Props = {
  placed: (SpeciesId | null)[];
  width: number;
  /** a plant is selected, so empty tiles show where it can go */
  armed: boolean;
  onSlot: (slot: number) => void;
};

/** Isometric grass island. Every tile is a slot you can plant one of your plants in. */
function Garden3D({ placed, width, armed, onSlot }: Props) {
  const a = Math.floor(width / (2 * N)); // half tile width
  const h = a / 2;
  const cx = width / 2;
  const top = a * 3.4; // headroom for tall plants
  const band = a * 0.18; // green lip
  const depth = a * 0.7; // total thickness
  const height = top + N * a + depth + 20;
  const k = a / 46; // plant art scale

  const pt = (i: number, j: number) => ({ x: cx + (i - j) * a, y: top + (i + j) * h });
  const P = (...p: { x: number; y: number }[]) => p.map((q) => `${q.x},${q.y}`).join(' ');
  const off = (q: { x: number; y: number }, dy: number) => ({ x: q.x, y: q.y + dy });

  const W = pt(0, N), S = pt(N, N), E = pt(N, 0), Nn = pt(0, 0);

  const order = useMemo(() => {
    const out: { i: number; j: number; slot: number }[] = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) out.push({ i, j, slot: i * N + j });
    return out.sort((p, q) => p.i + p.j - (q.i + q.j) || p.i - q.i);
  }, []);

  const decor = useMemo(() => {
    const out: { x: number; y: number; kind: number }[] = [];
    for (let n = 0; n < 70; n++) {
      const u = rnd(n + 1), v = rnd(n + 101);
      const p = pt(u * N, v * N);
      out.push({ x: p.x, y: p.y, kind: n % 5 });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  // The maple animates, so it lives in its own small <Svg> that redraws on its own clock while the island stays still.
  const maples = order.filter(({ slot }) => placed[slot] === 'maple');
  const frontDepth = maples.length ? Math.min(...maples.map(({ i, j }) => i + j)) : Infinity;
  const s = 0.4 * k; // maple art scale: its 340x300 box shrunk to island size
  const viewBox = `-20 0 ${width + 40} ${height}`;

  return (
    <View style={{ width: width + 40, height }}>
    <Svg width={width + 40} height={height} viewBox={viewBox}>
      <Defs>
        <LinearGradient id="grass" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6FD27F" />
          <Stop offset="1" stopColor="#4DBF68" />
        </LinearGradient>
      </Defs>

      {/* thickness: green lip on top of a sandy body */}
      <Polygon points={P(W, S, off(S, depth), off(W, depth))} fill="#C9BB87" />
      <Polygon points={P(S, E, off(E, depth), off(S, depth))} fill="#E6D5B0" />
      <Polygon points={P(W, S, off(S, band * 2), off(W, band * 2))} fill="#3FB567" />
      <Polygon points={P(S, E, off(E, band * 2), off(S, band * 2))} fill="#58C77A" />

      <Polygon points={P(Nn, E, S, W)} fill="url(#grass)" />

      {/* tufts and tiny flowers */}
      {decor.map((d, n) =>
        d.kind < 3 ? (
          <Path key={n} d={`M${d.x - 3} ${d.y} L${d.x - 1} ${d.y - 6} L${d.x} ${d.y} L${d.x + 2} ${d.y - 5} L${d.x + 3} ${d.y}`} stroke="#3FA857" strokeWidth={1.4} fill="none" strokeLinecap="round" />
        ) : (
          <Circle key={n} cx={d.x} cy={d.y} r={2.2} fill={d.kind === 3 ? '#FFF59D' : '#FFFFFF'} />
        ),
      )}

      {order.map(({ i, j, slot }) => {
        const c = pt(i + 0.5, j + 0.5);
        const sp = placed[slot];
        const diamond = P({ x: c.x, y: c.y - h }, { x: c.x + a, y: c.y }, { x: c.x, y: c.y + h }, { x: c.x - a, y: c.y });
        return (
          <G key={slot} onPress={() => onSlot(slot)}>
            <Polygon
              points={diamond}
              fill={armed && !sp ? '#FFFFFF' : 'transparent'}
              fillOpacity={armed && !sp ? 0.28 : 0}
              stroke={armed && !sp ? '#FFFFFF' : 'none'}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            {sp && sp !== 'maple' && (
              <G transform={`translate(${c.x} ${c.y + h * 0.35}) scale(${k})`}>
                <SpeciesArt species={sp} />
              </G>
            )}
          </G>
        );
      })}
    </Svg>

    {maples.map(({ i, j, slot }) => {
      const c = pt(i + 0.5, j + 0.5);
      return (
        <Pressable
          key={slot}
          onPress={() => onSlot(slot)}
          style={{ position: 'absolute', left: c.x + 20 - 170 * s, top: c.y + h * 0.35 - 288 * s }}
        >
          <RedTreeScene width={340 * s} />
        </Pressable>
      );
    })}

    {/* plants standing in front of a maple are drawn again on top of it */}
    {maples.length > 0 && (
      <Svg width={width + 40} height={height} viewBox={viewBox} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
        {order.map(({ i, j, slot }) => {
          const sp = placed[slot];
          if (!sp || sp === 'maple' || i + j <= frontDepth) return null;
          const c = pt(i + 0.5, j + 0.5);
          return (
            <G key={slot} transform={`translate(${c.x} ${c.y + h * 0.35}) scale(${k})`}>
              <SpeciesArt species={sp} />
            </G>
          );
        })}
      </Svg>
    )}
    </View>
  );
}

export default memo(Garden3D);
