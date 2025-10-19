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
import { DiscountBanner } from '@/components/ui/discount-banner';
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

  // Debug logging (can be removed in production)
  console.log('PricingTable Debug:', {
    subscriptionDetails,
    userProStatus: user
      ? {
        id: user.id,
        isProUser: user.isProUser,
        proSource: user.proSource,
        hasPolarSubscription: !!user.polarSubscription,
        polarSubStatus: user.polarSubscription?.status,
        polarSubProductId: user.polarSubscription?.productId,
      }
      : null,
  });

  const [discountConfig, setDiscountConfig] = useState<DiscountConfig>({ enabled: false });

  useEffect(() => {
    const fetchDiscountConfig = async () => {
      try {
        const config = await getDiscountConfigAction();
        const isDevMode = config.dev || process.env.NODE_ENV === 'development';

        console.log('Discount Config Debug:', {
          config,
          isDevMode,
          nodeEnv: process.env.NODE_ENV,
          hasCode: !!config.code,
          hasMessage: !!config.message,
          enabled: config.enabled,
          dev: config.dev
        });

        if ((config.enabled || isDevMode) && !config.originalPrice) {
          config.originalPrice = PRICING.PRO_MONTHLY;
        }
        setDiscountConfig(config);
      } catch (error) {
        console.error('Failed to fetch discount config:', error);
      }
    };

    fetchDiscountConfig();
  }, []);

  // Helper function to calculate discounted price
  const getDiscountedPrice = (originalPrice: number, isINR: boolean = false) => {
    // TEMPORARY: Force disable all discounts
    if (process.env.NEXT_PUBLIC_DISABLE_DISCOUNTS === 'true') {
      return originalPrice;
    }

    const isDevMode = discountConfig.dev || process.env.NODE_ENV === 'development';
    const shouldApplyDiscount = isDevMode
      ? discountConfig.code && discountConfig.message
      : discountConfig.enabled && discountConfig.code && discountConfig.message;

    if (!shouldApplyDiscount) {
      return originalPrice;
    }

    // Use INR price directly if available
    if (isINR && discountConfig.inrPrice) {
      return discountConfig.inrPrice;
    }

    // Use final price directly if available (for student discounts)
    if (!isINR && discountConfig.finalPrice) {
      return discountConfig.finalPrice;
    }

    // Apply percentage discount
    if (discountConfig.percentage) {
      return Math.round(originalPrice - (originalPrice * discountConfig.percentage) / 100);
    }

    return originalPrice;
  };

  // Check if discount should be shown
  const shouldShowDiscount = () => {
    // TEMPORARY: Force disable all discounts
    if (process.env.NEXT_PUBLIC_DISABLE_DISCOUNTS === 'true') {
      console.log('Discounts disabled via NEXT_PUBLIC_DISABLE_DISCOUNTS');
      return false;
    }

    const isDevMode = discountConfig.dev || process.env.NODE_ENV === 'development';
    const hasRequiredFields = discountConfig.code && discountConfig.message;
    const hasDiscountValue = discountConfig.percentage || discountConfig.inrPrice || discountConfig.finalPrice;

    const result = isDevMode
      ? hasRequiredFields && hasDiscountValue
      : discountConfig.enabled && hasRequiredFields && hasDiscountValue;

    console.log('shouldShowDiscount Debug:', {
      isDevMode,
      hasCode: !!discountConfig.code,
      hasMessage: !!discountConfig.message,
      hasPercentage: !!discountConfig.percentage,
      hasInrPrice: !!discountConfig.inrPrice,
      hasFinalPrice: !!discountConfig.finalPrice,
      enabled: discountConfig.enabled,
      hasRequiredFields,
      hasDiscountValue,
      result
    });

    return result;
  };

  const handleCheckout = async (productId: string, slug: string, paymentMethod?: 'dodo' | 'polar') => {
    if (!user) {
      router.push('/sign-up');
      return;
    }

    try {
      if (paymentMethod === 'dodo') {
        router.push('/checkout');
      } else {
        // Auto-apply discount if available
        const discountIdToUse = discountConfig.discountId || '';

        // TEMPORARY: Force disable all discounts
        const discountsDisabled = process.env.NEXT_PUBLIC_DISABLE_DISCOUNTS === 'true';

        // Show special messaging for student discounts
        if (!discountsDisabled && discountConfig.isStudentDiscount) {
          toast.success('🎓 Student discount applied automatically!');
        } else if (!discountsDisabled && discountIdToUse && (discountConfig.enabled || (discountConfig.dev || process.env.NODE_ENV === 'development'))) {
          toast.success(`💰 Discount "${discountConfig.code}" applied automatically!`);
        }

        await authClient.checkout({
          products: [productId],
          slug: slug,
          allowDiscountCodes: true,
          ...(discountIdToUse !== '' &&
            !discountsDisabled &&
            (discountConfig.enabled || (discountConfig.dev || process.env.NODE_ENV === 'development')) && {
            discountId: discountIdToUse,
          }),
        });
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error('Something went wrong. Please try again.');
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
          {!location.loading && location.isIndia && !discountConfig.isStudentDiscount && (
            <Badge variant="secondary" className="mt-4">
              🇮🇳 Special India pricing available
            </Badge>
          )}
        </div>
      </div>

      {/* Discount Banner */}
      {shouldShowDiscount() && (
        <div className="max-w-4xl mx-auto px-6 sm:px-16 mb-8">
          <DiscountBanner discountConfig={discountConfig} className="mx-auto" />
        </div>
      )}

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
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mr-3 flex-shrink-0"></div>
                  {SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches per day
                </li>
                <li className="flex items-center text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mr-3 flex-shrink-0"></div>
                  Basic AI models
                </li>
                <li className="flex items-center text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mr-3 flex-shrink-0"></div>
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
            {!hasProAccess() && shouldShowDiscount() && (
              <div className="absolute -top-3 right-4 z-10">
                <Badge variant="secondary">
                  {discountConfig.showPrice && discountConfig.finalPrice
                    ? `$${PRICING.PRO_MONTHLY - discountConfig.finalPrice} OFF for a year`
                    : discountConfig.percentage
                      ? `${discountConfig.percentage}% OFF`
                      : 'DISCOUNT'}
                </Badge>
              </div>
            )}

            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium">Scira Pro</h3>
                <Badge variant="secondary">Popular</Badge>
              </div>

              {/* Pricing Display */}
              {hasProAccess() ? (
                // Show user's current pricing method
                getProAccessSource() === 'dodo' ? (
                  <div className="flex items-baseline">
                    <span className="text-4xl font-light">₹{PRICING.PRO_MONTHLY_INR}</span>
                    <span className="text-muted-foreground ml-2">+GST</span>
                  </div>
                ) : (
                  <div className="flex items-baseline">
                    <span className="text-4xl font-light">$15</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                )
              ) : !location.loading && location.isIndia && !discountConfig.isStudentDiscount ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* INR Option */}
                    <div className="p-3 border rounded-lg bg-muted/50">
                      <div className="space-y-1">
                        {shouldShowDiscount() ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground line-through">
                              ₹{PRICING.PRO_MONTHLY_INR}
                            </span>
                            <span className="text-xl font-light">
                              ₹{getDiscountedPrice(PRICING.PRO_MONTHLY_INR, true)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xl font-light">₹{PRICING.PRO_MONTHLY_INR}</span>
                        )}
                        <div className="text-xs text-muted-foreground">+18% GST</div>
                        <div className="text-xs">1 month access</div>
                        <div className="text-xs text-muted-foreground">🇮🇳 UPI, Cards, QR</div>
                      </div>
                    </div>

                    {/* USD Option */}
                    <div className="p-3 border rounded-lg">
                      <div className="space-y-1">
                        {shouldShowDiscount() ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground line-through">${PRICING.PRO_MONTHLY}</span>
                            <span className="text-xl font-light">${getDiscountedPrice(PRICING.PRO_MONTHLY)}</span>
                          </div>
                        ) : (
                          <span className="text-xl font-light">${PRICING.PRO_MONTHLY}</span>
                        )}
                        <div className="text-xs text-muted-foreground">USD</div>
                        <div className="text-xs">Monthly subscription</div>
                        <div className="text-xs text-muted-foreground">💳 Card payment</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-baseline">
                  {shouldShowDiscount() ? (
                    <div className="flex items-baseline gap-3">
                      <span className="text-xl text-muted-foreground line-through">$15</span>
                      <span className="text-4xl font-light">${getDiscountedPrice(PRICING.PRO_MONTHLY)}</span>
                    </div>
                  ) : (
                    <span className="text-4xl font-light">$15</span>
                  )}
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                  Unlimited searches
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                  All AI models
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                  PDF analysis
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                  Priority support
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0"></div>
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
                  {getProAccessSource() === 'dodo' && user?.dodoPayments?.expiresAt && (
                    <p className="text-sm text-muted-foreground text-center">
                      Access expires {formatDate(new Date(user.dodoPayments.expiresAt))}
                    </p>
                  )}
                </div>
              ) : !location.loading && location.isIndia && !discountConfig.isStudentDiscount ? (
                !user ? (
                  <Button className="w-full group" onClick={() => handleCheckout(STARTER_TIER, STARTER_SLUG)}>
                    Sign up for Pro
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="border border-border/60 rounded-md p-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground">
                        UPI AutoPay coming soon. Use subscription below.
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      className="w-full opacity-50 cursor-not-allowed" 
                      disabled
                    >
                      Pay ₹{getDiscountedPrice(PRICING.PRO_MONTHLY_INR, true)} (Unavailable)
                    </Button>
                    <Button
                      className="w-full group"
                      onClick={() => handleCheckout(STARTER_TIER, STARTER_SLUG, 'polar')}
                    >
                      Subscribe ${getDiscountedPrice(PRICING.PRO_MONTHLY)}/month
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    {shouldShowDiscount() && discountConfig.discountAvail && (
                      <p className="text-xs text-primary text-center font-medium">{discountConfig.discountAvail}</p>
                    )}
                  </div>
                )
              ) : (
                <Button
                  className="w-full group"
                  onClick={() => handleCheckout(STARTER_TIER, STARTER_SLUG)}
                  disabled={location.loading}
                >
                  {location.loading ? 'Loading...' : !user ? 'Sign up for Pro' : 'Upgrade to Pro'}
                  {!location.loading && (
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Student Discount */}
        {!discountConfig.isStudentDiscount && (
          <Card className="max-w-2xl mx-auto mt-16">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-medium mb-2">🎓 Student discount available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get Pro for just $5/month! Simply sign up with your university email address and the discount will be
                  applied automatically.
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
        {discountConfig.isStudentDiscount && !hasProAccess() && (
          <Card className="max-w-2xl mx-auto mt-16 border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-medium mb-2 text-primary">🎓 Student discount active!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your university email domain has been automatically recognized. Get Pro for just $5/month.
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
