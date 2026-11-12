import { G, Circle, Ellipse, Path } from 'react-native-svg';
import type { SpeciesId } from '../lib/species';

/** Petal flower: `n` petals around (cx,cy). */
function Flower({ cx, cy, r, n = 6, petal, shade, center }: { cx: number; cy: number; r: number; n?: number; petal: string; shade: string; center: string }) {
  const petals = Array.from({ length: n }, (_, k) => (k * 360) / n);
  return (
    <G>
      {petals.map((deg) => (
        <G key={deg} rotation={deg} originX={cx} originY={cy}>
          <Ellipse cx={cx} cy={cy - r * 0.62} rx={r * 0.38} ry={r * 0.55} fill={petal} />
          <Ellipse cx={cx + r * 0.08} cy={cy - r * 0.5} rx={r * 0.2} ry={r * 0.35} fill={shade} opacity={0.5} />
        </G>
      ))}
      <Circle cx={cx} cy={cy} r={r * 0.3} fill={center} />
      <Circle cx={cx - r * 0.07} cy={cy - r * 0.07} r={r * 0.12} fill="#FFE082" />
    </G>
  );
}

const STEM = '#3E7D32';
const STEM_L = '#66A845';

/**
 * Stand-in art for each species, drawn around the origin (the plant's base) in a ~100 wide, ~120 tall box.
 * Swap for painted sprites later without touching the garden logic.
 */
export default function SpeciesArt({ species }: { species: SpeciesId }) {
  if (species === 'hydrangea') {
    const blooms: [number, number, number][] = [
      [0, -58, 26], [-24, -46, 18], [24, -46, 18], [-12, -78, 17], [14, -76, 17], [-34, -62, 13], [34, -62, 13], [0, -34, 16],
    ];
    return (
      <G>
        <Ellipse cx={0} cy={0} rx={38} ry={9} fill="#000" opacity={0.15} />
        <Ellipse cx={0} cy={-22} rx={40} ry={26} fill="#2E6B3A" />
        <Ellipse cx={-12} cy={-28} rx={22} ry={14} fill="#3F8A4A" />
        {blooms.map(([x, y, r], k) => (
          <G key={k}>
            <Circle cx={x} cy={y} r={r} fill="#F4A6BE" />
            <Circle cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.7} fill="#F8BBD0" />
            {[[-0.4, -0.2], [0.35, -0.35], [0.2, 0.3], [-0.2, 0.35]].map(([dx, dy], q) => (
              <Circle key={q} cx={x + dx * r} cy={y + dy * r} r={r * 0.28} fill="#FDDDE8" opacity={0.9} />
            ))}
          </G>
        ))}
      </G>
    );
  }

  if (species === 'cosmos') {
    const f: [number, number, number, string][] = [
      [0, -98, 19, '#FFFFFF'], [-26, -74, 16, '#FCE4EC'], [26, -80, 16, '#FFFFFF'], [-8, -54, 15, '#F8BBD0'], [-34, -44, 11, '#FFFFFF'], [32, -50, 12, '#F48FB1'],
    ];
    return (
      <G>
        <Ellipse cx={0} cy={0} rx={34} ry={8} fill="#000" opacity={0.15} />
        {f.map(([x, y], k) => (
          <Path key={k} d={`M${(k - 2.5) * 5} 0 Q${x * 0.4} ${y * 0.5} ${x} ${y}`} stroke={k % 2 ? STEM : STEM_L} strokeWidth={3} fill="none" strokeLinecap="round" />
        ))}
        <Path d="M-10 0 Q-34 -14 -38 -34 Q-16 -26 -10 0Z" fill={STEM_L} />
        <Path d="M10 0 Q34 -12 38 -30 Q16 -24 10 0Z" fill={STEM} />
        {f.map(([x, y, r, c], k) => (
          <Flower key={k} cx={x} cy={y} r={r} n={8} petal={c} shade="#F8BBD0" center="#F9A825" />
        ))}
      </G>
    );
  }

  // daffodil
  const f: [number, number, number][] = [[0, -90, 20], [-28, -66, 17], [28, -70, 17], [-10, -44, 15], [20, -40, 14]];
  return (
    <G>
      <Ellipse cx={0} cy={0} rx={36} ry={8} fill="#000" opacity={0.15} />
      <Path d="M-6 0 Q-30 -30 -26 -62 Q-12 -34 -2 0Z" fill={STEM} />
      <Path d="M6 0 Q30 -30 26 -62 Q12 -34 2 0Z" fill={STEM_L} />
      <Path d="M0 0 Q-8 -40 0 -78 Q8 -40 0 0Z" fill={STEM} />
      {f.map(([x, y], k) => (
        <Path key={k} d={`M${(k - 2) * 4} 0 Q${x * 0.3} ${y * 0.6} ${x} ${y}`} stroke={STEM} strokeWidth={3} fill="none" strokeLinecap="round" />
      ))}
      {f.map(([x, y, r], k) => (
        <G key={k}>
          <Flower cx={x} cy={y} r={r} n={6} petal="#FFF3B0" shade="#FFE082" center="#FFB74D" />
          <Circle cx={x} cy={y} r={r * 0.32} fill="#FFA726" />
        </G>
      ))}
    </G>
  );
}
