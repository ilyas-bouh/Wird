import { Ctx, El } from './kit';
import type { LeafSpec } from './leaves';
import { drawBamboo, drawCactus, drawJuniper, drawMush, drawSucc } from './misc';
import { drawStems, StemSpec } from './stems';
import { drawTree } from './trees';

/** What drifts off the finished plant in the wind: petals, leaves or glimmers. */
export interface Fx { c: string; kind: 'petal' | 'leaf' | 'spark' }
export interface Species { name: string; draw: (cx: Ctx, stage: number) => El[]; fx?: Fx }

const stems = (name: string, spec: StemSpec, fx?: Fx): Species => ({ name, draw: (cx, st) => drawStems(cx, spec, st), fx: fx ?? { c: spec.alt?.color ?? spec.color, kind: 'petal' } });
const lf = (style: LeafSpec['style'], len: number, c0: string, c1: string, extra: Partial<LeafSpec> = {}): LeafSpec => ({ style, len, c0, c1, ...extra });

/* shared leaf colourways */
const FRESH = ['#2F7A3A', '#8CCB4E'] as const;
const DEEP = ['#1F6B34', '#5BB04A'] as const;
const TEAL = ['#1F8A5B', '#6FD39A'] as const;
const SAGE = ['#4F8456', '#A9CFA0'] as const;
const LIME = ['#4C8B2F', '#9BD25A'] as const;

const oak = (name: string, canopy: { light: string; mid: string; deep: string }, fruit: 'acorn' | 'lemon' | 'blossom', extra: any = {}): Species => ({
  name, draw: (cx, st) => drawTree(cx, { kind: 'oak', canopy, fruit, ...extra }, st),
  fx: fruit === 'blossom' ? { c: '#FFD3E1', kind: 'petal' } : { c: canopy.mid, kind: 'leaf' },
});

export const SPECIES: Species[] = [
  /* ---------------------------------------------------------- 1-4: yours */
  stems('Rose', { head: 'layered', color: '#D8203C', ho: { rings: 5, per: [6, 6, 5, 4, 3], round: 0.95 }, hs: 17, layout: 'fan', n: 7, h: 80, spread: 30,
    leaf: lf('broad', 30, ...FRESH), basal: { n: 5, fan: 60 }, sl: { n: 2, size: 0.7, stems: 2 }, stemW: 2, sh: 34 }),
  stems('Pink Lotus', { head: 'lotus', color: '#F5779F', pal: { light: '#FFF1F5', deep: '#D2427A' }, ho: { seedpod: '#F7D154' }, hs: 17,
    layout: 'lotus', n: 3, h: 96, spread: 26, leaf: lf('round', 30, '#2A8A3C', '#82CC55'), stemC: '#4A9A45', stemW: 2.2, ground: 'water', sh: 40,
    pads: [{ x: -26, y: -30, r: 18 }, { x: 25, y: -34, r: 17 }, { x: 4, y: -20, r: 12 }, { x: 40, y: -20, r: 9 }] }),
  stems('Mint', { head: 'spike', color: '#B084DC', pal: { light: '#E6D2FA', deep: '#6A3F9E' }, ho: { len: 2.8, n: 14, floret: 'star5', fr: 0.34, width: 0.55, eye: '#fff' }, hs: 10,
    layout: 'fan', n: 3, h: 76, spread: 20, stemC: '#7C4E3C', stemW: 2, leaf: lf('serr', 24, '#2A7A2E', '#6FBF45'), sl: { n: 4, size: 1, angle: 52, stems: 3 }, sh: 30 }),
  { name: 'Prickly Pear', draw: (cx, st) => drawCactus(cx, { kind: 'pad', body: { light: '#C2DC4E', mid: '#86B22C', deep: '#46781F' }, flower: '#E8334A' }, st) },

  /* ------------------------------------------------- 5-30: from the sheet */
  stems('Allium', { head: 'ball', color: '#A86CD8', ho: { florets: 46, fr: 0.2, shape: 'star6' }, hs: 17, layout: 'fan', n: 7, h: 84, spread: 30,
    leaf: lf('strap', 44, '#2D7236', '#6DBB45'), basal: { n: 8, fan: 62 }, sh: 34 }),
  stems('Azalea', { head: 'flower5', color: '#F4569B', pal: { light: '#FFC4DD', deep: '#B01E62' }, ho: { n: 5, len: 1, wid: 0.5, round: 0.95, eye: '#8E1850', eyeR: 0.2, stamens: 5, stamenLen: 0.55 }, hs: 10,
    layout: 'fan', n: 6, h: 56, spread: 30, cluster: 3, stemC: '#7B5A3A', stemW: 2.2, leaf: lf('lance', 22, '#2F6F32', '#7BBF4A'), basal: { n: 7, fan: 78, size: 0.9 }, sl: { n: 3, size: 0.8, angle: 50, stems: 4 }, sh: 36 }),
  stems('Bellflower', { head: 'bell', color: '#CFE8FF', pal: { deep: '#7FB6E0', light: '#FFFFFF' }, ho: { style: 'globe', len: 1.1, wid: 0.58 }, hs: 8.5, layout: 'arch', n: 3, h: 74, spread: 34,
    leaf: lf('broad', 38, ...FRESH), basal: { n: 3, fan: 50 }, along: { n: 6, from: 0.5 }, sh: 32 }),
  stems('Bird of Paradise', { head: 'bop', color: '#FF9A1F', pal: { light: '#FFD060', deep: '#E5500F' }, hs: 21, layout: 'fan', n: 4, h: 76, spread: 28, headRot: 0, stemC: '#3C8A4A', stemW: 2.6,
    leaf: lf('palm', 52, '#1F6B3A', '#5EB06A', { wid: 14 }), basal: { n: 4, fan: 56, size: 1.1 }, sh: 36 }),
  oak('Blue Oak', { light: '#A6DDF5', mid: '#5EB6E8', deep: '#2B7FBF' }, 'acorn'),
  stems('Calendula', { head: 'daisy', color: '#FF9A1F', ho: { n: 16, rings: 2, len: 1, wid: 0.2, core: 0.32, coreC: ['#8A3B14', '#4A1E0A'], dots: 9 }, hs: 14, layout: 'fan', n: 6, h: 70, spread: 32,
    leaf: lf('lance', 26, ...LIME), basal: { n: 7, fan: 70 }, sh: 36 }),
  { name: 'Chinese Bamboo', draw: (cx, st) => drawBamboo(cx, st) },
  stems('Dahlia', { head: 'layered', color: '#F4739A', pal: { light: '#FFD0DE', deep: '#C21E5C' }, ho: { rings: 6, per: [10, 9, 8, 6, 5, 3], round: 0.5, wid: 0.5 }, hs: 17, layout: 'mound', n: 5, h: 44, spread: 28,
    leaf: lf('broad', 24, ...DEEP), basal: { n: 9, fan: 80, size: 0.85 }, sh: 36 }),
  stems('Dancing Lady Orchid', { head: 'orchid', color: '#F9D423', pal: { light: '#FFF08A', deep: '#E39A08' }, ho: { kind: 'dancing', throat: '#B86A2A' }, hs: 10, layout: 'arch', n: 3, h: 70, spread: 30,
    leaf: lf('strap', 38, '#1F8A50', '#76D08A'), basal: { n: 4, fan: 46 }, along: { n: 7, from: 0.38 }, sh: 32 }),
  stems('Dandelion', { head: 'puff', color: '#F2F0DC', pal: { light: '#FFFFFF', deep: '#C9C6A8' }, hs: 11, layout: 'fan', n: 5, h: 62, spread: 30, stemC: '#7BB45A', stemW: 2,
    alt: { head: 'daisy', color: '#FFD21F', ho: { n: 30, rings: 2, len: 0.9, wid: 0.1, core: 0.28, coreC: ['#F5A000', '#E07A00'], dots: 6 }, hs: 11, ranks: [1, 4] },
    leaf: lf('lance', 30, '#2E8B3A', '#7CCB4A', { wid: 6 }), basal: { n: 8, fan: 78 }, sh: 34 }),
  stems('Flaming Katy', { head: 'ball', color: '#F2552C', pal: { light: '#FF9B6A', deep: '#B91C14' }, ho: { florets: 64, fr: 0.17, shape: 'star4', flat: 0.74 }, hs: 17, layout: 'mound', n: 4, h: 50, spread: 26,
    leaf: lf('succ', 24, '#2E7D4A', '#7FD08A'), basal: { n: 10, fan: 85 }, sh: 36 }),
  stems('Hyacinth', { head: 'spike', color: '#4F55E0', ho: { len: 3.4, n: 15, floret: 'star6', fr: 0.5, width: 0.55 }, hs: 11, layout: 'fan', n: 5, h: 56, spread: 22,
    leaf: lf('sword', 46, ...TEAL), basal: { n: 6, fan: 55 }, sh: 30 }),
  stems('Chrysanthemum', { head: 'layered', color: '#FFB54A', pal: { light: '#FFE49A', deep: '#E3721A' }, ho: { rings: 4, per: [22, 18, 14, 9], round: 0.85, wid: 0.13, len: 1, bend: 0.3, swirl: false }, hs: 17, layout: 'mound', n: 5, h: 40, spread: 28,
    leaf: lf('serr', 26, '#1F6F45', '#52B070'), basal: { n: 7, fan: 80, size: 0.9 }, sh: 36 }),
  stems('Iris', { head: 'iris', color: '#6A5CE0', pal: { light: '#C2BCFF', deep: '#3A2FA8' }, hs: 14, layout: 'fan', n: 4, h: 70, spread: 24,
    leaf: lf('sword', 58, '#2A8A48', '#76D08A'), basal: { n: 7, fan: 38 }, sh: 32 }),
  { name: 'Juniper', draw: (cx, st) => drawJuniper(cx, { dark: '#2F7A3A', light: '#7FCB4E', berry: ['#4F9BFF', '#1F4FB5'] }, st) },
  stems('Moth Orchid', { head: 'orchid', color: '#F26BB5', pal: { light: '#FFC8E4', deep: '#B0267A' }, ho: { kind: 'moth', lip: '#B0267A', throat: '#FFD54F' }, hs: 11.5, layout: 'arch', n: 3, h: 66, spread: 28,
    leaf: lf('broad', 40, '#1F7A38', '#6BC25A', { wid: 12 }), basal: { n: 3, fan: 55 }, along: { n: 5, from: 0.35 }, sh: 34 }),
  oak('Oak', { light: '#A8DB3F', mid: '#58AE3A', deep: '#2F7D33' }, 'acorn'),
  { name: 'Persimmon', draw: (cx, st) => drawTree(cx, { kind: 'persimmon', canopy: { light: '#76D9B0', mid: '#3CA88A', deep: '#2F8F78' } }, st) },
  oak('Pink Oak', { light: '#FFDCCF', mid: '#F8B2A6', deep: '#E27B7B' }, 'acorn'),
  oak('Purple Oak', { light: '#D6B8F2', mid: '#A883D8', deep: '#6F4BA8' }, 'acorn'),
  stems('Red Spider Lily', { head: 'spider', color: '#E0242E', pal: { light: '#FF6A5E', deep: '#8E0E18' }, hs: 14, layout: 'fan', n: 4, h: 60, spread: 24, stemC: '#7FBF4A', stemW: 2.6,
    leaf: lf('strap', 30, '#3E8A3A', '#8CCB4E'), basal: { n: 3, fan: 40, size: 0.8 }, sh: 32 }),
  { name: 'Royal Poinciana', draw: (cx, st) => drawTree(cx, { kind: 'poinciana', canopy: { light: '#FF7A3A', mid: '#E8421E', deep: '#8E1212' } }, st) },
  stems('Snowdrop', { head: 'bell', color: '#F3F8EE', pal: { light: '#FFFFFF', deep: '#CFE0C8' }, ho: { style: 'drop', len: 1.3, wid: 0.5 }, hs: 11.5, layout: 'arch', n: 4, h: 50, spread: 24,
    leaf: lf('strap', 36, '#2E7D3A', '#7CCB6A'), basal: { n: 4, fan: 40 }, ground: 'snow', sh: 30 }),
  stems('White Calla Lily', { head: 'calla', color: '#FBFDF0', pal: { light: '#FFFFFF', deep: '#D6E3B2' }, hs: 14, layout: 'fan', n: 4, h: 58, spread: 26,
    leaf: lf('broad', 38, '#1F7A3A', '#7BCB55', { wid: 14 }), basal: { n: 4, fan: 56 }, ground: 'water', sh: 40 }),
  stems('Wishing Flower', { head: 'wishing', color: '#6EC6F2', hs: 13, layout: 'fan', n: 3, h: 58, spread: 24, stemC: '#B9A36A', stemW: 2.2,
    leaf: lf('lance', 30, '#3FA8A0', '#BDF3E6', { wid: 7 }), basal: { n: 7, fan: 70 }, sh: 34 }),
  { name: 'Witch Mushroom', draw: (cx, st) => drawMush(cx, { kind: 'witch', cap: { light: '#C275D8', mid: '#9A4FB8', deep: '#5E2A7E' }, stalk: { light: '#FFF1DA', deep: '#D8B48A' } }, st) },

  /* ----------------------------------------------------------- 31-60: new */
  stems('White Rose', { head: 'layered', color: '#FBEFE6', pal: { light: '#FFFFFF', deep: '#D9BFAE' }, ho: { rings: 5, per: [6, 6, 5, 4, 3], round: 0.95 }, hs: 17, layout: 'fan', n: 7, h: 80, spread: 30,
    leaf: lf('broad', 30, ...FRESH), basal: { n: 5, fan: 60 }, sl: { n: 2, size: 0.7, stems: 2 }, stemW: 2, sh: 34, seed: 11 }),
  stems('Sunrise Rose', { head: 'layered', color: '#FFA531', pal: { light: '#FFE27A', deep: '#E2411A' }, ho: { rings: 5, per: [6, 6, 5, 4, 3], round: 0.95 }, hs: 17, layout: 'fan', n: 7, h: 80, spread: 30,
    leaf: lf('broad', 30, ...FRESH), basal: { n: 5, fan: 60 }, sl: { n: 2, size: 0.7, stems: 2 }, stemW: 2, sh: 34, seed: 13 }),
  stems('Peony', { head: 'layered', color: '#F7A1C4', pal: { light: '#FFE0EC', deep: '#D9608E' }, ho: { rings: 4, per: [8, 8, 7, 5], round: 1, wid: 0.82 }, hs: 19, layout: 'fan', n: 5, h: 64, spread: 26,
    leaf: lf('lance', 30, '#2E7A3A', '#78C256', { wid: 8 }), basal: { n: 6, fan: 70 }, sl: { n: 2, size: 0.8, stems: 3 }, sh: 36 }),
  stems('Camellia', { head: 'layered', color: '#F0334F', pal: { light: '#FF8A9A', deep: '#9C1230' }, ho: { rings: 4, per: [5, 5, 5, 4], round: 1, wid: 0.8 }, hs: 15, layout: 'fan', n: 5, h: 58, spread: 28, stemC: '#6B4A32',
    leaf: lf('broad', 26, '#14502A', '#3F9A4E'), basal: { n: 6, fan: 70 }, sl: { n: 3, size: 0.9, stems: 4 }, sh: 36 }),
  stems('Ranunculus', { head: 'layered', color: '#FF8A3D', pal: { light: '#FFD08A', deep: '#D84A14' }, ho: { rings: 6, per: [10, 9, 8, 6, 4, 3], round: 1, wid: 0.72 }, hs: 14, layout: 'fan', n: 6, h: 62, spread: 28,
    leaf: lf('lance', 24, ...DEEP, { wid: 7 }), basal: { n: 6, fan: 70 }, sh: 34 }),
  stems('Tulip', { head: 'tulip', color: '#E8232F', pal: { light: '#FF8A7A', deep: '#9C1018' }, ho: { A: 30, len: 1.7, wid: 0.6 }, hs: 9.5, layout: 'fan', n: 5, h: 66, spread: 22,
    leaf: lf('lance', 42, '#2E8A4A', '#7FCB7A', { wid: 8, bend: 0.22 }), basal: { n: 3, fan: 30 }, sh: 32 }),
  stems('Crocus', { head: 'tulip', color: '#9B6BE0', pal: { light: '#E6D4FF', deep: '#5A2FA8' }, ho: { A: 42, len: 1.4, wid: 0.5 }, hs: 8, layout: 'fan', n: 5, h: 36, spread: 22,
    leaf: lf('strap', 34, '#2E7D3A', '#8CD27A'), basal: { n: 6, fan: 40 }, sh: 30 }),
  stems('Magnolia', { head: 'tulip', color: '#F7C6D9', pal: { light: '#FFF6F9', deep: '#D4709A' }, ho: { n: 7, A: 46, len: 1.45, wid: 0.62, round: 0.45 }, hs: 12.5, layout: 'fan', n: 3, h: 74, spread: 28, stemC: '#6B4A32', stemW: 2.4,
    leaf: lf('broad', 26, '#14502A', '#4FA45A'), basal: { n: 0, fan: 0 }, sl: { n: 4, size: 1, angle: 55, stems: 3 }, sh: 34 }),
  stems('Blue Lotus', { head: 'lotus', color: '#6FA8F0', pal: { light: '#F0F6FF', deep: '#2F5FC4' }, ho: { seedpod: '#F7D154' }, hs: 16,
    layout: 'lotus', n: 3, h: 94, spread: 26, leaf: lf('round', 30, '#1F7F6A', '#6BCBA8'), stemC: '#3F9A7A', stemW: 2.2, ground: 'water', sh: 40, seed: 5,
    pads: [{ x: 26, y: -30, r: 18 }, { x: -25, y: -34, r: 17 }, { x: -2, y: -20, r: 12 }, { x: -40, y: -20, r: 9 }] }),
  stems('Water Lily', { head: 'lotus', color: '#FFD7E8', pal: { light: '#FFFFFF', deep: '#E58FB5' }, ho: { flat: 1.25, len: 1.05, seedpod: '#F7D154' }, hs: 15,
    layout: 'lotus', n: 3, h: 52, spread: 28, leaf: lf('round', 32, '#2A8A3C', '#82CC55'), stemC: '#4A9A45', stemW: 2, ground: 'water', sh: 42, seed: 9,
    pads: [{ x: -28, y: -18, r: 17 }, { x: 28, y: -17, r: 16 }, { x: 0, y: -14, r: 14 }, { x: -40, y: -10, r: 9 }, { x: 42, y: -9, r: 8 }] }),
  stems('Sunflower', { head: 'daisy', color: '#FFC81E', ho: { n: 22, rings: 2, len: 0.8, wid: 0.22, core: 0.52, coreC: ['#7A4A1A', '#3A2410'], dots: 22, seeds: true }, hs: 20, layout: 'fan', n: 3, h: 88, spread: 24, stemC: '#4E8A3A', stemW: 3,
    leaf: lf('broad', 30, '#2A7A32', '#7DC251'), basal: { n: 2, fan: 50 }, sl: { n: 3, size: 1, angle: 60, stems: 3 }, sh: 34 }),
  stems('Gerbera', { head: 'daisy', color: '#FF4F8B', pal: { light: '#FFA6C4', deep: '#C21E5E' }, ho: { n: 24, rings: 2, len: 1, wid: 0.17, core: 0.24, coreC: ['#4A3022', '#1E140E'], dots: 8 }, hs: 15, layout: 'fan', n: 5, h: 66, spread: 28, stemW: 2,
    leaf: lf('lance', 28, ...DEEP, { wid: 7 }), basal: { n: 6, fan: 70 }, sh: 36 }),
  stems('Cosmos', { head: 'daisy', color: '#F77FB3', pal: { light: '#FFC4DD', deep: '#C23E7E' }, ho: { n: 8, rings: 1, len: 1.05, wid: 0.42, round: 1, core: 0.2, coreC: ['#FFD54F', '#E0A800'], dots: 7 }, hs: 14, layout: 'fan', n: 5, h: 80, spread: 32, stemW: 1.6,
    leaf: lf('lance', 24, '#4C8B3A', '#A8D46A', { wid: 2.4, bend: 0.1 }), basal: { n: 8, fan: 60, size: 0.9 }, sl: { n: 3, size: 0.9, stems: 3 }, sh: 36 }),
  stems('Zinnia', { head: 'layered', color: '#F2672A', pal: { light: '#FFC27A', deep: '#C2380E' }, ho: { rings: 5, per: [12, 10, 8, 6, 4], round: 0.6, wid: 0.5, swirl: false }, hs: 14, layout: 'fan', n: 5, h: 64, spread: 28,
    leaf: lf('broad', 24, ...FRESH), basal: { n: 4, fan: 60 }, sl: { n: 3, size: 0.8, stems: 4 }, sh: 34 }),
  stems('Chamomile', { head: 'daisy', color: '#FFFFFF', pal: { light: '#FFFFFF', deep: '#D8D8D0' }, ho: { n: 14, rings: 1, len: 1, wid: 0.22, core: 0.38, coreC: ['#FFD83A', '#E0A800'], dots: 10 }, hs: 11, layout: 'fan', n: 7, h: 62, spread: 30, stemW: 1.6,
    leaf: lf('lance', 20, '#5E9A3A', '#B3DC7A', { wid: 2.4 }), basal: { n: 8, fan: 65, size: 0.9 }, sh: 36 }),
  stems('Purple Aster', { head: 'daisy', color: '#8F5BE0', pal: { light: '#D2B8FF', deep: '#5A2FA8' }, ho: { n: 26, rings: 2, len: 0.95, wid: 0.12, core: 0.22, coreC: ['#FFD54F', '#E0A800'], dots: 6 }, hs: 12, layout: 'fan', n: 6, h: 64, spread: 30, stemW: 1.8,
    leaf: lf('lance', 18, '#2E7A3A', '#78C256', { wid: 3 }), basal: { n: 6, fan: 65, size: 0.9 }, sl: { n: 3, size: 0.7, stems: 4 }, sh: 34 }),
  stems('Lavender', { head: 'spike', color: '#9E7BDB', pal: { light: '#D7C4F5', deep: '#5E3FA8' }, ho: { len: 3.2, n: 16, floret: 'blob', fr: 0.26, width: 0.3 }, hs: 9, layout: 'fan', n: 8, h: 70, spread: 28, stemW: 1.6,
    leaf: lf('lance', 30, ...SAGE, { wid: 3 }), basal: { n: 8, fan: 52 }, sh: 34 }),
  stems('Delphinium', { head: 'spike', color: '#3B7DE0', pal: { light: '#9CC4FF', deep: '#1F3FA8' }, ho: { len: 4, n: 11, floret: 'star5', fr: 0.55, width: 0.5, eye: '#fff' }, hs: 12, layout: 'fan', n: 4, h: 54, spread: 18,
    leaf: lf('broad', 26, ...DEEP), basal: { n: 5, fan: 60 }, sh: 30 }),
  stems('Foxglove', { head: 'bell', color: '#E070C0', pal: { light: '#FFC2EA', deep: '#9C2E86' }, ho: { style: 'fox', len: 1.2, wid: 0.5 }, hs: 8, layout: 'fan', n: 4, h: 82, spread: 20,
    leaf: lf('broad', 32, '#2A7A3A', '#7BBF5A'), basal: { n: 5, fan: 55 }, along: { n: 7, from: 0.3 }, sh: 32 }),
  stems('Bluebell', { head: 'bell', color: '#6A84F0', pal: { light: '#C5D0FF', deep: '#2F3FB8' }, ho: { style: 'blue', len: 1.2, wid: 0.55 }, hs: 7, layout: 'arch', n: 4, h: 62, spread: 30,
    leaf: lf('strap', 36, '#2E7D3A', '#7CCB6A'), basal: { n: 5, fan: 45 }, along: { n: 5, from: 0.45 }, sh: 32, seed: 4 }),
  stems('Hydrangea', { head: 'ball', color: '#7CA6F0', pal: { light: '#C4DAFF', deep: '#3F63C4' }, ho: { florets: 34, fr: 0.22, shape: 'star4' }, hs: 19, layout: 'mound', n: 4, h: 46, spread: 24,
    leaf: lf('serr', 30, '#1F6F3A', '#6DBB55'), basal: { n: 8, fan: 82 }, sh: 38 }),
  stems('Tiger Lily', { head: 'flower5', color: '#FF8A1F', pal: { light: '#FFC46A', deep: '#D9420F' }, ho: { n: 6, len: 1.1, wid: 0.26, round: 0.5, recurve: 0.25, eye: '#C2410C', eyeR: 0.2, spots: '#4A1E10', stamens: 6, stamenLen: 0.7, stamenC: '#8A3B10' }, hs: 14,
    layout: 'fan', n: 4, h: 74, spread: 26, leaf: lf('lance', 24, '#2A7A3A', '#7BBF5A', { wid: 3.4 }), sl: { n: 4, size: 0.9, stems: 4 }, sh: 32 }),
  stems('Hibiscus', { head: 'flower5', color: '#E8203A', pal: { light: '#FF7A8A', deep: '#9C0E2A' }, ho: { n: 5, len: 1, wid: 0.62, round: 1, eye: '#6A0A22', eyeR: 0.3, stamens: 1, column: true, stamenLen: 0.9 }, hs: 16,
    layout: 'fan', n: 4, h: 60, spread: 28, stemC: '#5E7A3A', leaf: lf('broad', 26, '#14502A', '#4FA45A'), basal: { n: 5, fan: 70 }, sl: { n: 3, size: 0.9, stems: 4 }, sh: 36 }),
  stems('Daffodil', { head: 'flower5', color: '#FFE14D', pal: { light: '#FFF4A0', deep: '#E8A800' }, ho: { n: 6, len: 1, wid: 0.3, round: 0.5, trumpet: '#FFB000', eye: '#E8A800', eyeR: 0.1 }, hs: 13,
    layout: 'fan', n: 5, h: 60, spread: 24, leaf: lf('strap', 44, '#2E7D3A', '#7CCB6A', { wid: 3.6 }), basal: { n: 6, fan: 36 }, sh: 32 }),
  oak('Cherry Blossom', { light: '#FFE3EC', mid: '#FAB6CB', deep: '#E57AA0' }, 'blossom', { trunk: { light: '#B07A68', dark: '#6A4036' }, fruitC: ['#FFF0F5', '#F59BB8'] }),
  oak('Lemon Tree', { light: '#B6E06A', mid: '#5BB03F', deep: '#2F7D33' }, 'lemon'),
  { name: 'Barrel Cactus', draw: (cx, st) => drawCactus(cx, { kind: 'barrel', body: { light: '#9ED26A', mid: '#5FAE48', deep: '#2F7A3A' }, flower: '#FFC933', spine: '#F5E6A8' }, st) },
  { name: 'Saguaro', draw: (cx, st) => drawCactus(cx, { kind: 'saguaro', body: { light: '#8FD08A', mid: '#4FA662', deep: '#276B45' }, flower: '#FFFFFF', flower2: '#FFE3F0', spine: '#F3E8C0' }, st) },
  { name: 'Echeveria', draw: (cx, st) => drawSucc(cx, { leaf: { light: '#A5DDB8', mid: '#5DB89A', deep: '#2F8A78' }, tip: '#F58DB0', flower: '#FF9A5A' }, st) },
  { name: 'Red Toadstool', draw: (cx, st) => drawMush(cx, { kind: 'toad', cap: { light: '#FF6A5A', mid: '#E02E2A', deep: '#8E1414' }, stalk: { light: '#FFF8EA', deep: '#E0C9A6' } }, st) },
];

export function drawPlant(cx: Ctx, index: number, stage: number): El[] {
  return SPECIES[index].draw(cx, stage);
}

const FX_OVERRIDE: Record<string, Fx> = {
  'Mint': { c: '#6FBF45', kind: 'leaf' },
  'Prickly Pear': { c: '#E8334A', kind: 'petal' },
  'Chinese Bamboo': { c: '#8CCB4E', kind: 'leaf' },
  'Dandelion': { c: '#FFFFFF', kind: 'spark' },
  'Juniper': { c: '#7FCB4E', kind: 'leaf' },
  'Persimmon': { c: '#76D9B0', kind: 'leaf' },
  'Royal Poinciana': { c: '#FF5A2A', kind: 'petal' },
  'Wishing Flower': { c: '#FFF2B0', kind: 'spark' },
  'Witch Mushroom': { c: '#E8C4FF', kind: 'spark' },
  'Red Toadstool': { c: '#FFFFFF', kind: 'spark' },
  'Barrel Cactus': { c: '#FFC933', kind: 'petal' },
  'Saguaro': { c: '#FFFFFF', kind: 'petal' },
  'Echeveria': { c: '#FF9A5A', kind: 'petal' },
  'Snowdrop': { c: '#FFFFFF', kind: 'spark' },
};
export function fxOf(index: number): Fx {
  const sp = SPECIES[index];
  return FX_OVERRIDE[sp.name] ?? sp.fx ?? { c: '#FFFFFF', kind: 'petal' };
}
