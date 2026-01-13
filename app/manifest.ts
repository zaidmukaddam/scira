import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HebronAI - AI-Powered Research & Search',
    short_name: 'HebronAI',
    description:
      'An AI-powered research and search platform that finds, analyzes, and cites information from the live web using advanced models like GPT-4, Claude, and Gemini.',
    start_url: '/',
    display: 'standalone',
    categories: ['search', 'ai', 'productivity', 'research'],
    background_color: '#171717',
    icons: [
      {
        src: '/icon-maskable.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    screenshots: [
      {
        src: '/opengraph-image.png',
        type: 'image/png',
        sizes: '1200x630',
      },
    ],
  };
}
