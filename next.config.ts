import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const jiti = createJiti(fileURLToPath(import.meta.url));

jiti.import('./env/server.ts');
jiti.import('./env/client.ts');

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
  // Add Turbopack alias to resolve MathJax default font to NewCM font
  turbopack: {
    resolveAlias: {
      '#default-font/*': '@mathjax/mathjax-newcm-font/mjs/*',
    },
    resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json'],
  },
  reactCompiler: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    optimizePackageImports: [
      '@phosphor-icons/react',
      'lucide-react',
      '@hugeicons/react',
      '@hugeicons/core-free-icons',
      'date-fns',
    ],
    serverActions: {
      bodySizeLimit: '20mb',
    },
    staleTimes: {
      dynamic: 10,
      static: 30,
    },
  },
  // Ensure MathJax packages are treated as externals for server bundling
  serverExternalPackages: ['@aws-sdk/client-s3', 'prettier'],
  transpilePackages: [
    'geist',
    '@daytonaio/sdk',
    'shiki',
    'resumable-stream',
    '@t3-oss/env-nextjs',
    '@t3-oss/env-core',
    '@mathjax/src',
    '@mathjax/mathjax-newcm-font',
  ],
  devIndicators: process.env.NODE_ENV === 'production' ? false : { position: 'bottom-right' },
  // Webpack fallback alias for environments not using Turbopack
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['#default-font'] = '@mathjax/mathjax-newcm-font/mjs';
    config.resolve.alias['#default-font/*'] = '@mathjax/mathjax-newcm-font/mjs/*';

    // Ensure proper module resolution for MathJax ESM modules
    if (isServer) {
      config.resolve.extensionAlias = {
        '.js': ['.js', '.ts', '.tsx', '.jsx'],
        '.mjs': ['.mjs', '.mts'],
        '.cjs': ['.cjs', '.cts'],
      };
    }

    return config;
  },
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
        destination: 'https://peerlist.io/zaidmukaddam/project/scira-ai-30',
        permanent: true,
      },
      {
        source: '/blog',
        destination: 'https://blog.scira.ai',
        permanent: true,
      },
      {
        source: '/askscirabot',
        destination: 'https://t.me/askscirabot',
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
    // Add additional settings for better image loading,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    unoptimized: false,
  },
};

export default nextConfig;
