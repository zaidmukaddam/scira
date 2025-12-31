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
import { useLocation } from '@/hooks/use-location';
import { ComprehensiveUserData } from '@/lib/user-data-server';
import { StudentDomainRequestButton } from '@/components/student-domain-request-button';
import { SupportedDomainsList } from '@/components/supported-domains-list';
import { SciraLogo } from '@/components/logos/scira-logo';

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
  const location = useLocation();
  const userEmail = user?.email?.toLowerCase() ?? '';
  const derivedIsIndianStudentEmail = Boolean(
    userEmail && (userEmail.endsWith('.ac.in') || userEmail.endsWith('.edu.in')),
  );

  const [discountConfig, setDiscountConfig] = useState<DiscountConfig>({
    enabled: false,
    isStudentDiscount: false,
  });

  useEffect(() => {
    const fetchDiscountConfig = async () => {
      try {
        const config = await getDiscountConfigAction({
          email: user?.email,
          isIndianUser: location.isIndia || derivedIsIndianStudentEmail,
        });

        setDiscountConfig(config as DiscountConfig);
      } catch (error) {
        console.error('Failed to fetch discount config:', error);
      }
    };

    fetchDiscountConfig();
  }, [location.isIndia, user?.email, derivedIsIndianStudentEmail]);

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
        billing_currency: location.isIndia ? 'INR' : 'USD',
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
              <SciraLogo className="size-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-lg font-light tracking-tighter font-be-vietnam-pro">scira</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center">
          <p className="text-xs text-muted-foreground tracking-wide mb-3">Plans</p>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro mb-4">
            Pricing
          </h1>
          <p className="text-base text-muted-foreground">
            Choose the plan that works for you
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="bg-background p-8 flex flex-col">
            <h3 className="text-lg font-medium mb-2 text-foreground">Free</h3>
            <p className="text-sm text-muted-foreground mb-6">Get started with essential features</p>
            <div className="flex items-baseline mb-8">
              <span className="text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro">$0</span>
              <span className="text-sm text-muted-foreground ml-2">/month</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />
                {SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches per day
              </li>
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />
                Basic AI models
              </li>
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />
                Search history
              </li>
            </ul>

            <Button variant="outline" className="w-full h-11 rounded-none" disabled={!hasProAccess()}>
              {!hasProAccess() ? 'Current plan' : 'Free plan'}
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-muted/20 p-8 flex flex-col relative">
            {hasProAccess() && (
              <div className="absolute top-4 right-4">
                <span className="text-[10px] uppercase tracking-wider text-foreground border border-foreground px-2 py-1">
                  Current
                </span>
              </div>
            )}
            {!hasProAccess() && hasStudentDiscount() && (
              <div className="absolute top-4 right-4">
                <span className="text-[10px] uppercase tracking-wider text-green-600 dark:text-green-400 border border-green-600 dark:border-green-400 px-2 py-1">
                  Student
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-medium text-foreground">Pro</h3>
              {!hasProAccess() && !hasStudentDiscount() && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5">
                  Popular
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-6">Everything for serious research</p>

            {/* Pricing Display */}
            <div className="mb-8">
              {hasProAccess() ? (
                getProAccessSource() === 'dodo' ? (
                  <div className="flex items-baseline">
                    <span className="text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro">₹{PRICING.PRO_MONTHLY_INR}</span>
                    <span className="text-sm text-muted-foreground ml-2">(excl. GST)/month</span>
                  </div>
                ) : (
                  <div className="flex items-baseline">
                    <span className="text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro">$15</span>
                    <span className="text-sm text-muted-foreground ml-2">/month</span>
                  </div>
                )
              ) : location.isIndia || derivedIsIndianStudentEmail ? (
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    {getStudentPrice(true) ? (
                      <>
                        <span className="text-xl text-muted-foreground line-through mr-2">₹{PRICING.PRO_MONTHLY_INR}</span>
                        <span className="text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro">₹{getStudentPrice(true)}</span>
                      </>
                    ) : (
                      <span className="text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro">₹{PRICING.PRO_MONTHLY_INR}</span>
                    )}
                    <span className="text-sm text-muted-foreground ml-2">(excl. GST)/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Approx. $15/month</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    {getStudentPrice(false) ? (
                      <>
                        <span className="text-xl text-muted-foreground line-through mr-2">$15</span>
                        <span className="text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro">${getStudentPrice(false)}</span>
                      </>
                    ) : (
                      <span className="text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro">$15</span>
                    )}
                    <span className="text-sm text-muted-foreground ml-2">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Approx. ₹{PRICING.PRO_MONTHLY_INR}/month</p>
                </div>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-3 text-sm text-foreground/80">
                <span className="w-1 h-1 rounded-full bg-foreground mt-2 shrink-0" />
                Unlimited searches
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground/80">
                <span className="w-1 h-1 rounded-full bg-foreground mt-2 shrink-0" />
                All AI models
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground/80">
                <span className="w-1 h-1 rounded-full bg-foreground mt-2 shrink-0" />
                PDF analysis
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground/80">
                <span className="w-1 h-1 rounded-full bg-foreground mt-2 shrink-0" />
                Priority support
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground/80">
                <span className="w-1 h-1 rounded-full bg-foreground mt-2 shrink-0" />
                Scira Lookout
              </li>
            </ul>

            {hasProAccess() ? (
              <div className="space-y-3">
                <Button className="w-full h-11 rounded-none" onClick={handleManageSubscription}>
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
              <Button className="w-full h-11 rounded-none group" onClick={() => handleCheckout(STARTER_TIER, STARTER_SLUG)}>
                Sign up for Pro
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  className="w-full h-11 rounded-none group"
                  onClick={() => handleCheckout(STARTER_TIER, STARTER_SLUG, 'dodo')}
                  disabled={location.loading}
                >
                  {location.loading
                    ? 'Loading...'
                    : location.isIndia || derivedIsIndianStudentEmail
                      ? getStudentPrice(true)
                        ? `Subscribe ₹${getStudentPrice(true)}/month`
                        : `Subscribe ₹${PRICING.PRO_MONTHLY_INR}/month`
                      : getStudentPrice(false)
                        ? `Subscribe $${getStudentPrice(false)}/month`
                        : 'Subscribe $15/month'}
                  {!location.loading && (
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  {location.isIndia || derivedIsIndianStudentEmail
                    ? 'UPI, Cards, Net Banking & more'
                    : 'Credit/Debit Cards, UPI & more'}{' '}
                  (auto-renews monthly)
                </p>
                {(location.isIndia || derivedIsIndianStudentEmail) && (
                  <p className="text-xs text-center text-amber-600 dark:text-amber-400">
                    Tip: UPI payments have a higher success rate on PC/Desktop
                  </p>
                )}
                {hasStudentDiscount() && discountConfig.message && (
                  <p className="text-xs text-green-600 dark:text-green-400 text-center font-medium">
                    {discountConfig.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Student Discount Section */}
        {!hasStudentDiscount() && (
          <div className="max-w-3xl mx-auto mt-8 p-6 border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <GraduationCap className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium mb-1">Student discount available</h3>
                  <p className="text-xs text-muted-foreground">
                    {location.isIndia || derivedIsIndianStudentEmail
                      ? 'Get Pro for just ₹450/month (approx. $5)!'
                      : 'Get Pro for just $5/month (approx. ₹450)!'}{' '}
                    Sign up with your university email.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SupportedDomainsList />
                <StudentDomainRequestButton />
              </div>
            </div>
          </div>
        )}

        {/* Student Discount Active */}
        {hasStudentDiscount() && !hasProAccess() && (
          <div className="max-w-3xl mx-auto mt-8 p-6 border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
            <div className="flex items-start gap-4">
              <GraduationCap className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium mb-1 text-green-700 dark:text-green-300">Student discount active</h3>
                <p className="text-xs text-muted-foreground">
                  Your university email has been recognized. Get Pro for{' '}
                  {location.isIndia || derivedIsIndianStudentEmail
                    ? `₹${getStudentPrice(true) || 450}/month`
                    : `$${getStudentPrice(false) || 5}/month`}
                  . Discount applied automatically at checkout.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="max-w-3xl mx-auto mt-16 text-center space-y-4">
          <p className="text-xs text-muted-foreground">
            By subscribing, you agree to our{' '}
            <Link href="/terms" className="text-foreground hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="text-foreground hover:underline">
              Privacy Policy
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Questions?{' '}
            <a href="mailto:zaid@scira.ai" className="text-foreground hover:underline">
              zaid@scira.ai
            </a>
          </p>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <SciraLogo className="size-4" />
              <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} Scira</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
