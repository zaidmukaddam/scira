'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen } from 'lucide-react';
import ApiPlayground from '@/components/api-docs/api-playground';
import CommercialAccountModal from '@/components/api-docs/commercial-account-modal';
import { useRouter } from 'next/navigation';

export function PlaygroundClient() {
  const [showCommercialModal, setShowCommercialModal] = useState(false);
  const router = useRouter();

  return (
    <div className="w-full">
      {/* Header */}
      <section className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">API Playground</h1>
          <p className="text-xl text-muted-foreground">
            Test our API directly in your browser. Try different models, tools, and parameters to see real-time
            responses.
          </p>
        </div>

        {/* Playground */}
        <div className="mb-12">
          <ApiPlayground />
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
              <CardDescription>Check out our comprehensive documentation and code examples</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => router.push('/api-docs')}>
                <BookOpen className="mr-2 h-4 w-4" />
                View Documentation
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ready to Build?</CardTitle>
              <CardDescription>Get your API key and start integrating with your application</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => router.push('/api-docs/api-keys')}>
                Create API Key <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Need higher limits or dedicated support?</p>
          <Button variant="link" onClick={() => setShowCommercialModal(true)}>
            Apply for Commercial Account →
          </Button>
        </div>

        {/* Commercial Account Modal */}
        <CommercialAccountModal open={showCommercialModal} onOpenChange={setShowCommercialModal} />
      </section>
    </div>
  );
}
