import { HEADS, pal } from './heads';
import { drawLeaf } from './leaves';
import {
  C, Ctx, E, El, G, P, S, at, clamp, darken, ease, lerp, lighten, mix, polar, rng, shadow, shine, soil, stem,
} from './kit';

const f = (v: number) => (Math.round(v * 10) / 10).toString();
const gr = (stage: number, tab: number[]) => tab[Math.min(stage, tab.length - 1)];

/* =============================================================== cactus */

export interface CactusSpec {
  kind: 'pad' | 'barrel' | 'saguaro';
  body: { light: string; mid: string; deep: string };
  flower: string;
  flower2?: string;
  spine?: string;
  seed?: number;
}

function cactusFlower(cx: Ctx, C_: CactusSpec, x: number, y: number, s: number, u: number, rot = 0): El[] {
  const p = pal(C_.flower, { deep: darken(C_.flower, 0.35), light: C_.flower2 ?? lighten(C_.flower, 0.35) });
  return HEADS.cup(cx, { x, y, s, rot, u }, p, { n: 7, A: 62, len: 1.0, wid: 0.45, round: 0.55, seedpod: '#F4C542', calyx: false });
}

const PADS: [number, number, number, number, number][] = [
  [0, -24, 19, 26, 0], [-14, -60, 14, 20, -26], [17, -55, 13, 18, 36], [-30, -88, 11, 16, -52], [31, -77, 10, 14, 56],
];
const PAD_FLOWERS: [number, number, number][] = [[-36, -103, -35], [37, -90, 38], [-9, -78, -10], [20, -70, 20]];

function cactusPad(cx: Ctx, C_: CactusSpec, x: number, y: number, rx: number, ry: number, rot: number, k: number, sd: number): El[] {
  const b = C_.body;
  const r = rng(sd);
  const out: El[] = [];
  const el: El[] = [
    E(0, 0, rx, ry, cx.r(mix(b.light, b.mid, 0.4), b.deep, 0.4, 0.35, b.mid), { stroke: darken(b.deep, 0.3), strokeWidth: 0.8 }),
    E(-rx * 0.08, -ry * 0.06, rx * 0.72, ry * 0.74, cx.r(lighten(b.light, 0.15), b.mid, 0.4, 0.32)),
    E(0, 0, rx * 0.34, ry * 0.2, '#fff', { opacity: 0.16 }, at(-rx * 0.22, -ry * 0.28, -20)),
  ];
  let d = '';
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.82;
    const px = Math.cos(a) * rx * rr, py = Math.sin(a) * ry * rr;
    const dir = r() > 0.5 ? 1 : -1;
    d += `M${f(px)} ${f(py)} L${f(px - 1.6 * dir)} ${f(py - 2.6)} M${f(px)} ${f(py)} L${f(px + 1.4 * dir)} ${f(py - 2.2)} `;
  }
  el.push(S(d, C_.spine ?? '#6B3F1E', 0.7));
  out.push(G(el, at(x, y, rot, k)));
  return out;
}

function padCactus(cx: Ctx, C_: CactusSpec, stage: number, x = 0, sc = 1): El[] {
  const out: El[] = [];
  const nPads = gr(stage, [0, 0, 1, 1, 1, 3, 5, 5, 5]);
  const flowers = gr(stage, [0, 0, 0, 0, 0, 0, 0, 1, 4]);
  const scale0 = gr(stage, [0, 0, 0.5, 0.75, 1, 1, 1, 1, 1]);
  const young = stage === 5 ? 0.75 : 1;
  const body: El[] = [];
  for (let i = 0; i < nPads; i++) {
    const [px, py, rx, ry, rot] = PADS[i];
    const k = i === 0 ? scale0 : i >= 3 && stage === 5 ? 0 : young;
    if (k === 0) continue;
    if (i === 0 && scale0 < 1) body.push(...cactusPad(cx, C_, px, py * scale0 + 0, rx * scale0, ry * scale0, rot, 1, 3));
    else body.push(...cactusPad(cx, C_, px, py, rx, ry, rot, k, 3 + i));
  }
  const bloom: El[] = [];
  if (stage >= 6) {
    const bu = stage === 6 ? 0.42 : stage === 7 ? 0.72 : 1;
    PAD_FLOWERS.slice(0, stage === 8 ? 4 : stage === 7 ? 3 : 2).forEach(([fx, fy, rot], i) => {
      const u = stage === 7 ? (i === 0 ? 1 : 0.45) : stage === 8 ? 1 : i === 0 ? 0.62 : 0.4;
      bloom.push(...cactusFlower(cx, C_, fx, fy, 15, u, rot * 0.5));
    });
    void bu;
  }
  out.push(G([...body, ...bloom], at(x, 0, 0, sc)));
  return out;
}

function ribs(cx: Ctx, b: CactusSpec['body'], R: number, h: number, n: number): El[] {
  let d = '';
  for (let i = -Math.floor(n / 2); i <= Math.floor(n / 2); i++) {
    const t = i / (n / 2);
    d += `M0 ${f(-h * 2)} Q${f(R * 1.45 * t)} ${f(-h)} 0 0 `;
  }
  void cx; void b;
  return [S(d, '#000', 0.9, { opacity: 0.18 })];
}

function barrel(cx: Ctx, C_: CactusSpec, x: number, k: number, u: number, flowers: number): El[] {
  const b = C_.body;
  const R = 22, H = 22;
  const out: El[] = [];
  out.push(E(0, 2, R * 1.1, 4, '#000', { opacity: 0.15 }));
  out.push(E(0, -H, R, H, cx.r(mix(b.light, b.mid, 0.3), b.deep, 0.38, 0.3, b.mid), { stroke: darken(b.deep, 0.3), strokeWidth: 0.7 }));
  out.push(...ribs(cx, b, R, H, 7).map((e) => (e.t === 'path' ? { ...e, a: { ...e.a }, m: at(0, -H * 2 + H * 2, 0) } : e)));
  // ribs drawn from the crown (0,-2H) down to the base (0,0) — shift so they follow the body
  out.push(E(0, 0, R * 0.28, H * 0.22, '#fff', { opacity: 0.18 }, at(-R * 0.35, -H * 1.35, -25)));
  const r = rng(9);
  let d = '';
  for (let i = -3; i <= 3; i++) for (let j = 0; j < 3; j++) {
    const px = i * R * 0.27 * (1 - j * 0.02), py = -H * (0.5 + j * 0.62) + Math.abs(i) * 1.5;
    const w = (1 - Math.abs(px) / (R * 1.1)) * 3.4;
    d += `M${f(px)} ${f(py)} l${f(-w)} -2.4 M${f(px)} ${f(py)} l${f(w)} -2.4 M${f(px)} ${f(py)} l0 -3.2 `;
  }
  void r;
  out.push(S(d, C_.spine ?? '#F3E2A0', 0.8, { opacity: 0.95 }));
  const spots: [number, number, number][] = [[-9, -42, -20], [0, -45, 0], [9, -42, 20]];
  spots.slice(0, flowers).forEach(([fx, fy, rot]) => out.push(...cactusFlower(cx, C_, fx, fy, 12, u, rot)));
  return [G(out, at(x, 0, 0, k))];
}

function saguaro(cx: Ctx, C_: CactusSpec, x: number, k: number, hgt: number, arms: number, u: number): El[] {
  const b = C_.body;
  const H = 78 * hgt;
  const out: El[] = [];
  out.push(E(0, 2, 18, 4, '#000', { opacity: 0.15 }));
  const limbs: string[] = [`M0 -2 L0 ${f(-H)}`];
  const armL = `M0 ${f(-H * 0.4)} L-17 ${f(-H * 0.4)} L-17 ${f(-H * 0.68)}`;
  const armR = `M0 ${f(-H * 0.55)} L17 ${f(-H * 0.55)} L17 ${f(-H * 0.84)}`;
  if (arms >= 1) limbs.push(armL);
  if (arms >= 2) limbs.push(armR);
  for (const d of limbs) {
    out.push(S(d, darken(b.deep, 0.2), 15, { strokeLinejoin: 'round' }));
  }
  for (const d of limbs) out.push(S(d, b.mid, 12.5, { strokeLinejoin: 'round' }));
  for (const d of limbs) out.push(S(d, b.light, 5.5, { strokeLinejoin: 'round', opacity: 0.55 }, [1, 0, 0, 1, -1.6, 0]));
  // ribs
  out.push(S(`M-2 -4 L-2 ${f(-H + 4)} M3 -4 L3 ${f(-H + 4)}`, darken(b.deep, 0.3), 0.7, { opacity: 0.45 }));
  let sp = '';
  for (let i = 0; i < 9 * hgt; i++) sp += `M${i % 2 ? 4 : -4} ${f(-8 - i * 8)} l-1.6 -2 M${i % 2 ? 4 : -4} ${f(-8 - i * 8)} l1.6 -2 `;
  out.push(S(sp, C_.spine ?? '#F3E2A0', 0.7, { opacity: 0.9 }));
  if (u > 0) {
    out.push(...cactusFlower(cx, C_, 0, -H - 3, 12, u, 0));
    if (arms >= 1) out.push(...cactusFlower(cx, C_, -17, -H * 0.68 - 3, 10, u * 0.9, -10));
    if (arms >= 2) out.push(...cactusFlower(cx, C_, 17, -H * 0.84 - 3, 10, u * 0.9, 10));
  }
  return [G(out, at(x, 0, 0, k))];
}

export function drawCactus(cx: Ctx, C_: CactusSpec, stage: number): El[] {
  const out: El[] = [];
  if (stage === 0) return [shadow(cx, 14), ...soil(cx, 9, 3, -0.5)];
  out.push(shadow(cx, lerp(14, 34, clamp(stage / 7))));
  if (stage === 1) {
    out.push(...soil(cx, 10, 3.5, -0.5));
    const b = C_.body;
    out.push(E(0, 0, 4.2, 5.4, cx.r(b.light, b.deep, 0.4, 0.3), {}, at(-4, -4, -18)), E(0, 0, 4, 5.2, cx.r(b.light, b.deep, 0.4, 0.3), {}, at(4, -4, 18)));
    out.push(E(0, -8, 3.6, 4.8, cx.r(lighten(b.light, 0.15), b.mid, 0.4, 0.3)));
    return out;
  }
  if (stage <= 3) out.push(...soil(cx, 12, 3.5, -0.5));
  if (C_.kind === 'pad') return [...out, ...padCactus(cx, C_, stage)];
  if (C_.kind === 'barrel') {
    const k = gr(stage, [0, 0, 0.34, 0.5, 0.68, 0.85, 1, 1, 1]);
    const u = stage === 6 ? 0.42 : stage === 7 ? 0.8 : 1;
    const fl = stage < 6 ? 0 : 3;
    if (stage < 8) return [...out, ...barrel(cx, C_, 0, k, stage === 6 ? 0.42 : u, stage === 6 ? 2 : fl)];
    return [...out, ...barrel(cx, C_, -27, 0.58, 1, 3), ...barrel(cx, C_, 28, 0.5, 1, 2), ...barrel(cx, C_, 0, 0.92, 1, 3)];
  }
  const hgt = gr(stage, [0, 0, 0.28, 0.42, 0.62, 0.8, 0.95, 1, 1]);
  const arms = stage < 5 ? 0 : stage === 5 ? 1 : 2;
  const u = stage < 6 ? 0 : stage === 6 ? 0.42 : stage === 7 ? 0.75 : 1;
  if (stage < 8) return [...out, ...saguaro(cx, C_, 0, 1, hgt, arms, u)];
  return [...out, ...saguaro(cx, C_, -30, 0.62, 0.8, 1, 1), ...saguaro(cx, C_, 28, 0.55, 0.7, 1, 1), ...saguaro(cx, C_, 0, 0.95, 1, 2, 1)];
}

/* ============================================================== mushroom */

export interface MushSpec {
  kind: 'toad' | 'witch';
  cap: { light: string; mid: string; deep: string };
  stalk?: { light: string; deep: string };
  spot?: string;
  accent?: string;
}

function mush(cx: Ctx, M: MushSpec, x: number, k: number, u: number, size = 1): El[] {
  const out: El[] = [];
  const st = M.stalk ?? { light: '#FFF3DC', deep: '#D9B98F' };
  const c = M.cap;
  const g = size;
  const capW = 25 * g * lerp(0.5, 1, u), stalkH = 22 * g;
  out.push(E(0, 2, 24 * g, 4.5 * g, '#000', { opacity: 0.18 }));
  // stalk
  out.push(P(`M${f(-10 * g)} 1 C${f(-12 * g)} -4 ${f(-6.5 * g)} ${f(-stalkH * 0.7)} ${f(-5.6 * g)} ${f(-stalkH - 4)} L${f(5.6 * g)} ${f(-stalkH - 4)} C${f(6.5 * g)} ${f(-stalkH * 0.7)} ${f(12 * g)} -4 ${f(10 * g)} 1 C${f(4 * g)} 4 ${f(-4 * g)} 4 ${f(-10 * g)} 1Z`, cx.h(st.light, st.deep, mix(st.light, st.deep, 0.35))));
  out.push(E(-3 * g, -stalkH * 0.45, 1.6 * g, 2.4 * g, '#E6B9A0', { opacity: 0.55 }));
  out.push(E(3 * g, -stalkH * 0.7, 1.3 * g, 2 * g, '#E6B9A0', { opacity: 0.5 }));
  if (M.kind === 'toad') {
    const h = lerp(14, 17, u) * g, y = -stalkH - 2;
    // gills under the cap
    out.push(E(0, y + 1, capW * 0.96, 4.6 * g * u + 1.5, cx.v('#F3DFC0', '#BFA078')));
    const cap = `M${f(-capW)} ${f(y)} C${f(-capW)} ${f(y - h * 1.35)} ${f(capW)} ${f(y - h * 1.35)} ${f(capW)} ${f(y)} C${f(capW * 0.7)} ${f(y + 5 * g * u + 2)} ${f(-capW * 0.7)} ${f(y + 5 * g * u + 2)} ${f(-capW)} ${f(y)}Z`;
    out.push(P(cap, cx.v(c.light, c.deep, c.mid)));
    out.push(P(`M${f(-capW * 0.8)} ${f(y - h * 0.2)} C${f(-capW * 0.7)} ${f(y - h * 0.95)} ${f(-capW * 0.1)} ${f(y - h * 1.1)} ${f(capW * 0.2)} ${f(y - h * 1.05)} C${f(-capW * 0.3)} ${f(y - h * 0.8)} ${f(-capW * 0.55)} ${f(y - h * 0.4)} ${f(-capW * 0.8)} ${f(y - h * 0.2)}Z`, '#fff', { opacity: 0.2 }));
    const spots: [number, number, number][] = [[-0.45, -0.55, 3.4], [0.15, -0.8, 2.8], [0.55, -0.45, 3.2], [-0.1, -0.35, 2.2], [0.78, -0.18, 2], [-0.75, -0.2, 2.2]];
    for (const [sx, sy, r] of spots) out.push(E(sx * capW * 0.9, y + sy * h * 0.85, r * g * 1.1, r * g * 0.72, M.spot ?? '#FFF8EE', { opacity: 0.95 }));
  } else {
    // witch hat
    const y = -stalkH - 2;
    const w = capW * 1.08;
    out.push(E(0, y + 1, w, 5.6 * g, cx.v(c.mid, darken(c.deep, 0.3))));
    const hh = 34 * g * lerp(0.6, 1, u);
    out.push(P(`M${f(-w * 0.58)} ${f(y)} C${f(-w * 0.5)} ${f(y - hh * 0.5)} ${f(-w * 0.2)} ${f(y - hh * 0.85)} ${f(w * 0.12)} ${f(y - hh)} C${f(w * 0.3)} ${f(y - hh * 0.98)} ${f(w * 0.36)} ${f(y - hh * 0.88)} ${f(w * 0.42)} ${f(y - hh * 0.82)} C${f(w * 0.28)} ${f(y - hh * 0.6)} ${f(w * 0.45)} ${f(y - hh * 0.3)} ${f(w * 0.58)} ${f(y)} C${f(w * 0.3)} ${f(y + 3)} ${f(-w * 0.3)} ${f(y + 3)} ${f(-w * 0.58)} ${f(y)}Z`, cx.h(c.light, c.deep, c.mid)));
    out.push(P(`M${f(-w * 0.54)} ${f(y - hh * 0.16)} C${f(-w * 0.3)} ${f(y - hh * 0.06)} ${f(w * 0.3)} ${f(y - hh * 0.06)} ${f(w * 0.54)} ${f(y - hh * 0.16)} L${f(w * 0.5)} ${f(y - hh * 0.3)} C${f(w * 0.3)} ${f(y - hh * 0.2)} ${f(-w * 0.3)} ${f(y - hh * 0.2)} ${f(-w * 0.5)} ${f(y - hh * 0.3)}Z`, cx.v('#9A6A3A', '#4E2F1A')));
    out.push(P(`M${f(-w * 0.1)} ${f(y - hh * 0.28)} h${f(w * 0.2)} v${f(hh * 0.16)} h${f(-w * 0.2)}Z`, '#F2B233', { stroke: '#B27C14', strokeWidth: 0.5 }));
    out.push(P(`M${f(-w * 0.05)} ${f(y - hh * 0.24)} h${f(w * 0.1)} v${f(hh * 0.08)} h${f(-w * 0.1)}Z`, '#6E4A1E'));
    for (const [sx, sy, r] of [[-0.25, 0.55, 1.6], [0.1, 0.7, 1.2], [-0.35, 0.4, 1.2], [0.28, 0.45, 1.4]] as const) out.push(C(sx * w, y - hh * sy, r * g, lighten(c.mid, 0.3), { opacity: 0.6 }));
    out.push(P(`M${f(-w * 0.45)} ${f(y - hh * 0.4)} C${f(-w * 0.3)} ${f(y - hh * 0.7)} ${f(-w * 0.1)} ${f(y - hh * 0.85)} ${f(w * 0.05)} ${f(y - hh * 0.95)} C${f(-w * 0.1)} ${f(y - hh * 0.6)} ${f(-w * 0.25)} ${f(y - hh * 0.45)} ${f(-w * 0.45)} ${f(y - hh * 0.4)}Z`, '#fff', { opacity: 0.14 }));
  }
  return [G(out, at(x, 0, 0, k))];
}

function grass(cx: Ctx, x: number, k = 1): El[] {
  const l = { style: 'strap' as const, len: 9, c0: '#2F7A3A', c1: '#8CCB4E', wid: 1.4, bend: 0.2 };
  return [G([...drawLeaf(cx, l, at(-2, 0, -25)), ...drawLeaf(cx, { ...l, len: 11, bend: -0.1 }, at(0, 0, 5)), ...drawLeaf(cx, { ...l, len: 8, bend: -0.2 }, at(2, 0, 28))], at(x, 1, 0, k))];
}

export function drawMush(cx: Ctx, M: MushSpec, stage: number): El[] {
  const out: El[] = [];
  if (stage === 0) return [shadow(cx, 14), ...soil(cx, 9, 3, -0.5)];
  if (stage === 1) {
    out.push(shadow(cx, 14), ...soil(cx, 10, 3.5, -0.5));
    out.push(E(0, -4.5, 3.8, 5.2, cx.v(M.stalk?.light ?? '#FFF3DC', M.stalk?.deep ?? '#D9B98F')), E(0, -8, 4.4, 3.2, cx.v(M.cap.light, M.cap.deep)));
    return out;
  }
  if (stage <= 3) out.push(...soil(cx, 12, 3.5, -0.5));
  const size = gr(stage, [0, 0, 0.42, 0.58, 0.74, 0.88, 1, 1, 1]);
  const u = gr(stage, [0, 0, 0, 0.15, 0.35, 0.6, 0.85, 1, 1]);
  if (stage < 8) {
    out.push(...mush(cx, M, 0, 1, u, size));
    if (stage >= 6) out.push(...grass(cx, -22, 1), ...grass(cx, 24, 0.9));
    if (stage === 7) out.push(...mush(cx, M, 26, 1, 0.3, 0.35));
    return out;
  }
  out.push(...mush(cx, M, -30, 1, 0.9, 0.55), ...mush(cx, M, 32, 1, 0.9, 0.62), ...mush(cx, M, 0, 1, 1, 0.95));
  out.push(...grass(cx, -46, 0.9), ...grass(cx, 44, 1), ...grass(cx, -10, 0.8));
  out.push(...mush(cx, M, 16, 1, 0.8, 0.3), ...mush(cx, M, -17, 1, 0.8, 0.28));
  return out;
}

/* ================================================================ bamboo */

function culm(cx: Ctx, x: number, h: number, w: number, nodes: number, leafy: boolean, light: boolean): El[] {
  const out: El[] = [];
  const c0 = light ? '#5FA02C' : '#3F8A25', c1 = light ? '#A8D84A' : '#7CBF3A';
  out.push(P(`M${f(x - w)} 0 L${f(x - w)} ${f(-h)} L${f(x + w)} ${f(-h)} L${f(x + w)} 0 C${f(x + w)} 2 ${f(x - w)} 2 ${f(x - w)} 0Z`, cx.h(c0, darken(c0, 0.1), c1)));
  out.push(E(x, -h, w, w * 0.35, cx.v('#F3EC7A', '#B9C43A')));
  out.push(E(x, -h, w * 0.62, w * 0.2, '#6E8A22', { opacity: 0.65 }));
  const seg = h / (nodes + 1);
  for (let i = 1; i <= nodes; i++) {
    const y = -seg * i;
    out.push(E(x, y, w * 1.12, w * 0.3, cx.v('#E4E86A', '#8EA82C')));
    out.push(E(x, y + 0.6, w * 1.12, w * 0.22, '#4E7A1C', { opacity: 0.35 }));
  }
  out.push(S(`M${f(x - w * 0.45)} -2 L${f(x - w * 0.45)} ${f(-h + 3)}`, '#fff', Math.max(0.7, w * 0.22), { opacity: 0.28 }));
  if (leafy) {
    const l = { style: 'lance' as const, len: 24, c0: '#2F7A22', c1: '#8CCB4E', wid: 3.2, bend: 0.12 };
    for (let i = 1; i <= nodes; i += 1) {
      const y = -seg * i;
      const s = 0.55 + 0.05 * i;
      for (const a of [-62, -30, 38, 68]) out.push(...drawLeaf(cx, l, at(x + (a > 0 ? w : -w) * 0.6, y, a), s, a > 0 ? 0.1 : -0.1, a > 0 ? 1 : -1));
    }
  }
  return out;
}

function lantern(cx: Ctx, x: number, y: number, s: number): El[] {
  return [G([
    S('M0 -12 L0 -6', '#B8860B', 0.8),
    P('M-4.6 -6 h9.2 v2 h-9.2Z', cx.v('#F7D154', '#B8860B')),
    E(0, 2, 8.4, 8.6, cx.r('#FF6A4A', '#B3100E', 0.4, 0.35), { stroke: '#8E0C0C', strokeWidth: 0.4 }),
    P('M-3 -5.4 C-6.6 -2 -6.6 6 -3 9.6 M3 -5.4 C6.6 -2 6.6 6 3 9.6', '#8E0C0C', { opacity: 0.4, fill: 'none', stroke: '#8E0C0C', strokeWidth: 0.5 }),
    P('M-4.6 9.4 h9.2 v2 h-9.2Z', cx.v('#F7D154', '#B8860B')),
    S('M0 11.4 L0 18', '#D6281E', 0.9), C(0, 19.4, 1.5, '#E23A2B'),
    S('M-1 18 L-2 22 M1 18 L2 22', '#E23A2B', 0.7),
    shine(-3, -1, 1.8, 3.2, 10, 0.4),
  ], at(x, y, 0, s))];
}
function coin(cx: Ctx, x: number, y: number, s: number, rot = 0): El[] {
  return [G([
    E(0, 0, 5, 5, cx.r('#FFE680', '#D9A21A', 0.4, 0.35), { stroke: '#B27C14', strokeWidth: 0.5 }),
    P('M-1.6 -1.6 h3.2 v3.2 h-3.2Z', '#B27C14', { opacity: 0.85 }),
    E(0, 0, 1.5, 0.8, '#fff', { opacity: 0.5 }, at(-1.6, -1.8, -30)),
  ], at(x, y, rot, s, s * 0.9))];
}
function ingot(cx: Ctx, x: number, y: number, s: number): El[] {
  return [G([
    P('M-7 -2 C-7 -6 7 -6 7 -2 C8 1 5 4 3 4 L-3 4 C-5 4 -8 1 -7 -2Z', cx.v('#FFE680', '#D9A21A', '#F6C945'), { stroke: '#B27C14', strokeWidth: 0.4 }),
    E(0, -3, 4.2, 1.8, '#FFF3B0', { opacity: 0.75 }),
    E(-3, -4, 2, 0.8, '#fff', { opacity: 0.6 }),
  ], at(x, y, 0, s))];
}

export function drawBamboo(cx: Ctx, stage: number): El[] {
  const out: El[] = [];
  if (stage === 0) return [shadow(cx, 14), ...soil(cx, 9, 3, -0.5)];
  out.push(shadow(cx, lerp(14, 38, clamp(stage / 6))));
  if (stage <= 3) out.push(...soil(cx, 12, 3.5, -0.5));
  if (stage === 1) {
    out.push(P('M-3.4 0 C-3.4 -7 -1 -11 0 -14 C1 -11 3.4 -7 3.4 0Z', cx.h('#A8B55C', '#6E8A22')), S('M-3 -4 L3 -4 M-2.4 -8 L2.4 -8', '#5E7A1A', 0.5));
    return out;
  }
  if (stage === 2) {
    out.push(...culm(cx, 0, 24, 3.3, 1, false, true));
    out.push(...drawLeaf(cx, { style: 'lance', len: 12, c0: '#2F7A22', c1: '#8CCB4E', wid: 2.4 }, at(2, -20, 50)), ...drawLeaf(cx, { style: 'lance', len: 12, c0: '#2F7A22', c1: '#8CCB4E', wid: 2.4 }, at(-2, -18, -48)));
    return out;
  }
  const defs: [number, number, number, number][] = [[0, 78, 5.2, 3], [-15, 62, 4.4, 2], [15, 66, 4.6, 2], [-27, 44, 3.6, 1], [28, 48, 3.8, 1]];
  const n = gr(stage, [0, 0, 0, 1, 2, 3, 3, 3, 5]);
  const hs = gr(stage, [0, 0, 0, 0.55, 0.78, 0.95, 1, 1, 1]);
  const order = [1, 2, 0, 3, 4].filter((i) => i < Math.max(n, 1) + (n > 3 ? 2 : 0));
  const picked = (n >= 5 ? [0, 1, 2, 3, 4] : n === 3 ? [1, 0, 2] : n === 2 ? [1, 2] : [0]).slice(0, n);
  void order;
  const back = picked.slice().sort((a, b) => defs[b][1] - defs[a][1]);
  const fl = stage >= 5;
  for (const i of back) {
    const [x, h, w, nodes] = defs[i];
    out.push(...culm(cx, x, h * hs, w, Math.max(1, Math.round(nodes * (hs > 0.7 ? 1 : 0.7))), fl || stage >= 3, i % 2 === 0));
  }
  if (stage >= 6) {
    // red ribbon bow tying the culms
    out.push(P('M-18 -14 C-10 -17 10 -17 18 -14 L18 -9.5 C10 -12 -10 -12 -18 -9.5Z', cx.v('#F0483A', '#A8120E')));
    out.push(P('M0 -13 C-6 -22 -14 -20 -12 -14Z', cx.v('#F0483A', '#B3180F')), P('M0 -13 C6 -22 14 -20 12 -14Z', cx.v('#F0483A', '#B3180F')), C(0, -13, 2.2, '#C92016'));
    out.push(S('M-1 -12 L-3 -3 M1 -12 L3 -4', '#D6281E', 1.2));
  }
  if (stage >= 7) {
    out.push(...lantern(cx, 30, -52, 1), ...coin(cx, -26, -3, 0.9, 10), ...coin(cx, 24, -2, 0.8, -8), ...coin(cx, -10, 0, 0.8, 6));
  }
  if (stage >= 8) {
    out.push(S('M22 -66 Q30 -74 36 -64', '#8A5A1C', 1.1), ...lantern(cx, 40, -56, 0.8), ...ingot(cx, -30, 0, 1.1), ...ingot(cx, 34, 0, 0.9), ...coin(cx, 6, 1, 0.8, 4), ...coin(cx, -38, -1, 0.7, -12));
  }
  return out;
}

/* =============================================================== juniper */

export interface JuniperSpec { dark: string; light: string; berry: [string, string]; seed?: number }

function juniper(cx: Ctx, J: JuniperSpec, x: number, k: number, g: number, ripe: number): El[] {
  const out: El[] = [];
  const r = rng(J.seed ?? 3);
  out.push(E(0, 2, 36 * k, 6 * k, '#000', { opacity: 0.16 }));
  out.push(P('M-5 2 C-5 -8 -4 -16 -2 -26 L3 -26 C5 -16 5 -8 6 2Z', cx.h('#B8935A', '#6A4A26')));
  const tiers = 6;
  const leaves: { y: number; side: number; j: number; t: number }[] = [];
  const nT = Math.max(2, Math.round(tiers * g));
  for (let t = 0; t < nT; t++) for (let side = -1; side <= 1; side += 2) for (let j = 0; j < 3; j++) leaves.push({ y: -6 - t * 15, side, j, t });
  for (let t = 0; t < nT; t++) leaves.push({ y: -12 - t * 15, side: 0, j: 0, t });
  const berries: El[] = [];
  const sp: El[] = [];
  for (const L of leaves) {
    const tf = L.t / (tiers - 1);
    const reach = (1 - tf * 0.82) * 24;
    const len = lerp(26, 15, tf) * (0.9 + r() * 0.2);
    const col0 = mix(J.dark, J.light, tf * 0.5), col1 = mix(J.light, '#C9F27A', tf * 0.4);
    const x0 = L.side * (4 + L.j * reach * 0.34), y0 = L.y + (r() - 0.5) * 3 - L.j * 1.5;
    const ang = L.side === 0 ? (r() - 0.5) * 30 : L.side * (58 - L.j * 16 + (r() - 0.5) * 12);
    sp.push(...drawLeaf(cx, { style: 'lance', len, c0: col0, c1: col1, wid: len * 0.15, bend: 0.06 * (L.side || 1) }, at(x0, y0, ang), 1, (r() - 0.5) * 0.6, L.side || 1));
    if (L.side !== 0 && L.j === 2 && L.t % 2 === 1 && ripe >= 0) {
      const [bx, by] = polar(x0, y0, len * 0.6, ang);
      berries.push(C(bx, by, 3.4, cx.r(mix('#9CC85A', J.berry[0], ripe), mix('#5E9A36', J.berry[1], ripe), 0.38, 0.32), { stroke: mix('#3E6A22', J.berry[1], ripe), strokeWidth: 0.4 }), shine(bx - 1, by - 1, 1.1, 0.7, -20, 0.7));
    }
  }
  out.push(...sp, ...berries);
  return [G(out, at(x, 0, 0, k))];
}

export function drawJuniper(cx: Ctx, J: JuniperSpec, stage: number): El[] {
  const out: El[] = [];
  if (stage === 0) return [shadow(cx, 14), ...soil(cx, 9, 3, -0.5)];
  if (stage === 1) {
    out.push(shadow(cx, 14), ...soil(cx, 10, 3.5, -0.5));
    const l = { style: 'lance' as const, len: 12, c0: J.dark, c1: J.light, wid: 1.8 };
    out.push(...drawLeaf(cx, l, at(0, -1, -35)), ...drawLeaf(cx, l, at(0, -1, 35)), ...drawLeaf(cx, { ...l, len: 14 }, at(0, -1, 0)));
    return out;
  }
  if (stage <= 3) out.push(...soil(cx, 12, 3.5, -0.5));
  const g = gr(stage, [0, 0, 0.34, 0.5, 0.68, 0.85, 1, 1, 1]);
  const ripe = gr(stage, [0, 0, 0, 0, 0, 0.05, 0.4, 0.8, 1]);
  const k = gr(stage, [0, 0, 0.62, 0.7, 0.8, 0.9, 1, 1, 1]);
  if (stage < 8) {
    if (stage < 6) return [...out, ...juniperNoBerries(cx, J, k, g)];
    return [...out, ...juniper(cx, J, 0, k, g, ripe)];
  }
  return [...out, ...juniper(cx, { ...J, seed: 5 }, -30, 0.58, 1, 1), ...juniper(cx, { ...J, seed: 8 }, 31, 0.62, 1, 1), ...juniper(cx, J, 0, 0.9, 1, 1)];
}
function juniperNoBerries(cx: Ctx, J: JuniperSpec, k: number, g: number): El[] {
  return juniper(cx, J, 0, k, g, -1);
}

/* ============================================================ succulent */

export interface SuccSpec { leaf: { light: string; mid: string; deep: string }; tip: string; flower: string }

function rosette(cx: Ctx, S_: SuccSpec, x: number, y: number, R: number): El[] {
  const p = pal(S_.leaf.mid, { light: S_.leaf.light, deep: S_.leaf.deep });
  return HEADS.layered(cx, { x, y, s: R, rot: 0, u: 1 }, p, { rings: 4, per: [8, 7, 5, 4], round: 0.55, wid: 0.5, len: 1, squash: 0.68, tipC: S_.tip, swirl: false });
}

export function drawSucc(cx: Ctx, S_: SuccSpec, stage: number): El[] {
  const out: El[] = [];
  if (stage === 0) return [shadow(cx, 14), ...soil(cx, 9, 3, -0.5)];
  if (stage === 1) {
    out.push(shadow(cx, 14), ...soil(cx, 10, 3.5, -0.5));
    out.push(...drawLeaf(cx, { style: 'succ', len: 9, c0: S_.leaf.deep, c1: S_.leaf.light }, at(-2, -1, -28)), ...drawLeaf(cx, { style: 'succ', len: 9, c0: S_.leaf.deep, c1: S_.leaf.light }, at(2, -1, 28), 1, 0.15));
    return out;
  }
  out.push(shadow(cx, lerp(16, 36, clamp(stage / 7))));
  if (stage <= 3) out.push(...soil(cx, 12, 3.5, -0.5));
  const R = gr(stage, [0, 0, 8, 12, 16, 19, 20, 21, 22]);
  const stalk = (sx: number, sy0: number, side: number, h: number, u: number) => {
    const x1 = sx + side * 24, y1 = sy0 - h;
    const d = `M${sx} ${sy0} Q${sx + side * 2} ${sy0 - h * 1.1} ${x1} ${y1}`;
    const els: El[] = [...stem(cx, d, 1.5, '#6FA04A')];
    const pf = pal(S_.flower);
    for (let i = 0; i < 5; i++) {
      const t = 0.45 + i * 0.13;
      const mx = sx + (x1 - sx) * (t * t) + side * 1.5, my = sy0 + (y1 - sy0) * Math.min(1, t * 1.05);
      els.push(...HEADS.bell(cx, { x: mx + side * 2, y: my + 2, s: 6.2, rot: side * 10, u: clamp(u - i * 0.12 + 0.05, 0.1, 1) }, pf, { style: 'blue', len: 1.25, wid: 0.5 }));
    }
    return els;
  };
  if (stage >= 6) {
    out.push(...stalk(-6, -8, 1, 62, stage === 6 ? 0.5 : 1));
  }
  if (stage === 8) {
    out.push(...stalk(8, -8, -1, 50, 1));
    out.push(...rosette(cx, S_, -24, -12, 13), ...rosette(cx, S_, 26, -11, 12));
  }
  if (stage >= 5 && stage < 8) {
    out.push(...rosette(cx, S_, -22, -8, R * 0.4), ...rosette(cx, S_, 22, -7, R * 0.35));
  }
  out.push(...rosette(cx, S_, 0, -R * 0.66, R));
  return out;
}
