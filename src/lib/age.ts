/**
 * Client-side mirror of the API's 18+ rule (luvngift-api/src/shared/utils/age.ts),
 * so a sign-up form can say "you must be 18" before submitting. The API is
 * the authority; this only spares a round trip.
 */
export const MINIMUM_AGE = 18;

/** True when `raw` (YYYY-MM-DD) is a real date at least 18 years ago and under 120. */
export function isAdultDateOfBirth(raw: string, now: Date = new Date()): boolean {
  const dob = new Date(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(dob.getTime())) return false;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth()
    || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= MINIMUM_AGE && age <= 120;
}

/** Latest date of birth that is 18 today, as YYYY-MM-DD — for a date input's `max`. */
export function latestAdultDateOfBirth(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear() - MINIMUM_AGE, now.getUTCMonth(), now.getUTCDate()));
  return d.toISOString().slice(0, 10);
}
