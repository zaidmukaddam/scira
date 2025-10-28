import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hyper - AI-Powered Search & Management Engine',
    short_name: 'Hyper',
    description:
      'Moteur de recherche et de gestion propulsé par l\'intelligence artificielle, conçu pour les entreprises. Hyper utilise des modèles IA avancés comme GPT-4, Claude et Grok.',
    start_url: '/',
    display: 'standalone',
    categories: ['search', 'ai', 'productivity'],
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
