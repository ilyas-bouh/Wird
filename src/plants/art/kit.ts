/**
 * Tiny scene-graph + drawing kit for the plant art. Everything here is pure data (no React), so the same
 * drawings render in the app (via Art.tsx) and in the HTML preview sheet (tools/plant_preview.mjs).
 *
 * Coordinate space: base of the plant at (0,0), growing up into x -50..50, y -120..0.
 * Shapes are authored in local coordinates (pointing up = -y) and placed with `at()` matrices, so gradients
 * (objectBoundingBox) follow the shape: they run base -> tip however the shape is rotated.
 */

export type Matrix = [number, number, number, number, number, number];
export type Attrs = Record<string, string | number>;
export interface El {
  t: 'path' | 'ellipse' | 'circle' | 'g';
  a: Attrs;
  m?: Matrix;
  c?: El[];
}
export interface GradStop { o: number; c: string; op?: number }
export interface Grad {
  id: string;
  kind: 'lin' | 'rad';
  g: [number, number, number, number]; // lin: x1 y1 x2 y2 ; rad: cx cy r (unused) fx
  stops: GradStop[];
}

/* ------------------------------------------------------------------ colour */

function norm(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  return h.toLowerCase();
}
export function rgb(hex: string): [number, number, number] {
  const h = norm(hex);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function toHex(r: number, g: number, b: number): string {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}
export function hsl(hex: string): [number, number, number] {
  const [r0, g0, b0] = rgb(hex);
  const r = r0 / 255, g = g0 / 255, b = b0 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
export function fromHsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
}
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a), y = rgb(b);
  return toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}
export const lighten = (c: string, t: number) => {
  const [h, s, l] = hsl(c);
  return fromHsl(h, s * (1 - t * 0.35), l + (1 - l) * t);
};
/** darker, a touch more saturated, hue nudged toward warm/red so shadows glow instead of going grey */
export const darken = (c: string, t: number) => {
  const [h, s, l] = hsl(c);
  return fromHsl(h - t * 8, Math.min(1, s * (1 + t * 0.35)), l * (1 - t));
};
export const shift = (c: string, dh: number, ds = 0, dl = 0) => {
  const [h, s, l] = hsl(c);
  return fromHsl(h + dh, s + ds, l + dl);
};

/* ----------------------------------------------------------------- random */

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ----------------------------------------------------------------- matrix */

const RAD = Math.PI / 180;
/** place a local shape: translate (x,y), rotate `rot` degrees clockwise, scale (sx, sy) */
export function at(x: number, y: number, rot = 0, sx = 1, sy = sx): Matrix {
  const c = Math.cos(rot * RAD), s = Math.sin(rot * RAD);
  return [c * sx, s * sx, -s * sy, c * sy, x, y];
}
/** point at distance r from (x,y) in direction `deg` (0 = up, clockwise) */
export function polar(x: number, y: number, r: number, deg: number): [number, number] {
  return [x + Math.sin(deg * RAD) * r, y - Math.cos(deg * RAD) * r];
}
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const n1 = (v: number) => Math.round(v * 10) / 10;

/* ------------------------------------------------------------------- ctx */

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Collects the gradients a drawing uses; ids are content-derived so identical gradients are shared. */
export class Ctx {
  defs = new Map<string, Grad>();

  private reg(kind: 'lin' | 'rad', g: [number, number, number, number], stops: GradStop[]): string {
    const key = kind + g.join(',') + stops.map((s) => `${s.o}${s.c}${s.op ?? 1}`).join('|');
    const id = `pg${hash(key)}`;
    if (!this.defs.has(id)) this.defs.set(id, { id, kind, g, stops });
    return `url(#${id})`;
  }
  /** vertical gradient across the shape's bounding box: `top` at the tip (-y), `bottom` at the base */
  v(top: string, bottom: string, mid?: string): string {
    const stops = mid ? [{ o: 0, c: top }, { o: 0.5, c: mid }, { o: 1, c: bottom }] : [{ o: 0, c: top }, { o: 1, c: bottom }];
    return this.reg('lin', [0, 0, 0, 1], stops);
  }
  /** horizontal gradient, `left` -> `right` */
  h(left: string, right: string, mid?: string): string {
    const stops = mid ? [{ o: 0, c: left }, { o: 0.5, c: mid }, { o: 1, c: right }] : [{ o: 0, c: left }, { o: 1, c: right }];
    return this.reg('lin', [0, 0, 1, 0], stops);
  }
  /** diagonal: top-left -> bottom-right */
  d(tl: string, br: string, mid?: string): string {
    const stops = mid ? [{ o: 0, c: tl }, { o: 0.5, c: mid }, { o: 1, c: br }] : [{ o: 0, c: tl }, { o: 1, c: br }];
    return this.reg('lin', [0, 0, 1, 1], stops);
  }
  /** radial; centre/focus at (fx, fy) of the bounding box (0..1), `inner` in the middle */
  r(inner: string, outer: string, fx = 0.5, fy = 0.5, mid?: string): string {
    const stops = mid ? [{ o: 0, c: inner }, { o: 0.55, c: mid }, { o: 1, c: outer }] : [{ o: 0, c: inner }, { o: 1, c: outer }];
    return this.reg('rad', [fx, fy, 0.5, 0], stops);
  }
  /** radial glow that fades to transparent */
  glow(color: string, strength = 0.9): string {
    return this.reg('rad', [0.5, 0.5, 0.5, 0], [{ o: 0, c: color, op: strength }, { o: 0.45, c: color, op: strength * 0.35 }, { o: 1, c: color, op: 0 }]);
  }
}

/* ------------------------------------------------------------ constructors */

export const P = (d: string, fill: string, extra: Attrs = {}, m?: Matrix): El => ({ t: 'path', a: { d, fill, ...extra }, m });
export const S = (d: string, stroke: string, w: number, extra: Attrs = {}, m?: Matrix): El => ({
  t: 'path', a: { d, fill: 'none', stroke, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round', ...extra }, m,
});
export const E = (cx: number, cy: number, rx: number, ry: number, fill: string, extra: Attrs = {}, m?: Matrix): El => ({
  t: 'ellipse', a: { cx: n1(cx), cy: n1(cy), rx: n1(rx), ry: n1(ry), fill, ...extra }, m,
});
export const C = (cx: number, cy: number, r: number, fill: string, extra: Attrs = {}, m?: Matrix): El => ({
  t: 'circle', a: { cx: n1(cx), cy: n1(cy), r: n1(r), fill, ...extra }, m,
});
export const G = (c: El[], m?: Matrix, a: Attrs = {}): El => ({ t: 'g', a, c, m });

/* ---------------------------------------------------------------- paths */

const f = (v: number) => (Math.round(v * 10) / 10).toString();

/** quadratic/cubic helpers in absolute coords */
export function stemPath(x0: number, y0: number, x1: number, y1: number, bend: number): string {
  // gentle S/arc: control point offset sideways by `bend`
  const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2;
  return `M${f(x0)} ${f(y0)} Q${f(mx)} ${f(my)} ${f(x1)} ${f(y1)}`;
}
/** point + tangent angle (deg, 0 = up) on a quadratic stem at t */
export function stemAt(x0: number, y0: number, x1: number, y1: number, bend: number, t: number): { x: number; y: number; a: number } {
  const cx = (x0 + x1) / 2 + bend, cy = (y0 + y1) / 2;
  const u = 1 - t;
  const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
  const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
  const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx);
  const dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
  return { x, y, a: Math.atan2(dx, -dy) / RAD };
}

/** leaf-like blade pointing up from the origin. `bend` curls the tip sideways, `base` is where it is widest (0..1). */
export function bladeD(len: number, wid: number, bend = 0, base = 0.4, tipSharp = 1): string {
  const L = len, W = wid;
  const bx = bend * L;
  const wy = -L * base;
  const t = tipSharp;
  return (
    `M0 0 C${f(-W * 1.15)} ${f(-L * 0.12)} ${f(-W * 1.05 + bx * 0.3)} ${f(wy - L * 0.2)} ${f(bx)} ${f(-L)}` +
    ` C${f(W * 1.05 + bx * 0.3)} ${f(wy - L * 0.2 * t)} ${f(W * 1.15)} ${f(-L * 0.12)} 0 0Z`
  );
}
/** the lit half of a blade (right side), used as a highlight overlay */
export function bladeHalfD(len: number, wid: number, bend = 0, base = 0.4): string {
  const L = len, W = wid;
  const bx = bend * L;
  const wy = -L * base;
  return (
    `M0 0 C${f(W * 0.35)} ${f(-L * 0.1)} ${f(W * 0.35 + bx * 0.3)} ${f(wy - L * 0.25)} ${f(bx)} ${f(-L)}` +
    ` C${f(W * 1.05 + bx * 0.3)} ${f(wy - L * 0.2)} ${f(W * 1.15)} ${f(-L * 0.12)} 0 0Z`
  );
}
export function veinD(len: number, bend = 0): string {
  return `M0 ${f(-len * 0.04)} Q${f(bend * len * 0.3)} ${f(-len * 0.5)} ${f(bend * len)} ${f(-len * 0.94)}`;
}

/** n-point star made of rounded petals (one path) with outer radius r; used for tiny florets */
export function starD(n: number, r: number, inner = 0.45, rot = 0): string {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i * 360) / n;
    const aM = a0 + 180 / n;
    const [tx, ty] = polar(0, 0, r, a0);
    const [mx, my] = polar(0, 0, r * inner, aM);
    const [px, py] = polar(0, 0, r * inner, a0 - 180 / n);
    // petal: from previous valley, curve out to tip, back in to next valley
    pts.push(`${i === 0 ? 'M' : 'L'}${f(px)} ${f(py)}`);
    const [c1x, c1y] = polar(0, 0, r * 0.95, a0 - 180 / n * 0.9);
    const [c2x, c2y] = polar(0, 0, r * 0.95, a0 + 180 / n * 0.9);
    pts.push(`C${f(c1x)} ${f(c1y)} ${f(tx)} ${f(ty)} ${f(tx)} ${f(ty)}`);
    pts.push(`C${f(tx)} ${f(ty)} ${f(c2x)} ${f(c2y)} ${f(mx)} ${f(my)}`);
  }
  return pts.join(' ') + 'Z';
}

/* ------------------------------------------------------------ primitives */

export const GREEN = {
  deep: '#2E6B34',
  mid: '#4E9A3E',
  light: '#8FCB4E',
  pale: '#B9E36A',
  stem: '#3F8A3B',
};

export interface LeafOpts {
  len: number; wid: number; bend?: number; base?: number; sharp?: number;
  c0?: string; c1?: string; // base colour -> tip colour
  vein?: boolean; lit?: boolean;
}
/** one leaf, authored pointing up from the origin; caller places it with `at()` */
export function leaf(cx: Ctx, o: LeafOpts): El[] {
  const c0 = o.c0 ?? GREEN.deep, c1 = o.c1 ?? GREEN.light;
  const bend = o.bend ?? 0, base = o.base ?? 0.4;
  const out: El[] = [P(bladeD(o.len, o.wid, bend, base, o.sharp ?? 1), cx.v(c1, c0))];
  if (o.lit !== false) out.push(P(bladeHalfD(o.len, o.wid, bend, base), lighten(c1, 0.35), { opacity: 0.35 }));
  if (o.vein !== false) out.push(S(veinD(o.len, bend), darken(c0, 0.2), Math.max(0.5, o.wid * 0.07), { opacity: 0.5 }));
  return out;
}

/** a stem as two strokes (dark body + light edge highlight) so it reads as a rounded tube */
export function stem(cx: Ctx, d: string, w: number, color = GREEN.stem, light?: string): El[] {
  const out: El[] = [S(d, darken(color, 0.25), w)];
  if (w >= 1.6) {
    out.push(S(d, color, w * 0.72));
    out.push(S(d, light ?? lighten(color, 0.4), w * 0.22, { opacity: 0.6 }, [1, 0, 0, 1, -w * 0.16, 0]));
  } else {
    out[0] = S(d, color, w);
  }
  return out;
}

/** soft ground shadow under a plant */
export function shadow(cx: Ctx, rx: number, ry = rx * 0.22, opacity = 0.2): El {
  return E(0, ry * 0.2, rx, ry, cx.r('#000000', '#000000', 0.5, 0.5), { opacity });
}

/** small mound of soil */
export function soil(cx: Ctx, rx: number, ry: number, y = 0): El[] {
  return [
    E(0, y, rx * 1.15, ry * 0.7, '#000', { opacity: 0.14 }),
    P(`M${f(-rx)} ${f(y)} Q${f(-rx * 0.5)} ${f(y - ry * 1.5)} 0 ${f(y - ry * 1.3)} Q${f(rx * 0.5)} ${f(y - ry * 1.5)} ${f(rx)} ${f(y)} Q0 ${f(y + ry * 0.5)} ${f(-rx)} ${f(y)}Z`, cx.v('#9A7552', '#6B4C34')),
    E(-rx * 0.25, y - ry * 0.7, rx * 0.35, ry * 0.25, '#B89470', { opacity: 0.55 }),
  ];
}

/** glossy highlight dot */
export const shine = (x: number, y: number, rx: number, ry = rx * 0.6, rot = -30, op = 0.55): El =>
  E(0, 0, rx, ry, '#FFFFFF', { opacity: op }, at(x, y, rot));
