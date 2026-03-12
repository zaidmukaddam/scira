'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Crown, CheckCircle, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { acceptTermsAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

interface TermsAcceptanceModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

const PRO_BENEFITS = [
  { icon: '♾️', text: 'Unlimited AI conversations' },
  { icon: '🧠', text: 'Premium AI models' },
  { icon: '📄', text: 'PDF document analysis & OCR' },
  { icon: '🤖', text: 'Auto mode with intelligent tool selection' },
  { icon: '⚡', text: 'Priority processing & support' },
  { icon: '🔮', text: 'Early access to new features' },
] as const;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function TermsAcceptanceModal({ open, onOpenChange, onAccept, onDecline }: TermsAcceptanceModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const retryCountRef = useRef(0);

  const handleAccept = async () => {
    if (!agreed) {
      toast.error('Please check the box to agree to the terms and conditions first.');
      return;
    }

    setAccepting(true);
    retryCountRef.current = 0;
    const maxRetries = 3;
    const retryDelayMs = 1000;

    const attemptAccept = async (): Promise<void> => {
      try {
        const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined;
        await acceptTermsAction(undefined, userAgent);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const isAuthError = message.includes('authenticated') || message.includes('Failed to accept terms');

        if (isAuthError && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`[Terms] Retry ${retryCountRef.current}/${maxRetries} — waiting for session sync…`);
          await delay(retryDelayMs);
          return attemptAccept();
        }
        throw error;
      }
    };

    try {
      await attemptAccept();

      toast.success('Terms accepted! Enjoy your Pro features.');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['subscription'] }),
        queryClient.invalidateQueries({ queryKey: ['user'] }),
        queryClient.invalidateQueries({ queryKey: ['comprehensive-user-data'] }),
      ]);

      onAccept?.();
      router.refresh();
    } catch (error) {
      console.error('[TermsAcceptanceModal] Failed to accept terms:', error);
      toast.error('Failed to accept terms. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    if (onDecline) {
      onDecline();
    } else {
      onOpenChange?.(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex-shrink-0">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <DialogTitle className="text-xl font-semibold">Activate Your Free Pro Account</DialogTitle>
            <DialogDescription className="text-sm mt-0.5">
              Complete activation to unlock all features
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Pro grant banner */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-green-900 dark:text-green-100">
                  🎉 You&apos;ve been granted FREE Pro access until 31 March 2026!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  No credit card required. Full access to all premium features.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits grid */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Your Pro Benefits Include:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRO_BENEFITS.map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs leading-tight">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Terms scroll area */}
          <div className="space-y-3">
            <h4 className="font-medium text-base">Terms &amp; Conditions</h4>
            <ScrollArea className="h-40 w-full rounded-md border bg-muted/30 p-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">By accepting these terms, you agree to:</p>
                <ul className="space-y-2 ml-4">
                  {[
                    'Use SCX.ai in accordance with our acceptable use policy',
                    'Not share your account credentials with others',
                    'Respect the fair use limits and not abuse the service',
                    'Understand this is a promotional offer that may be modified',
                    'Comply with all applicable laws in your use of the service',
                  ].map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 pt-4 border-t">
                  For complete terms, please visit{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    southerncrossai.com.au/terms
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </ScrollArea>
          </div>

          {/* Agreement checkbox */}
          <div className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
            <Checkbox
              id="terms-agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
              className="mt-0.5"
            />
            <label htmlFor="terms-agree" className="text-sm font-medium leading-relaxed cursor-pointer select-none">
              I have read and agree to the terms and conditions for using SCX.ai Pro
            </label>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleDecline} disabled={accepting} className="flex-1">
            Maybe Later
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!agreed || accepting}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            {accepting ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Activating…
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept &amp; Activate Pro
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
