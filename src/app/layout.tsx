import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Luvngift — Send Gifts to Loved Ones in Nigeria',
    template: '%s | Luvngift',
  },
  description:
    'Send curated gift bundles and custom experiences to loved ones in Nigeria from the USA, Canada, or UK. Pay in CAD, USD, or GBP — we handle everything in Nigeria.',
  keywords: [
    'send gifts to Nigeria',
    'Nigerian diaspora gifts',
    'gift delivery Nigeria',
    'birthday gifts Nigeria',
    'Christmas gifts Nigeria',
    'send money to Nigeria alternative',
    'Nigerian gift bundles',
    'gifts from Canada to Nigeria',
    'gifts from UK to Nigeria',
    'gifts from USA to Nigeria',
  ],
  authors: [{ name: 'Luvngift' }],
  creator: 'Luvngift',
  publisher: 'Luvngift',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Luvngift',
    title: 'Luvngift — Send Gifts to Loved Ones in Nigeria',
    description:
      'Send curated gift bundles and custom experiences to loved ones in Nigeria from the USA, Canada, or UK. Pay in CAD, USD, or GBP — we handle everything.',
    images: [
      {
        url: '/images/luvngift.png',
        width: 1200,
        height: 630,
        alt: 'Luvngift — Gift delivery to Nigeria',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luvngift — Send Gifts to Loved Ones in Nigeria',
    description:
      'Curated gift bundles and custom experiences delivered to Nigeria. Pay in CAD, USD, or GBP.',
    images: ['/images/luvngift.png'],
    creator: '@luvngift',
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
