import { describe, it, expect } from 'vitest';
import { parseOrderListParams, withOrderListParams } from './admin-order-tabs';

const parse = (qs: string) => parseOrderListParams(new URLSearchParams(qs));

describe('parseOrderListParams', () => {
  it('opens on "Needs action", newest first, page 1', () => {
    expect(parse('')).toEqual({ tab: 'needs-action', q: '', sort: 'newest', page: 1 });
  });

  it('reads a full view from the URL', () => {
    expect(parse('tab=shipped&q=ada&sort=oldest&page=3')).toEqual({
      tab: 'shipped', q: 'ada', sort: 'oldest', page: 3,
    });
  });

  it('ignores malformed values rather than breaking the page', () => {
    expect(parse('tab=archived&sort=sideways&page=-2')).toEqual({
      tab: 'needs-action', q: '', sort: 'newest', page: 1,
    });
  });
});

describe('withOrderListParams', () => {
  it('keeps the ?order= deep link while changing tab', () => {
    expect(withOrderListParams('order=cabc123', { tab: 'processing', page: 1 })).toBe(
      'order=cabc123&tab=processing',
    );
  });

  it('drops defaults so the URL stays short', () => {
    expect(withOrderListParams('tab=shipped&q=ada&page=3', { tab: 'needs-action', q: '', page: 1 })).toBe('');
  });
});
