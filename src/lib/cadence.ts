/**
 * How often a subscription delivers. Mirrors the API's shared/utils/cadence.ts.
 * BIWEEKLY is no longer sold (2026-11-06), but subscribers already on it keep
 * it, so it still needs wording.
 */
export type Interval = 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'BIWEEKLY';

export const OFFERED_INTERVALS = ['MONTHLY', 'BIMONTHLY', 'QUARTERLY'] as const;
export type OfferedInterval = (typeof OFFERED_INTERVALS)[number];

const WORDS: Record<Interval, { cycle: string; label: string; title: string }> = {
  MONTHLY: { cycle: 'month', label: 'monthly', title: 'Every month' },
  BIMONTHLY: { cycle: '2 months', label: 'every 2 months', title: 'Every 2 months' },
  QUARTERLY: { cycle: '3 months', label: 'quarterly', title: 'Every 3 months' },
  BIWEEKLY: { cycle: '2 weeks', label: 'every two weeks', title: 'Every 2 weeks' },
};

const known = (i: string): Interval => (i in WORDS ? (i as Interval) : 'MONTHLY');

/** For "/ ___" and "every ___": month, 2 months, 3 months. */
export const cycleWord = (i: string) => WORDS[known(i)].cycle;
/** In a sentence: monthly, every 2 months, quarterly. */
export const cadenceLabel = (i: string) => WORDS[known(i)].label;
/** As a button or heading: Every month, Every 2 months, Every 3 months. */
export const cadenceTitle = (i: string) => WORDS[known(i)].title;
