export type SpeciesId = 'daffodil' | 'hydrangea' | 'cosmos' | 'maple';

export const SPECIES: { id: SpeciesId; name: string }[] = [
  { id: 'daffodil', name: 'Daffodil' },
  { id: 'hydrangea', name: 'Hydrangea' },
  { id: 'cosmos', name: 'Cosmos' },
  { id: 'maple', name: 'Red maple' },
];

// the plants earned by finishing thumns; the red maple is a gift, not an earnable
const EARNABLE: SpeciesId[] = ['daffodil', 'hydrangea', 'cosmos'];

/** The plant you earn for finishing a thumn: one species per hizb, cycling. */
export const speciesForThumn = (thumnIndex: number): SpeciesId =>
  EARNABLE[Math.floor(thumnIndex / 8) % EARNABLE.length];
