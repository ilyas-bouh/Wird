import type { ComponentType } from 'react';

/**
 * Drop-in artwork for the plants. Register a component under the plant's id (`h1` is the Rose, `h2` the Lily, ...):
 *
 *   import Rose from './Rose';
 *   export const ART: Record<string, ComponentType<{ stage: number }>> = { h1: Rose };
 *
 * The component draws react-native-svg children (no <Svg> wrapper) with the plant's base at (0,0), growing
 * upward into x -50..50, y -120..0. `stage` is 0..8: 0 bare soil, 1 sprout, ... 8 the full bouquet.
 * Any plant without art falls back to the generated placeholder.
 */
export const ART: Record<string, ComponentType<{ stage: number }>> = {};
