import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const jiti = createJiti(fileURLToPath(import.meta.url));

jiti.import('./env/server.ts');
jiti.import('./env/client.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
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
      '#default-font': '@mathjax/mathjax-newcm-font/mjs',
      '#default-font/*': '@mathjax/mathjax-newcm-font/mjs/*',
    },
    resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json'],
  },
  reactCompiler: true,
  experimental: {
    webpackMemoryOptimizations: true,
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    optimizePackageImports: [
      '@phosphor-icons/react',
      'lucide-react',
      '@hugeicons/react',
      '@hugeicons/core-free-icons',
      'date-fns',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-accordion',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-avatar',
      '@radix-ui/react-separator',
      '@radix-ui/react-switch',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-slider',
      '@radix-ui/react-tabs',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-progress',
      'recharts',
      'sileo',
    ],
    serverActions: {
      bodySizeLimit: '2000mb',
    },
    staleTimes: {
      dynamic: 10,
      static: 30,
    },
  },
  // Ensure MathJax packages are treated as externals for server bundling
  serverExternalPackages: [
    '@aws-sdk/client-s3',
    'prettier',
    'experimental-fast-webstreams',
    '@basetenlabs/performance-client',
    '@ai-sdk/baseten',
  ],
  transpilePackages: [
    'geist',
    '@daytonaio/sdk',
    'shiki',
    'ai-resumable-stream',
    '@t3-oss/env-nextjs',
    '@t3-oss/env-core',
    '@mathjax/src',
    '@mathjax/mathjax-newcm-font',
  ],
  devIndicators: false,
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
        // Apply X-Frame-Options: DENY to all routes except public legal pages
        source: '/((?!privacy-policy|terms|about).*)',
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
      {
        // Public legal pages — no X-Frame-Options so Google's OAuth validator can process them
        source: '/(privacy-policy|terms|about)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
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
