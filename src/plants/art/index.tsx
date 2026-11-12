import type { ComponentType } from 'react';
import PlantSvg from './Art';

/**
 * Artwork for the 60 plants. Plant `h<n>` is the n-th entry of PLANT_NAMES (catalog.ts) and of SPECIES (species.ts);
 * the drawings are generated (kit.ts / heads.ts / stems.ts / trees.ts / misc.ts) so every plant has all 8 growth steps.
 * Each component draws react-native-svg children (no <Svg> wrapper) with the plant's base at (0,0), growing upward
 * into x -50..50, y -120..0. `stage` is 0..8: 0 bare soil, 1 sprout, ... 8 the full bouquet.
 */
export const ART: Record<string, ComponentType<{ stage: number }>> = {};
for (let i = 0; i < 60; i++) {
  ART[`h${i + 1}`] = ({ stage }: { stage: number }) => <PlantSvg index={i} stage={stage} />;
}
