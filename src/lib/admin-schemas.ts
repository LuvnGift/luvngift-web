import { z } from 'zod';

/**
 * Client-side mirrors of the admin schemas in
 * `luvngift-api/src/modules/subscriptions/subscriptions.validation.ts`.
 *
 * They are duplicated rather than shared on purpose: mobile never manages plans
 * or the catalogue, so putting them in `@luvngift/shared` would ship dead weight
 * in the app bundle (the same reasoning recorded in that file).
 *
 * > **The cost of that choice is this file.** If you change a rule in the API's
 * > admin schemas, change it here too, or the admin UI will start accepting
 * > values the server rejects — the error surfaces as an opaque 400 at save
 * > time instead of inline on the field.
 *
 * The server remains the authority; this exists so an admin sees which field is
 * wrong before submitting, not to replace server validation.
 */

/** Money is entered in major units and sent in the smallest unit. */
const majorAmount = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => Number.isFinite(Number(v)), `${label} must be a number`)
    .refine((v) => Number(v) > 0, `${label} must be greater than zero`)
    // Cap mirrors the API's max, applied before the /100 conversion.
    .refine((v) => Math.round(Number(v) * 100) <= 1_000_000_00, `${label} is implausibly large`);

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
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  description: z.string().trim().max(500, 'Description must be at most 500 characters').optional(),
  priceMajor: majorAmount('Price'),
  currency: z.enum(['CAD', 'USD', 'GBP', 'NGN']),
  category: z.string().trim().min(2, 'Category must be at least 2 characters').max(60),
  stock: optionalCount('Stock', 1_000_000),
  isActive: z.boolean(),
  availableStates: z.array(z.string()).max(40, 'Select at most 40 states'),
});

export type CatalogueItemFormValues = z.infer<typeof catalogueItemFormSchema>;

// ─── Subscription plans ───────────────────────────────────────────────────────

export const planPriceRowSchema = z.object({
  interval: z.enum(['MONTHLY', 'BIWEEKLY']),
  currency: z.enum(['CAD', 'USD', 'GBP']),
  amountMajor: majorAmount('Amount'),
});

export const planFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be at most 1000 characters'),
  slotCount: optionalCount('Item slots', 100).refine((v) => v >= 1, 'A plan needs at least 1 slot'),
  sortOrder: optionalCount('Sort order', 10_000),
  isActive: z.boolean(),
});

/**
 * Prices are validated separately from the plan body: they only exist when
 * creating (Stripe Prices are immutable, so editing omits them).
 */
export const planPricesSchema = z
  .array(planPriceRowSchema)
  .min(1, 'A plan needs at least one price')
  .superRefine((rows, ctx) => {
    const seen = new Set<string>();
    rows.forEach((row, i) => {
      const key = `${row.interval}-${row.currency}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [i, 'currency'],
          message: 'This interval and currency is already priced',
        });
      }
      seen.add(key);
    });
  });

export type PlanFormValues = z.infer<typeof planFormSchema>;

/** Flattens a ZodError into `{ fieldName: 'first message' }` for inline display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.errors) {
    const key = issue.path.join('.');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
