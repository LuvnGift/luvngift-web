/**
 * The legal identity of the business, shown wherever the law expects a seller
 * to be identifiable: the footer, the contact page and the legal pages.
 *
 * Ontario's Consumer Protection Act requires an online seller to disclose its
 * name, business address and telephone number before the customer buys; the
 * UK's E-Commerce Regulations ask for the same plus an email. Keep every copy
 * of these details reading from here so they can never disagree.
 */
export const BUSINESS = {
  tradingName: 'Luvngift',
  legalName: 'DOCH FX INC',
  address: {
    street: '3354 Woodroffe Avenue',
    city: 'Nepean',
    region: 'Ontario',
    postalCode: 'K2J 0A8',
    country: 'Canada',
  },
  email: 'info@luvngift.com',
  /**
   * Customer-facing phone number in international format, e.g. '+1 613 555 0123'.
   * Leave empty until a real number exists: every surface hides the phone line
   * when this is blank rather than showing a placeholder.
   */
  phone: '' as string,
} as const;

/** One-line postal address, e.g. for the footer. */
export function businessAddressLine(): string {
  const a = BUSINESS.address;
  return `${a.street}, ${a.city}, ${a.region} ${a.postalCode}, ${a.country}`;
}

/** `tel:` href for the phone number — digits and a leading + only. */
export function businessPhoneHref(): string {
  return `tel:${BUSINESS.phone.replace(/[^\d+]/g, '')}`;
}
