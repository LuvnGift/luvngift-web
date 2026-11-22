import { describe, expect, it } from 'vitest';
import { STAFF_PRESETS, updateUserAccessSchema } from '@luvngift/shared';
import type { UserAccessChange } from '@/hooks/use-admin';

/**
 * What the admin access page sends must pass the schema the API validates,
 * so a form change surfaces here instead of as a 400 at save time.
 */
describe('admin access payloads', () => {
  const preset = STAFF_PRESETS[0];

  it.each<UserAccessChange>([
    { role: 'ADMIN' },
    { role: 'CUSTOMER' },
    { role: 'STAFF', permissions: [...preset.permissions], title: preset.title },
  ])('%o passes the shared schema', (body) => {
    expect(updateUserAccessSchema.safeParse(body).success).toBe(true);
  });

  it('refuses staff with no permissions, which the form keeps disabled', () => {
    expect(updateUserAccessSchema.safeParse({ role: 'STAFF', permissions: [], title: preset.title }).success).toBe(false);
  });
});
