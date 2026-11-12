import type { Ctx, El, Grad } from './kit';

const kebab = (k: string) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

function attrs(e: El): string {
  let s = '';
  for (const [k, v] of Object.entries(e.a)) s += ` ${kebab(k)}="${v}"`;
  if (e.m) s += ` transform="matrix(${e.m.map((n) => +n.toFixed(4)).join(' ')})"`;
  return s;
}
export function elToSvg(e: El): string {
  if (e.t === 'g') return `<g${attrs(e)}>${(e.c ?? []).map(elToSvg).join('')}</g>`;
  return `<${e.t}${attrs(e)}/>`;
}
export function gradToSvg(g: Grad): string {
  const stops = g.stops.map((s) => `<stop offset="${s.o}" stop-color="${s.c}"${s.op != null ? ` stop-opacity="${s.op}"` : ''}/>`).join('');
  if (g.kind === 'lin') return `<linearGradient id="${g.id}" x1="${g.g[0]}" y1="${g.g[1]}" x2="${g.g[2]}" y2="${g.g[3]}">${stops}</linearGradient>`;
  return `<radialGradient id="${g.id}" cx="${g.g[0]}" cy="${g.g[1]}" fx="${g.g[0]}" fy="${g.g[1]}" r="${g.g[2]}">${stops}</radialGradient>`;
}
/** a standalone <svg> string; viewBox covers the plant space x -60..60, y -130..8 */
export function toSvg(els: El[], cx: Ctx, size = 160): string {
  const defs = [...cx.defs.values()].map(gradToSvg).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.15)}" viewBox="-60 -130 120 138"><defs>${defs}</defs>${els.map(elToSvg).join('')}</svg>`;
}
