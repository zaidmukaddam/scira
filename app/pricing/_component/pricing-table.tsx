'use client';

import { Button } from '@/components/ui/button';
import { authClient, betterauthClient } from '@/lib/auth-client';
import { ArrowRight, ArrowLeft, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PRICING, SEARCH_LIMITS } from '@/lib/constants';
import { getDiscountConfigAction } from '@/app/actions';
import { DiscountConfig } from '@/lib/discount';
import { ComprehensiveUserData } from '@/lib/user-data-server';
import { StudentDomainRequestButton } from '@/components/student-domain-request-button';
import { SupportedDomainsList } from '@/components/supported-domains-list';
import { SouthernCrossLogo } from '@/components/logos/southerncross-logo';

type SubscriptionDetails = {
  id: string;
  productId: string;
  status: string;
  amount: number;
  currency: string;
  recurringInterval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  organizationId: string | null;
};

type SubscriptionDetailsResult = {
  hasSubscription: boolean;
  subscription?: SubscriptionDetails;
  error?: string;
  errorType?: 'CANCELED' | 'EXPIRED' | 'GENERAL';
};

interface PricingTableProps {
  subscriptionDetails: SubscriptionDetailsResult;
  user: ComprehensiveUserData | null;
}

export default function PricingTable({ subscriptionDetails, user }: PricingTableProps) {
  const router = useRouter();
  const [discountConfig, setDiscountConfig] = useState<DiscountConfig>({
    enabled: false,
    isStudentDiscount: false,
  });

  useEffect(() => {
    const fetchDiscountConfig = async () => {
      try {
        const config = await getDiscountConfigAction({
          email: user?.email,
        });

        setDiscountConfig(config as DiscountConfig);
      } catch (error) {
        console.error('Failed to fetch discount config:', error);
      }
    };

    fetchDiscountConfig();
  }, [user?.email]);

  // Helper function to get student discount price
  const getStudentPrice = (isINR: boolean = false) => {
    if (!discountConfig.enabled || !discountConfig.isStudentDiscount) {
      return null;
    }

    if (isINR) {
      return discountConfig.inrPrice || null;
    } else {
      return discountConfig.finalPrice || null;
    }
  };

  // Check if student discount is active
  const hasStudentDiscount = () => {
    return discountConfig.enabled && discountConfig.isStudentDiscount;
  };

  const handleCheckout = async (_productId: string, _slug: string, _paymentMethod?: 'dodo' | 'polar') => {
    if (!user) {
      router.push('/sign-up');
      return;
    }

    try {
      // Use DodoPayments checkout for all new subscriptions
      toast.loading('Redirecting to checkout...');

      const { data: checkout, error } = await betterauthClient.dodopayments.checkoutSession({
        slug: process.env.NEXT_PUBLIC_PREMIUM_SLUG,
        customer: {
          email: user.email || '',
          name: user.name || '',
        },
        billing_currency: 'USD',
        allowed_payment_method_types: [
          'credit',
          'debit',
          'upi_collect',
          'upi_intent',
          'apple_pay',
          'google_pay',
          'amazon_pay',
          'sepa',
          'ach',
          'klarna',
          'affirm',
          'afterpay_clearpay',
        ],
        referenceId: `order_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        ...(hasStudentDiscount() && discountConfig.dodoDiscountId && { discount_code: 'SCIRASTUD' }),
      });

      if (error) {
        toast.dismiss();
        throw new Error(error.message || 'Checkout failed');
      }

      if (checkout?.url) {
        // Show success message for student discount
        if (hasStudentDiscount()) {
          toast.dismiss();
          toast.success('🎓 Student discount applied!');
        }
        // Redirect to DodoPayments checkout
        window.location.href = checkout.url;
      } else {
        toast.dismiss();
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    }
  };

  const handleManageSubscription = async () => {
    try {
      const proSource = getProAccessSource();
      if (proSource === 'dodo') {
        await betterauthClient.dodopayments.customer.portal();
      } else {
        await authClient.customer.portal();
      }
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      toast.error('Failed to open subscription management');
    }
  };

  const STARTER_TIER = process.env.NEXT_PUBLIC_STARTER_TIER;
  const STARTER_SLUG = process.env.NEXT_PUBLIC_STARTER_SLUG;

  if (!STARTER_TIER || !STARTER_SLUG) {
    console.error('Missing required environment variables');
    throw new Error('Missing required environment variables for Starter tier');
  }

  // Check if user has active Polar subscription
  const hasPolarSubscription = () => {
    return (
      subscriptionDetails.hasSubscription &&
      subscriptionDetails.subscription?.productId === STARTER_TIER &&
      subscriptionDetails.subscription?.status === 'active'
    );
  };

  // Check if user has active Dodo payments subscription
  const hasDodoSubscription = () => {
    return user?.isProUser === true && user?.proSource === 'dodo';
  };

  // Check if user has any Pro status (Polar or DodoPayments)
  const hasProAccess = () => {
    const polarAccess = hasPolarSubscription();
    const dodoAccess = hasDodoSubscription();
    return polarAccess || dodoAccess;
  };

  // Get the source of Pro access for display
  const getProAccessSource = () => {
    if (hasPolarSubscription()) return 'polar';
    if (hasDodoSubscription()) return 'dodo';
    return null;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between h-14 px-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <SouthernCrossLogo variant="square" className="size-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-lg font-light tracking-tighter font-be-vietnam-pro">SCX.ai</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center relative">
          {/* Ambient glow */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-8 flex justify-center -z-10">
            <div className="h-40 w-80 rounded-full bg-primary/8 blur-3xl dark:bg-primary/12" />
          </div>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1 text-xs font-medium text-primary mb-5">
            <span className="size-1.5 rounded-full bg-primary" />
            Plans
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro mb-3 neon-glow">
            Pricing
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Choose the plan that works for you
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto border border-border">
          {/* Free Plan */}
          <div className="bg-background p-8 flex flex-col border-b md:border-b-0 md:border-r border-border">
            <div className="mb-6">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-1">Free</h3>
              <p className="text-xs text-muted-foreground">Get started with essential features</p>
            </div>
            <div className="flex items-baseline mb-8">
              <span className="text-5xl font-light tracking-tight text-foreground font-be-vietnam-pro">$0</span>
              <span className="text-sm text-muted-foreground ml-2">/month</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                `${SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches per day`,
                'Basic AI models',
                'Search history',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="size-4 rounded-full border border-border flex items-center justify-center shrink-0">
                    <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <Button variant="outline" className="w-full h-11 rounded-sm transition-all duration-150" disabled={!hasProAccess()}>
              {!hasProAccess() ? 'Current plan' : 'Free plan'}
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-primary/[0.03] dark:bg-primary/[0.05] p-8 flex flex-col relative border-t border-primary/20 md:border-t-0 md:border-l-0">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-primary/40" />

            {hasProAccess() && (
              <div className="absolute top-4 right-4">
                <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-2 py-1 rounded-sm">
                  Active
                </span>
              </div>
            )}
            {!hasProAccess() && hasStudentDiscount() && (
              <div className="absolute top-4 right-4">
                <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-2 py-1 rounded-sm">
                  Student
                </span>
              </div>
            )}
            {!hasProAccess() && !hasStudentDiscount() && (
              <div className="absolute top-4 right-4">
                <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-2 py-1 rounded-sm">
                  Popular
                </span>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary mb-1">Pro</h3>
              <p className="text-xs text-muted-foreground">Everything for serious research</p>
            </div>

            {/* Pricing Display */}
            <div className="mb-8">
              {hasProAccess() ? (
                getProAccessSource() === 'dodo' ? (
                  <div className="flex items-baseline">
                    <span className="text-5xl font-light tracking-tight text-foreground font-be-vietnam-pro">₹{PRICING.PRO_MONTHLY_INR}</span>
                    <span className="text-sm text-muted-foreground ml-2">(excl. GST)/month</span>
                  </div>
                ) : (
                  <div className="flex items-baseline">
                    <span className="text-5xl font-light tracking-tight text-foreground font-be-vietnam-pro">${PRICING.PRO_MONTHLY}</span>
                    <span className="text-sm text-muted-foreground ml-2">/month</span>
                  </div>
                )
              ) : (
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    {getStudentPrice(false) ? (
                      <>
                        <span className="text-xl text-muted-foreground line-through mr-2">${PRICING.PRO_MONTHLY}</span>
                        <span className="text-5xl font-light tracking-tight text-foreground font-be-vietnam-pro">${getStudentPrice(false)}</span>
                      </>
                    ) : (
                      <span className="text-5xl font-light tracking-tight text-foreground font-be-vietnam-pro">${PRICING.PRO_MONTHLY}</span>
                    )}
                    <span className="text-sm text-muted-foreground ml-2">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Billed monthly · cancel anytime</p>
                </div>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Unlimited searches',
                'All AI models',
                'PDF analysis',
                'File management',
                'Priority support',
                'SCX.ai Lookout',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-foreground/80">
                  <span className="size-4 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center shrink-0">
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            {hasProAccess() ? (
              <div className="space-y-3">
                <Button
                  className="w-full h-11 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 neon-glow-box"
                  onClick={handleManageSubscription}
                >
                  {getProAccessSource() === 'dodo' ? 'Manage payment' : 'Manage subscription'}
                </Button>
                {getProAccessSource() === 'polar' && subscriptionDetails.subscription && (
                  <p className="text-xs text-muted-foreground text-center">
                    {subscriptionDetails.subscription.cancelAtPeriodEnd
                      ? `Expires ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`
                      : `Renews ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`}
                  </p>
                )}
                {getProAccessSource() === 'dodo' && user?.dodoSubscription?.expiresAt && (
                  <p className="text-xs text-muted-foreground text-center">
                    Expires {formatDate(new Date(user.dodoSubscription.expiresAt))}
                  </p>
                )}
              </div>
            ) : !user ? (
              <Button
                className="w-full h-11 rounded-sm group bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 neon-glow-box"
                onClick={() => handleCheckout(STARTER_TIER, STARTER_SLUG)}
              >
                Sign up for Pro
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-150" />
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  className="w-full h-11 rounded-sm group bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 neon-glow-box"
                  onClick={() => handleCheckout(STARTER_TIER, STARTER_SLUG, 'dodo')}
                >
                  {getStudentPrice(false)
                    ? `Subscribe $${getStudentPrice(false)}/month`
                    : `Subscribe $${PRICING.PRO_MONTHLY}/month`}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-150" />
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Credit/Debit Cards & more (auto-renews monthly)
                </p>
                {hasStudentDiscount() && discountConfig.message && (
                  <p className="text-xs text-primary text-center font-medium">
                    {discountConfig.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Student Discount Section */}
        {!hasStudentDiscount() && (
          <div className="max-w-3xl mx-auto mt-6 p-5 border border-border bg-muted/30 rounded-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <GraduationCap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium mb-0.5">Student discount</h3>
                  <p className="text-xs text-muted-foreground">
                    Get Pro for just $5/month with a verified university email
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SupportedDomainsList />
                <StudentDomainRequestButton />
              </div>
            </div>
          </div>
        )}

        {/* Student Discount Active */}
        {hasStudentDiscount() && !hasProAccess() && (
          <div className="max-w-3xl mx-auto mt-6 p-5 border border-primary/20 bg-primary/5 rounded-sm">
            <div className="flex items-start gap-3">
              <GraduationCap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium mb-0.5 text-primary">Student discount active</h3>
                <p className="text-xs text-muted-foreground">
                  Your university email has been verified. Get Pro for ${getStudentPrice(false) || 5}/month — applied automatically at checkout.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="max-w-3xl mx-auto mt-14 text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            By subscribing, you agree to our{' '}
            <Link href="/terms" className="text-foreground hover:text-primary transition-colors duration-150 underline-offset-2 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="text-foreground hover:text-primary transition-colors duration-150 underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Questions?{' '}
            <a href="mailto:support@scx.ai" className="text-foreground hover:text-primary transition-colors duration-150 underline-offset-2 hover:underline">
              support@scx.ai
            </a>
          </p>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <SouthernCrossLogo variant="square" className="size-4" />
              <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} SCX.ai</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150">Home</Link>
              <Link href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150">About</Link>
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150">Terms</Link>
              <Link href="/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
