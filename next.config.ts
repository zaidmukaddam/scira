import type { NextConfig } from 'next';
import './env/server';
import './env/client';

const nextConfig: NextConfig = {
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error'],
          }
        : false,
  },
  experimental: {
    useCache: true,
    optimizePackageImports: ['@phosphor-icons/react'],
    nodeMiddleware: true,
    serverActions: {
      bodySizeLimit: '10mb',
    },
    staleTimes: {
      dynamic: 10,
      static: 30,
    },
  },
  transpilePackages: ['geist', '@daytonaio/sdk'],
  output: 'standalone',
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
  // async redirects() {
  //   return [
  //     {
  //       source: '/raycast',
  //       destination: 'https://www.raycast.com/zaidmukaddam/scira',
  //       permanent: true,
  //     },
  //     {
  //       source: '/plst',
  //       destination: 'https://peerlist.io/zaidmukaddam/project/scira-ai-20',
  //       permanent: true,
  //     },
  //   ];
  // },
  images: {
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
