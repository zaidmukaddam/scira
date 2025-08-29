import type { NextConfig } from 'next';
import './env/server';
import './env/client';

const nextConfig: NextConfig = {
  compiler: {
    // if NODE_ENV is production, remove console.log
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error'],
          }
        : false,
  },
  experimental: {
    useCache: true,
    optimizePackageImports: [
      '@phosphor-icons/react',
      'lucide-react',
      '@hugeicons/react',
      '@hugeicons/core-free-icons',
      'date-fns',
    ],
    serverActions: {
      bodySizeLimit: '10mb',
    },
    staleTimes: {
      dynamic: 10,
      static: 30,
    },
  },
  serverExternalPackages: ['@aws-sdk/client-s3', 'prettier'],
  transpilePackages: ['geist', '@daytonaio/sdk', 'shiki'],
  output: 'standalone',
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/ph',
        destination: 'https://www.producthunt.com/posts/scira',
        permanent: true,
      },
      {
        source: '/raycast',
        destination: 'https://www.raycast.com/zaidmukaddam/scira',
        permanent: true,
      },
      {
        source: '/plst',
        destination: 'https://peerlist.io/zaidmukaddam/project/scira-ai-20',
        permanent: true,
      },
      {
        source: '/blog',
        destination: 'https://blog.scira.ai',
        permanent: true,
      },
    ];
  },
  images: {
    qualities: [75, 100],
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
        port: '',
        pathname: '**',
      },
      // Google Favicon Service - comprehensive patterns
      {
        protocol: 'https',
        hostname: 'www.google.com',
        port: '',
        pathname: '/s2/favicons/**',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        port: '',
        pathname: '/s2/favicons',
      },
      // Google Maps Static API
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        port: '',
        pathname: '/**',
      },
      // Google Street View Static API
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        port: '',
        pathname: '/maps/api/streetview/**',
      },
      {
        protocol: 'https',
        hostname: 'api.producthunt.com',
        port: '',
        pathname: '/widgets/embed-image/v1/featured.svg',
      },
      {
        protocol: 'https',
        hostname: 'metwm7frkvew6tn1.public.blob.vercel-storage.com',
        port: '',
        pathname: '**',
      },
      // upload.wikimedia.org
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '**',
      },
      // media.theresanaiforthat.com
      {
        protocol: 'https',
        hostname: 'media.theresanaiforthat.com',
        port: '',
        pathname: '**',
      },
      // www.uneed.best
      {
        protocol: 'https',
        hostname: 'www.uneed.best',
        port: '',
        pathname: '**',
      },
      // image.tmdb.org
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/original/**',
      },
      // image.tmdb.org
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/**',
      },
    ],
    // Add additional settings for better image loading
    domains: [],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    unoptimized: false,
  },
};

export default nextConfig;
