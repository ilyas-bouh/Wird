// Crop a Quran page SVG to a set of ayah polygons (quran.ws method):
//  1. viewBox = bounding box of the union of the polygons
//  2. clipPath (userSpaceOnUse) built from those polygons
//  3. page content wrapped in a fresh, untransformed <g clip-path> (never clip the transformed glyph group)

export type PagePolygon = { surahNumber: number; ayahNumber: number; polygon: string };

const NUM = /-?\d+(?:\.\d+)?/g;

export function polygonBox(polygons: string[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polygons) {
    const n = (p.match(NUM) ?? []).map(Number);
    for (let i = 0; i + 1 < n.length; i += 2) {
      minX = Math.min(minX, n[i]); maxX = Math.max(maxX, n[i]);
      minY = Math.min(minY, n[i + 1]); maxY = Math.max(maxY, n[i + 1]);
    }
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Polygons of surah:ayah entries with `ayahNumber` in [from, to] (inclusive). */
export function selectAyahs(entries: PagePolygon[], surah: number, from: number, to: number) {
  return entries.filter((e) => e.surahNumber === surah && e.ayahNumber >= from && e.ayahNumber <= to);
}

export type HeaderZone = { y0: number; y1: number };

/**
 * Surah title banners sit outside the ayah polygons, between the previous ayah and ayah 1.
 * For every selected ayah 1, return the vertical band the crop must include. With no previous ayah on the
 * page the band reaches the top of the page's text ink (`inkTop`, precomputed by tools/page_ink.py).
 */
export function headerZones(pageEntries: PagePolygon[], selected: PagePolygon[], inkTop: number): HeaderZone[] {
  const zones: HeaderZone[] = [];
  for (const e of selected) {
    if (e.ayahNumber !== 1) continue;
    const i = pageEntries.indexOf(e);
    const top = polygonBox([e.polygon]).y;
    if (i > 0) {
      const pb = polygonBox([pageEntries[i - 1].polygon]);
      zones.push({ y0: pb.y + pb.h, y1: top });
    } else {
      zones.push({ y0: Math.min(inkTop - 2, top), y1: top });
    }
  }
  return zones;
}

export type CropOptions = {
  /** horizontal padding in page units (default 1); vertical padding is always 0 so pages join seamlessly */
  padX?: number;
  /** force a common viewBox width (centred on the crop) so stacked pages share one scale */
  width?: number;
  /** vertical bands (surah banners) the viewBox must include */
  zones?: HeaderZone[];
  /** polygons of the page's ayahs that are NOT in the portion: painted over in the paper colour */
  cover?: string[];
  /** paper colour used for the cover shapes */
  paper?: string;
};

const shape = (p: string) => (/[A-Za-z]/.test(p) ? `<path d="${p}"/>` : `<polygon points="${p}"/>`);

/**
 * Crop a page to a portion: the viewBox is the bounding box of the selected polygons (plus banner zones)
 * and ayahs outside the portion that share those lines are hidden under paper-coloured shapes.
 * (A clip-path over the page's ~500 KB merged text path rendered with large missing patches, so we cover instead.)
 */
export function cropSvg(svg: string, polygons: string[], opts: CropOptions = {}): string {
  const { padX = 1, width, zones = [], cover = [], paper = '#FBFDF9' } = opts;
  const b = polygonBox(polygons);
  let top = b.y;
  for (const z of zones) if (z.y0 < top) top = z.y0;
  const bottom = b.y + b.h;
  const w = width ?? b.w + 2 * padX;
  const x = width ? b.x + b.w / 2 - width / 2 : b.x - padX;
  const viewBox = `${x} ${top} ${w} ${bottom - top}`;

  const open = svg.match(/<svg(?=[\s>])[^>]*>/);
  if (!open || open.index === undefined) throw new Error('cropSvg: no <svg> root');
  const root = /viewBox="[^"]*"/.test(open[0])
    ? open[0].replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`)
    : open[0].replace('<svg', `<svg viewBox="${viewBox}"`);
  const end = svg.lastIndexOf('</svg>');
  const inner = svg.slice(open.index + open[0].length, end);
  const covers = cover.length ? `<g fill="${paper}" pointer-events="none">${cover.map(shape).join('')}</g>` : '';
  return svg.slice(0, open.index) + root + inner + covers + '</svg>';
}

export type AyahRef = { surah: number; ayah: number };
const cmp = (a: AyahRef, b: AyahRef) => a.surah - b.surah || a.ayah - b.ayah;

/** Polygons of ayahs within [start, end] (inclusive), by surah:ayah order. */
export function selectRange(entries: PagePolygon[], start: AyahRef, end: AyahRef) {
  return entries.filter((e) => {
    const r = { surah: e.surahNumber, ayah: e.ayahNumber };
    return cmp(r, start) >= 0 && cmp(r, end) <= 0;
  });
}
