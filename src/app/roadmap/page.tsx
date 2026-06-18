import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Rocket, Hammer, CircleDashed, CheckCircle2 } from 'lucide-react';
import { NotifyForm } from './notify-form';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export const metadata: Metadata = {
  title: "What's Coming — Luvngift Roadmap",
  description:
    'See what we’re building next at Luvngift — new gifting corridors and features. Get notified when each one goes live.',
  alternates: { canonical: `${BASE_URL}/roadmap` },
  openGraph: {
    title: 'Luvngift Roadmap — What’s Coming',
    description: 'New gifting corridors and features coming to Luvngift. Join the waitlist.',
    url: `${BASE_URL}/roadmap`,
    type: 'website',
  },
};

type RoadmapStatus = 'PLANNED' | 'IN_PROGRESS' | 'LAUNCHED';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: string | null;
  status: RoadmapStatus;
  targetLabel: string | null;
}

async function fetchRoadmap(): Promise<RoadmapItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/roadmap`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

// Display order + presentation per status group.
const GROUPS: { status: RoadmapStatus; label: string; icon: typeof Rocket; blurb: string }[] = [
  { status: 'IN_PROGRESS', label: 'In progress', icon: Hammer, blurb: 'Actively building this now.' },
  { status: 'PLANNED', label: 'Planned', icon: CircleDashed, blurb: 'On our radar and coming up.' },
  { status: 'LAUNCHED', label: 'Launched', icon: CheckCircle2, blurb: 'Live and ready to use.' },
];

export default async function RoadmapPage() {
  const items = await fetchRoadmap();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/30 py-16 md:py-20">
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
              <Rocket className="h-3.5 w-3.5 text-primary" />
              Product roadmap
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">What&apos;s coming next</h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              We&apos;re always expanding where and how you can send gifts. Here&apos;s what we&apos;re
              working on — add your email to any item and we&apos;ll let you know the moment it&apos;s live.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto max-w-3xl px-4">
            {items.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <p>Nothing to show yet — check back soon!</p>
              </div>
            ) : (
              <div className="space-y-14">
                {GROUPS.map((group) => {
                  const groupItems = items.filter((i) => i.status === group.status);
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group.status}>
                      <div className="mb-5 flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <group.icon className="h-4 w-4 text-primary" />
                        </span>
                        <div>
                          <h2 className="text-lg font-bold">{group.label}</h2>
                          <p className="text-xs text-muted-foreground">{group.blurb}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {groupItems.map((item) => (
                          <div key={item.id} className="rounded-xl border bg-card p-5">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{item.title}</h3>
                              {item.category && <Badge variant="secondary">{item.category}</Badge>}
                              {item.targetLabel && (
                                <span className="text-xs text-muted-foreground">{item.targetLabel}</span>
                              )}
                            </div>
                            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                              {item.description}
                            </p>
                            {item.status !== 'LAUNCHED' && <NotifyForm itemId={item.id} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
