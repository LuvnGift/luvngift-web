import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminClientLayout from './admin-client-layout';

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
    redirect('/login');
  }

  return <AdminClientLayout>{children}</AdminClientLayout>;
}
