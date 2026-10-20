import { describe, it, expect } from 'vitest';
import {
  catalogueItemFormSchema,
  planFormSchema,
  planPricingFormSchema,
  toPricingInput,
  fieldErrors,
  quoteFormSchema,
  toMinorUnits,
} from './admin-schemas';

/**
 * These schemas mirror the API's admin schemas by hand (see the note in
 * admin-schemas.ts). The cases below pin the boundaries that matter, so a drift
 * between the two shows up here rather than as an opaque 400 at save time.
 */

const validItem = {
  name: 'Bag of rice (5kg)',
  description: 'Long grain',
  priceMajor: '8500',
  category: 'Staples',
  stock: 12,
  isActive: true,
  availableStates: ['Lagos'],
};

describe('catalogueItemFormSchema', () => {
  it('accepts a well-formed item', () => {
    expect(catalogueItemFormSchema.safeParse(validItem).success).toBe(true);
  });

  it('rejects a cleared price rather than treating it as zero', () => {
    const result = catalogueItemFormSchema.safeParse({ ...validItem, priceMajor: '' });
    expect(result.success).toBe(false);
  });

  it.each([['0'], ['-5'], ['abc']])('rejects price=%s', (priceMajor) => {
    expect(catalogueItemFormSchema.safeParse({ ...validItem, priceMajor }).success).toBe(false);
  });

  it('rejects a price above the API cap, catching a missing /100 conversion', () => {
    // 1,000,000.01 major units exceeds the 1_000_000_00 smallest-unit cap.
    const result = catalogueItemFormSchema.safeParse({ ...validItem, priceMajor: '1000000.01' });
    expect(result.success).toBe(false);
  });

  it('rejects NaN stock, which is what a cleared number input coerces to', () => {
    const result = catalogueItemFormSchema.safeParse({ ...validItem, stock: NaN });
    expect(result.success).toBe(false);
  });

  it('rejects a negative stock', () => {
    expect(catalogueItemFormSchema.safeParse({ ...validItem, stock: -1 }).success).toBe(false);
  });

  it('treats an empty state list as valid — that means nationwide', () => {
    const result = catalogueItemFormSchema.safeParse({ ...validItem, availableStates: [] });
    expect(result.success).toBe(true);
  });

  it('enforces the same min length on name as the API', () => {
    expect(catalogueItemFormSchema.safeParse({ ...validItem, name: 'a' }).success).toBe(false);
  });
});

const validPlan = {
  name: 'Standard Grocery Box',
  description: 'A month of staples for one or two people.',
  slotCount: 5,
  sortOrder: 0,
  isActive: true,
};

describe('planFormSchema', () => {
  it('accepts a well-formed plan', () => {
    expect(planFormSchema.safeParse(validPlan).success).toBe(true);
  });

  it('rejects a description under 10 characters, matching the API', () => {
    expect(planFormSchema.safeParse({ ...validPlan, description: 'Too short' }).success).toBe(false);
  });

  it('rejects a cleared slot count instead of saving a zero-slot plan', () => {
    const result = planFormSchema.safeParse({ ...validPlan, slotCount: '' });
    expect(result.success).toBe(false);
  });

  it('rejects zero slots', () => {
    expect(planFormSchema.safeParse({ ...validPlan, slotCount: 0 }).success).toBe(false);
  });

  it('rejects more slots than the API allows', () => {
    expect(planFormSchema.safeParse({ ...validPlan, slotCount: 101 }).success).toBe(false);
  });

  it('coerces a numeric string from the input into a number', () => {
    const result = planFormSchema.safeParse({ ...validPlan, slotCount: '7' });
    expect(result.success && result.data.slotCount).toBe(7);
  });

  it('allows sortOrder 0', () => {
    expect(planFormSchema.safeParse({ ...validPlan, sortOrder: 0 }).success).toBe(true);
  });
});

describe('planPricingFormSchema', () => {
  const valid = { sourcingMajor: '150000', markupPercent: '62.5', intervals: ['MONTHLY' as const] };

  it('accepts a well-formed pricing input and converts it for the API', () => {
    const result = planPricingFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(toPricingInput(result.data)).toEqual({
        boxAllowanceNgn: 150_000_00,
        markupPercent: 62.5,
        intervals: ['MONTHLY'],
      });
    }
  });

  it('requires a sourcing amount, up to the API limit', () => {
    expect(planPricingFormSchema.safeParse({ ...valid, sourcingMajor: '' }).success).toBe(false);
    expect(planPricingFormSchema.safeParse({ ...valid, sourcingMajor: '2500000' }).success).toBe(true);
    expect(planPricingFormSchema.safeParse({ ...valid, sourcingMajor: '100000000.01' }).success).toBe(false);
  });

  it.each([[''], ['-1'], ['abc'], ['62.555'], ['1001']])('rejects markup %s', (markupPercent) => {
    expect(planPricingFormSchema.safeParse({ ...valid, markupPercent }).success).toBe(false);
  });

  it('requires at least one cadence', () => {
    expect(planPricingFormSchema.safeParse({ ...valid, intervals: [] }).success).toBe(false);
  });
});

describe('fieldErrors', () => {
  it('keys messages by dotted path and keeps the first per field', () => {
    const result = catalogueItemFormSchema.safeParse({ ...validItem, name: '', priceMajor: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.name).toBeDefined();
      expect(errors.priceMajor).toBeDefined();
    }
  });
});

describe('quoteFormSchema', () => {
  const valid = {
    priceMajor: '45.50',
    scope: 'Red velvet cake, 12 roses and a handwritten card',
    note: '',
    isFinal: false,
  };

  it('accepts a well-formed quote', () => {
    expect(quoteFormSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a zero or blank price', () => {
    expect(quoteFormSchema.safeParse({ ...valid, priceMajor: '0' }).success).toBe(false);
    expect(quoteFormSchema.safeParse({ ...valid, priceMajor: '' }).success).toBe(false);
  });

  it('requires a scope the vendor can work from (API min 10)', () => {
    expect(quoteFormSchema.safeParse({ ...valid, scope: 'Cake' }).success).toBe(false);
  });

  it('caps scope at the API limit of 4000', () => {
    expect(quoteFormSchema.safeParse({ ...valid, scope: 'x'.repeat(4001) }).success).toBe(false);
  });

  it('converts to the smallest unit without float drift', () => {
    expect(toMinorUnits('45.50')).toBe(4550);
    expect(toMinorUnits('19.99')).toBe(1999);
  });
});
