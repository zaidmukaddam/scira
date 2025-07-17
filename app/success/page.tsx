'use client';

import { Button } from '@/components/ui/button';
import { Check, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Initial burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Side cannons
    const end = Date.now() + 3 * 1000; // 3 seconds
    const colors = ['hsl(var(--foreground))', 'hsl(var(--muted-foreground))', 'hsl(var(--border))'];

    const frame = () => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
      });

      requestAnimationFrame(frame);
    };

    // Delay the side cannons slightly
    setTimeout(() => {
      frame();
    }, 500);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Success Icon */}
        <div className="mx-auto mb-8 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Check className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Content */}
        <h1 className="text-2xl font-light text-foreground mb-4 tracking-tight">Welcome to Scira Pro</h1>
        <p className="text-muted-foreground mb-8">Your subscription is active. Start unlimited searching.</p>

        {/* Action */}
        <Button
          onClick={() => router.push('/')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-6 text-sm font-normal"
        >
          Start searching
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
