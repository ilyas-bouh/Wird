import { Circle, Ellipse, G, Path } from 'react-native-svg';
import { ART } from './art';
import { FULL_GROWTH, hizbOf } from './catalog';

function hsl(h: number, s: number, l: number) {
  const a = (s * Math.min(l, 1 - l));
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// where each new flower head appears as the plant grows
const HEADS: [number, number][] = [[0, -92], [-22, -74], [22, -76], [-11, -54], [13, -52], [-34, -50], [34, -54], [0, -34]];
const FLOWERS_AT = [0, 0, 1, 2, 3, 4, 5, 6, 8]; // flowers shown at each stage 0..8

/** Generated stand-in so every plant has all 8 growth steps before real artwork exists. */
function Placeholder({ id, stage }: { id: string; stage: number }) {
  const hue = (Math.max(hizbOf(id), 0) * 137.5) % 360;
  const petal = hsl(hue, 0.7, 0.72);
  const petalDark = hsl(hue, 0.65, 0.58);
  const n = FLOWERS_AT[Math.max(0, Math.min(stage, FULL_GROWTH))];
  return (
    <G>
      <Ellipse cx={0} cy={0} rx={30} ry={7} fill="#000" opacity={0.15} />
      <Ellipse cx={0} cy={-2} rx={stage === 0 ? 14 : 20} ry={5} fill="#8D6E4F" />
      {stage >= 1 && stage < 2 && (
        <>
          <Path d="M0 -4 V-18" stroke="#3E7D32" strokeWidth={3} strokeLinecap="round" />
          <Path d="M0 -14 C-10 -14 -12 -22 -10 -26 C-3 -25 0 -20 0 -14Z" fill="#66A845" />
          <Path d="M0 -12 C10 -12 12 -20 10 -24 C3 -23 0 -18 0 -12Z" fill="#7BC043" />
        </>
      )}
      {stage >= 2 && (
        <>
          <Path d="M-4 -2 C-26 -10 -30 -24 -26 -34 C-12 -28 -6 -16 -4 -2Z" fill="#4F9A3B" />
          <Path d="M4 -2 C26 -10 30 -22 26 -32 C12 -26 6 -14 4 -2Z" fill="#66A845" />
        </>
      )}
      {HEADS.slice(0, n).map(([x, y], i) => (
        <Path key={`s${i}`} d={`M0 -4 Q${x * 0.3} ${y * 0.6} ${x} ${y}`} stroke="#3E7D32" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      ))}
      {HEADS.slice(0, n).map(([x, y], i) => {
        const r = (stage === 8 ? 12 : 8 + stage * 0.7) - (i > 3 ? 1.5 : 0);
        return (
          <G key={`f${i}`}>
            {[0, 72, 144, 216, 288].map((deg) => (
              <G key={deg} rotation={deg} originX={x} originY={y}>
                <Ellipse cx={x} cy={y - r * 0.6} rx={r * 0.42} ry={r * 0.62} fill={petal} />
                <Ellipse cx={x + r * 0.08} cy={y - r * 0.5} rx={r * 0.2} ry={r * 0.36} fill={petalDark} opacity={0.4} />
              </G>
            ))}
            <Circle cx={x} cy={y} r={r * 0.3} fill="#FFD54F" />
          </G>
        );
      })}
    </G>
  );
}

/** A plant at a growth step 0..8, base at (0,0). Uses the real art for the plant if it is registered. */
export default function PlantArt({ id, stage }: { id: string; stage: number }) {
  const Art = ART[id];
  return Art ? <Art stage={stage} /> : <Placeholder id={id} stage={stage} />;
}
