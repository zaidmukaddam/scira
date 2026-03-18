'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Defer analytics loading - not critical for initial render
const Analytics = dynamic(
  () => import('@vercel/analytics/next').then(m => m.Analytics),
  { ssr: false }
);

const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then(m => m.SpeedInsights),
  { ssr: false }
);

export function ClientAnalytics(): React.JSX.Element {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
