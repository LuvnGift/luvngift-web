import { describe, it, expect } from 'vitest';
import {
  catalogueItemFormSchema,
  planFormSchema,
  planPricingFormSchema,
  toPricingInput,
  bundlePricingFormSchema,
  toBundlePricingInput,
  fieldErrors,
  quoteFormSchema,
  toMinorUnits,
} from './admin-schemas';
import { bundlePricingSchema, createItemSchema, fulfilmentRulesSchema, planPricingSchema, sendQuoteSchema } from '@luvngift/shared';

/**
 * The admin forms parse what admin types; the API validates with the wire
 * schemas in @luvngift/shared. The cases below pin the form boundaries, and
 * the last block checks a valid form converts into a payload the API's own
 * schema accepts, so a gap between the two fails here, not as a 400 at save.
 */

const validItem = {
  name: 'Bag of rice (5kg)',
  description: 'Long grain',
  priceMajor: '8500',
  categoryId: 'cat_1',
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
  const valid = {
    sourcingMajor: '150000',
    packagingMajor: '2000',
    platformPercent: '25.5',
    intervals: ['MONTHLY' as const],
  };

  it('accepts a well-formed cost stack and converts it for the API', () => {
    const result = planPricingFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(toPricingInput(result.data)).toEqual({
        boxAllowanceNgn: 150_000_00,
        packagingNgn: 2_000_00,
        platformPercent: 25.5,
        intervals: ['MONTHLY'],
      });
    }
  });

  it('allows zero packaging but not a negative or blank amount', () => {
    expect(planPricingFormSchema.safeParse({ ...valid, packagingMajor: '0' }).success).toBe(true);
    expect(planPricingFormSchema.safeParse({ ...valid, packagingMajor: '-1' }).success).toBe(false);
    expect(planPricingFormSchema.safeParse({ ...valid, packagingMajor: '' }).success).toBe(false);
  });

  it('has no fee to type: the fulfilment fee is the High band fee from Settings', () => {
    expect(Object.keys(planPricingFormSchema.shape)).not.toContain('agentFeeMajor');
    expect(Object.keys(planPricingFormSchema.shape)).not.toContain('fulfilmentFeeMajor');
  });

  it('requires a sourcing amount, up to the API limit', () => {
    expect(planPricingFormSchema.safeParse({ ...valid, sourcingMajor: '' }).success).toBe(false);
    expect(planPricingFormSchema.safeParse({ ...valid, sourcingMajor: '2500000' }).success).toBe(true);
    expect(planPricingFormSchema.safeParse({ ...valid, sourcingMajor: '100000000.01' }).success).toBe(false);
  });

  // percentSchema(PLATFORM_PERCENT_MAX) in @luvngift/shared.
  it.each([[''], ['-1'], ['abc'], ['25.555'], ['61']])('rejects platform share %s', (platformPercent) => {
    expect(planPricingFormSchema.safeParse({ ...valid, platformPercent }).success).toBe(false);
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

// bundlePricingSchema in @luvngift/shared.
describe('bundlePricingFormSchema', () => {
  const valid = { sourcingMajor: '85000.50', packagingMajor: '2000', platformPercent: '25' };

  it('converts naira to kobo and keeps the platform share as a percent', () => {
    const result = bundlePricingFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(toBundlePricingInput(result.data)).toEqual({
        sourcingNgn: 85_000_50,
        packagingNgn: 2_000_00,
        platformPercent: 25,
      });
    }
  });

  it('has no cadence: a bundle is bought once', () => {
    expect(Object.keys(bundlePricingFormSchema.shape)).toEqual([
      'sourcingMajor',
      'packagingMajor',
      'platformPercent',
    ]);
  });

  it('refuses a missing goods cost or a share with three decimals', () => {
    expect(bundlePricingFormSchema.safeParse({ ...valid, sourcingMajor: '' }).success).toBe(false);
    expect(bundlePricingFormSchema.safeParse({ ...valid, platformPercent: '25.125' }).success).toBe(false);
  });
});

describe('a valid form is a valid API payload', () => {
  it('plan pricing', () => {
    const form = planPricingFormSchema.parse({
      sourcingMajor: '150000', packagingMajor: '0', platformPercent: '25.5', intervals: ['MONTHLY'],
    });
    expect(planPricingSchema.safeParse(toPricingInput(form)).success).toBe(true);
  });

  it('bundle pricing', () => {
    const form = bundlePricingFormSchema.parse({
      sourcingMajor: '40000', packagingMajor: '2000', platformPercent: '25',
    });
    expect(bundlePricingSchema.safeParse(toBundlePricingInput(form)).success).toBe(true);
  });

  it('a catalogue item, at the largest cost the form allows', () => {
    const form = catalogueItemFormSchema.parse({ ...validItem, priceMajor: '1000000' });
    const payload = {
      name: form.name,
      description: form.description,
      price: toMinorUnits(form.priceMajor),
      categoryId: form.categoryId,
      stock: form.stock,
      isActive: form.isActive,
      availableStates: form.availableStates,
    };
    expect(createItemSchema.safeParse(payload).success).toBe(true);
  });

  it('a quote', () => {
    const form = quoteFormSchema.parse({ priceMajor: '120.50', scope: 'Cake, flowers and a card', note: '', isFinal: false });
    expect(sendQuoteSchema.safeParse({ subtotal: toMinorUnits(form.priceMajor), scope: form.scope, isFinal: form.isFinal }).success).toBe(true);
  });
});

// fulfilmentRulesSchema in @luvngift/shared: what Settings → Fulfilment sends.
describe('fulfilment settings payload', () => {
  const payload = {
    bandFeesNgn: { HIGH: 8_000_00, MEDIUM: 6_000_00, LOW: 5_000_00 },
    stateBands: { Lagos: 'HIGH' as const, FCT: 'HIGH' as const, Kebbi: 'LOW' as const },
    defaultPackagingNgn: 2_000_00,
    defaultPlatformPercent: 25,
    fxBufferPercent: 5,
    defaultSplitPercent: 50,
    requireRecipientConfirmation: false,
  };

  it('accepts the bands and a partial state map', () => {
    expect(fulfilmentRulesSchema.safeParse(payload).success).toBe(true);
  });

  it('refuses a band fee above High, because every price is built on High', () => {
    const bad = { ...payload, bandFeesNgn: { HIGH: 5_000_00, MEDIUM: 6_000_00, LOW: 1 } };
    expect(fulfilmentRulesSchema.safeParse(bad).success).toBe(false);
  });
});
