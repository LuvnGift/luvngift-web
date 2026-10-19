import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminClientLayout from './admin-client-layout';
import { sessionRefreshUrl } from '@/lib/auth-redirect';

async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  if (!accessToken) return false;

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
    const res = await fetch(`${apiUrl}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const body = await res.json();
    return body?.data?.role === 'ADMIN';
  } catch {
    return false;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    // NOT straight to /login: the middleware bounces a visitor whose 7-day
    // session hint says "admin" from /login back to /admin, which looped
    // forever once the 15-minute access token expired. The refresh route
    // renews the token (or signs out cleanly) and returns to this same page,
    // so a deep link from an alert email survives the round trip.
    const requested = (await headers()).get('x-pathname') ?? '/admin';
    redirect(sessionRefreshUrl(requested));
  }

  return <AdminClientLayout>{children}</AdminClientLayout>;
}
