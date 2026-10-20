/**
 * How full a subscription box is, for the picker's meter.
 *
 * Each catalogue item comes with `share`: the percentage of the plan's box one
 * unit uses. The API decides in kobo and is the authority, so this is a guide
 * that can differ from it by a rounding hair at the edges, and the server's
 * message is shown if it does.
 */

export type BoxFillStatus = 'EMPTY' | 'UNDER' | 'OK' | 'OVER';

export interface BoxFill {
  percent: number;
  status: BoxFillStatus;
}

export function boxFill(
  picked: Record<string, number>,
  items: { id: string; share: number | null }[],
  minFillPercent: number,
): BoxFill {
  const shares = new Map(items.map((i) => [i.id, i.share ?? 0]));
  const entries = Object.entries(picked);
  if (entries.length === 0) return { percent: 0, status: 'EMPTY' };

  const raw = entries.reduce((sum, [id, qty]) => sum + (shares.get(id) ?? 0) * qty, 0);
  const percent = Math.round(raw * 10) / 10;
  if (percent > 100) return { percent, status: 'OVER' };
  if (percent < minFillPercent) return { percent, status: 'UNDER' };
  return { percent, status: 'OK' };
}
