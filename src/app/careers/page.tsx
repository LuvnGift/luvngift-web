import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Briefcase, MapPin, ArrowRight } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export const metadata: Metadata = {
  title: 'Careers — Join the Luvngift Team',
  description:
    'Help us connect the Nigerian diaspora with loved ones back home. See open roles at Luvngift and apply online.',
  alternates: { canonical: `${BASE_URL}/careers` },
  openGraph: {
    title: 'Careers at Luvngift',
    description: 'Open roles at Luvngift — build the platform that delivers gifts across Nigeria.',
    url: `${BASE_URL}/careers`,
    type: 'website',
  },
};

export const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  REMOTE: 'Remote',
};

interface Job {
  id: string;
  title: string;
  slug: string;
  department: string | null;
  location: string | null;
  employmentType: string;
}

async function fetchJobs(): Promise<Job[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/jobs`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function CareersPage() {
  const jobs = await fetchJobs();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/30 py-16 md:py-20">
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              Careers
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Build with us</h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              We&apos;re a small team on a big mission: making it effortless for the Nigerian diaspora to send
              love home. If that excites you, we&apos;d love to hear from you.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className="mb-6 text-2xl font-bold">Open roles</h2>
            {jobs.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
                <p className="mb-2">No open roles right now.</p>
                <p className="text-sm">
                  Still want to reach out? Email{' '}
                  <a href="mailto:careers@luvngift.com" className="font-medium text-foreground underline underline-offset-2">
                    careers@luvngift.com
                  </a>
                  .
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/careers/${job.slug}`}
                      className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/40"
                    >
                      <div>
                        <h3 className="font-semibold group-hover:text-primary">{job.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary">{EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType}</Badge>
                          {job.department && <span>{job.department}</span>}
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {job.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
