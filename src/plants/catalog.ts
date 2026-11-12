/**
 * The 60 collectible plants. Plant n belongs to hizb n: every finished thumn of that hizb grows it one
 * step (8 steps, sprout to bouquet), and finishing the hizb unlocks it. Rename freely; the order matters.
 */
export const PLANT_NAMES = [
  'Rose', 'Lily', 'Tulip', 'Daisy', 'Sunflower', 'Lavender', 'Jasmine', 'Orchid', 'Peony', 'Iris',
  'Lotus', 'Poppy', 'Marigold', 'Daffodil', 'Hyacinth', 'Carnation', 'Camellia', 'Magnolia', 'Hibiscus', 'Dahlia',
  'Zinnia', 'Cosmos', 'Anemone', 'Violet', 'Freesia', 'Gardenia', 'Lilac', 'Wisteria', 'Foxglove', 'Snapdragon',
  'Primrose', 'Buttercup', 'Bluebell', 'Chrysanthemum', 'Gerbera', 'Begonia', 'Petunia', 'Pansy', 'Azalea', 'Hydrangea',
  'Crocus', 'Aster', 'Clematis', 'Delphinium', 'Edelweiss', 'Forget-me-not', 'Geranium', 'Heather', 'Ixia', 'Jonquil',
  'Kalmia', 'Lupine', 'Mimosa', 'Narcissus', 'Oleander', 'Phlox', 'Ranunculus', 'Salvia', 'Verbena', 'Yarrow',
] as const;

export const HIZB_COUNT = PLANT_NAMES.length; // 60
export const THUMNS_PER_HIZB = 8;
/** growth steps: 0 = bare soil, 1 = sprout ... 8 = full bouquet */
export const FULL_GROWTH = THUMNS_PER_HIZB;

/** A plant id is `h1`..`h60`, or `maple` for the gift tree. */
export type PlantId = string;
export const MAPLE: PlantId = 'maple';

export const plantId = (hizbIndex: number): PlantId => `h${hizbIndex + 1}`;
export const hizbOf = (id: PlantId): number => (id === MAPLE ? -1 : Number(id.slice(1)) - 1);
export const plantName = (id: PlantId): string => (id === MAPLE ? 'Red maple' : PLANT_NAMES[hizbOf(id)]);
