/**
 * Display helpers for points. The API decides every rule (modules/points);
 * these only preview it. Mirrors points-ledger.ts: change both.
 */

/** Points a box filled to `fillPercent` earns per delivery: `perStep` per full `stepPercent` unfilled. */
export function pointsForFill(fillPercent: number, perStep = 10, stepPercent = 5): number {
  const unfilled = Math.max(0, 100 - Math.min(100, fillPercent));
  return Math.floor(unfilled / stepPercent + 1e-9) * perStep;
}

/** What `points` take off, in the smallest currency unit. */
export function pointsValue(points: number, pointsPerCurrencyUnit: number): number {
  return Math.floor((points * 100) / pointsPerCurrencyUnit);
}

export const formatPoints = (n: number) => n.toLocaleString('en-GB');
