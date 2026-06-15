import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface OccasionSlug {
  slug: string;
  updatedAt?: string;
}

interface BundleRef {
  slug: string;
  updatedAt?: string;
}

async function fetchOccasionSlugs(): Promise<OccasionSlug[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/occasions?limit=100`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.occasions ?? json.data ?? [];
  } catch {
    return [];
  }
}

async function fetchBundleRefs(): Promise<BundleRef[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/bundles?limit=200&isActive=true`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.bundles ?? json.data ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [occasions, bundles] = await Promise.all([
    fetchOccasionSlugs(),
    fetchBundleRefs(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/occasions`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const occasionPages: MetadataRoute.Sitemap = occasions.map((o) => ({
    url: `${BASE_URL}/occasions/${o.slug}`,
    lastModified: o.updatedAt ? new Date(o.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const bundlePages: MetadataRoute.Sitemap = bundles.map((b) => ({
    url: `${BASE_URL}/bundles/${b.slug}`,
    lastModified: b.updatedAt ? new Date(b.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...occasionPages, ...bundlePages];
}
