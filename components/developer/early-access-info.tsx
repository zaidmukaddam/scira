'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Key, Zap, Shield, Sparkle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function DeveloperEarlyAccessInfo() {
  const router = useRouter();

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8 text-center">
        <Badge variant="secondary" className="mb-4">
          🚀 Early Access
        </Badge>
        <h1 className="text-4xl font-bold mb-2">Developer API Access</h1>
        <p className="text-xl text-muted-foreground">
          Build powerful applications with SCX.ai&apos;s advanced models and tools
        </p>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 to-blue-600/10 border-primary/20 mb-8">
        <CardHeader className="text-center">
          <Crown className="h-16 w-16 text-primary mx-auto mb-4" />
          <CardTitle className="text-3xl">Pro Access Required</CardTitle>
          <CardDescription className="text-lg mt-2">
            Our Developer API is exclusively available for Pro subscribers during early access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Key className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">API Key Management</p>
                  <p className="text-sm text-muted-foreground">
                    Create and manage multiple API keys for different applications
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">All Models &amp; Tools</p>
                  <p className="text-sm text-muted-foreground">Access Llama 4, DeepSeek, and 30+ integrated tools</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Shield className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">OpenAI Compatible</p>
                  <p className="text-sm text-muted-foreground">Drop-in replacement for existing OpenAI integrations</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Sparkle className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Priority Support</p>
                  <p className="text-sm text-muted-foreground">Get dedicated support for your integration needs</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => router.push('/pricing')}>
              Activate Free Pro Access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/api-docs')}>
              View Documentation
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What&apos;s Included in Developer Access?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <div>
                <strong>Generous Rate Limits:</strong> 60 requests/minute, 100K tokens/day per key
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <div>
                <strong>Full Model Access:</strong> Llama 4, DeepSeek V3, DeepSeek R1, and more
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <div>
                <strong>30+ Tools:</strong> Web search, code interpreter, academic search, weather, stocks, and more
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <div>
                <strong>Streaming Support:</strong> Real-time responses with server-sent events
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <div>
                <strong>OpenAI SDK Compatible:</strong> Use existing OpenAI client libraries
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
