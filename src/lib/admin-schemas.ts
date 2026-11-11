import { z } from 'zod';
import {
  CATALOGUE_ITEM_COST_MAX,
  CATALOGUE_ITEM_DESCRIPTION_MAX,
  CATALOGUE_ITEM_NAME_MAX,
  CATALOGUE_ITEM_STATES_MAX,
  KOBO_MAX,
  MESSAGE_MAX,
  OFFERED_INTERVALS,
  type OfferedInterval,
  PLAN_DESCRIPTION_MAX,
  PLAN_DESCRIPTION_MIN,
  PLAN_NAME_MAX,
  PLAN_NAME_MIN,
  PLAN_SLOTS_MAX,
  PLATFORM_PERCENT_MAX,
  QUOTE_SUBTOTAL_MAX,
  SCOPE_MAX,
  SCOPE_MIN,
} from '@luvngift/shared';

/**
 * The admin forms. Admin types text (naira and dollars in major units,
 * percentages), so these parse the inputs and say which field is wrong as
 * the admin types. The wire schemas and every limit are in @luvngift/shared,
 * which the API validates with: no number here is typed by hand, and
 * admin-schemas.test checks a valid form converts to a payload the shared
 * wire schema accepts.
 */

/** Money is entered in major units and sent in the smallest unit. */
const majorAmount = (label: string, maxMinor: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => Number.isFinite(Number(v)), `${label} must be a number`)
    .refine((v) => Number(v) > 0, `${label} must be greater than zero`)
    // The API's cap, applied to the converted value.
    .refine((v) => Math.round(Number(v) * 100) <= maxMinor, `${label} is implausibly large`);

/** Naira entered in major units, up to the API's KOBO_MAX. */
const nairaAmount = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => Number.isFinite(Number(v)), `${label} must be a number`)
    .refine((v) => Number(v) > 0, `${label} must be greater than zero`)
    .refine((v) => Math.round(Number(v) * 100) <= KOBO_MAX, `${label} is implausibly large`);

/**
 * A cleared `<input type="number">` yields '' and `Number('')` is 0, while
 * `Number('abc')` is NaN — both slip past a plain `z.number()` on a value the
 * component already coerced. Parse from the raw string instead.
 */
const optionalCount = (label: string, max: number) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'number' ? v : v.trim()))
    .refine((v) => v !== '' && Number.isInteger(Number(v)), `${label} must be a whole number`)
    .refine((v) => Number(v) >= 0, `${label} cannot be negative`)
    .refine((v) => Number(v) <= max, `${label} cannot exceed ${max}`)
    .transform((v) => Number(v));

// ─── Catalogue items ──────────────────────────────────────────────────────────

export const catalogueItemFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(CATALOGUE_ITEM_NAME_MAX),
  description: z
    .string()
    .trim()
    .max(CATALOGUE_ITEM_DESCRIPTION_MAX, `Description must be at most ${CATALOGUE_ITEM_DESCRIPTION_MAX} characters`)
    .optional(),
  /** Sourcing cost in naira. Always NGN: boxes are measured against a naira allowance. */
  priceMajor: majorAmount('Cost', CATALOGUE_ITEM_COST_MAX),
  /** Chosen from the managed list (Admin -> Catalogue -> Categories). */
  categoryId: z.string().min(1, 'Choose a category'),
  stock: optionalCount('Stock', 1_000_000),
  isActive: z.boolean(),
  availableStates: z.array(z.string()).max(CATALOGUE_ITEM_STATES_MAX, `Select at most ${CATALOGUE_ITEM_STATES_MAX} states`),
});

export type CatalogueItemFormValues = z.infer<typeof catalogueItemFormSchema>;

// ─── Subscription plans ───────────────────────────────────────────────────────

/** A plan's details. Pricing is separate: it is derived, previewed and published. */
export const planFormSchema = z.object({
  name: z.string().trim().min(PLAN_NAME_MIN, `Name must be at least ${PLAN_NAME_MIN} characters`).max(PLAN_NAME_MAX),
  description: z
    .string()
    .trim()
    .min(PLAN_DESCRIPTION_MIN, `Description must be at least ${PLAN_DESCRIPTION_MIN} characters`)
    .max(PLAN_DESCRIPTION_MAX, `Description must be at most ${PLAN_DESCRIPTION_MAX} characters`),
  slotCount: optionalCount('Item slots', PLAN_SLOTS_MAX).refine((v) => v >= 1, 'A plan needs at least 1 slot'),
  sortOrder: optionalCount('Sort order', 10_000),
  isActive: z.boolean(),
});

export type PlanFormValues = z.infer<typeof planFormSchema>;

/** A fee in naira that may be zero (a partner who charges nothing for that part). */
const nairaFee = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required (0 if none)`)
    .refine((v) => Number.isFinite(Number(v)), `${label} must be a number`)
    .refine((v) => Number(v) >= 0, `${label} cannot be negative`)
    .refine((v) => Math.round(Number(v) * 100) <= KOBO_MAX, `${label} is implausibly large`);

/**
 * The cost stack as typed (costStackSchema in @luvngift/shared):
 * the partners' naira fees and the platform's share. The goods amount is
 * named per caller (sourcing for a bundle, the box allowance for a plan).
 */
const costStackFields = {
  /** What one delivery's goods cost to buy, in naira. */
  sourcingMajor: nairaAmount('Goods cost'),
  agentFeeMajor: nairaFee('Agent fee'),
  deliveryFeeMajor: nairaFee('Delivery fee'),
  platformPercent: z
    .string()
    .trim()
    .min(1, 'Platform share is required')
    .refine((v) => Number.isFinite(Number(v)), 'Platform share must be a number')
    .refine((v) => Number(v) >= 0 && Number(v) <= PLATFORM_PERCENT_MAX, `Platform share must be between 0% and ${PLATFORM_PERCENT_MAX}%`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'At most two decimal places'),
};

/**
 * A plan's pricing as typed (planPricingSchema in @luvngift/shared). Prices
 * are never entered: the API derives them from the cost stack at today's rate.
 */
export const planPricingFormSchema = z.object({
  ...costStackFields,
  intervals: z
    .array(z.enum([...OFFERED_INTERVALS, 'BIWEEKLY']))
    .min(1, 'Offer the plan at least one cadence')
    // A plan may still list every two weeks from before it was retired; it must be unticked to save.
    .refine((v) => !v.includes('BIWEEKLY'), 'Every two weeks is no longer sold: untick it'),
});

export type PlanPricingFormValues = z.infer<typeof planPricingFormSchema>;

const toKobo = (major: string) => Math.round(Number(major) * 100);

/** Form values → the API's pricing input. */
export const toPricingInput = (v: PlanPricingFormValues) => ({
  boxAllowanceNgn: toKobo(v.sourcingMajor),
  agentFeeNgn: toKobo(v.agentFeeMajor),
  deliveryFeeNgn: toKobo(v.deliveryFeeMajor),
  platformPercent: Number(v.platformPercent),
  // The schema already refuses the retired cadence; this narrows the type to match.
  intervals: v.intervals.filter((i): i is OfferedInterval => i !== 'BIWEEKLY'),
});

/**
 * A bundle's pricing as typed (bundlePricingSchema in @luvngift/shared): the
 * same cost stack without cadences — a bundle is bought once.
 */
export const bundlePricingFormSchema = z.object(costStackFields);
export type BundlePricingFormValues = z.infer<typeof bundlePricingFormSchema>;

/** Form values → the API's bundle pricing input. */
export const toBundlePricingInput = (v: BundlePricingFormValues) => ({
  sourcingNgn: toKobo(v.sourcingMajor),
  agentFeeNgn: toKobo(v.agentFeeMajor),
  deliveryFeeNgn: toKobo(v.deliveryFeeMajor),
  platformPercent: Number(v.platformPercent),
});

/** A stored stack (kobo / basis points) → form values; blanks for a legacy item. */
export const stackFormValues = (row: {
  goodsNgn?: number | null;
  agentFeeNgn?: number | null;
  deliveryFeeNgn?: number | null;
  platformBps?: number | null;
}): BundlePricingFormValues => ({
  sourcingMajor: row.goodsNgn ? String(row.goodsNgn / 100) : '',
  agentFeeMajor: row.agentFeeNgn != null ? String(row.agentFeeNgn / 100) : '',
  deliveryFeeMajor: row.deliveryFeeNgn != null ? String(row.deliveryFeeNgn / 100) : '',
  platformPercent: row.platformBps != null ? String(row.platformBps / 100) : '',
});

/**
 * A quote as typed (sendQuoteSchema in @luvngift/shared).
 * The price is entered in major units of the ORDER's currency (the buyer's).
 */
export const quoteFormSchema = z.object({
  priceMajor: majorAmount('Price', QUOTE_SUBTOTAL_MAX),
  scope: z
    .string()
    .trim()
    .min(SCOPE_MIN, 'Describe what will be delivered — the vendor works from this')
    .max(SCOPE_MAX),
  note: z.string().trim().max(MESSAGE_MAX),
  isFinal: z.boolean(),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

/** Major-unit string → smallest unit, as the API expects. */
export const toMinorUnits = (major: string): number => Math.round(Number(major) * 100);

/** Flattens a ZodError into `{ fieldName: 'first message' }` for inline display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.errors) {
    const key = issue.path.join('.');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
