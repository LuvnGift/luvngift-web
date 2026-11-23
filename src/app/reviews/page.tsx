import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { ReviewCard } from '@/components/reviews/review-card';
import { RatingSummary } from '@/components/reviews/rating-summary';
import { ApiUnavailableError, fetchResourceOrNull } from '@/lib/api-fetch';
import {
  CACHE_FALLBACK_SECONDS,
  CACHE_TAGS,
  type PaginatedResponse,
  type PublicReview,
  type ReviewRatingSummary,
} from '@luvngift/shared';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const PAGE_SIZE = 12;
const CACHE = { revalidate: CACHE_FALLBACK_SECONDS, tags: [CACHE_TAGS.reviews] };

export const metadata: Metadata = {
  title: 'Customer Reviews — Luvngift',
  description:
    'Reviews from people who sent gifts to family and friends in Nigeria with Luvngift. Every review is from a buyer whose order we delivered.',
  alternates: { canonical: `${BASE_URL}/reviews` },
  openGraph: {
    title: 'Luvngift Customer Reviews',
    description: 'What buyers say about the gifts we delivered to their loved ones in Nigeria.',
    url: `${BASE_URL}/reviews`,
    type: 'website',
  },
};

/**
 * The list throws on an outage (see lib/api-fetch.ts), so an API blip is never
 * cached as "no reviews yet". A 404 here means a wrong URL, not an empty list.
 */
async function fetchReviews(page: number): Promise<PaginatedResponse<PublicReview>> {
  const url = `${API_URL}/api/v1/reviews?page=${page}&limit=${PAGE_SIZE}`;
  const result = await fetchResourceOrNull<PaginatedResponse<PublicReview>>(url, { next: CACHE });
  if (!result || !Array.isArray(result.data)) throw new ApiUnavailableError(url, 'response was not a list');
  return result;
}

function fetchSummary(): Promise<ReviewRatingSummary | null> {
  return fetchResourceOrNull<ReviewRatingSummary>(`${API_URL}/api/v1/reviews/summary`, { next: CACHE });
}

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function ReviewsPage({ searchParams }: Props) {
  const requested = Number.parseInt((await searchParams).page ?? '1', 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const [reviews, summary] = await Promise.all([fetchReviews(page), fetchSummary()]);
  const { totalPages } = reviews.meta;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        <section className="py-14 md:py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/30">
          <div className="container mx-auto px-4 max-w-3xl text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold">Customer reviews</h1>
            <p className="text-muted-foreground">
              Every review here is from a buyer whose gift we delivered. We publish good and bad
              reviews alike, and only remove ones that are abusive, unlawful, share someone&apos;s
              private details, are not about the order, or are spam.
            </p>
            <RatingSummary rating={summary} className="justify-center text-base" />
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-5xl">
            {reviews.data.length === 0 ? (
              <EmptyState firstPage={page === 1} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {reviews.data.map((review) => <ReviewCard key={review.id} review={review} />)}
              </div>
            )}
            <Pager page={page} totalPages={totalPages} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function EmptyState({ firstPage }: { firstPage: boolean }) {
  return (
    <div className="text-center py-12 space-y-4">
      <p className="text-muted-foreground">
        {firstPage ? 'No reviews yet. The first ones will appear here soon.' : 'There are no more reviews.'}
      </p>
      <Button asChild variant="outline">
        <Link href={firstPage ? '/occasions' : '/reviews'}>{firstPage ? 'Browse gifts' : 'Back to the first page'}</Link>
      </Button>
    </div>
  );
}

function Pager({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Review pages" className="flex items-center justify-center gap-3 mt-10 text-sm">
      {page > 1 && (
        <Button asChild variant="outline" size="sm">
          <Link href={page === 2 ? '/reviews' : `/reviews?page=${page - 1}`}>Newer</Link>
        </Button>
      )}
      <span className="text-muted-foreground">Page {page} of {totalPages}</span>
      {page < totalPages && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/reviews?page=${page + 1}`}>Older</Link>
        </Button>
      )}
    </nav>
  );
}
