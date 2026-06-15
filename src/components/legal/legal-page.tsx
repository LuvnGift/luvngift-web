import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

interface LegalPageProps {
  title: string;
  updated: string;
  children: React.ReactNode;
}

/**
 * Shared chrome + typography for static legal pages (Privacy, Terms, etc.).
 * Uses Tailwind arbitrary descendant selectors to style the raw content so no
 * typography plugin is required.
 */
export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <h1 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          <p className="mb-10 text-sm text-muted-foreground">Last updated: {updated}</p>
          <div
            className="
              text-[15px] leading-7 text-muted-foreground
              [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground
              [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground
              [&_p]:mb-4
              [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6
              [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
              [&_strong]:font-semibold [&_strong]:text-foreground
            "
          >
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
