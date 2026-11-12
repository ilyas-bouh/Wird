import { drawLeaf } from './leaves';
import {
  C, Ctx, E, El, G, P, S, at, clamp, darken, ease, lerp, lighten, mix, polar, rng, shadow, shine, soil, starD, stem,
} from './kit';

const f = (v: number) => (Math.round(v * 10) / 10).toString();

export interface TreeSpec {
  kind: 'oak' | 'persimmon' | 'poinciana';
  canopy: { light: string; mid: string; deep: string };
  trunk?: { light: string; dark: string };
  fruit?: 'acorn' | 'lemon' | 'blossom' | 'persimmon' | 'flower';
  fruitC?: [string, string];
  seed?: number;
}

const TRUNK = { light: '#D39A5E', dark: '#8A5A33' };

function trunkEls(cx: Ctx, T: TreeSpec): El[] {
  const t = T.trunk ?? TRUNK;
  const out: El[] = [];
  out.push(P('M-22 3 C-13 0 -10 -8 -9.5 -20 C-9 -32 -11 -42 -15 -54 C-9 -49 -4 -45 0 -43 C4 -45 9 -49 15 -54 C11 -42 9 -32 9.5 -20 C10 -8 13 0 22 3 C11 5 -11 5 -22 3Z', cx.h(t.light, t.dark, mix(t.light, t.dark, 0.35))));
  out.push(S('M-4 -6 C-6 -18 -5 -30 -7 -42', t.dark, 1.1, { opacity: 0.45 }));
  out.push(S('M4 -4 C6 -16 5 -28 7 -38', t.dark, 0.9, { opacity: 0.35 }));
  out.push(S('M-14 1 C-10 -3 -9 -8 -8 -14', lighten(t.light, 0.3), 1.2, { opacity: 0.5 }));
  out.push(E(3, -22, 4.2, 5.4, darken(t.dark, 0.45), { opacity: 0.9 }));
  out.push(E(3, -21, 2.8, 3.8, darken(t.dark, 0.65), { opacity: 0.9 }));
  return out;
}

function canopyEls(cx: Ctx, T: TreeSpec, g: number): El[] {
  const c = T.canopy;
  const out: El[] = [];
  const k = lerp(0.35, 1, g);
  const lobe = (x: number, y: number, r: number, col: string, col2: string, fx = 0.38, fy = 0.3) =>
    C(x * k, -50 + (y + 50) * k, r * k, cx.r(col, col2, fx, fy));
  // back mass
  out.push(lobe(-24, -62, 22, c.mid, c.deep));
  out.push(lobe(25, -64, 22, c.mid, c.deep));
  out.push(lobe(0, -90, 24, c.mid, c.deep));
  out.push(lobe(0, -70, 31, mix(c.mid, c.light, 0.3), c.deep));
  out.push(lobe(-17, -84, 19, mix(c.mid, c.light, 0.3), c.mid));
  out.push(lobe(19, -83, 20, mix(c.mid, c.light, 0.35), c.mid));
  // front lobes (the light, puffy ones)
  out.push(lobe(-27, -56, 15, c.light, c.mid));
  out.push(lobe(25, -58, 17, c.light, c.mid));
  out.push(lobe(-5, -52, 14, mix(c.light, c.mid, 0.4), c.deep, 0.4, 0.3));
  // under-shadow crescents + top light
  out.push(E(0, -48 * k - 50 * (1 - k), 26 * k, 5 * k, c.deep, { opacity: 0.25 }));
  out.push(E(0, 0, 14 * k, 7 * k, lighten(c.light, 0.5), { opacity: 0.28 }, at(-8 * k, -50 - 46 * k, -20)));
  return out;
}

function acorn(cx: Ctx, x: number, y: number, s: number, ripe: number, c: [string, string]): El[] {
  const nut = mix('#8FBF55', c[0], ripe), nut2 = mix('#5E8F3A', c[1], ripe);
  return [G([
    P('M-3.6 0 C-4.6 4 -2 8 0 9 C2 8 4.6 4 3.6 0Z', cx.v(nut, nut2)),
    P('M-4.4 0.6 C-4.6 -4.6 4.6 -4.6 4.4 0.6 C2 2 -2 2 -4.4 0.6Z', cx.v('#8A5A33', '#4E2F1A')),
    S('M-3 -1.8 L3 0.2 M-3.6 -0.4 L1.6 1.1 M-1.8 -3.2 L3.8 -0.8', '#E9C79A', 0.35, { opacity: 0.35 }),
    shine(-1.4, 4.2, 1, 1.9, 10, 0.5),
  ], at(x, y, 0, s))];
}

function lemon(cx: Ctx, x: number, y: number, s: number, ripe: number, c: [string, string]): El[] {
  const a = mix('#A8D060', c[0], ripe), b = mix('#6FA83A', c[1], ripe);
  return [G([
    E(0, 0, 6.4, 4.6, cx.r(lighten(a, 0.35), b, 0.38, 0.32)),
    P('M5.6 -1.4 C8.4 -1.6 8.4 1.6 5.6 1.6Z', cx.v(a, b)),
    P('M-5.8 -1.4 C-8.4 -1.4 -8.4 1.4 -5.8 1.6Z', cx.v(a, b)),
    shine(-2, -2, 2.2, 1.1, -15, 0.6),
    S('M0 -4.4 L1 -7', '#4A7A2A', 0.8),
  ], at(x, y, 20, s))];
}

function blossom(cx: Ctx, x: number, y: number, s: number, c: [string, string], rot: number): El[] {
  return [G([
    P(starD(5, 6, 0.55), cx.r(c[0], c[1], 0.5, 0.5), { stroke: lighten(c[0], 0.2), strokeWidth: 0.3 }),
    C(0, 0, 1.3, '#F2C14E'),
    C(0.5, -0.5, 0.5, '#fff', { opacity: 0.8 }),
  ], at(x, y, rot, s))];
}

function persimmonFruit(cx: Ctx, x: number, y: number, s: number, ripe: number): El[] {
  const a = mix('#9CC85A', '#FF9A2B', ripe), b = mix('#5E9A36', '#E2571A', ripe);
  return [G([
    P('M-7.5 -2 C-8 -6.5 -3 -7.5 0 -6 C3 -7.5 8 -6.5 7.5 -2 C8.5 3 4 6.5 0 6.2 C-4 6.5 -8.5 3 -7.5 -2Z', cx.r(lighten(a, 0.3), b, 0.38, 0.32)),
    P('M-4 -6 L-1.6 -4 L0 -7.4 L1.6 -4 L4 -6 L2.6 -3 L0 -2.6 L-2.6 -3Z', cx.v('#9BB83A', '#4F7A22')),
    shine(-3.2, -2.2, 2.2, 1.2, -25, 0.55),
  ], at(x, y, 0, s))];
}

const FRUIT_POS: [number, number, number][] = [[-22, -66, 1], [10, -84, 1], [28, -56, 1], [-6, -58, 0.95], [22, -82, 0.9], [-30, -50, 0.9], [4, -72, 0.9], [-12, -88, 0.85]];

function fruitEls(cx: Ctx, T: TreeSpec, ripe: number, count: number, k: number): El[] {
  const out: El[] = [];
  const c = T.fruitC ?? ['#F0A860', '#C26A28'];
  for (let i = 0; i < Math.min(count, FRUIT_POS.length); i++) {
    const [x, y, s] = FRUIT_POS[i];
    const px = x * k, py = -50 + (y + 50) * k;
    if (T.fruit === 'acorn') out.push(...acorn(cx, px, py, s * k * 0.78, ripe, c as [string, string]));
    else if (T.fruit === 'lemon') out.push(...lemon(cx, px, py, 1.1 * k, ripe, ['#FFE24A', '#E0A800']));
    else if (T.fruit === 'blossom') out.push(...blossom(cx, px, py, 1.9 * k * (0.5 + 0.5 * ripe), c as [string, string], i * 37));
  }
  return out;
}

/** one oak-like tree centred at x=0, 0..-105 tall at scale 1 */
function oakTree(cx: Ctx, T: TreeSpec, g: number, ripe: number, fruits: number): El[] {
  const out: El[] = [];
  out.push(E(0, 2, 40 * lerp(0.5, 1, g), 8 * lerp(0.5, 1, g), '#000', { opacity: 0.17 }));
  out.push(...trunkEls(cx, T));
  out.push(...canopyEls(cx, T, g));
  if (fruits > 0) out.push(...fruitEls(cx, T, ripe, fruits, lerp(0.35, 1, g)));
  return out;
}

/** gnarled persimmon: twisted trunk, sparse teal leaves, big orange fruits */
function persimmonTree(cx: Ctx, T: TreeSpec, g: number, ripe: number, fruits: number): El[] {
  const out: El[] = [];
  const k = lerp(0.4, 1, g);
  out.push(E(0, 2, 36 * k, 6 * k, '#000', { opacity: 0.17 }));
  const body = G([
    P('M-22 4 C-12 2 -8 -4 -8 -14 C-8 -24 -18 -30 -14 -44 C-12 -54 -2 -56 6 -64 C2 -52 4 -46 10 -42 C16 -36 14 -28 8 -22 C4 -16 6 -8 12 -2 C16 1 22 3 26 4 C14 6 -12 6 -22 4Z', cx.h('#8A8A4A', '#4E4A26', '#6F6A36')),
    S('M-2 -4 C-4 -16 -10 -26 -8 -40', '#3A361C', 1.1, { opacity: 0.45 }),
    S('M10 -6 C6 -14 8 -22 12 -30', '#B9B870', 1.2, { opacity: 0.35 }),
    E(-3, -18, 2.2, 3.2, '#2A2814', { opacity: 0.85 }),
    P('M-6 -44 C-18 -54 -30 -52 -36 -60 C-30 -50 -20 -46 -10 -40Z', '#5E5A2E'),
    P('M8 -52 C20 -60 32 -58 38 -68 C32 -56 22 -50 12 -46Z', '#5E5A2E'),
  ], at(0, 0, 0, k));
  out.push(body);
  // leaves
  const r = rng(11);
  const leafSpots: [number, number][] = [[-34, -62], [-26, -48], [-40, -52], [34, -68], [26, -52], [40, -58], [6, -70], [-8, -66], [18, -74], [-18, -72]];
  const nLeaf = Math.round(leafSpots.length * lerp(0.4, 1, g));
  for (let i = 0; i < nLeaf; i++) {
    const [x, y] = leafSpots[i];
    out.push(...drawLeaf(cx, { style: 'lance', len: 13 * k, c0: '#2F8F78', c1: '#76D9B0', wid: 4.6 * k }, at(x * k, y * k, (r() - 0.5) * 140 + (x > 0 ? 40 : -40)), 1, (r() - 0.5) * 0.5));
  }
  const spots: [number, number, number][] = [[-30, -56, 1.15], [-20, -44, 0.95], [30, -60, 1.2], [20, -48, 1], [4, -64, 1.1], [-8, -34, 0.9], [14, -36, 0.9], [38, -46, 0.8]];
  for (let i = 0; i < Math.min(fruits, spots.length); i++) {
    const [x, y, s] = spots[i];
    out.push(...persimmonFruit(cx, x * k, y * k, s * k * 1.1, clamp(ripe - i * 0.04)));
  }
  // fallen leaves
  if (g > 0.6) for (const [x, y, rot] of [[-30, 0, -20], [-18, 3, 30], [26, 2, 10], [38, 1, -30]] as const) out.push(...drawLeaf(cx, { style: 'lance', len: 8, c0: '#2F8F78', c1: '#76D9B0', wid: 2.8 }, at(x, y, rot + 80)));
  return out;
}

/** royal poinciana: umbrella crown of flame-red flowers over feathery leaves, twisting trunk */
function poincianaTree(cx: Ctx, T: TreeSpec, g: number, ripe: number, fruits: number): El[] {
  const out: El[] = [];
  const k = lerp(0.4, 1, g);
  out.push(E(0, 2, 44 * k, 7 * k, '#000', { opacity: 0.17 }));
  out.push(P('M-20 4 C-8 2 -6 -6 -8 -14 C-10 -24 2 -30 -2 -40 C-6 -48 -4 -52 0 -56 C6 -48 10 -44 8 -36 C6 -28 -2 -22 2 -14 C4 -8 8 0 24 4 C10 6 -10 6 -20 4Z', cx.h('#E9923A', '#A55A1C', '#C77427')));
  const trunkTop = G([], at(0, 0, 0, 1));
  void trunkTop;
  const body: El[] = [];
  const kk = k;
  const lobe = (x: number, y: number, rx: number, ry: number, a: string, b: string) => E(x * kk, -62 + (y + 62) * kk, rx * kk, ry * kk, cx.r(a, b, 0.4, 0.32));
  // feathery green under-leaves
  const r = rng(5);
  const frond = (x: number, y: number, rot: number) =>
    G([
      S('M0 0 Q4 6 3 16', '#3E8A33', 0.9),
      ...Array.from({ length: 6 }, (_, i) => E(0, 0, 2.2, 1, i % 2 ? '#52B043' : '#3F9A3A', {}, at(i % 2 ? 2.2 : -2.2, 2.4 + i * 2.5, i % 2 ? 40 : -40))),
    ], at(x * kk, -62 + (y + 62) * kk, rot, kk * 1.1));
  for (const [x, y, rot] of [[-36, -50, 8], [34, -50, -8], [-16, -46, 0], [16, -46, 0]] as const) body.push(frond(x, y, rot));
  body.push(lobe(-30, -64, 22, 14, '#EE4A22', '#A81818'));
  body.push(lobe(30, -64, 22, 14, '#EE4A22', '#A81818'));
  body.push(lobe(0, -72, 34, 18, '#F0572A', '#A21616'));
  body.push(lobe(-16, -82, 22, 12, '#F46B33', '#B42018'));
  body.push(lobe(18, -82, 22, 12, '#F46B33', '#B42018'));
  body.push(lobe(-4, -60, 24, 10, '#FF7A3A', '#C22A18'));
  body.push(E(-6 * kk, -88 * kk - 62 * (1 - kk) * 0.2, 16 * kk, 5 * kk, '#FFB070', { opacity: 0.35 }));
  out.push(...body);
  const nFl = Math.round(26 * clamp(0.4 + ripe * 0.6));
  for (let i = 0; i < nFl; i++) {
    const a = r() * 360, rr = Math.sqrt(r());
    const x = Math.sin((a * Math.PI) / 180) * 44 * rr * kk, y = -66 * kk - 62 * (1 - kk) + Math.cos((a * Math.PI) / 180) * 17 * rr * kk * 1.1 - 6 * kk;
    out.push(G([
      P(starD(5, 6.5, 0.5), cx.r('#FFB347', '#E8321E', 0.5, 0.5), { stroke: '#FFD9A0', strokeWidth: 0.25 }),
      S('M0 0 L2.5 -4 M0 0 L-1 -5', '#FFE3B0', 0.5),
      C(2.5, -4, 0.7, '#FFD54F'),
    ], at(x, y, r() * 360, kk * 1.25)));
  }
  // dropped petals
  if (g > 0.7) for (const [x, y] of [[-26, 1], [-10, 4], [20, 3], [34, 1], [8, 5]] as const) out.push(E(x, y, 1.8, 1, '#E8421E', { opacity: 0.9 }));
  void fruits;
  return out;
}

const STAGE_TREE = [
  null,
  null,
  null,
  { g: 0.0, ripe: 0, fruits: 0, sc: 1 },
  { g: 0.55, ripe: 0, fruits: 0, sc: 0.56 },
  { g: 0.85, ripe: 0, fruits: 0, sc: 0.78 },
  { g: 1, ripe: 0.1, fruits: 6, sc: 1 },
  { g: 1, ripe: 0.65, fruits: 6, sc: 1 },
  { g: 1, ripe: 1, fruits: 6, sc: 1 },
] as const;

export function drawTree(cx: Ctx, T: TreeSpec, stage: number): El[] {
  const out: El[] = [];
  if (stage === 0) return [shadow(cx, 14), ...soil(cx, 9, 3, -0.5)];
  if (stage === 1) {
    out.push(shadow(cx, 14), ...soil(cx, 10, 3.5, -0.5));
    out.push(...stem(cx, 'M0 -1 Q-1 -8 0 -13', 2.3, '#7A9A3E'));
    const l = { style: 'round' as const, len: 10, c0: T.canopy.deep, c1: T.canopy.light, wid: 5 };
    out.push(...drawLeaf(cx, l, at(0, -10, -62)), ...drawLeaf(cx, l, at(0, -10, 62), 1, 0.15), ...drawLeaf(cx, { ...l, len: 6, wid: 3 }, at(0, -13, 0), 1, 0.2));
    return out;
  }
  if (stage === 2) {
    out.push(shadow(cx, 18), ...soil(cx, 11, 3.5, -0.5));
    out.push(...stem(cx, 'M0 -1 Q-2 -14 0 -28', 2.8, T.trunk?.dark ?? '#8A5A33'));
    const l = { style: 'blade' as const, len: 15, c0: T.canopy.deep, c1: T.canopy.light, wid: 5.5 };
    for (const [y, a, s] of [[-12, -55, 0.8], [-12, 55, 0.8], [-20, -48, 0.95], [-21, 50, 0.95], [-28, 0, 0.85]] as const) out.push(...drawLeaf(cx, l, at(0, y, a), s, a > 0 ? 0.1 : -0.05));
    return out;
  }
  const S_ = STAGE_TREE[stage]!;
  const make = T.kind === 'persimmon' ? persimmonTree : T.kind === 'poinciana' ? poincianaTree : oakTree;
  if (stage < 8) {
    if (stage === 3) {
      // sapling: slim trunk, tiny puff of leaves
      out.push(E(0, 2, 18, 4, '#000', { opacity: 0.16 }));
      out.push(...stem(cx, 'M0 0 Q-1.5 -14 0 -28', 4.6, T.trunk?.dark ?? '#8A5A33', T.trunk?.light));
      out.push(S('M0 -14 Q6 -18 9 -24', T.trunk?.dark ?? '#8A5A33', 1.8));
      const c = T.canopy;
      out.push(C(-9, -34, 9, cx.r(c.mid, c.deep)), C(9, -35, 9.5, cx.r(c.mid, c.deep)), C(0, -44, 11, cx.r(c.light, c.mid)), C(-4, -31, 7, cx.r(c.light, c.mid)), C(7, -30, 6.5, cx.r(c.light, c.mid)));
      return out;
    }
    const sc = lerp(0.6, 1, ease(S_.g));
    out.push(G(make(cx, T, S_.g, S_.ripe, S_.fruits), at(0, 0, 0, S_.sc)));
    return out;
    void sc;
  }
  // stage 8: a grove of three
  out.push(G(make(cx, { ...T, seed: 2 }, 1, 1, 4), at(-35, 0, 0, 0.47)));
  out.push(G(make(cx, { ...T, seed: 3 }, 1, 1, 4), at(35, 0, 0, 0.47)));
  out.push(G(make(cx, T, 1, 1, 6), at(0, 0, 0, 0.92)));
  // windfall
  if (T.fruit === 'acorn') for (const [x, y] of [[-14, 1], [10, 3], [26, 1], [-36, 2]] as const) out.push(...acorn(cx, x, y, 0.8, 1, (T.fruitC ?? ['#F0A860', '#C26A28']) as [string, string]));
  if (T.fruit === 'blossom') for (const [x, y, r] of [[-18, 1, 20], [8, 4, 70], [24, 1, 110], [-40, 3, 40], [40, 3, 10]] as const) out.push(...blossom(cx, x, y, 0.6, (T.fruitC ?? ['#FFE0EA', '#F59BB8']) as [string, string], r));
  return out;
}
