'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { authClient, betterauthClient } from '@/lib/auth-client';
import { ArrowRight, ArrowLeft } from 'lucide-react';
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

  const handleCheckout = async (productId: string, slug: string, paymentMethod?: 'dodo' | 'polar') => {
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
        referenceId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      <div className="max-w-4xl mx-auto px-6 pt-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-4xl font-medium text-foreground mb-4 font-be-vietnam-pro">Pricing</h1>
          <p className="text-xl text-muted-foreground">Choose the plan that works for you</p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader className="pb-4">
              <h3 className="text-xl font-medium">Free</h3>
              <div className="flex items-baseline">
                <span className="text-4xl font-light">$0</span>
                <span className="text-muted-foreground ml-2">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-center text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mr-3 shrink-0"></div>
                  {SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches per day
                </li>
                <li className="flex items-center text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mr-3 shrink-0"></div>
                  Basic AI models
                </li>
                <li className="flex items-center text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mr-3 shrink-0"></div>
                  Search history
                </li>
              </ul>

              <Button variant="outline" className="w-full" disabled={!hasProAccess()}>
                {!hasProAccess() ? 'Current plan' : 'Free plan'}
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-2 border-primary">
            {hasProAccess() && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="bg-primary text-primary-foreground">Current plan</Badge>
              </div>
            )}
            {!hasProAccess() && hasStudentDiscount() && (
              <div className="absolute -top-3 right-4 z-10">
                <Badge>🎓 Student Discount</Badge>
              </div>
            )}

            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium">Scira Pro</h3>
                <Badge variant="secondary">Popular</Badge>
              </div>

              {/* Pricing Display - Show currency based on location */}
              {hasProAccess() ? (
                // Show user's current pricing method
                getProAccessSource() === 'dodo' ? (
                  <div className="flex items-baseline">
                    <span className="text-4xl font-light">₹{PRICING.PRO_MONTHLY_INR}</span>
                    <span className="text-muted-foreground ml-2">(excl. GST)/month</span>
                  </div>
                ) : (
                  <div className="flex items-baseline">
                    <span className="text-4xl font-light">$15</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                )
              ) : location.isIndia || derivedIsIndianStudentEmail ? (
                // Show INR pricing for Indian users
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    {getStudentPrice(true) ? (
                      <>
                        <span className="text-2xl text-muted-foreground line-through mr-2">
                          ₹{PRICING.PRO_MONTHLY_INR}
                        </span>
                        <span className="text-4xl font-light">₹{getStudentPrice(true)}</span>
                      </>
                    ) : (
                      <span className="text-4xl font-light">₹{PRICING.PRO_MONTHLY_INR}</span>
                    )}
                    <span className="text-muted-foreground ml-2">(excl. GST)/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Approx. $15/month</p>
                </div>
              ) : (
                // Show USD pricing for non-Indian users
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    {getStudentPrice(false) ? (
                      <>
                        <span className="text-2xl text-muted-foreground line-through mr-2">$15</span>
                        <span className="text-4xl font-light">${getStudentPrice(false)}</span>
                      </>
                    ) : (
                      <span className="text-4xl font-light">$15</span>
                    )}
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Approx. ₹{PRICING.PRO_MONTHLY_INR}/month</p>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 shrink-0"></div>
                  Unlimited searches
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 shrink-0"></div>
                  All AI models
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 shrink-0"></div>
                  PDF analysis
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 shrink-0"></div>
                  Priority support
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 shrink-0"></div>
                  Scira Lookout
                </li>
              </ul>

              {hasProAccess() ? (
                <div className="space-y-4">
                  <Button className="w-full" onClick={handleManageSubscription}>
                    {getProAccessSource() === 'dodo' ? 'Manage payment' : 'Manage subscription'}
                  </Button>
                  {getProAccessSource() === 'polar' && subscriptionDetails.subscription && (
                    <p className="text-sm text-muted-foreground text-center">
                      {subscriptionDetails.subscription.cancelAtPeriodEnd
                        ? `Subscription expires ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`
                        : `Renews ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`}
                    </p>
                  )}
                  {getProAccessSource() === 'dodo' && user?.dodoSubscription?.expiresAt && (
                    <p className="text-sm text-muted-foreground text-center">
                      Access expires {formatDate(new Date(user.dodoSubscription.expiresAt))}
                    </p>
                  )}
                </div>
              ) : !user ? (
                <Button className="w-full group" onClick={() => handleCheckout(STARTER_TIER, STARTER_SLUG)}>
                  Sign up for Pro
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button
                    className="w-full group"
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
                  <div className="text-xs text-center text-muted-foreground">
                    💳{' '}
                    {location.isIndia || derivedIsIndianStudentEmail
                      ? 'UPI, Cards, Net Banking & more'
                      : 'Credit/Debit Cards, UPI & more'}{' '}
                    (auto-renews monthly)
                  </div>
                  {(location.isIndia || derivedIsIndianStudentEmail) && (
                    <div className="text-xs text-center text-amber-600 dark:text-amber-400">
                      💡 Tip: UPI payments have a higher success rate on PC/Desktop
                    </div>
                  )}
                  {hasStudentDiscount() && discountConfig.message && (
                    <p className="text-xs text-green-600 dark:text-green-400 text-center font-medium">
                      {discountConfig.message}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Student Discount */}
        {!hasStudentDiscount() && (
          <Card className="max-w-2xl mx-auto mt-16">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-medium mb-2">🎓 Student discount available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {location.isIndia || derivedIsIndianStudentEmail
                    ? 'Get Pro for just ₹450/month (approx. $5)!'
                    : 'Get Pro for just $5/month (approx. ₹450)!'}{' '}
                  Simply sign up with your university email address and the discount will be applied automatically.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                  <SupportedDomainsList />
                  <span className="text-xs text-muted-foreground">or</span>
                  <StudentDomainRequestButton />
                </div>
                <p className="text-xs text-muted-foreground">
                  Check if your university is already supported, or request to add a new domain.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student Discount Active */}
        {hasStudentDiscount() && !hasProAccess() && (
          <Card className="max-w-2xl mx-auto mt-16 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-medium mb-2 text-green-700 dark:text-green-300">🎓 Student discount active!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your university email domain has been automatically recognized. Get Pro for just{' '}
                  {location.isIndia || derivedIsIndianStudentEmail
                    ? `₹${getStudentPrice(true) || 450}/month (approx. $5)`
                    : `$${getStudentPrice(false) || 5}/month (approx. ₹${getStudentPrice(true) || 450})`}
                  .
                </p>
                <p className="text-xs text-muted-foreground">Discount automatically applied at checkout</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-16 space-y-4">
          <p className="text-sm text-muted-foreground">
            By subscribing, you agree to our{' '}
            <Link href="/terms" className="text-foreground hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="text-foreground hover:underline">
              Privacy Policy
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Questions?{' '}
            <a href="mailto:zaid@scira.ai" className="text-foreground hover:underline">
              Get in touch
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
