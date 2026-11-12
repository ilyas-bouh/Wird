import { HEADS, HeadKind, Pal, pal } from './heads';
import { drawLeaf, pad, LeafSpec } from './leaves';
import {
  C, Ctx, E, El, G, at, clamp, darken, ease, lerp, lighten, mix, rng, shadow, soil, stem, polar,
} from './kit';

/**
 * The workhorse for flowers, herbs and bulbs: stems rise from a leafy base, each carrying a flower head (or
 * a string of them). Every stage 0..8 comes from one schedule so all plants grow the same way:
 * 1 sprout, 2 seedling, 3 leafy + first stalk, 4 buds, 5 coloured buds, 6 first bloom, 7 blooming, 8 bouquet.
 */
export interface StemSpec {
  head: HeadKind;
  color: string;              // base colour of the flower
  pal?: Partial<Pal>;
  ho?: any;                   // options for the head drawer
  hs: number;                 // head size
  layout: 'fan' | 'mound' | 'arch' | 'lotus';
  n: number;                  // stems at stage 8
  h: number;                  // tallest tip
  spread: number;
  stemC?: string;
  stemW?: number;
  leaf: LeafSpec;
  basal?: { n: number; fan: number; size?: number };
  sl?: { n: number; size: number; angle?: number; leaf?: LeafSpec; stems?: number };
  along?: { n: number; from: number };
  cluster?: number;
  alt?: { head: HeadKind; color: string; ho?: any; hs?: number; ranks: number[] };
  headRot?: number;
  ground?: 'soil' | 'snow' | 'water';
  pads?: { x: number; y: number; r: number }[];
  sh?: number;
  seed?: number;
}

/** flowers are the point of the plant: draw every head this much bigger than its spec */
const HEAD_BOOST = 1.32;

const STAGES = [
  null,
  null,
  { leaf: 0.42, ln: 0.55, k: 0, hgt: 0.3, u0: 0, du: 0 },
  { leaf: 0.62, ln: 0.8, k: 0, hgt: 0.5, u0: 0.1, du: 0 },
  { leaf: 0.8, ln: 0.9, k: 0.3, hgt: 0.72, u0: 0.3, du: 0.05 },
  { leaf: 0.9, ln: 1, k: 0.45, hgt: 0.88, u0: 0.47, du: 0.06 },
  { leaf: 0.96, ln: 1, k: 0.6, hgt: 0.96, u0: 0.82, du: 0.13 },
  { leaf: 1, ln: 1, k: 0.82, hgt: 1, u0: 1, du: 0.12 },
  { leaf: 1.04, ln: 1, k: 1, hgt: 1, u0: 1, du: 0.025 },
] as const;

interface Stalk { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number; t: number; rank: number; kind: 'flower' | 'pad' }

const qpt = (s: Stalk, t: number) => {
  const u = 1 - t;
  const x = u * u * s.x0 + 2 * u * t * s.cx + t * t * s.x1;
  const y = u * u * s.y0 + 2 * u * t * s.cy + t * t * s.y1;
  const dx = 2 * u * (s.cx - s.x0) + 2 * t * (s.x1 - s.cx);
  const dy = 2 * u * (s.cy - s.y0) + 2 * t * (s.y1 - s.cy);
  return { x, y, a: (Math.atan2(dx, -dy) * 180) / Math.PI };
};
const qd = (s: Stalk, t = 1) => {
  // sub-curve 0..t of the quadratic
  const u = 1 - t;
  const mx = lerp(s.x0, s.cx, t), my = lerp(s.y0, s.cy, t);
  const ex = u * u * s.x0 + 2 * u * t * s.cx + t * t * s.x1, ey = u * u * s.y0 + 2 * u * t * s.cy + t * t * s.y1;
  return `M${s.x0.toFixed(1)} ${s.y0.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
};

function layout(sp: StemSpec): Stalk[] {
  const r = rng(sp.seed ?? 7);
  const n = sp.n;
  const out: Stalk[] = [];
  for (let j = 0; j < n; j++) {
    const t = n === 1 ? 0 : (j - (n - 1) / 2) / ((n - 1) / 2);
    const jit = (r() - 0.5) * 6;
    if (sp.layout === 'arch') {
      const side = t === 0 ? (r() > 0.5 ? 1 : -1) : Math.sign(t);
      const k = 0.55 + 0.45 * Math.abs(t);
      const tx = side * sp.spread * (0.35 + 0.65 * k);
      out.push({ x0: t * 4, y0: 0, cx: side * sp.spread * 0.12 + t * 4, cy: -sp.h * 1.15, x1: tx, y1: -sp.h * (0.72 - 0.14 * Math.abs(t)) + jit, t, rank: 0, kind: 'flower' });
    } else if (sp.layout === 'lotus') {
      const tx = t * sp.spread * 0.9;
      out.push({ x0: t * 3, y0: -2, cx: t * 3 - t * 5, cy: -sp.h * 0.55, x1: tx, y1: -sp.h * (0.78 + 0.22 * Math.sqrt(Math.max(0, 1 - t * t))) + jit, t, rank: 0, kind: 'flower' });
    } else {
      const dome = sp.layout === 'mound' ? 0.8 : 0.7;
      const tx = t * sp.spread * 0.9 * (0.85 + 0.15 * Math.abs(t));
      const ty = -sp.h * (dome + (1 - dome) * Math.sqrt(Math.max(0, 1 - t * t * 0.92))) + jit;
      out.push({ x0: t * 3.5, y0: 0, cx: t * 3.5 + t * 3 - Math.sign(t) * Math.abs(t) * 7, cy: ty * 0.5, x1: tx, y1: ty, t, rank: 0, kind: 'flower' });
    }
  }
  // rank: centre first, alternating outward
  const order = out.map((_, i) => i).sort((a, b) => Math.abs(out[a].t) - Math.abs(out[b].t) || out[a].t - out[b].t);
  order.forEach((i, k) => (out[i].rank = k));
  return out;
}

function scaleStalk(s: Stalk, g: number): Stalk {
  // shrink a stalk toward its base so young plants are shorter
  const f = (v: number, b: number) => b + (v - b) * g;
  return { ...s, cx: f(s.cx, s.x0), cy: f(s.cy, s.y0), x1: f(s.x1, s.x0), y1: f(s.y1, s.y0) };
}

function groundEls(cx: Ctx, sp: StemSpec, stage: number): El[] {
  const sh = sp.sh ?? 32;
  const out: El[] = [];
  if (sp.ground === 'water') {
    out.push(E(0, -1, sh * 1.05, sh * 0.3, cx.r('#BFE8F2', '#5FB3D6', 0.5, 0.4), { opacity: 0.95 }));
    out.push(E(-sh * 0.25, -2, sh * 0.5, sh * 0.1, '#fff', { opacity: 0.35 }));
  } else {
    out.push(shadow(cx, lerp(14, sh, clamp(stage / 6)), undefined, 0.2));
    if (stage <= 3) out.push(...soil(cx, lerp(9, 14, clamp((stage - 1) / 2)), lerp(3, 4.5, clamp((stage - 1) / 2)), -0.5));
  }
  if (sp.ground === 'snow' && stage >= 2) {
    for (const [x, y, r] of [[-22, -1, 6], [20, -1, 5], [-8, 0, 4], [30, -2, 3.5], [-32, -1, 3.5]] as const) {
      out.push(E(x, y, r, r * 0.5, cx.v('#FFFFFF', '#DDE8F0')));
    }
  }
  return out;
}

function sprout(cx: Ctx, sp: StemSpec): El[] {
  const out: El[] = [];
  const l = sp.leaf;
  const thin = l.style === 'strap' || l.style === 'sword';
  const c = { ...l, len: 13 };
  if (sp.ground === 'water') {
    for (const [x, y, r] of [[-9, -2, 6], [8, -1, 5]] as const) out.push(...pad(cx, x, y, r, l.c0, l.c1, 0.5));
    return out;
  }
  if (thin) {
    out.push(...drawLeaf(cx, { ...c, len: 15, bend: 0.22 }, at(-1, -1, -20)));
    out.push(...drawLeaf(cx, { ...c, len: 15, bend: -0.22 }, at(1, -1, 20)));
    out.push(...drawLeaf(cx, { ...c, len: 12 }, at(0, -1, 0)));
    return out;
  }
  out.push(...stem(cx, 'M0 -1 Q-1 -7 0 -11', 2.2, darken(l.c1, 0.1)));
  const lf = { style: 'round' as const, len: 9, c0: l.c0, c1: l.c1, wid: 4.6, bend: 0 };
  out.push(...drawLeaf(cx, lf, at(0, -9, -62, 1, 1), 1, 0));
  out.push(...drawLeaf(cx, { ...lf, len: 8.5 }, at(0, -9, 62, 1, 1), 1, 0.15));
  out.push(...drawLeaf(cx, { ...lf, len: 5, wid: 2.6 }, at(0, -11, 0), 1, 0.2));
  return out;
}

export function drawStems(cx: Ctx, sp: StemSpec, stage: number): El[] {
  const out: El[] = [];
  out.push(...groundEls(cx, sp, stage));
  if (stage === 0) return out;
  if (stage === 1) return [...out, ...sprout(cx, sp)];

  const T = STAGES[stage]!;
  const r = rng((sp.seed ?? 7) + stage * 3);
  if (sp.pads) {
    const nPads = Math.max(2, Math.round(sp.pads.length * T.ln));
    for (const pd of sp.pads.slice(0, nPads)) {
      const y1 = pd.y * lerp(0.5, 1, T.hgt);
      const d = `M${(pd.x * 0.35).toFixed(1)} -2 Q${(pd.x * 0.3).toFixed(1)} ${(y1 * 0.4).toFixed(1)} ${pd.x.toFixed(1)} ${y1.toFixed(1)}`;
      out.push(...stem(cx, d, 1.6, sp.stemC ?? '#4A9A45'));
      out.push(...pad(cx, pd.x, y1, pd.r * lerp(0.55, 1, T.leaf), sp.leaf.c0, sp.leaf.c1, 0.5));
    }
  }
  const p = pal(sp.color, sp.pal);
  const stems = layout(sp);
  const stemC = sp.stemC ?? '#3F8A3B';
  const sw = sp.stemW ?? 2.4;

  const nShow = stage <= 2 ? 0 : Math.max(1, Math.round(sp.n * T.k));
  const shown = stems.filter((s) => s.rank < nShow).sort((a, b) => a.rank - b.rank);

  // ---- basal leaves
  const B = sp.basal;
  const back: El[] = [], front: El[] = [];
  if (B && B.n > 0) {
    const cnt = Math.max(2, Math.round(B.n * T.ln));
    for (let i = 0; i < cnt; i++) {
      const tt = cnt === 1 ? 0 : (i - (cnt - 1) / 2) / ((cnt - 1) / 2);
      const a = tt * B.fan + (r() - 0.5) * 8;
      const size = (B.size ?? 1) * T.leaf * (1 - 0.3 * Math.abs(tt) + (r() - 0.5) * 0.14);
      const side = a === 0 ? 1 : Math.sign(a);
      const els = drawLeaf(cx, sp.leaf, at(a * 0.09, 1, a), size, (r() - 0.5) * 0.6, side);
      (Math.abs(tt) < 0.55 ? back : front).push(...els);
    }
  }
  out.push(...back);

  // ---- stems (and stem leaves, along-heads)
  const heads: { y: number; els: El[] }[] = [];
  const leaves2: El[] = [];
  const stemsOnly = !B || B.n === 0;
  const list = stage === 2 && stemsOnly ? [stems.sort((a, b) => a.rank - b.rank)[0]] : shown;
  const gStage = stage === 2 ? T.hgt : T.hgt;
  for (const raw of list) {
    const st = scaleStalk(raw, gStage * (stage === 2 ? 1 : 1));
    out.push(...stem(cx, qd(st), sw, stemC));
    const hu = clamp(T.u0 - T.du * raw.rank, 0.08, 1);
    // stem leaves
    if (sp.sl && raw.rank < (sp.sl.stems ?? 3)) {
      const sl = sp.sl;
      const lf = sl.leaf ?? sp.leaf;
      for (let k = 0; k < sl.n; k++) {
        const tt = 0.22 + (0.62 * (k + 0.5)) / sl.n;
        const q = qpt(st, tt);
        const sc = sl.size * T.leaf * (1 - 0.4 * tt);
        const ang = sl.angle ?? 58;
        leaves2.push(...drawLeaf(cx, lf, at(q.x, q.y, q.a - ang - (k % 2) * 6), sc, 0.1, -1));
        leaves2.push(...drawLeaf(cx, lf, at(q.x, q.y, q.a + ang + (k % 2) * 6), sc, -0.05, 1));
      }
    }
    if (stage < 3 || (stage === 2 && stemsOnly)) {
      continue;
    }
    const isAlt = !!sp.alt && sp.alt.ranks.includes(raw.rank);
    const hsz = (isAlt && sp.alt!.hs ? sp.alt!.hs : sp.hs) * HEAD_BOOST * (stage === 8 ? 1.08 : 1) * (0.9 + 0.1 * (1 - Math.abs(raw.t)));
    const fn = HEADS[isAlt ? sp.alt!.head : sp.head];
    const pp = isAlt ? pal(sp.alt!.color) : p;
    const ho = (isAlt ? sp.alt!.ho : sp.ho) ?? {};
    if (sp.along) {
      const A = sp.along;
      for (let k = 0; k < A.n; k++) {
        const tt = lerp(A.from, 1, A.n === 1 ? 1 : k / (A.n - 1));
        const q = qpt(st, tt);
        const side = (k % 2 ? 1 : -1) * (st.x1 >= 0 ? 1 : -1);
        const hx = q.x + side * 5, hy = q.y + 4;
        const uu = clamp(hu - (1 - tt) * 0.0 + (tt - 1) * 0.28 * (stage < 8 ? 1 : 0.4), 0.06, 1);
        const hh = { x: hx, y: hy, s: hsz * (0.78 + 0.22 * tt), rot: side * 14 + (r() - 0.5) * 8, u: uu };
        heads.push({ y: hy, els: [S_ped(q.x, q.y, hx, hy, stemC), ...fn(cx, hh, pp, ho)] });
      }
    } else if (sp.cluster) {
      const offs: [number, number, number][] = [[0, 0, 1], [-1, 0.75, 0.85], [1, 0.7, 0.82], [-0.5, -0.55, 0.78], [0.55, -0.6, 0.76]];
      const tip = qpt(st, 1);
      for (let k = Math.min(sp.cluster, offs.length) - 1; k >= 0; k--) {
        const [ox, oy, sc] = offs[k];
        const hh = { x: tip.x + ox * hsz * 0.75, y: tip.y + oy * hsz * 0.55, s: hsz * sc, rot: (sp.headRot ?? 0) + ox * 8, u: clamp(hu - k * 0.04, 0.08, 1) };
        heads.push({ y: hh.y + k * 0.01, els: fn(cx, hh, pp, ho) });
      }
    } else {
      const tip = qpt(st, 1);
      const rot = sp.headRot ?? (sp.head === 'spike' || sp.head === 'calla' || sp.head === 'iris' ? tip.a * 0.6 : sp.head === 'tulip' || sp.head === 'lotus' || sp.head === 'cup' ? tip.a * 0.3 : raw.t * 8);
      heads.push({ y: tip.y, els: fn(cx, { x: tip.x, y: tip.y, s: hsz, rot, u: hu }, pp, ho) });
    }
  }
  out.push(...leaves2);
  heads.sort((a, b) => a.y - b.y);
  for (const h of heads) out.push(...h.els);
  out.push(...front);
  return out;
}

function S_ped(x0: number, y0: number, x1: number, y1: number, c: string): El {
  return S_(`M${x0.toFixed(1)} ${y0.toFixed(1)} Q${(x0 + (x1 - x0) * 0.2).toFixed(1)} ${(y0 + (y1 - y0) * 0.9).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`, c);
}
function S_(d: string, c: string): El {
  return { t: 'path', a: { d, fill: 'none', stroke: c, strokeWidth: 1.1, strokeLinecap: 'round' } };
}

export { polar, mix, lighten, ease, C, G };
