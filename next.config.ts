import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  // Proxy all /api/v1/* requests through the Next.js server so cookies are
  // set on the web domain (first-party). Without this, iOS Safari ITP blocks
  // cross-origin httpOnly cookies from the API domain, breaking login on mobile.
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
