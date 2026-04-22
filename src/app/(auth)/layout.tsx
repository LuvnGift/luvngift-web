import { Gift } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b py-4 px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg w-fit">
          <Gift className="h-5 w-5 text-primary" />
          Luvngift
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
