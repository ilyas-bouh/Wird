/**
 * The 60 collectible plants. Plant n belongs to hizb n: every finished thumn of that hizb grows it one
 * step (8 steps, sprout to bouquet), and finishing the hizb unlocks it. Rename freely; the order matters.
 */
export const PLANT_NAMES = [
  'Rose', 'Pink Lotus', 'Mint', 'Prickly Pear', 'Allium', 'Azalea',
  'Bellflower', 'Bird of Paradise', 'Blue Oak', 'Calendula', 'Chinese Bamboo', 'Dahlia',
  'Dancing Lady Orchid', 'Dandelion', 'Flaming Katy', 'Hyacinth', 'Chrysanthemum', 'Iris',
  'Juniper', 'Moth Orchid', 'Oak', 'Persimmon', 'Pink Oak', 'Purple Oak',
  'Red Spider Lily', 'Royal Poinciana', 'Snowdrop', 'White Calla Lily', 'Wishing Flower', 'Witch Mushroom',
  'White Rose', 'Sunrise Rose', 'Peony', 'Camellia', 'Ranunculus', 'Tulip',
  'Crocus', 'Magnolia', 'Blue Lotus', 'Water Lily', 'Sunflower', 'Gerbera',
  'Cosmos', 'Zinnia', 'Chamomile', 'Purple Aster', 'Lavender', 'Delphinium',
  'Foxglove', 'Bluebell', 'Hydrangea', 'Tiger Lily', 'Hibiscus', 'Daffodil',
  'Cherry Blossom', 'Lemon Tree', 'Barrel Cactus', 'Saguaro', 'Echeveria', 'Red Toadstool',
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
