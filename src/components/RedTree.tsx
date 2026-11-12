import { useEffect, useState } from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

/** Seconds since mount, re-rendered about `fps` times a second. Drives the wind and falling leaves. */
export function useClock(fps = 30) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const start = Date.now();
    const loop = () => {
      const now = Date.now();
      if (now - last >= 1000 / fps) {
        last = now;
        setT((now - start) / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fps]);
  return t;
}

const rnd = (seed: number) => {
  const x = Math.sin(seed * 78.233 + 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const BASE_X = 150;
const BASE_Y = 288;
const REDS_BACK = ['#7F0A0A', '#9B0F0F', '#B71C1C', '#A31212'];
const REDS_MID = ['#C62828', '#D32F2F', '#E01B1B', '#C8102E'];
const REDS_FRONT = ['#F03030', '#FF3B30', '#E53935', '#FF5252'];

type Blob = { x: number; y: number; r: number; c: string; phase: number };

/** Clouds of red foliage inside an oval, from dark at the back to bright at the front. */
function makeBlobs(n: number, seed: number, palette: string[], rMin: number, rMax: number): Blob[] {
  return Array.from({ length: n }, (_, i) => {
    const a = rnd(seed + i * 3.1) * Math.PI * 2;
    const d = Math.sqrt(rnd(seed + i * 5.7));
    return {
      x: 150 + Math.cos(a) * d * 132,
      y: 108 + Math.sin(a) * d * 76,
      r: rMin + rnd(seed + i * 9.3) * (rMax - rMin),
      c: palette[Math.floor(rnd(seed + i * 1.7) * palette.length)],
      phase: rnd(seed + i * 2.3) * 6.28,
    };
  });
}

const BACK = makeBlobs(70, 1, REDS_BACK, 12, 24);
const MID = makeBlobs(80, 50, REDS_MID, 9, 19);
const FRONT = makeBlobs(70, 120, REDS_FRONT, 6, 14);
const SPECKS = makeBlobs(22, 300, REDS_FRONT, 3, 6).map((b) => ({ ...b, x: 150 + (b.x - 150) * 1.18, y: 108 + (b.y - 108) * 1.3 }));

const LEAVES = Array.from({ length: 18 }, (_, i) => ({
  x0: 55 + rnd(i * 4.1 + 7) * 190,
  y0: 70 + rnd(i * 2.9 + 3) * 120,
  speed: 0.06 + rnd(i * 6.3 + 1) * 0.07,
  phase: rnd(i * 8.8 + 5),
  size: 0.8 + rnd(i * 3.3 + 9) * 0.9,
  spin: 360 + rnd(i * 1.3 + 2) * 540,
  c: REDS_FRONT[i % REDS_FRONT.length],
}));

const BRANCHES = [
  'M152 200 C140 175 118 160 96 140',
  'M96 140 C86 130 78 122 66 112',
  'M154 200 C168 176 190 160 212 142',
  'M212 142 C222 132 232 124 246 114',
  'M152 196 C150 160 148 130 152 84',
  'M150 150 C130 138 118 120 112 96',
  'M152 140 C172 126 184 108 190 86',
  'M120 156 C108 160 96 170 84 172',
  'M190 158 C204 164 216 174 230 174',
];

/**
 * The red tree, drawn in a 300x300 box with its base at (150,288). `t` is the clock in seconds:
 * the wind sways the canopy and the leaves drift down and loop. Pass t=0 for a still tree.
 */
export default function RedTreeArt({ t = 0 }: { t?: number }) {
  const wind = Math.sin(t * 0.8) + 0.5 * Math.sin(t * 2.1 + 1);
  const sway = (b: Blob, k: number) => ({
    dx: wind * k * (1 + (200 - b.y) / 120) + Math.sin(t * 2.4 + b.phase) * 1.6,
    dy: Math.sin(t * 1.9 + b.phase) * 1.2,
  });
  const treeRot = wind * 0.9;

  const layer = (blobs: Blob[], k: number, opacity = 1) =>
    blobs.map((b, i) => {
      const s = sway(b, k);
      return <Circle key={i} cx={b.x + s.dx} cy={b.y + s.dy} r={b.r} fill={b.c} opacity={opacity} />;
    });

  return (
    <G>
      <Ellipse cx={BASE_X} cy={BASE_Y} rx={118} ry={8} fill="#C62828" opacity={0.35} />
      <Ellipse cx={BASE_X} cy={BASE_Y} rx={70} ry={4} fill="#8E0000" opacity={0.35} />

      <G transform={`rotate(${treeRot} ${BASE_X} ${BASE_Y})`}>
        {/* trunk */}
        <Path d="M137 288 C141 252 144 222 146 190 L158 190 C158 222 161 252 167 288 Z" fill="#DDD6CF" />
        <Path d="M156 190 C158 222 161 252 167 288 L158 288 C154 252 152 222 150 190 Z" fill="#9C948C" />
        <Path d="M146 260 L152 262 M148 236 L154 238 M147 212 L153 214" stroke="#4A3F3A" strokeWidth={1.4} />

        {layer(BACK, 3)}
        {BRANCHES.map((d, i) => {
          const sw = Math.sin(t * 2 + i) * 0.8 + wind * 1.5;
          return (
            <G key={i} transform={`translate(${sw} 0)`}>
              <Path d={d} stroke="#2A1717" strokeWidth={i < 6 ? 4.5 - (i % 2) : 2.2} fill="none" strokeLinecap="round" />
            </G>
          );
        })}
        {layer(MID, 4.5)}
        {layer(FRONT, 6)}
        {SPECKS.map((b, i) => {
          const s = sway(b, 8);
          return <Circle key={i} cx={b.x + s.dx} cy={b.y + s.dy} r={b.r} fill={b.c} opacity={0.85} />;
        })}
      </G>

      {/* falling leaves */}
      {LEAVES.map((l, i) => {
        const u = (t * l.speed + l.phase) % 1;
        const y = l.y0 + u * (BASE_Y - 4 - l.y0);
        const x = l.x0 + Math.sin(u * 9 + l.phase * 6) * 16 + u * (30 + wind * 22);
        const fade = Math.min(1, u * 8, (1 - u) * 6);
        return (
          <G key={i} transform={`translate(${x} ${y}) rotate(${u * l.spin}) scale(${l.size})`} opacity={fade}>
            <Path d="M0 -6 C5 -3 5 3 0 7 C-5 3 -5 -3 0 -6Z" fill={l.c} />
            <Path d="M0 -5 L0 6" stroke="#8E0000" strokeWidth={0.8} />
          </G>
        );
      })}
    </G>
  );
}

/** The red tree on its own, animated and sized to `width`. */
export function RedTreeScene({ width }: { width: number }) {
  const t = useClock(30);
  return (
    <Svg width={width} height={(width * 300) / 340} viewBox="-20 0 340 300">
      <RedTreeArt t={t} />
    </Svg>
  );
}
