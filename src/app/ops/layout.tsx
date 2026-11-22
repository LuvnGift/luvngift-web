import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { canUseOps } from '@luvngift/shared';
import OpsClientLayout from './ops-client-layout';
import { sessionRefreshUrl } from '@/lib/auth-redirect';
import { ApiUnavailableError, isTransientStatus, sessionFetch } from '@/lib/api-fetch';

/**
 * The ops dashboard for STAFF (and admins). Verified on the server like the
 * admin layout, never by a client-side role check alone. True for staff or
 * admin; false when the API says the token is not one; throws when the API
 * could not answer, which shows the error page and keeps the cookies.
 */
async function verifyStaffSession(): Promise<boolean> {
  const accessToken = (await cookies()).get('accessToken')?.value;
  if (!accessToken) return false;

  const url = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/v1/users/me`;
  const res = await sessionFetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (isTransientStatus(res.status)) throw new ApiUnavailableError(url, `HTTP ${res.status}`);
  if (!res.ok) return false;
  const body = await res.json();
  return canUseOps(body?.data?.role);
}

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  if (!(await verifyStaffSession())) {
    // Through the refresh route, never straight to /login: see the admin layout.
    const requested = (await headers()).get('x-pathname') ?? '/ops';
    redirect(sessionRefreshUrl(requested));
  }
  return <OpsClientLayout>{children}</OpsClientLayout>;
}
