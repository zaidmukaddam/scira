import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  crons: [
    {
      path: '/api/clean_images',
      schedule: '0 * * * *'
    },
  ],
  bunVersion: '1.3.4'
};