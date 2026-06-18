import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Briefcase } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { ApplyForm } from './apply-form';
import { EMPLOYMENT_LABELS } from '../constants';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface Job {
  id: string;
  title: string;
  slug: string;
  department: string | null;
  location: string | null;
  employmentType: string;
  description: string;
  createdAt: string;
}

async function fetchJob(slug: string): Promise<Job | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/jobs/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const job = await fetchJob(slug);
  if (!job) return { title: 'Job Not Found' };

  const title = `${job.title} — Careers at Luvngift`;
  const description = `${job.title} at Luvngift${job.location ? ` · ${job.location}` : ''}. Apply online.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/careers/${slug}` },
    openGraph: { title, description, url: `${BASE_URL}/careers/${slug}`, type: 'website' },
  };
}

// Map our employment enum to schema.org's accepted values.
const SCHEMA_EMPLOYMENT: Record<string, string> = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACTOR',
  REMOTE: 'FULL_TIME',
};

function jobPostingJsonLd(job: Job) {
  const isRemote = job.employmentType === 'REMOTE';
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: new Date(job.createdAt).toISOString(),
    employmentType: SCHEMA_EMPLOYMENT[job.employmentType] ?? 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Luvngift',
      sameAs: BASE_URL,
    },
    directApply: true,
    ...(isRemote
      ? {
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: { '@type': 'Country', name: 'Nigeria' },
        }
      : job.location
        ? { jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location } } }
        : {}),
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params;
  const job = await fetchJob(slug);
  if (!job) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd(job)) }}
        />

        <div className="container mx-auto max-w-3xl px-4 py-10">
          <Link href="/careers" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            All roles
          </Link>

          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{job.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              {EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType}
            </Badge>
            {job.department && <span>{job.department}</span>}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
            )}
          </div>

          {/* Description — newlines preserved */}
          <div className="prose prose-sm mt-8 max-w-none whitespace-pre-wrap text-foreground/90">
            {job.description}
          </div>

          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold">Apply for this role</h2>
            <ApplyForm jobId={job.id} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
