import { describe, expect, it } from 'vitest';
import { isVendorAssignable, vendorAssignmentBlock } from './vendor-assignment';

// Mirrors the API rule (vendor-assignment.service.ts), which is what enforces it.
describe('vendorAssignmentBlock', () => {
  const paid = { status: 'PENDING', subscriptionId: null, payment: { status: 'SUCCEEDED' } };

  it('allows a paid order, open or already being fulfilled', () => {
    expect(vendorAssignmentBlock(paid)).toBeNull();
    expect(vendorAssignmentBlock({ ...paid, status: 'PROCESSING' })).toBeNull();
  });

  it('allows a subscription cycle, which has no payment row', () => {
    expect(vendorAssignmentBlock({ status: 'PENDING', subscriptionId: 'sub_1', payment: null })).toBeNull();
  });

  it.each(['CANCELLED', 'REFUNDED', 'SHIPPED', 'DELIVERED'])('blocks a %s order', (status) => {
    expect(vendorAssignmentBlock({ ...paid, status })).not.toBeNull();
  });

  it('blocks an unpaid one-off order', () => {
    expect(vendorAssignmentBlock({ ...paid, payment: { status: 'PENDING' } })).toMatch(/not paid/i);
    expect(vendorAssignmentBlock({ ...paid, payment: null })).toMatch(/not paid/i);
  });
});

describe('isVendorAssignable', () => {
  it('offers only approved, active vendors', () => {
    expect(isVendorAssignable({ isActive: true, status: 'APPROVED' })).toBe(true);
    expect(isVendorAssignable({ isActive: false, status: 'APPROVED' })).toBe(false);
    expect(isVendorAssignable({ isActive: true, status: 'PENDING' })).toBe(false);
    expect(isVendorAssignable({ isActive: true, status: 'REJECTED' })).toBe(false);
  });
});
