import { C, Ctx, E, El, G, Matrix, P, S, at, bladeD, bladeHalfD, darken, lighten, mix, polar, veinD } from './kit';

export type LeafStyle = 'blade' | 'lance' | 'strap' | 'sword' | 'broad' | 'succ' | 'round' | 'serr' | 'palm' | 'frond';

export interface LeafSpec {
  style: LeafStyle;
  len: number;          // length at full size
  c0: string;           // colour at the base
  c1: string;           // colour at the tip
  wid?: number;         // half width override (else derived from style)
  bend?: number;        // tip curl (fraction of len), arching leaves
}

const f = (v: number) => (Math.round(v * 10) / 10).toString();

export function leafDims(s: LeafSpec): { w: number; bend: number; base: number; sharp: number } {
  const L = s.len;
  switch (s.style) {
    case 'lance': return { w: s.wid ?? L * 0.17, bend: s.bend ?? 0.08, base: 0.38, sharp: 1 };
    case 'strap': return { w: s.wid ?? L * 0.075, bend: s.bend ?? 0.28, base: 0.3, sharp: 1 };
    case 'sword': return { w: s.wid ?? L * 0.1, bend: s.bend ?? 0.1, base: 0.35, sharp: 1 };
    case 'broad': return { w: s.wid ?? L * 0.38, bend: s.bend ?? 0.05, base: 0.45, sharp: 1 };
    case 'succ': return { w: s.wid ?? L * 0.42, bend: s.bend ?? 0.04, base: 0.6, sharp: 0.7 };
    case 'round': return { w: s.wid ?? L * 0.5, bend: s.bend ?? 0.02, base: 0.55, sharp: 0.6 };
    case 'palm': return { w: s.wid ?? L * 0.24, bend: s.bend ?? 0.06, base: 0.5, sharp: 1 };
    default: return { w: s.wid ?? L * 0.3, bend: s.bend ?? 0.1, base: 0.42, sharp: 1 };
  }
}

/** serrated outline (mint, nettle-like) pointing up */
function serrD(L: number, W: number, bend: number): string {
  const k = 9;
  const right: string[] = [], left: string[] = [];
  for (let i = 1; i <= k; i++) {
    const t = i / k;
    const wy = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.8) * W * (1 - t * 0.1);
    const y = -L * t, bx = bend * L * t * t;
    const out = i % 2 ? 1 : 0.86;
    right.push(`L${f(bx + wy * out)} ${f(y + (i % 2 ? L * 0.02 : 0))}`);
    left.push(`L${f(bx - wy * out)} ${f(y + (i % 2 ? L * 0.02 : 0))}`);
  }
  return `M0 0 ${right.join(' ')} L${f(bend * L)} ${f(-L)} ${left.reverse().join(' ')} Z`;
}

/** side veins for broad / serrated leaves */
function sideVeins(L: number, W: number, bend: number, n = 4): string {
  let d = '';
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const y = -L * t, bx = bend * L * t * t * 0.9;
    const w = W * Math.sin(Math.PI * Math.pow(t, 0.75)) * 0.8;
    d += `M${f(bx)} ${f(y)} L${f(bx + w)} ${f(y - L * 0.1)} M${f(bx)} ${f(y)} L${f(bx - w)} ${f(y - L * 0.1)} `;
  }
  return d;
}

/** draw one leaf of this style at `m`; `shade` -1..1 shifts it darker/lighter for variety */
export function drawLeaf(cx: Ctx, spec: LeafSpec, m: Matrix, size = 1, shade = 0, flip = 1): El[] {
  const d = leafDims({ ...spec, len: spec.len * size, wid: spec.wid ? spec.wid * size : undefined });
  const L = spec.len * size;
  const c0 = shade > 0 ? lighten(spec.c0, shade * 0.3) : darken(spec.c0, -shade * 0.3);
  const c1 = shade > 0 ? lighten(spec.c1, shade * 0.3) : darken(spec.c1, -shade * 0.3);
  const bend = d.bend * flip;
  const body = spec.style === 'serr' ? serrD(L, d.w, bend) : bladeD(L, d.w, bend, d.base, d.sharp);
  const els: El[] = [P(body, cx.v(c1, c0, mix(c0, c1, 0.55)))];
  // lit half
  els.push(P(bladeHalfD(L, d.w, bend, d.base), lighten(c1, 0.35), { opacity: 0.3 }));
  // dark rim on the shaded side
  els.push(S(veinD(L, bend), darken(c0, 0.25), Math.max(0.5, d.w * 0.06 + 0.2), { opacity: 0.5 }));
  if (spec.style === 'serr' || spec.style === 'broad' || spec.style === 'palm') {
    els.push(S(sideVeins(L, d.w, bend, spec.style === 'palm' ? 6 : 4), darken(c0, 0.1), 0.4, { opacity: 0.35 }));
  }
  if (spec.style === 'succ') els.push(E(0, 0, d.w * 0.25, L * 0.18, '#fff', { opacity: 0.18 }, at(-d.w * 0.2, -L * 0.55, 10)));
  return [G(els, m)];
}

/** lotus / water-lily pad seen at a slant, centred at (x, y) */
export function pad(cx: Ctx, x: number, y: number, r: number, c0: string, c1: string, tilt = 0.45, rot = 0, notch = true): El[] {
  const k = 14;
  const pts: string[] = [];
  for (let i = 0; i <= k; i++) {
    const a = (i / k) * 360;
    const wob = 1 + (i % 2 ? 0.07 : -0.03) * 0.8;
    const [px, py] = polar(0, 0, r * wob, a + 180);
    pts.push(`${i ? 'L' : 'M'}${f(px)} ${f(py)}`);
  }
  const rim = pts.join(' ') + 'Z';
  const out: El[] = [P(rim, cx.r(c1, c0, 0.45, 0.42, mix(c0, c1, 0.5)), { stroke: darken(c0, 0.2), strokeWidth: 0.5, strokeOpacity: 0.6 })];
  let veins = '';
  for (let i = 0; i < 12; i++) {
    const [px, py] = polar(0, 0, r * 0.95, i * 30 + 15);
    veins += `M0 0 L${f(px)} ${f(py)} `;
  }
  out.push(S(veins, darken(c0, 0.3), 0.5, { opacity: 0.35 }));
  out.push(E(-r * 0.15, -r * 0.2, r * 0.45, r * 0.25, '#fff', { opacity: 0.12 }));
  return [G(out, at(x, y, rot, 1, tilt))];
}

/** a leaf cluster for conifer-like sprigs (juniper) — small needle fans */
export function sprig(cx: Ctx, c0: string, c1: string, len: number, n = 5): El[] {
  const out: El[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * 24;
    out.push(...drawLeaf(cx, { style: 'lance', len: len * (1 - Math.abs(a) * 0.004), c0, c1, wid: len * 0.13 }, at(0, 0, a)));
  }
  return out;
}
export { C };
