'use client';

import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Loader2, Infinity, Cpu, FileText, Eye, RefreshCw, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useUserData } from '@/hooks/use-user-data';
import { useSession } from '@/lib/auth-client';
import { useQueryClient } from '@tanstack/react-query';

const PRO_FEATURES = [
  { icon: Infinity, label: 'Unlimited searches', description: 'No daily limits' },
  { icon: Cpu, label: 'All AI models', description: 'Access every model' },
  { icon: FileText, label: 'PDF analysis', description: 'Upload & analyze documents' },
  { icon: Eye, label: 'Scira Lookout', description: 'Real-time monitoring' },
];

export default function SuccessPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } = useSession();
  const { isProUser, isLoading, refetch } = useUserData();
  const [showContent, setShowContent] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const animationRef = useRef<number | null>(null);
  const hasTriggeredConfetti = useRef(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isSessionPending && !session) {
      router.push('/sign-in');
    }
  }, [isSessionPending, session, router]);

  // Poll for subscription status if not yet active
  useEffect(() => {
    if (!isProUser && !isLoading) {
      const interval = setInterval(() => {
        refetch();
      }, 2000);

      // Show retry button after 10 seconds
      const retryTimeout = setTimeout(() => {
        setShowRetry(true);
      }, 10000);

      // Stop polling after 30 seconds
      const timeout = setTimeout(() => {
        clearInterval(interval);
      }, 30000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
        clearTimeout(retryTimeout);
      };
    }
  }, [isProUser, isLoading, refetch]);

  const handleClearCache = async () => {
    setIsClearing(true);
    // Invalidate all user-related queries
    await queryClient.invalidateQueries({ queryKey: ['comprehensive-user-data'] });
    await refetch();
    setIsClearing(false);
  };

  // Trigger confetti when pro status is confirmed
  useEffect(() => {
    if (isProUser && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      setShowContent(true);

      // Initial burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#171717', '#525252', '#a3a3a3'],
      });

      // Side cannons
      const end = Date.now() + 2500;

      const frame = () => {
        if (Date.now() > end) {
          animationRef.current = null;
          return;
        }

        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          startVelocity: 60,
          origin: { x: 0, y: 0.5 },
          colors: ['#171717', '#525252', '#a3a3a3'],
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          startVelocity: 60,
          origin: { x: 1, y: 0.5 },
          colors: ['#171717', '#525252', '#a3a3a3'],
        });

        animationRef.current = requestAnimationFrame(frame);
      };

      setTimeout(() => {
        animationRef.current = requestAnimationFrame(frame);
      }, 300);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isProUser]);

  // Don't render anything while redirecting unauthenticated users
  if (!isSessionPending && !session) {
    return null;
  }

  // Loading state while verifying session or subscription
  if (isSessionPending || isLoading || (!isProUser && !showContent)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 w-full">
        <div className="text-center max-w-md">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-6 text-muted-foreground" />
          <h2 className="text-lg font-medium text-foreground mb-2">Verifying your subscription</h2>
          <p className="text-sm text-muted-foreground mb-6">This will only take a moment...</p>
          
          {showRetry && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Taking longer than expected?</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                disabled={isClearing}
                className="h-9"
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Clear cache & retry
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 w-full">
      <div
        className="text-center max-w-lg w-full"
        style={{
          opacity: showContent ? 1 : 0,
          transform: showContent ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }}
      >
        {/* Success Icon */}
        <div className="mx-auto mb-8 w-14 h-14 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
        </div>

        {/* Content */}
        <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">Welcome to Scira Pro</h1>
        <p className="text-muted-foreground mb-10">Your subscription is now active. Here&apos;s what you&apos;ve unlocked.</p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {PRO_FEATURES.map((feature, index) => (
            <div
              key={feature.label}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
              style={{
                opacity: showContent ? 1 : 0,
                transform: showContent ? 'translateY(0)' : 'translateY(8px)',
                transition: `opacity 0.4s ease-out ${150 + index * 75}ms, transform 0.4s ease-out ${150 + index * 75}ms`,
              }}
            >
              <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center shrink-0 border border-border/50">
                <feature.icon className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{feature.label}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* XQL Feature - Centered */}
        <div
          className="flex justify-center mt-3 mb-10"
          style={{
            opacity: showContent ? 1 : 0,
            transform: showContent ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.4s ease-out 450ms, transform 0.4s ease-out 450ms',
          }}
        >
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-left w-full sm:w-[calc(50%-6px)]">
            <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center shrink-0 border border-border/50">
              <Sparkles className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">XQL</p>
              <p className="text-xs text-muted-foreground">Natural language data queries</p>
            </div>
          </div>
        </div>

        {/* Action */}
        <Button
          onClick={() => router.push('/')}
          className="h-10 px-8 text-sm font-medium"
          style={{
            opacity: showContent ? 1 : 0,
            transform: showContent ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.4s ease-out 550ms, transform 0.4s ease-out 550ms',
          }}
        >
          Start searching
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        {/* Subtle footer */}
        <p
          className="text-xs text-muted-foreground mt-8"
          style={{
            opacity: showContent ? 1 : 0,
            transition: 'opacity 0.4s ease-out 650ms',
          }}
        >
          Manage your subscription anytime in Settings
        </p>
      </div>
    </div>
  );
}
