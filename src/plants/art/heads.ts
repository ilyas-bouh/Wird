import {
  C, Ctx, E, El, G, P, S, at, clamp, darken, ease, fromHsl, hsl, lerp, lighten, mix, polar, rng, shift, shine, starD,
} from './kit';

/** Colour ramp for a flower: tip colour, body colour, deep shade (base / shadow). */
export interface Pal { light: string; mid: string; deep: string; core?: string; core2?: string; accent?: string }

export function pal(base: string, o: Partial<Pal> = {}): Pal {
  const [h, s0, l] = hsl(base);
  const colourful = s0 > 0.25 && l < 0.85;
  const s = colourful ? Math.min(1, s0 * 1.12 + 0.04) : s0;
  return {
    light: o.light ?? fromHsl(h + 4, s * 0.92, Math.min(0.92, l + 0.16)),
    mid: colourful ? fromHsl(h, s, Math.max(0.42, Math.min(0.62, l))) : base,
    deep: o.deep ?? fromHsl(h - 9, Math.min(1, s * 1.1), l * 0.58),
    core: o.core, core2: o.core2, accent: o.accent,
  };
}

/** Where and how big one flower is. `u` is its life: 0..0.5 closed bud (colour creeping in), 0.5..1 opening to full bloom. */
export interface Head { x: number; y: number; s: number; rot: number; u: number }
export type HeadFn = (cx: Ctx, h: Head, p: Pal, o: any) => El[];

const f = (v: number) => (Math.round(v * 10) / 10).toString();
const SEPAL = '#5FA845';
const SEPAL_D = '#2F7A3A';

/** petal path with its base at (0,-r0) pointing up. round: 0 pointed .. 1 round-tipped. bend: tip leans sideways (fraction of len). */
export function petalD(L: number, W: number, round = 0.5, r0 = 0, bend = 0): string {
  const y0 = -r0, y1 = -r0 - L, sh = y0 - L * 0.55, bx = bend * L;
  const tw = W * 0.6 * round;
  return (
    `M0 ${f(y0)} C${f(-W * 0.5)} ${f(y0 - L * 0.05)} ${f(-W)} ${f(y0 - L * 0.3)} ${f(-W + bx * 0.4)} ${f(sh)}` +
    ` C${f(-W + bx * 0.6)} ${f(y0 - L * (0.7 + 0.2 * round))} ${f(-tw + bx)} ${f(y1)} ${f(bx)} ${f(y1)}` +
    ` C${f(tw + bx)} ${f(y1)} ${f(W + bx * 0.6)} ${f(y0 - L * (0.7 + 0.2 * round))} ${f(W + bx * 0.4)} ${f(sh)}` +
    ` C${f(W)} ${f(y0 - L * 0.3)} ${f(W * 0.5)} ${f(y0 - L * 0.05)} 0 ${f(y0)}Z`
  );
}
/** a petal as 1-2 elements: gradient body + soft lit edge */
export function petal(cx: Ctx, L: number, W: number, p: Pal, o: { round?: number; r0?: number; bend?: number; tip?: string; base?: string; rim?: boolean; vein?: boolean } = {}, m?: ReturnType<typeof at>): El[] {
  const d = petalD(L, W, o.round ?? 0.5, o.r0 ?? 0, o.bend ?? 0);
  const out: El[] = [P(d, cx.v(o.tip ?? p.light, o.base ?? p.deep, p.mid), o.rim === false ? {} : { stroke: darken(p.deep, 0.15), strokeWidth: 0.45, strokeOpacity: 0.22 }, m)];
  if (o.vein) out.push(S(`M0 ${f(-(o.r0 ?? 0) - L * 0.08)} L${f((o.bend ?? 0) * L * 0.8)} ${f(-(o.r0 ?? 0) - L * 0.85)}`, p.deep, Math.max(0.4, W * 0.05), { opacity: 0.28 }, m));
  return out;
}

/** the closed bud every flower starts as: green sepals, colour creeping up from the tip */
export function bud(cx: Ctx, h: Head, p: Pal, o: { w?: number; len?: number } = {}): El[] {
  const g = clamp(h.u / 0.5);
  const sz = h.s * lerp(0.42, 0.78, g);
  const w = sz * 0.55 * (o.w ?? 1), len = sz * 1.15 * (o.len ?? 1);
  const tint = ease((g - 0.35) / 0.65);
  const top = mix(SEPAL, p.mid, tint);
  const mid = mix(SEPAL, p.deep, tint * 0.75);
  const body = `M0 0 C${f(-w * 1.2)} ${f(-len * 0.08)} ${f(-w * 1.1)} ${f(-len * 0.7)} 0 ${f(-len)} C${f(w * 1.1)} ${f(-len * 0.7)} ${f(w * 1.2)} ${f(-len * 0.08)} 0 0Z`;
  const out: El[] = [P(body, cx.v(mix(SEPAL, p.light, tint), SEPAL_D, top), {}, undefined)];
  out.push(P(`M0 ${f(-len * 0.3)} C${f(-w * 0.3)} ${f(-len * 0.5)} ${f(-w * 0.2)} ${f(-len * 0.8)} 0 ${f(-len * 0.95)} C${f(w * 0.5)} ${f(-len * 0.75)} ${f(w * 0.4)} ${f(-len * 0.45)} 0 ${f(-len * 0.3)}Z`, '#FFFFFF', { opacity: 0.16 + 0.1 * tint }));
  // two sepals hugging the base
  out.push(P(`M0 0 C${f(-w * 1.3)} ${f(-len * 0.1)} ${f(-w * 1.5)} ${f(-len * 0.5)} ${f(-w * 0.9)} ${f(-len * 0.62)} C${f(-w * 0.9)} ${f(-len * 0.35)} ${f(-w * 0.4)} ${f(-len * 0.15)} 0 0Z`, cx.v(SEPAL, SEPAL_D)));
  out.push(P(`M0 0 C${f(w * 1.3)} ${f(-len * 0.1)} ${f(w * 1.5)} ${f(-len * 0.5)} ${f(w * 0.9)} ${f(-len * 0.62)} C${f(w * 0.9)} ${f(-len * 0.35)} ${f(w * 0.4)} ${f(-len * 0.15)} 0 0Z`, cx.v(mix(SEPAL, '#CDEB8B', 0.3), SEPAL_D)));
  return [G(out, at(h.x, h.y, h.rot))];
}

const closedBud = (cx: Ctx, h: Head, p: Pal, o: any) => bud(cx, h, p, o?.bud);

/* ================================================================== daisy */

export interface DaisyO {
  n: number; rings?: number; len?: number; wid?: number; core?: number; coreC?: [string, string]; dots?: number;
  squash?: number; round?: number; bend?: number; seeds?: boolean; notch?: boolean; ray?: boolean;
}
/** radial flower seen face-on: calendula, sunflower, gerbera, cosmos, aster, chamomile, dandelion */
export const daisy: HeadFn = (cx, h, p, o: DaisyO) => {
  if (h.u < 0.5) return closedBud(cx, h, p, o);
  const v = ease((h.u - 0.5) / 0.5);
  const s = h.s * lerp(0.55, 1, v);
  const rings = o.rings ?? 2, len = (o.len ?? 0.95) * s, wid = (o.wid ?? 0.28) * s, core = (o.core ?? 0.3) * s;
  const out: El[] = [];
  const r = rng(Math.round(h.x * 7 + h.y * 13));
  for (let k = rings - 1; k >= 0; k--) {
    const n = o.n + (rings - 1 - k) * 0;
    const kk = k / Math.max(1, rings - 1 || 1);
    const lk = len * (1 - kk * 0.18), off = (k * 360) / n / 2;
    const pc = k === 0 ? p : { light: mix(p.light, p.mid, 0.4), mid: darken(p.mid, 0.12), deep: darken(p.deep, 0.1) };
    for (let i = 0; i < n; i++) {
      const a = off + (i * 360) / n + (r() - 0.5) * 5;
      const L = lk * (0.9 + r() * 0.2);
      out.push(...petal(cx, L, wid, pc, { round: o.round ?? 0.8, r0: core * 0.7, bend: (o.bend ?? 0) * (i % 2 ? 1 : -1) }, at(0, 0, a)));
    }
  }
  // disc
  const c0 = o.coreC?.[0] ?? '#8A4B1E', c1 = o.coreC?.[1] ?? '#4A2410';
  out.push(C(0, 0, core * 1.05, cx.r(c0, c1, 0.4, 0.35)));
  const dots = o.dots ?? 9;
  for (let i = 0; i < dots; i++) {
    const rr = Math.sqrt((i + 0.5) / dots) * core * 0.8, a = i * 137.5;
    const [px, py] = polar(0, 0, rr, a);
    out.push(C(px, py, core * (o.seeds ? 0.13 : 0.16), lighten(c0, 0.25), { opacity: 0.75 }));
  }
  out.push(E(-core * 0.3, -core * 0.35, core * 0.35, core * 0.2, '#fff', { opacity: 0.22 }, at(0, 0, -30)));
  return [G(out, at(h.x, h.y, h.rot, 1, o.squash ?? 0.86))];
};

/* =============================================================== layered */

export interface LayeredO {
  rings: number; per: number[]; round?: number; wid?: number; len?: number; bend?: number; squash?: number;
  swirl?: boolean; center?: string; curl?: number; tipC?: string;
}
/** many overlapping rings of petals seen from above: rose, dahlia, peony, camellia, ranunculus, zinnia, chrysanthemum */
export const layered: HeadFn = (cx, h, p, o: LayeredO) => {
  if (h.u < 0.5) return closedBud(cx, h, p, o);
  const v = ease((h.u - 0.5) / 0.5);
  const s = h.s * lerp(0.6, 1, v);
  const out: El[] = [];
  const shown = Math.max(2, Math.ceil(lerp(Math.min(3, o.rings), o.rings, v)));
  // soft contact shadow so the head lifts off the foliage
  out.push(E(0, s * 0.1, s * 1.02, s * 0.9, '#000', { opacity: 0.12 }));
  for (let k = 0; k < shown; k++) {
    const rk = 1 - (k / o.rings) * 0.82;
    const n = o.per[k] ?? 4;
    const L = s * rk * (o.len ?? 0.98);
    const W = Math.min(s * rk * (o.wid ?? 0.72), (Math.PI * 2 * L * 0.5) / n * 1.5);
    const tone = k / o.rings;
    const pc: Pal = {
      light: mix(p.light, p.mid, tone * 0.7),
      mid: mix(p.mid, p.deep, tone * 0.45),
      deep: mix(p.deep, darken(p.deep, 0.3), tone * 0.5),
    };
    const off = k * 41 + (k % 2) * (180 / n);
    for (let i = 0; i < n; i++) {
      const a = off + (i * 360) / n;
      out.push(...petal(cx, L, W, pc, { round: o.round ?? 0.95, r0: L * 0.08, bend: (o.bend ?? 0) * (i % 2 ? 1 : -1), tip: o.tipC ?? pc.light }, at(0, 0, a)));
    }
  }
  if (o.swirl !== false) {
    const sw = s * 0.2;
    out.push(S(`M0 0 C${f(sw)} ${f(-sw * 0.2)} ${f(sw * 0.9)} ${f(sw * 0.9)} ${f(-sw * 0.2)} ${f(sw)} C${f(-sw * 1.1)} ${f(sw * 0.9)} ${f(-sw * 1.2)} ${f(-sw * 0.6)} ${f(sw * 0.1)} ${f(-sw * 0.8)}`, darken(p.deep, 0.2), Math.max(0.6, s * 0.05), { opacity: 0.55 }));
    out.push(E(-s * 0.04, -s * 0.04, s * 0.09, s * 0.06, p.light, { opacity: 0.5 }));
  }
  return [G(out, at(h.x, h.y, h.rot, 1, o.squash ?? 0.92))];
};

/* =================================================================== cup */

export interface CupO {
  n?: number; A: number; len?: number; wid?: number; round?: number; seedpod?: string; calyx?: boolean; ripple?: boolean;
}
/** side-view cup: tulip, magnolia, crocus, lotus, water lily — petals fan out from the base as it opens */
export const cup: HeadFn = (cx, h, p, o: CupO) => {
  const n = o.n ?? 5;
  const v = ease((h.u - 0.5) / 0.5);
  const g = clamp(h.u / 0.5);
  const s = h.s * (h.u < 0.5 ? lerp(0.5, 0.85, g) : lerp(0.85, 1, v));
  const A = h.u < 0.5 ? 6 + g * 4 : lerp(10, o.A, v);
  const tint = h.u < 0.5 ? ease((g - 0.3) / 0.7) : 1;
  const L = s * (o.len ?? 1.1), W = s * (o.wid ?? 0.42);
  const out: El[] = [];
  const mk = (col: Pal) => (tint < 1 ? { light: mix(SEPAL, col.light, tint), mid: mix(SEPAL, col.mid, tint), deep: mix(SEPAL_D, col.deep, tint) } : col);
  const back = mk({ light: mix(p.light, p.mid, 0.5), mid: darken(p.mid, 0.14), deep: darken(p.deep, 0.15) });
  const front = mk(p);
  // back petals (wide fan), then inner, then the front pair
  const half = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    const t = (i - half) / Math.max(half, 1);
    out.push(...petal(cx, L * (0.96 - Math.abs(t) * 0.12), W * 0.9, back, { round: o.round ?? 0.45 }, at(0, 0, t * A * 1.1)));
  }
  if (o.seedpod && h.u >= 0.5) {
    out.push(E(0, -L * 0.42, s * 0.28, s * 0.14, o.seedpod, {}, at(0, 0, 0)));
    out.push(E(0, -L * 0.46, s * 0.2, s * 0.08, lighten(o.seedpod, 0.4), { opacity: 0.7 }));
  }
  const fr = Math.max(3, n - 2);
  const fhalf = (fr - 1) / 2;
  for (let i = 0; i < fr; i++) {
    const t = (i - fhalf) / Math.max(fhalf, 1);
    const Li = L * (1 - Math.abs(t) * 0.1);
    out.push(...petal(cx, Li, W * 1.05, front, { round: o.round ?? 0.45, vein: true }, at(0, 0, t * A * 0.8)));
  }
  if (o.calyx) {
    out.push(P(`M0 0 C${f(-s * 0.5)} ${f(-s * 0.1)} ${f(-s * 0.5)} ${f(-s * 0.35)} ${f(-s * 0.3)} ${f(-s * 0.4)} C${f(-s * 0.2)} ${f(-s * 0.2)} ${f(-s * 0.05)} ${f(-s * 0.1)} 0 0Z`, cx.v(SEPAL, SEPAL_D)));
    out.push(P(`M0 0 C${f(s * 0.5)} ${f(-s * 0.1)} ${f(s * 0.5)} ${f(-s * 0.35)} ${f(s * 0.3)} ${f(-s * 0.4)} C${f(s * 0.2)} ${f(-s * 0.2)} ${f(s * 0.05)} ${f(-s * 0.1)} 0 0Z`, cx.v(SEPAL, SEPAL_D)));
  }
  return [G(out, at(h.x, h.y, h.rot))];
};

/* =================================================================== bell */

export interface BellO { style: 'globe' | 'blue' | 'drop' | 'fox' | 'tube'; len?: number; wid?: number; tip?: string }
/** a hanging bell; origin is the point it hangs from, it dangles toward +y (rotated by rot) */
export const bell: HeadFn = (cx, h, p, o: BellO) => {
  const g = clamp(h.u / 0.5);
  if (h.u < 0.5) {
    const s = h.s * lerp(0.35, 0.65, g);
    return [G([
      P(`M0 0 C${f(-s * 0.5)} ${f(s * 0.1)} ${f(-s * 0.55)} ${f(s * 0.85)} 0 ${f(s * 0.95)} C${f(s * 0.55)} ${f(s * 0.85)} ${f(s * 0.5)} ${f(s * 0.1)} 0 0Z`, cx.v(mix(SEPAL, p.light, g * 0.6), SEPAL_D)),
      shine(-s * 0.15, s * 0.3, s * 0.1, s * 0.2, 10, 0.4),
    ], at(h.x, h.y, h.rot))];
  }
  const v = ease((h.u - 0.5) / 0.5);
  const s = h.s * lerp(0.7, 1, v);
  const L = s * (o.len ?? 1.15), W = s * (o.wid ?? 0.55);
  const out: El[] = [];
  const base = o.style;
  if (base === 'drop') {
    // snowdrop: three hanging teardrop petals + green ovary
    const pet = (a: number, scale: number, col: string, col2: string) =>
      P(`M0 0 C${f(-W * 0.9 * scale)} ${f(L * 0.2)} ${f(-W * 0.95 * scale)} ${f(L * 0.8)} 0 ${f(L * scale)} C${f(W * 0.95 * scale)} ${f(L * 0.8)} ${f(W * 0.9 * scale)} ${f(L * 0.2)} 0 0Z`, cx.v(col2, col), { stroke: '#D5E3C8', strokeWidth: 0.4 }, at(0, 0, a));
    out.push(pet(-24, 0.95, p.mid, p.light), pet(24, 0.95, p.mid, p.light));
    out.push(pet(0, 1.02, lighten(p.mid, 0.15), '#FFFFFF'));
    out.push(S(`M${f(-W * 0.18)} ${f(L * 0.72)} Q0 ${f(L * 0.58)} ${f(W * 0.18)} ${f(L * 0.72)}`, '#7FBF55', Math.max(0.7, s * 0.06)));
    out.push(E(0, -s * 0.02, W * 0.32, s * 0.18, cx.v('#86C85A', '#3E8B3A')));
    return [G(out, at(h.x, h.y, h.rot))];
  }
  if (base === 'globe') {
    const body = `M0 0 C${f(-W * 0.7)} ${f(-L * 0.02)} ${f(-W * 1.3)} ${f(L * 0.45)} ${f(-W * 0.98)} ${f(L * 0.82)} Q${f(-W * 0.78)} ${f(L * 1.12)} ${f(-W * 0.42)} ${f(L * 0.97)} Q${f(-W * 0.2)} ${f(L * 1.16)} 0 ${f(L * 1.0)} Q${f(W * 0.2)} ${f(L * 1.16)} ${f(W * 0.42)} ${f(L * 0.97)} Q${f(W * 0.78)} ${f(L * 1.12)} ${f(W * 0.98)} ${f(L * 0.82)} C${f(W * 1.3)} ${f(L * 0.45)} ${f(W * 0.7)} ${f(-L * 0.02)} 0 0Z`;
    out.push(P(body, cx.r(p.light, p.mid, 0.38, 0.3, mix(p.light, p.mid, 0.5))));
    out.push(S(`M${f(-W * 0.95)} ${f(L * 0.84)} Q${f(-W * 0.5)} ${f(L * 0.95)} 0 ${f(L * 0.9)} Q${f(W * 0.5)} ${f(L * 0.95)} ${f(W * 0.95)} ${f(L * 0.84)}`, p.deep, 0.6, { opacity: 0.3 }));
    out.push(E(0, 0, W * 0.22, L * 0.2, '#fff', { opacity: 0.6 }, at(-W * 0.38, L * 0.32, 18)));
    return [G(out, at(h.x, h.y, h.rot))];
  }
  if (base === 'blue') {
    // narrow bell with flared, curled lip
    const body = `M0 0 C${f(-W * 0.55)} ${f(L * 0.02)} ${f(-W * 0.6)} ${f(L * 0.5)} ${f(-W * 0.52)} ${f(L * 0.78)} C${f(-W * 0.5)} ${f(L * 0.92)} ${f(-W * 1.05)} ${f(L * 0.98)} ${f(-W * 1.15)} ${f(L * 1.1)} C${f(-W * 0.6)} ${f(L * 1.08)} ${f(-W * 0.3)} ${f(L * 1.0)} 0 ${f(L * 1.02)} C${f(W * 0.3)} ${f(L * 1.0)} ${f(W * 0.6)} ${f(L * 1.08)} ${f(W * 1.15)} ${f(L * 1.1)} C${f(W * 1.05)} ${f(L * 0.98)} ${f(W * 0.5)} ${f(L * 0.92)} ${f(W * 0.52)} ${f(L * 0.78)} C${f(W * 0.6)} ${f(L * 0.5)} ${f(W * 0.55)} ${f(L * 0.02)} 0 0Z`;
    out.push(P(body, cx.v(p.light, p.deep, p.mid)));
    out.push(P(`M${f(W * 0.05)} ${f(L * 0.05)} C${f(W * 0.4)} ${f(L * 0.2)} ${f(W * 0.45)} ${f(L * 0.6)} ${f(W * 0.38)} ${f(L * 0.8)} C${f(W * 0.25)} ${f(L * 0.55)} ${f(W * 0.2)} ${f(L * 0.2)} ${f(W * 0.05)} ${f(L * 0.05)}Z`, '#fff', { opacity: 0.22 }));
    return [G(out, at(h.x, h.y, h.rot))];
  }
  // fox / tube: foxglove tube seen from the side, lip ellipse
  const body = `M0 0 C${f(-W * 0.5)} ${f(L * 0.05)} ${f(-W * 0.9)} ${f(L * 0.45)} ${f(-W * 0.95)} ${f(L * 0.95)} C${f(-W * 0.4)} ${f(L * 1.08)} ${f(W * 0.4)} ${f(L * 1.08)} ${f(W * 0.95)} ${f(L * 0.95)} C${f(W * 0.9)} ${f(L * 0.45)} ${f(W * 0.5)} ${f(L * 0.05)} 0 0Z`;
  out.push(P(body, cx.v(p.light, p.deep, p.mid)));
  out.push(E(0, L * 0.98, W * 0.95, L * 0.13, cx.v(p.deep, '#fff'), { }));
  out.push(E(0, L * 0.99, W * 0.68, L * 0.07, darken(p.deep, 0.4), { opacity: 0.8 }));
  for (let i = 0; i < 4; i++) out.push(C((i - 1.5) * W * 0.28, L * (0.97 + (i % 2) * 0.02), W * 0.07, '#fff', { opacity: 0.8 }));
  out.push(shine(-W * 0.4, L * 0.4, W * 0.1, L * 0.22, 8, 0.4));
  return [G(out, at(h.x, h.y, h.rot))];
};

/* =================================================================== ball */

export interface BallO {
  florets: number; fr?: number; shape?: 'star5' | 'star6' | 'star4' | 'dot'; flat?: number; center?: string; hi?: string;
}
/** a round (or domed) cluster of tiny florets: allium, hydrangea, flaming katy */
export const ball: HeadFn = (cx, h, p, o: BallO) => {
  if (h.u < 0.5) return closedBud(cx, h, p, o);
  const v = ease((h.u - 0.5) / 0.5);
  const R = h.s * lerp(0.6, 1, v);
  const N = Math.ceil(o.florets * lerp(0.35, 1, v));
  const out: El[] = [];
  const shape = o.shape ?? 'star5';
  const d0 = shape === 'star6' ? starD(6, 1, 0.5) : shape === 'star4' ? starD(4, 1, 0.5) : shape === 'dot' ? 'M-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0Z' : starD(5, 1, 0.5);
  out.push(E(0, 0, R * 0.98, R * 0.98 * (o.flat ?? 1), cx.r(p.mid, p.deep, 0.4, 0.35)));
  const rn = rng(Math.round(h.x * 31 + h.y * 17));
  const fr = R * (o.fr ?? 0.17);
  const pts: { x: number; y: number; z: number; a: number }[] = [];
  for (let i = 0; i < N; i++) {
    const rr = Math.sqrt((i + 0.5) / N) * R * 0.93, a = i * 137.508;
    const [px, py0] = polar(0, 0, rr, a);
    const py = py0 * (o.flat ?? 1);
    pts.push({ x: px, y: py, z: 1 - rr / R, a });
  }
  // draw far florets first
  pts.sort((a, b) => a.z - b.z);
  for (const q of pts) {
    const light = clamp(((-q.x * 0.5 - q.y * 0.9) / R + 1) / 2 * 0.7 + q.z * 0.35 + (rn() - 0.5) * 0.15);
    const col = light > 0.55 ? mix(p.mid, p.light, (light - 0.55) / 0.45) : mix(p.deep, p.mid, light / 0.55);
    const sc = fr * (0.8 + q.z * 0.4);
    out.push(P(d0, col, {}, at(q.x, q.y, q.a, sc)));
    if (shape !== 'dot' && rn() > 0.7) out.push(C(q.x, q.y, sc * 0.18, o.center ?? lighten(p.light, 0.5), { opacity: 0.8 }));
  }
  out.push(E(0, 0, R * 0.28, R * 0.16, '#fff', { opacity: 0.18 }, at(-R * 0.35, -R * 0.4, -35)));
  return [G(out, at(h.x, h.y, h.rot))];
};

/* ================================================================== spike */

export interface SpikeO {
  len: number; n: number; floret?: 'star6' | 'star5' | 'blob' | 'tube'; fr?: number; width?: number; eye?: string;
}
/** a vertical spire of florets, bottom blooms first: hyacinth, lavender, delphinium, lupine, mint, snapdragon */
export const spike: HeadFn = (cx, h, p, o: SpikeO) => {
  const open = clamp((h.u - 0.25) / 0.75);
  const grow = ease(clamp(h.u / 0.5));
  const Lh = h.s * o.len * lerp(0.4, 1, grow);
  const N = Math.max(4, Math.ceil(o.n * lerp(0.5, 1, grow)));
  const out: El[] = [];
  const r = rng(Math.round(h.x * 11 + h.y * 5));
  const d0 = o.floret === 'star5' ? starD(5, 1, 0.48) : o.floret === 'blob' ? 'M0 -1.2 C0.8 -1 1 0.2 0 1.2 C-1 0.2 -0.8 -1 0 -1.2Z' : starD(6, 1, 0.5);
  const fr = h.s * (o.fr ?? 0.42);
  out.push(S(`M0 0 L0 ${f(-Lh * 0.96)}`, mix(SEPAL, SEPAL_D, 0.4), Math.max(0.9, h.s * 0.12)));
  for (let i = N - 1; i >= 0; i--) {
    const t = i / (N - 1);
    const y = -t * Lh;
    const wv = h.s * (o.width ?? 0.5) * (1 - 0.62 * Math.pow(t, 1.4));
    const side = i % 2 ? 1 : -1;
    const x = side * wv * (0.55 + 0.35 * Math.sin(i * 1.7));
    const isOpen = t < open * 1.04;
    const size = fr * (1 - 0.5 * t) * (isOpen ? 1 : 0.5);
    const ang = side * (20 + r() * 25) + (r() - 0.5) * 10;
    if (isOpen) {
      const light = clamp(0.55 + (r() - 0.5) * 0.5 - t * 0.2);
      const col = mix(p.deep, p.light, light);
      if (o.floret === 'blob') {
        out.push(P(d0, cx.v(p.light, p.deep, p.mid), {}, at(x, y, ang, size * 0.7, size * 1.5)));
        out.push(P(d0, cx.v(p.light, p.mid), {}, at(-x * 0.7, y + size * 0.3, -ang, size * 0.65, size * 1.4)));
      } else {
        out.push(P(d0, col, { stroke: lighten(col, 0.25), strokeWidth: 0.3, strokeOpacity: 0.5 }, at(x, y, ang * 2, size)));
        out.push(C(x, y, size * 0.18, o.eye ?? '#fff', { opacity: 0.75 }));
      }
    } else {
      out.push(E(x, y, size * 0.55, size * 0.75, cx.v(mix(SEPAL, p.light, 0.5), SEPAL_D), {}, at(0, 0, 0)));
    }
  }
  return [G(out, at(h.x, h.y, h.rot))];
};

/* ================================================================ flower5 */

export interface FiveO {
  n?: number; len?: number; wid?: number; round?: number; eye?: string; eyeR?: number; stamens?: number; stamenC?: string; stamenLen?: number;
  spots?: string; trumpet?: string; squash?: number; recurve?: number; column?: boolean; overlap?: boolean; ruffle?: boolean; vein?: boolean;
}
/** star / funnel flowers seen face-on: azalea, hibiscus, lily, daffodil */
export const flower5: HeadFn = (cx, h, p, o: FiveO) => {
  if (h.u < 0.5) return closedBud(cx, h, p, o);
  const v = ease((h.u - 0.5) / 0.5);
  const s = h.s * lerp(0.6, 1, v);
  const n = o.n ?? 5, L = s * (o.len ?? 1), W = s * (o.wid ?? 0.5);
  const out: El[] = [];
  out.push(E(0, s * 0.08, s * 1.0, s * 0.85, '#000', { opacity: 0.1 }));
  const r = rng(Math.round(h.x * 3 + h.y * 19));
  // back petals, lighter alternating for depth
  for (let i = 0; i < n; i++) {
    const a = (i * 360) / n + 180 / n * 0.3;
    const pc: Pal = i % 2 ? p : { light: mix(p.light, p.mid, 0.3), mid: darken(p.mid, 0.06), deep: p.deep };
    out.push(...petal(cx, L, W, pc, { round: o.round ?? 0.9, r0: s * 0.04, bend: (o.recurve ?? 0) * (i % 2 ? 1 : -1), vein: o.vein !== false }, at(0, 0, a)));
  }
  // dark eye / throat
  const eyeR = s * (o.eyeR ?? 0.3);
  const eye = o.eye ?? p.deep;
  out.push(C(0, 0, eyeR * 1.35, cx.r(mix(eye, p.mid, 0.4), eye, 0.5, 0.5), { opacity: 0.55 }));
  out.push(P(starD(n, eyeR * 1.6, 0.35, 0), cx.r(darken(eye, 0.2), eye), { opacity: 0.85 }));
  if (o.spots) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 3; j++) {
        const [px, py] = polar(0, 0, L * (0.28 + j * 0.13), (i * 360) / n + 180 / n * 0.3 + (j % 2 ? 5 : -5));
        out.push(C(px, py, s * 0.035, o.spots, { opacity: 0.8 }));
      }
    }
  }
  if (o.trumpet) {
    const tr = s * 0.45;
    out.push(E(0, 0, tr, tr * 0.95, cx.r(lighten(o.trumpet, 0.2), darken(o.trumpet, 0.2), 0.5, 0.45), { stroke: darken(o.trumpet, 0.25), strokeWidth: 0.6 }));
    out.push(E(0, 0, tr * 0.62, tr * 0.58, darken(o.trumpet, 0.45), { opacity: 0.85 }));
    out.push(S(`M${f(-tr)} 0 ${Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * 360; const [px, py] = polar(0, 0, tr * (1 + (i % 2 ? 0.06 : -0.02)), a); return `L${f(px)} ${f(py)}`; }).join(' ')}`, lighten(o.trumpet, 0.35), 0.6, { opacity: 0.6 }));
  }
  if (o.stamens) {
    const sl = s * (o.stamenLen ?? 0.55);
    const sc = o.stamenC ?? '#FFD54F';
    if (o.column) {
      out.push(S(`M0 0 C${f(s * 0.1)} ${f(-sl * 0.5)} ${f(s * 0.3)} ${f(-sl * 0.9)} ${f(s * 0.45)} ${f(-sl * 1.2)}`, p.deep, Math.max(1, s * 0.09), { opacity: 0.95 }));
      for (let i = 0; i < 6; i++) { const t = i / 5; out.push(C(s * (0.2 + 0.28 * t) + (i % 2 ? 1.2 : -1.2), -sl * (0.7 + 0.55 * t), Math.max(0.7, s * 0.06), sc)); }
    } else {
      for (let i = 0; i < o.stamens; i++) {
        const a = -50 + (i * 100) / Math.max(1, o.stamens - 1) + (r() - 0.5) * 10;
        const [px, py] = polar(0, 0, sl * (0.9 + r() * 0.25), a);
        out.push(S(`M0 0 Q${f(px * 0.4)} ${f(py * 0.5)} ${f(px)} ${f(py)}`, mix(p.light, '#fff', 0.5), 0.7, { opacity: 0.9 }));
        out.push(E(0, 0, s * 0.055, s * 0.035, o.stamenC ?? '#E8A317', {}, at(px, py, a)));
      }
    }
  }
  return [G(out, at(h.x, h.y, h.rot, 1, o.squash ?? 0.88))];
};

/* =============================================================== orchid */

export interface OrchidO { kind: 'moth' | 'dancing'; lip?: string; throat?: string }
export const orchid: HeadFn = (cx, h, p, o: OrchidO) => {
  if (h.u < 0.5) return closedBud(cx, h, p, { bud: { w: 0.8, len: 0.9 } });
  const v = ease((h.u - 0.5) / 0.5);
  const s = h.s * lerp(0.6, 1, v);
  const out: El[] = [];
  const lip = o.lip ?? p.deep, throat = o.throat ?? '#FFD54F';
  if (o.kind === 'moth') {
    out.push(...petal(cx, s * 0.85, s * 0.3, p, { round: 0.8, r0: s * 0.05 }, at(0, 0, 180 + 38)));
    out.push(...petal(cx, s * 0.85, s * 0.3, p, { round: 0.8, r0: s * 0.05 }, at(0, 0, 180 - 38)));
    out.push(...petal(cx, s * 0.78, s * 0.3, { ...p, light: mix(p.light, '#fff', 0.2) }, { round: 0.8, r0: s * 0.05 }, at(0, -s * 0.05, 0)));
    for (const sgn of [-1, 1]) {
      const m = at(0, 0, sgn * 78);
      out.push(...petal(cx, s * 1.0, s * 0.56, { light: mix(p.light, '#fff', 0.35), mid: p.mid, deep: p.deep }, { round: 1, r0: s * 0.04, vein: true }, m));
      out.push(S(`M0 ${f(-s * 0.3)} L${f(-s * 0.18)} ${f(-s * 0.9)} M0 ${f(-s * 0.3)} L${f(s * 0.2)} ${f(-s * 0.88)}`, p.deep, 0.4, { opacity: 0.25 }, m));
    }
    out.push(P(`M0 ${f(s * 0.05)} C${f(-s * 0.3)} ${f(s * 0.1)} ${f(-s * 0.38)} ${f(s * 0.45)} ${f(-s * 0.12)} ${f(s * 0.5)} C${f(-s * 0.05)} ${f(s * 0.58)} ${f(s * 0.05)} ${f(s * 0.58)} ${f(s * 0.12)} ${f(s * 0.5)} C${f(s * 0.38)} ${f(s * 0.45)} ${f(s * 0.3)} ${f(s * 0.1)} 0 ${f(s * 0.05)}Z`, cx.v(lighten(lip, 0.2), darken(lip, 0.2))));
    out.push(E(0, s * 0.02, s * 0.14, s * 0.1, throat));
    out.push(E(0, -s * 0.06, s * 0.07, s * 0.06, '#fff', { opacity: 0.9 }));
  } else {
    // dancing lady: small tepals, big ruffled lip
    for (const a of [-60, -20, 20, 60]) out.push(...petal(cx, s * 0.62, s * 0.2, p, { round: 0.7, r0: s * 0.05, bend: a > 0 ? 0.12 : -0.12 }, at(0, 0, a)));
    out.push(...petal(cx, s * 0.55, s * 0.24, p, { round: 0.8, r0: s * 0.05 }, at(0, 0, 170)));
    out.push(...petal(cx, s * 0.55, s * 0.24, p, { round: 0.8, r0: s * 0.05 }, at(0, 0, -170)));
    out.push(...petal(cx, s * 0.78, s * 0.55, { light: lighten(p.light, 0.2), mid: p.mid, deep: p.deep }, { round: 1, r0: s * 0.05, vein: true }, at(0, s * 0.18, 180)));
    out.push(...petal(cx, s * 0.5, s * 0.42, { light: lighten(p.light, 0.25), mid: p.mid, deep: p.deep }, { round: 1 }, at(-s * 0.32, s * 0.1, 215)));
    out.push(...petal(cx, s * 0.5, s * 0.42, { light: lighten(p.light, 0.25), mid: p.mid, deep: p.deep }, { round: 1 }, at(s * 0.32, s * 0.1, 145)));
    out.push(E(0, s * 0.06, s * 0.2, s * 0.13, o.throat ?? '#A0522D', { opacity: 0.9 }));
    for (let i = 0; i < 5; i++) out.push(C((i - 2) * s * 0.07, s * 0.06 + (i % 2) * 2, s * 0.025, '#7A3B1D'));
  }
  return [G(out, at(h.x, h.y, h.rot))];
};

/* ===================================================== bird of paradise */

export const bop: HeadFn = (cx, h, p, o: { flip?: number }) => {
  const g = clamp(h.u / 0.5);
  const v = ease((h.u - 0.5) / 0.5);
  const s = h.s * (h.u < 0.5 ? lerp(0.5, 0.8, g) : lerp(0.8, 1, v));
  const out: El[] = [];
  const spathe = `M${f(-s * 0.9)} ${f(s * 0.1)} C${f(-s * 0.7)} ${f(-s * 0.42)} ${f(s * 0.2)} ${f(-s * 0.58)} ${f(s * 1.15)} ${f(-s * 0.3)} C${f(s * 0.3)} ${f(-s * 0.2)} ${f(-s * 0.3)} ${f(-s * 0.05)} ${f(-s * 0.9)} ${f(s * 0.1)}Z`;
  if (h.u >= 0.5) {
    const open = lerp(0.3, 1, v);
    const orange = (a: number, len: number, w: number) => petal(cx, s * len * open, s * w, p, { round: 0.1, r0: 0, tip: p.light }, at(s * 0.1, -s * 0.28, a));
    out.push(...orange(-22, 1.0, 0.22), ...orange(22, 0.95, 0.22));
    out.push(...petal(cx, s * 0.95 * open, s * 0.2, { light: '#8F7BFF', mid: '#5B4FD6', deep: '#2E2A9A' }, { round: 0.2 }, at(s * 0.05, -s * 0.28, 70)));
    out.push(...orange(0, 1.2, 0.26));
  }
  out.push(P(spathe, cx.v(mix('#5FA845', '#E75B7B', 0.5 * g), '#2F7A3A', '#4F9B3F'), {}, at(0, 0, 0)));
  out.push(S(`M${f(-s * 0.85)} ${f(s * 0.08)} C${f(-s * 0.6)} ${f(-s * 0.35)} ${f(s * 0.2)} ${f(-s * 0.5)} ${f(s * 1.1)} ${f(-s * 0.3)}`, '#E8496A', Math.max(0.8, s * 0.06), { opacity: 0.85 }));
  out.push(shine(-s * 0.1, -s * 0.2, s * 0.35, s * 0.05, -10, 0.3));
  return [G(out, at(h.x, h.y, h.rot, h.x < -1 ? -1 : 1, 1))];
};

/* ============================================================ spider lily */

export const spider: HeadFn = (cx, h, p, o: { n?: number }) => {
  if (h.u < 0.5) return closedBud(cx, h, p, { bud: { w: 0.7, len: 1.2 } });
  const v = ease((h.u - 0.5) / 0.5);
  const s = h.s * lerp(0.65, 1, v);
  const out: El[] = [];
  const m = o.n ?? 6;
  const flowers: [number, number, number][] = [];
  for (let i = 0; i < m; i++) {
    const a = (i / m) * 360 + 10;
    const rr = i === 0 ? 0 : s * 0.62;
    const [px, py] = polar(0, 0, i === 0 ? 0 : rr, i === 0 ? 0 : a);
    flowers.push([px, py * 0.85, i === 0 ? s * 0.82 : s * 0.7]);
  }
  flowers.sort((a, b) => a[1] - b[1]);
  for (const [fx, fy, fs] of flowers) {
    const fo: El[] = [];
    for (let i = 0; i < 6; i++) {
      const a = -92 + i * 36.8 + (i % 2) * 4;
      const [ex, ey] = polar(0, 0, fs * 0.95, a);
      const cxp = ex * 0.5, cyp = ey * 0.35 - fs * 0.35;
      const d = `M0 0 Q${f(cxp)} ${f(cyp)} ${f(ex)} ${f(ey)}`;
      fo.push(S(d, p.deep, Math.max(0.8, fs * 0.1)));
      fo.push(S(d, p.mid, Math.max(0.5, fs * 0.06)));
      fo.push(S(d, p.light, Math.max(0.3, fs * 0.025), { opacity: 0.6 }));
      // stamens, longer and thinner
      const [sx, sy] = polar(0, 0, fs * 1.25, a + 8);
      fo.push(S(`M0 0 Q${f(sx * 0.5)} ${f(sy * 0.3 - fs * 0.5)} ${f(sx)} ${f(sy * 0.9 - fs * 0.15)}`, p.mid, 0.45, { opacity: 0.9 }));
      fo.push(C(sx, sy * 0.9 - fs * 0.15, fs * 0.055, '#F5C34A'));
    }
    fo.push(C(0, 0, fs * 0.12, p.deep));
    out.push(G(fo, at(fx, fy, 0)));
  }
  return [G(out, at(h.x, h.y, h.rot))];
};

/* ================================================================== puff */

export const puff: HeadFn = (cx, h, p, o: { yellow?: boolean }) => {
  if (h.u < 0.5) return closedBud(cx, h, p, o);
  const v = ease((h.u - 0.5) / 0.5);
  const R = h.s * lerp(0.7, 1, v);
  const out: El[] = [];
  out.push(E(0, 0, R * 1.05, R * 1.05, cx.glow('#FFFFFF', 0.55)));
  out.push(C(0, 0, R * 0.95, cx.r('#FFFFFF', p.mid, 0.4, 0.35, p.light), { opacity: 0.95 }));
  let rays = '', tips = '';
  const N = 26;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * 360 + (i % 2) * 4;
    const [x0, y0] = polar(0, 0, R * 0.22, a), [x1, y1] = polar(0, 0, R * 0.9, a);
    rays += `M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)} `;
    const [x2, y2] = polar(0, 0, R * 0.98, a);
    tips += `M${f(x2 - 0.9)} ${f(y2)} a0.9 0.9 0 1 0 1.8 0 a0.9 0.9 0 1 0 -1.8 0 `;
  }
  out.push(S(rays, darken(p.mid, 0.1), 0.5, { opacity: 0.5 }));
  out.push(P(tips, '#FFFFFF', { opacity: 0.9 }));
  out.push(C(0, 0, R * 0.2, cx.r(p.deep, darken(p.deep, 0.3))));
  return [G(out, at(h.x, h.y, h.rot))];
};

/* ============================================================== wishing */

export const wishing: HeadFn = (cx, h, p, o) => {
  if (h.u < 0.5) return closedBud(cx, h, p, o);
  const v = ease((h.u - 0.5) / 0.5);
  const s = h.s * lerp(0.6, 1, v);
  const out: El[] = [];
  out.push(C(0, 0, s * 1.9, cx.glow('#FFE9A8', 0.8 * v)));
  for (let i = 0; i < 6; i++) {
    const a = i * 60 + 15;
    out.push(...petal(cx, s * 0.95, s * 0.42, { light: '#D7F3FF', mid: '#6EC6F2', deep: '#3A86D6' }, { round: 1, r0: s * 0.1 }, at(0, 0, a)));
  }
  for (let i = 0; i < 5; i++) {
    const a = i * 72;
    out.push(...petal(cx, s * 0.6, s * 0.34, { light: '#FFE08A', mid: '#FFB84A', deep: '#F58F2B' }, { round: 1, r0: s * 0.05 }, at(0, 0, a + 20)));
  }
  out.push(C(0, 0, s * 0.3, cx.r('#FFFDF0', '#FFB22E', 0.4, 0.38)));
  out.push(C(-s * 0.08, -s * 0.1, s * 0.09, '#fff', { opacity: 0.85 }));
  const r = rng(Math.round(h.x * 5 + h.y * 3));
  for (let i = 0; i < 5; i++) {
    const [px, py] = polar(0, 0, s * (1.1 + r() * 0.7), r() * 360);
    out.push(C(px, py, s * (0.04 + r() * 0.05), '#FFF6C8', { opacity: 0.9 }));
  }
  return [G(out, at(h.x, h.y, h.rot, 1, 0.9))];
};

/* =================================================================== calla */

export const calla: HeadFn = (cx, h, p, o) => {
  const g = clamp(h.u / 0.5);
  const v = ease((h.u - 0.5) / 0.5);
  const s = h.s * (h.u < 0.5 ? lerp(0.5, 0.85, g) : lerp(0.85, 1, v));
  const L = s * 1.7, W = s * 0.55 * (h.u < 0.5 ? 0.45 + g * 0.15 : lerp(0.65, 1, v));
  const tint = h.u < 0.5 ? ease((g - 0.2) / 0.8) : 1;
  const body = `M0 0 C${f(-W * 0.5)} ${f(-L * 0.1)} ${f(-W * 1.05)} ${f(-L * 0.45)} ${f(-W * 0.7)} ${f(-L * 0.8)} C${f(-W * 0.5)} ${f(-L * 0.95)} ${f(-W * 0.1)} ${f(-L * 1.05)} ${f(W * 0.15)} ${f(-L * 1.14)} C${f(W * 0.55)} ${f(-L * 0.85)} ${f(W * 1.15)} ${f(-L * 0.55)} ${f(W * 0.85)} ${f(-L * 0.3)} C${f(W * 0.6)} ${f(-L * 0.1)} ${f(W * 0.2)} ${f(-L * 0.02)} 0 0Z`;
  const top = mix('#B6DC8A', p.light, tint), bot = mix('#4C9C3C', p.deep, tint);
  const out: El[] = [P(body, cx.v(top, bot, mix('#CFE7A8', p.mid, tint)), { stroke: '#fff', strokeWidth: 0.4, strokeOpacity: 0.5 })];
  if (h.u >= 0.5) {
    out.push(P(`M${f(-W * 0.55)} ${f(-L * 0.35)} C${f(-W * 0.9)} ${f(-L * 0.55)} ${f(-W * 0.7)} ${f(-L * 0.78)} ${f(-W * 0.35)} ${f(-L * 0.85)} C${f(-W * 0.1)} ${f(-L * 0.6)} ${f(-W * 0.3)} ${f(-L * 0.45)} ${f(-W * 0.55)} ${f(-L * 0.35)}Z`, p.deep, { opacity: 0.18 }));
    out.push(E(0, 0, W * 0.13, L * 0.2, cx.v('#FFE066', '#F2A91E'), {}, at(W * 0.12, -L * 0.52, 12)));
    out.push(shine(W * 0.4, -L * 0.62, W * 0.12, W * 0.3, 20, 0.7));
  }
  out.push(E(W * 0.5, -L * 0.28, W * 0.1, L * 0.12, '#fff', { opacity: 0.35 }));
  return [G(out, at(h.x, h.y, h.rot))];
};

/* =================================================================== iris */

export const iris: HeadFn = (cx, h, p, o: { beard?: string }) => {
  if (h.u < 0.5) return closedBud(cx, h, p, { bud: { w: 0.75, len: 1.15 } });
  const v = ease((h.u - 0.5) / 0.5);
  const s = h.s * lerp(0.6, 1, v);
  const out: El[] = [];
  const stand = { light: mix(p.light, '#fff', 0.3), mid: mix(p.mid, p.light, 0.4), deep: p.mid };
  const sp = lerp(8, 34, v);
  out.push(...petal(cx, s * 0.95, s * 0.36, stand, { round: 0.9, r0: s * 0.05 }, at(0, 0, -sp)));
  out.push(...petal(cx, s * 0.95, s * 0.36, stand, { round: 0.9, r0: s * 0.05 }, at(0, 0, sp)));
  const fall = { light: p.mid, mid: p.mid, deep: p.deep };
  const fa = lerp(155, 128, v);
  out.push(...petal(cx, s * 0.95, s * 0.44, fall, { round: 0.95, r0: s * 0.04, tip: p.mid, base: p.deep, vein: true }, at(0, 0, fa)));
  out.push(...petal(cx, s * 0.95, s * 0.44, fall, { round: 0.95, r0: s * 0.04, tip: p.mid, base: p.deep, vein: true }, at(0, 0, -fa)));
  out.push(...petal(cx, s * 0.78, s * 0.36, stand, { round: 0.95, r0: s * 0.02, vein: true }, at(0, -s * 0.02, 0)));
  out.push(...petal(cx, s * 1.0, s * 0.46, fall, { round: 0.95, r0: s * 0.04, tip: p.mid, base: p.deep, vein: true }, at(0, 0, 180)));
  out.push(E(0, s * 0.35, s * 0.1, s * 0.2, o.beard ?? '#FFD54F', { opacity: 0.95 }));
  out.push(E(0, 0, s * 0.06, s * 0.14, o.beard ?? '#FFD54F', { opacity: 0.8 }, at(-s * 0.3, s * 0.3, 40)));
  out.push(E(0, 0, s * 0.06, s * 0.14, o.beard ?? '#FFD54F', { opacity: 0.8 }, at(s * 0.3, s * 0.3, -40)));
  return [G(out, at(h.x, h.y, h.rot))];
};


/* ================================================================ tulip */

export interface TulipO { A?: number; A0?: number; len?: number; wid?: number; round?: number; n?: number; calyx?: boolean }
/** egg-shaped chalice seen from the side: tulip, crocus, magnolia. Closed bud -> open cup as u rises. */
export const tulip: HeadFn = (cx, h, p, o: TulipO) => {
  const g = clamp(h.u / 0.5);
  const v = h.u < 0.5 ? 0 : ease((h.u - 0.5) / 0.5);
  const s = h.s * (h.u < 0.5 ? lerp(0.5, 0.85, g) : lerp(0.85, 1, v));
  const tint = h.u < 0.5 ? ease((g - 0.25) / 0.75) : 1;
  const L = s * (o.len ?? 1.7), W = s * (o.wid ?? 0.6);
  const A = lerp(o.A0 ?? 3, o.A ?? 30, v);
  const rnd = o.round ?? 0.7;
  const mk = (c: Pal): Pal => (tint < 1 ? { light: mix(SEPAL, c.light, tint), mid: mix(SEPAL, c.mid, tint), deep: mix(SEPAL_D, c.deep, tint) } : c);
  const dark = mk({ light: mix(p.mid, p.deep, 0.2), mid: mix(p.mid, p.deep, 0.55), deep: darken(p.deep, 0.2) });
  const midc = mk({ light: p.light, mid: p.mid, deep: p.deep });
  const front = mk({ light: lighten(p.light, 0.25), mid: mix(p.light, p.mid, 0.45), deep: p.mid });
  const out: El[] = [];
  const n = o.n ?? 5;
  // extra back petals for fuller flowers (magnolia)
  for (let i = 0; i < n - 5; i++) {
    const a = (i % 2 ? 1 : -1) * A * (1.15 + i * 0.12);
    out.push(...petal(cx, L * 0.95, W * 0.85, dark, { round: rnd }, at(0, 0, a)));
  }
  out.push(...petal(cx, L * 0.96, W * 0.9, dark, { round: rnd, bend: 0.05 }, at(0, 0, -A)));
  out.push(...petal(cx, L * 0.96, W * 0.9, dark, { round: rnd, bend: -0.05 }, at(0, 0, A)));
  out.push(...petal(cx, L * 0.99, W, midc, { round: rnd }, at(0, 0, -A * 0.55)));
  out.push(...petal(cx, L * 0.99, W, midc, { round: rnd }, at(0, 0, A * 0.55)));
  out.push(...petal(cx, L, W * 1.04, front, { round: rnd, vein: true, tip: front.light }, at(0, 0, 0)));
  out.push(P(petalD(L * 0.86, W * 0.3, 0.6, L * 0.06), '#FFFFFF', { opacity: 0.22 }, at(-W * 0.28, 0, -3)));
  if (o.calyx !== false) out.push(E(0, 0, s * 0.2, s * 0.1, cx.v(SEPAL, SEPAL_D)));
  return [G(out, at(h.x, h.y, h.rot))];
};

/* ================================================================== lotus */

export interface LotusO { flat?: number; seedpod?: string; len?: number }
/** lotus / water-lily: rows of pointed petals, white at the base blushing to colour at the tips */
export const lotus: HeadFn = (cx, h, p, o: LotusO) => {
  const g = clamp(h.u / 0.5);
  const v = h.u < 0.5 ? 0 : ease((h.u - 0.5) / 0.5);
  const s = h.s * (h.u < 0.5 ? lerp(0.55, 0.9, g) : lerp(0.9, 1, v));
  const tint = h.u < 0.5 ? ease((g - 0.25) / 0.75) : 1;
  const L = s * (o.len ?? 1.35), W = s * 0.36;
  const open = lerp(0.14, 1, v) * (o.flat ?? 1);
  const mk = (c: Pal): Pal => (tint < 1 ? { light: mix(SEPAL, c.light, tint * 0.8), mid: mix(SEPAL, c.mid, tint), deep: mix(SEPAL_D, c.deep, tint) } : c);
  const rows: [number[], number, number, Pal][] = [
    [[-68, -34, 0, 34, 68], 1.06, 0.95, mk({ light: mix(p.light, p.mid, 0.25), mid: darken(p.mid, 0.1), deep: p.deep })],
    [[-50, -17, 17, 50], 1.0, 1.0, mk({ light: p.light, mid: p.mid, deep: p.deep })],
    [[-30, 0, 30], 0.9, 1.05, mk({ light: lighten(p.light, 0.3), mid: mix(p.light, p.mid, 0.55), deep: p.mid })],
  ];
  const out: El[] = [];
  rows.forEach(([angles, ln, wd, pc], ri) => {
    if (ri === 2 && h.u >= 0.5 && v > 0.25) {
      out.push(E(0, -L * 0.4, s * 0.3, s * 0.15, cx.v(lighten(o.seedpod ?? '#F7D154', 0.3), darken(o.seedpod ?? '#F7D154', 0.2))));
      out.push(...[-0.14, 0, 0.14].map((x) => C(x * s, -L * 0.42, s * 0.04, '#B8860B', { opacity: 0.7 })));
    }
    for (const a of angles) {
      out.push(...petal(cx, L * ln, W * wd, pc, { round: 0.18, tip: pc.mid, base: pc.light, vein: true, bend: a === 0 ? 0 : Math.sign(a) * 0.1 * open }, at(0, 0, a * open)));
    }
  });
  out.push(E(0, 0, s * 0.18, s * 0.08, cx.v(SEPAL, SEPAL_D)));
  return [G(out, at(h.x, h.y, h.rot))];
};

/* ============================================================== registry */

export const HEADS = { tulip, lotus, daisy, layered, cup, bell, ball, spike, flower5, orchid, bop, spider, puff, wishing, calla, iris } as const;
export type HeadKind = keyof typeof HEADS;
export { shift };
