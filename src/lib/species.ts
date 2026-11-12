export type SpeciesId = 'daffodil' | 'hydrangea' | 'cosmos';

export const SPECIES: { id: SpeciesId; name: string }[] = [
  { id: 'daffodil', name: 'Daffodil' },
  { id: 'hydrangea', name: 'Hydrangea' },
  { id: 'cosmos', name: 'Cosmos' },
];

/** The plant you earn for finishing a thumn: one species per hizb, cycling. */
export const speciesForThumn = (thumnIndex: number): SpeciesId =>
  SPECIES[Math.floor(thumnIndex / 8) % SPECIES.length].id;
