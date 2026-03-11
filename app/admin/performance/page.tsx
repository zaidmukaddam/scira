import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Performance Testing | Admin',
  description: 'Real-time API performance testing and benchmarking',
};

export default function PerformancePage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">API Performance Testing</h1>
        <p className="text-muted-foreground mb-8">Real-time API performance testing and benchmarking dashboard</p>
        <div className="bg-muted rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            Performance testing dashboard coming soon. This page will display real-time API performance metrics and
            benchmarking results.
          </p>
        </div>
      </div>
    </div>
  );
}
