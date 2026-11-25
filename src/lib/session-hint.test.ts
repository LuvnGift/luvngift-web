import { describe, expect, it } from 'vitest';
import { parseSessionHint } from './session-hint';

const encoded = (value: object) => `session=${encodeURIComponent(JSON.stringify(value))}`;

describe('parseSessionHint', () => {
  it('reads the cookie as Express writes it (URI-encoded JSON)', () => {
    expect(parseSessionHint(encoded({ isAuth: true, role: 'ADMIN' }))).toEqual({ isAuth: true, role: 'ADMIN' });
  });

  it('reads the raw JSON the old client-side copy wrote, so existing sessions survive the deploy', () => {
    expect(parseSessionHint('session={"isAuth":true,"role":"CUSTOMER"}')).toEqual({ isAuth: true, role: 'CUSTOMER' });
  });

  it('finds it among other cookies, and not inside another cookie name', () => {
    const header = `cookie_consent=all; ${encoded({ isAuth: true, role: 'CUSTOMER' })}; theme=dark`;
    expect(parseSessionHint(header).isAuth).toBe(true);
    expect(parseSessionHint('oldsession=x; cookie_consent=all').isAuth).toBe(false);
  });

  it('is signed out for a missing, cleared, malformed or non-true value', () => {
    for (const header of ['', 'session=', 'session=not-json', encoded({ isAuth: 'yes' }), encoded({ role: 'ADMIN' })]) {
      expect(parseSessionHint(header).isAuth).toBe(false);
    }
  });
});
