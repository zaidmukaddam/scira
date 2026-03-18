'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { authClient, betterauthClient } from '@/lib/auth-client';
import { ArrowRight, ArrowLeft, GraduationCap, Check, X, Shield, Zap, Quote, Tag, Percent } from 'lucide-react';
import { sileo } from 'sileo';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  getDiscountConfigAction,
  previewMaxUpgrade,
  upgradeToMax,
  previewDowngradeToPro,
  downgradeToPro,
} from '@/app/actions';
import { PRICING, SEARCH_LIMITS } from '@/lib/constants';
import { DiscountConfig } from '@/lib/discount';
import { useLocation } from '@/hooks/use-location';
import { ComprehensiveUserData } from '@/lib/user-data-server';
import { StudentDomainRequestButton } from '@/components/student-domain-request-button';
import { SupportedDomainsList } from '@/components/supported-domains-list';
import { SciraLogo } from '@/components/logos/scira-logo';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { cn } from '@/lib/utils';
import {
  ProAccordion,
  ProAccordionItem,
  ProAccordionTrigger,
  ProAccordionContent,
} from '@/components/ui/pro-accordion';

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

const comparisonFeatures = [
  { name: 'Daily searches', free: `${SEARCH_LIMITS.DAILY_SEARCH_LIMIT} per day`, pro: 'Unlimited', max: 'Unlimited' },
  { name: 'Base AI models', free: 'Basic models', pro: 'All base models', max: 'All base models' },
  { name: 'Max AI models (Anthropic Claude 4.5/4.6)', free: false, pro: false, max: true },
  { name: 'Search modes', free: '13 modes', pro: 'All 18 modes', max: 'All 18 modes' },
  { name: 'Web, Chat, X, Reddit', free: true, pro: true, max: true },
  { name: 'Academic, GitHub, Code', free: true, pro: true, max: true },
  { name: 'YouTube, Spotify, Crypto', free: true, pro: true, max: true },
  { name: 'Stocks, Prediction markets', free: true, pro: true, max: true },
  { name: 'Search history', free: true, pro: true, max: true },
  { name: 'Extreme (deep research)', free: false, pro: true, max: true },
  { name: 'Connectors (Drive, Notion)', free: false, pro: true, max: true },
  { name: 'Memory', free: false, pro: true, max: true },
  { name: 'PDF analysis', free: false, pro: true, max: true },
  { name: 'Voice mode', free: false, pro: true, max: true },
  { name: 'XQL (X Query Language)', free: false, pro: true, max: true },
  { name: 'Canvas (visualization mode)', free: false, pro: true, max: true },
  { name: 'Scira Apps (100+ MCP integrations)', free: false, pro: true, max: true },
  { name: 'Scira Lookout', free: false, pro: true, max: true },
  { name: 'Priority support', free: false, pro: true, max: true },
];

export default function PricingTable({ subscriptionDetails, user }: PricingTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const location = useLocation();
  const searchParams = useSearchParams();
  const redeemCode = searchParams.get('redeemCode') ?? '';
  const discountPercentParam = searchParams.get('discountPercent');
  const validMonthsParam = searchParams.get('validMonths');
  const discountPercent = discountPercentParam ? Number.parseInt(discountPercentParam, 10) || 0 : 0;
  const validMonths = validMonthsParam ? Number.parseInt(validMonthsParam, 10) || 0 : 0;
  const [showMaxUpgradeConfirm, setShowMaxUpgradeConfirm] = useState(false);
  const [isChangingToMax, setIsChangingToMax] = useState(false);
  const [isPreviewingMaxUpgrade, setIsPreviewingMaxUpgrade] = useState(false);
  const [maxUpgradePreview, setMaxUpgradePreview] = useState<{
    totalAmount: number;
    currency: string;
    settlementAmount: number;
    settlementCurrency: string;
    lineItems: Array<{
      id: string;
      type: string;
      quantity?: number;
      unit_price?: number;
      subtotal?: number;
      currency: string;
      name?: string | null;
      description?: string | null;
      proration_factor?: number;
    }>;
  } | null>(null);
  const [showProDowngradeConfirm, setShowProDowngradeConfirm] = useState(false);
  const [isDowngradingToPro, setIsDowngradingToPro] = useState(false);
  const [isPreviewingProDowngrade, setIsPreviewingProDowngrade] = useState(false);
  const [proDowngradePreview, setProDowngradePreview] = useState<{
    totalAmount: number;
    currency: string;
    settlementAmount: number;
    settlementCurrency: string;
    lineItems: Array<{
      id: string;
      type: string;
      quantity?: number;
      unit_price?: number;
      subtotal?: number;
      currency: string;
      name?: string | null;
      description?: string | null;
      proration_factor?: number;
    }>;
  } | null>(null);
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

  const getStudentPrice = (isINR: boolean = false) => {
    if (!discountConfig.enabled || !discountConfig.isStudentDiscount) return null;
    return isINR ? discountConfig.inrPrice || null : discountConfig.finalPrice || null;
  };

  const hasStudentDiscount = () => discountConfig.enabled && discountConfig.isStudentDiscount;

  // Redeem code discount helpers
  const clampedDiscountPercent = Math.min(Math.max(discountPercent, 0), 100);
  const hasRedeemDiscount = Boolean(redeemCode && clampedDiscountPercent > 0);
  const getRedeemPrice = (isINR: boolean = false) => {
    if (!hasRedeemDiscount) return null;
    const base = isINR ? PRICING.PRO_MONTHLY_INR : PRICING.PRO_MONTHLY;
    const discounted = Math.round(base * (1 - clampedDiscountPercent / 100));
    return discounted;
  };
  const validMonthsClamped = Math.max(validMonths, 0);
  const validMonthsLabel = validMonthsClamped === 1 ? '1 month' : `${validMonthsClamped} months`;

  const getSignUpUrl = () => {
    const params = new URLSearchParams();
    if (redeemCode) params.set('redeemCode', redeemCode);
    if (discountPercent > 0) params.set('discountPercent', String(discountPercent));
    if (validMonths > 0) params.set('validMonths', String(validMonths));
    const qs = params.toString();
    const redirectPath = qs ? `/pricing?${qs}` : '/pricing';
    return `/sign-up?redirect=${encodeURIComponent(redirectPath)}`;
  };

  const handleCheckout = async (slug: string) => {
    if (!user) {
      router.push(getSignUpUrl());
      return;
    }

    const checkoutAsync = async () => {
      const { data: checkout, error } = await betterauthClient.dodopayments.checkoutSession({
        slug,
        customer: { email: user.email || '', name: user.name || '' },
        billing_currency: location.isIndia ? 'INR' : 'USD',
        allowed_payment_method_types: [
          'credit',
          'debit',
          'upi_collect',
          'upi_intent',
          'apple_pay',
          'cashapp',
          'google_pay',
          'multibanco',
          'bancontact_card',
          'eps',
          'ideal',
          'przelewy24',
          'paypal',
          'affirm',
          'klarna',
          'sepa',
          'ach',
          'amazon_pay',
          'afterpay_clearpay',
        ],
        referenceId: `order_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        ...(redeemCode
          ? { discount_code: redeemCode }
          : hasStudentDiscount() && discountConfig.dodoDiscountId
            ? { discount_code: 'SCIRASTUD' }
            : {}),
      });
      if (error) throw new Error(error.message || 'Checkout failed');
      if (checkout?.url) {
        window.location.href = checkout.url;
        return { hasDiscount: hasStudentDiscount(), hasRedeemCode: !!redeemCode };
      }
      throw new Error('No checkout URL received');
    };

    sileo.promise(checkoutAsync(), {
      loading: { title: 'Redirecting to checkout...' },
      success: (data) => ({
        title: data.hasRedeemCode
          ? 'Redeem code will be applied at checkout!'
          : data.hasDiscount
            ? 'Student discount applied!'
            : 'Redirecting to checkout...',
      }),
      error: (err) => ({
        title: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      }),
    });
  };

  const handleManageSubscription = async () => {
    try {
      const proSource = getProAccessSource();
      if (proSource === 'dodo') await betterauthClient.dodopayments.customer.portal();
      else await authClient.customer.portal({});
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      sileo.error({ title: 'Failed to open subscription management' });
    }
  };

  const clearClientUserCaches = async () => {
    try {
      localStorage.removeItem('scira-user-data');
    } catch {}

    await queryClient.invalidateQueries({ queryKey: ['comprehensive-user-data'] });
    await queryClient.invalidateQueries({ queryKey: ['success-page-user'] });
  };

  const formatMoney = (amount: number, currency: string) => {
    const normalized = currency.toUpperCase();
    const value = amount / 100;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: normalized,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${normalized} ${value.toFixed(2)}`;
    }
  };

  const STARTER_TIER = process.env.NEXT_PUBLIC_STARTER_TIER;
  const STARTER_SLUG = process.env.NEXT_PUBLIC_PREMIUM_SLUG; // Dodo slug for Pro
  const MAX_SLUG = process.env.NEXT_PUBLIC_MAX_SLUG; // Dodo slug for Max

  if (!STARTER_TIER || !STARTER_SLUG) {
    console.error('Missing required environment variables for Pro tier');
  }

  const hasPolarSubscription = () =>
    subscriptionDetails.hasSubscription &&
    subscriptionDetails.subscription?.productId === STARTER_TIER &&
    subscriptionDetails.subscription?.status === 'active';

  const isProUser = user?.isProUser === true;
  const isMaxUser = user?.isMaxUser === true;
  const hasDodoSubscription = () => isProUser && user?.proSource === 'dodo';
  const hasProAccess = () => hasPolarSubscription() || hasDodoSubscription();

  const getProAccessSource = () => {
    if (hasPolarSubscription()) return 'polar';
    if (hasDodoSubscription()) return 'dodo';
    return null;
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between h-14 px-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <SciraLogo className="size-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-lg font-light tracking-tighter font-be-vietnam-pro">scira</span>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <Link
                href="/"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pixel-grid-bg opacity-30" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-background" />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-16">
          <div className="text-center max-w-xl mx-auto">
            <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">Plans</span>
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-foreground font-be-vietnam-pro mb-4">
              Simple, <span className="font-pixel text-4xl sm:text-5xl">honest</span> pricing
            </h1>
            <p className="text-lg text-muted-foreground mb-2">Start free. Upgrade when you need unlimited power.</p>
            <p className="text-xs text-muted-foreground">
              Cancel anytime &middot; No hidden fees &middot; Secure checkout
            </p>
          </div>
        </div>
      </div>

      {/* Redeem Code Banner — above pricing cards */}
      {redeemCode && !hasProAccess() && (
        <div className="max-w-5xl mx-auto px-6 pb-8">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Tag className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">Redeem code active</span>
                    <code className="font-pixel text-[10px] uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      {redeemCode}
                    </code>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      {clampedDiscountPercent > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                          <Percent className="w-3 h-3" />
                          {clampedDiscountPercent}% off Pro
                        </span>
                      )}
                      {validMonthsClamped > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          for {validMonthsLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {clampedDiscountPercent > 0
                        ? `You'll pay ${location.isIndia || derivedIsIndianStudentEmail ? `₹${getRedeemPrice(true)}` : `$${getRedeemPrice(false)}`}/month${validMonthsClamped > 0 ? ` for ${validMonthsLabel}` : ''} for Pro — discount applied automatically at checkout.`
                        : `This code will be applied automatically at checkout.${validMonthsClamped > 0 ? ` Valid for ${validMonthsLabel}.` : ''}`}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('redeemCode');
                  params.delete('discountPercent');
                  params.delete('validMonths');
                  const next = params.toString();
                  router.replace(next ? `/pricing?${next}` : '/pricing');
                }}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50 shrink-0 mt-0.5"
                aria-label="Remove redeem code"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="p-8 lg:p-10 flex flex-col rounded-2xl border border-border/50 bg-card/30">
            <h3 className="text-lg font-semibold mb-2 text-foreground">Free</h3>
            <p className="text-sm text-muted-foreground mb-6">Get started with the essentials</p>
            <div className="flex items-baseline mb-8">
              <span className="text-5xl font-pixel tracking-tight text-foreground">$0</span>
              <span className="text-sm text-muted-foreground ml-2">/month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                `${SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches per day`,
                'Basic AI models',
                'Search history',
                'Web, Reddit, X, YouTube',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full h-11 rounded-xl" disabled={!isProUser}>
              {!isProUser ? 'Current plan' : 'Free plan'}
            </Button>
          </div>

          {/* Pro Plan */}
          <div
            className={cn(
              'p-8 lg:p-10 flex flex-col rounded-2xl border bg-card relative overflow-hidden',
              isMaxUser ? 'border-border/50' : 'border-primary/20',
            )}
          >
            {!isMaxUser && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary/60 via-primary to-primary/60" />
            )}

            {isProUser && !isMaxUser && (
              <div className="absolute top-4 right-4">
                <span className="font-pixel text-[9px] uppercase tracking-wider text-foreground border border-foreground px-2.5 py-1 rounded-full">
                  Current
                </span>
              </div>
            )}
            {!isProUser && redeemCode && (
              <div className="absolute top-4 right-4">
                <span className="font-pixel text-[9px] uppercase tracking-wider text-primary border border-primary px-2.5 py-1 rounded-full">
                  {clampedDiscountPercent > 0 ? `${clampedDiscountPercent}% Off` : 'Code Applied'}
                </span>
              </div>
            )}
            {!isProUser && !redeemCode && hasStudentDiscount() && (
              <div className="absolute top-4 right-4">
                <span className="font-pixel text-[9px] uppercase tracking-wider text-green-600 dark:text-green-400 border border-green-600 dark:border-green-400 px-2.5 py-1 rounded-full">
                  Student
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-foreground">Pro</h3>
              {!isProUser && !hasStudentDiscount() && (
                <span className="font-pixel text-[9px] uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  Popular
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-6">Research, apps, and unlimited power</p>

            {/* Pricing Display */}
            <div className="mb-8">
              {isProUser && !isMaxUser ? (
                getProAccessSource() === 'dodo' ? (
                  <div className="flex items-baseline">
                    <span className="text-5xl font-pixel tracking-tight text-foreground">
                      ₹{PRICING.PRO_MONTHLY_INR}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">(excl. GST)/month</span>
                  </div>
                ) : (
                  <div className="flex items-baseline">
                    <span className="text-5xl font-pixel tracking-tight text-foreground">$15</span>
                    <span className="text-sm text-muted-foreground ml-2">/month</span>
                  </div>
                )
              ) : hasRedeemDiscount ? (
                /* Redeem code discount pricing */
                location.isIndia || derivedIsIndianStudentEmail ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline">
                      <span className="text-2xl text-muted-foreground line-through mr-2 font-pixel">
                        ₹{PRICING.PRO_MONTHLY_INR}
                      </span>
                      <span className="text-5xl font-pixel tracking-tight text-primary">₹{getRedeemPrice(true)}</span>
                      <span className="text-sm text-muted-foreground ml-2">(excl. GST)/month</span>
                    </div>
                    <p className="text-xs text-primary/70 font-medium">
                      {clampedDiscountPercent}% off with code {redeemCode}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-baseline">
                      <span className="text-2xl text-muted-foreground line-through mr-2 font-pixel">$15</span>
                      <span className="text-5xl font-pixel tracking-tight text-primary">${getRedeemPrice(false)}</span>
                      <span className="text-sm text-muted-foreground ml-2">/month</span>
                    </div>
                    <p className="text-xs text-primary/70 font-medium">
                      {clampedDiscountPercent}% off with code {redeemCode}
                    </p>
                  </div>
                )
              ) : location.isIndia || derivedIsIndianStudentEmail ? (
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    {getStudentPrice(true) ? (
                      <>
                        <span className="text-2xl text-muted-foreground line-through mr-2 font-pixel">
                          ₹{PRICING.PRO_MONTHLY_INR}
                        </span>
                        <span className="text-5xl font-pixel tracking-tight text-foreground">
                          ₹{getStudentPrice(true)}
                        </span>
                      </>
                    ) : (
                      <span className="text-5xl font-pixel tracking-tight text-foreground">
                        ₹{PRICING.PRO_MONTHLY_INR}
                      </span>
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
                        <span className="text-2xl text-muted-foreground line-through mr-2 font-pixel">$15</span>
                        <span className="text-5xl font-pixel tracking-tight text-foreground">
                          ${getStudentPrice(false)}
                        </span>
                      </>
                    ) : (
                      <span className="text-5xl font-pixel tracking-tight text-foreground">$15</span>
                    )}
                    <span className="text-sm text-muted-foreground ml-2">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Less than a coffee a day</p>
                </div>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Unlimited searches',
                'All base AI models',
                'Scira Apps (100+ integrations)',
                'Extreme deep research',
                'PDF analysis',
                'Voice mode',
                'XQL (X Query Language)',
                'Canvas (visualization mode)',
                'Scira Lookout',
                'Priority support',
              ].map((item) => (
                <li
                  key={item}
                  className={cn(
                    'flex items-center gap-3 text-sm',
                    isMaxUser ? 'text-muted-foreground' : 'text-foreground/80',
                  )}
                >
                  <Check
                    className={cn('w-3.5 h-3.5 shrink-0', isMaxUser ? 'text-muted-foreground/50' : 'text-primary')}
                  />
                  {item}
                </li>
              ))}
            </ul>

            {isProUser && !isMaxUser ? (
              <div className="space-y-3">
                <Button className="w-full h-11 rounded-xl" onClick={handleManageSubscription}>
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
            ) : isMaxUser ? (
              <div className="space-y-3">
                <Button
                  className="w-full h-11 rounded-xl"
                  variant="outline"
                  onClick={async () => {
                    if (user?.proSource === 'dodo' && user?.isMaxUser) {
                      setIsPreviewingProDowngrade(true);
                      try {
                        const result = await previewDowngradeToPro();
                        if (result.success && result.preview) {
                          setProDowngradePreview(result.preview);
                          setShowProDowngradeConfirm(true);
                        } else {
                          sileo.error({ title: result.error || 'Failed to preview Pro downgrade' });
                        }
                      } catch {
                        sileo.error({ title: 'Failed to preview Pro downgrade' });
                      } finally {
                        setIsPreviewingProDowngrade(false);
                      }
                      return;
                    }
                    handleManageSubscription();
                  }}
                  disabled={isPreviewingProDowngrade || isDowngradingToPro}
                >
                  {isPreviewingProDowngrade || isDowngradingToPro ? 'Loading...' : 'Downgrade to Pro'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  {user?.proSource === 'dodo'
                    ? 'Switch back to Pro with a prorated plan change preview.'
                    : 'Manage your subscription to change plans.'}
                </p>
              </div>
            ) : !user ? (
              <Button className="w-full h-11 rounded-xl group" onClick={() => handleCheckout(STARTER_SLUG!)}>
                Sign up for Pro <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  className="w-full h-11 rounded-xl group"
                  onClick={() => handleCheckout(STARTER_SLUG!)}
                  disabled={location.loading}
                >
                  {location.loading
                    ? 'Loading...'
                    : hasRedeemDiscount
                      ? location.isIndia || derivedIsIndianStudentEmail
                        ? `Subscribe ₹${getRedeemPrice(true)}/month`
                        : `Subscribe $${getRedeemPrice(false)}/month`
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
                {redeemCode && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium">
                    <Tag className="w-3 h-3" />
                    <span>
                      Code <code className="font-pixel text-[10px] uppercase">{redeemCode}</code>
                      {clampedDiscountPercent > 0 ? ` (${clampedDiscountPercent}% off` : ''}
                      {clampedDiscountPercent > 0 && validMonthsClamped > 0 ? ` for ${validMonthsLabel}` : ''}
                      {clampedDiscountPercent > 0 ? ')' : ''} applied at checkout
                    </span>
                  </div>
                )}
                {!redeemCode && hasStudentDiscount() && discountConfig.message && (
                  <p className="text-xs text-green-600 dark:text-green-400 text-center font-medium">
                    {discountConfig.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Max Plan */}
          <div
            className={cn(
              'p-8 lg:p-10 flex flex-col rounded-2xl border bg-card relative overflow-hidden',
              isMaxUser ? 'border-primary/30' : 'border-border/50',
            )}
          >
            {isMaxUser && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary/60 via-primary to-primary/60" />
            )}

            {isMaxUser && (
              <div className="absolute top-4 right-4">
                <span className="font-pixel text-[9px] uppercase tracking-wider text-foreground border border-foreground px-2.5 py-1 rounded-full">
                  Current
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-foreground">Max</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">All paid features + Anthropic Claude models</p>

            <div className="mb-8">
              <div className="space-y-1">
                <div className="flex items-baseline">
                  <span className="text-5xl font-pixel tracking-tight text-foreground">
                    {location.isIndia ? '₹5990' : '$60'}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">/month</span>
                </div>
                {location.isIndia && <p className="text-xs text-muted-foreground">Approx. $60/month (excl. GST)</p>}
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-3 text-sm text-foreground/80 font-medium">
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                All standard paid features
              </li>
              {[
                'Claude 4.6 Sonnet',
                'Claude 4.6 Sonnet Thinking',
                'Claude 4.6 Opus',
                'Claude 4.6 Opus Thinking',
                'Claude 4.5 Opus',
                'Claude 4.5 Opus Thinking',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            {isMaxUser ? (
              <div className="space-y-3">
                <Button className="w-full h-11 rounded-xl" onClick={handleManageSubscription}>
                  Manage subscription
                </Button>
                {getProAccessSource() === 'dodo' && user?.dodoSubscription?.expiresAt && (
                  <p className="text-xs text-muted-foreground text-center">
                    Expires {formatDate(new Date(user.dodoSubscription.expiresAt))}
                  </p>
                )}
              </div>
            ) : !user ? (
              <Button className="w-full h-11 rounded-xl group" onClick={() => handleCheckout(MAX_SLUG!)}>
                Sign up for Max <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  className="w-full h-11 rounded-xl group"
                  onClick={async () => {
                    if (user?.proSource === 'dodo' && user?.isProUser && !user?.isMaxUser) {
                      setIsPreviewingMaxUpgrade(true);
                      try {
                        const result = await previewMaxUpgrade();
                        if (result.success && result.preview) {
                          setMaxUpgradePreview(result.preview);
                          setShowMaxUpgradeConfirm(true);
                        } else {
                          sileo.error({ title: result.error || 'Failed to preview Max upgrade' });
                        }
                      } catch {
                        sileo.error({ title: 'Failed to preview Max upgrade' });
                      } finally {
                        setIsPreviewingMaxUpgrade(false);
                      }
                      return;
                    }
                    handleCheckout(MAX_SLUG!);
                  }}
                  disabled={location.loading || isChangingToMax || isPreviewingMaxUpgrade}
                >
                  {location.loading || isChangingToMax || isPreviewingMaxUpgrade
                    ? 'Loading...'
                    : user?.proSource === 'dodo' && user?.isProUser && !user?.isMaxUser
                      ? 'Switch to Max'
                      : location.isIndia
                        ? 'Subscribe ₹5990/month'
                        : 'Subscribe $60/month'}
                  {!location.loading && !isChangingToMax && !isPreviewingMaxUpgrade && (
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  {user?.proSource === 'dodo' && user?.isProUser && !user?.isMaxUser
                    ? 'Your plan will be switched immediately with prorated billing.'
                    : `${location.isIndia ? 'UPI, Cards, Net Banking & more' : 'Credit/Debit Cards, UPI & more'} (auto-renews monthly)`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={showMaxUpgradeConfirm}
        onOpenChange={(open) => {
          setShowMaxUpgradeConfirm(open);
          if (!open && !isChangingToMax) setMaxUpgradePreview(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to Max?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current Dodo Pro subscription will be upgraded to Max immediately. Review the prorated charge below
              before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {maxUpgradePreview && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Immediate charge</span>
                <span className="text-sm font-semibold text-foreground">
                  {formatMoney(maxUpgradePreview.totalAmount, maxUpgradePreview.currency)}
                </span>
              </div>

              {maxUpgradePreview.lineItems.length > 0 && (
                <div className="space-y-2">
                  {maxUpgradePreview.lineItems.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="flex items-start justify-between gap-4 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{item.name || item.description || item.type}</p>
                        <p className="text-muted-foreground capitalize">
                          {item.type.replace(/_/g, ' ')}
                          {typeof item.quantity === 'number' ? ` · Qty ${item.quantity}` : ''}
                          {typeof item.proration_factor === 'number'
                            ? ` · Proration ${item.proration_factor.toFixed(2)}`
                            : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-foreground">
                        {formatMoney(
                          typeof item.subtotal === 'number'
                            ? item.subtotal
                            : typeof item.unit_price === 'number'
                              ? item.unit_price * (item.quantity || 1)
                              : 0,
                          item.currency,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                If payment fails, the plan change will be prevented and your current subscription will stay as-is.
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingToMax}>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (event) => {
                event.preventDefault();
                setIsChangingToMax(true);
                try {
                  const result = await upgradeToMax();
                  if (result.success && result.redirect) {
                    await clearClientUserCaches();
                    window.location.href = result.redirect;
                    return;
                  }
                  sileo.error({ title: result.error || 'Failed to switch to Max' });
                } catch {
                  sileo.error({ title: 'Failed to switch to Max' });
                } finally {
                  setIsChangingToMax(false);
                  setShowMaxUpgradeConfirm(false);
                  setMaxUpgradePreview(null);
                }
              }}
            >
              {isChangingToMax ? 'Switching...' : 'Confirm switch'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showProDowngradeConfirm}
        onOpenChange={(open) => {
          setShowProDowngradeConfirm(open);
          if (!open && !isDowngradingToPro) setProDowngradePreview(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downgrade to Pro?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current Dodo Max subscription will be changed to Pro immediately. Review the prorated adjustment
              below before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {proDowngradePreview && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Immediate adjustment</span>
                <span className="text-sm font-semibold text-foreground">
                  {formatMoney(proDowngradePreview.totalAmount, proDowngradePreview.currency)}
                </span>
              </div>

              {proDowngradePreview.lineItems.length > 0 && (
                <div className="space-y-2">
                  {proDowngradePreview.lineItems.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="flex items-start justify-between gap-4 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{item.name || item.description || item.type}</p>
                        <p className="text-muted-foreground capitalize">
                          {item.type.replace(/_/g, ' ')}
                          {typeof item.quantity === 'number' ? ` · Qty ${item.quantity}` : ''}
                          {typeof item.proration_factor === 'number'
                            ? ` · Proration ${item.proration_factor.toFixed(2)}`
                            : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-foreground">
                        {formatMoney(
                          typeof item.subtotal === 'number'
                            ? item.subtotal
                            : typeof item.unit_price === 'number'
                              ? item.unit_price * (item.quantity || 1)
                              : 0,
                          item.currency,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                If payment fails, the plan change will be prevented and your current subscription will stay as-is.
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDowngradingToPro}>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (event) => {
                event.preventDefault();
                setIsDowngradingToPro(true);
                try {
                  const result = await downgradeToPro();
                  if (result.success && result.redirect) {
                    await clearClientUserCaches();
                    window.location.href = result.redirect;
                    return;
                  }
                  sileo.error({ title: result.error || 'Failed to downgrade to Pro' });
                } catch {
                  sileo.error({ title: 'Failed to downgrade to Pro' });
                } finally {
                  setIsDowngradingToPro(false);
                  setShowProDowngradeConfirm(false);
                  setProDowngradePreview(null);
                }
              }}
            >
              {isDowngradingToPro ? 'Downgrading...' : 'Confirm downgrade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Trust Signals */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Secure checkout
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Instant activation
          </div>
          <div className="flex items-center gap-1.5">
            <X className="w-3.5 h-3.5" /> Cancel anytime
          </div>
        </div>
      </div>

      {/* Student Discount */}
      {!hasStudentDiscount() && (
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <div className="rounded-xl border border-border/60 divide-y divide-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium">Student?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {location.isIndia || derivedIsIndianStudentEmail ? (
                      <>
                        Get Pro for <span className="font-pixel text-[10px] text-primary/70">₹450/mo</span>
                      </>
                    ) : (
                      <>
                        Get Pro for <span className="font-pixel text-[10px] text-primary/70">$5/mo</span>
                      </>
                    )}{' '}
                    with a university email.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SupportedDomainsList />
                <StudentDomainRequestButton />
              </div>
            </div>
          </div>
        </div>
      )}

      {hasStudentDiscount() && !isProUser && (
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <div className="rounded-xl border border-green-200/60 dark:border-green-800/40 bg-green-50/30 dark:bg-green-900/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <GraduationCap className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-green-700 dark:text-green-300">Discount active</h3>
                  <span className="font-pixel text-[9px] text-green-600/60 dark:text-green-400/60 uppercase tracking-wider">
                    Student
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get Pro for{' '}
                  {location.isIndia || derivedIsIndianStudentEmail
                    ? `₹${getStudentPrice(true) || 450}/month`
                    : `$${getStudentPrice(false) || 5}/month`}
                  . Applied at checkout.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Comparison Table */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">Compare</span>
          <h2 className="text-2xl font-light tracking-tight font-be-vietnam-pro">Feature by feature</h2>
        </div>

        <div className="border border-border/50 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-4 bg-muted/30 border-b border-border/50">
            <div className="p-4 text-xs font-medium text-muted-foreground">Feature</div>
            <div className="p-4 text-xs font-medium text-muted-foreground text-center">Free</div>
            <div className="p-4 text-xs font-medium text-center">
              <span className="text-primary font-semibold">Pro</span>
            </div>
            <div className="p-4 text-xs font-medium text-center border-l border-border/50">
              <span className="text-primary font-semibold">Max</span>
            </div>
          </div>
          {/* Table Rows */}
          {comparisonFeatures.map((feature, i) => (
            <div
              key={feature.name}
              className={`grid grid-cols-4 ${i < comparisonFeatures.length - 1 ? 'border-b border-border/30' : ''} hover:bg-muted/10 transition-colors`}
            >
              <div className="p-4 text-sm text-foreground/80">{feature.name}</div>
              <div className="p-4 flex items-center justify-center">
                {typeof feature.free === 'boolean' ? (
                  feature.free ? (
                    <Check className="w-4 h-4 text-muted-foreground/50" />
                  ) : (
                    <span className="w-4 h-px bg-border" />
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">{feature.free}</span>
                )}
              </div>
              <div className="p-4 flex items-center justify-center">
                {typeof feature.pro === 'boolean' ? (
                  feature.pro ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="w-4 h-px bg-border" />
                  )
                ) : (
                  <span className="text-xs text-foreground font-medium">{feature.pro}</span>
                )}
              </div>
              <div className="p-4 flex items-center justify-center border-l border-border/50 bg-primary/5">
                {typeof feature.max === 'boolean' ? (
                  feature.max ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="w-4 h-px bg-border" />
                  )
                ) : (
                  <span className="text-xs text-foreground font-medium">{feature.max}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social Proof */}
      <div className="border-t border-border/50 bg-muted/10">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">
              Loved by researchers
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                content: 'Scira is better than Grok at digging up information from X. Insanely accurate answers!',
                author: 'Chris Universe',
                handle: '@chrisuniverseb',
              },
              {
                content: 'Read nothing the whole sem and here I am with Scira to top my mid sems!',
                author: 'Rajnandinit',
                handle: '@itsRajnandinit',
              },
            ].map((t) => (
              <div key={t.handle} className="p-5 rounded-2xl border border-border/50 bg-card/30">
                <Quote className="h-3.5 w-3.5 text-primary/40 mb-3" />
                <p className="text-sm text-foreground/80 leading-relaxed mb-4">{t.content}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{t.author}</span>
                  <span className="text-xs text-muted-foreground font-pixel">{t.handle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center mb-10">
            <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">FAQ</span>
            <h2 className="text-2xl font-light tracking-tight font-be-vietnam-pro">Common questions</h2>
          </div>

          <ProAccordion type="single" collapsible className="w-full">
            <ProAccordionItem value="q1">
              <ProAccordionTrigger>Can I cancel anytime?</ProAccordionTrigger>
              <ProAccordionContent>
                Yes. Cancel from your account settings or billing portal. You keep Pro access until the end of your
                billing period.
              </ProAccordionContent>
            </ProAccordionItem>
            <ProAccordionItem value="q2">
              <ProAccordionTrigger>How does the student discount work?</ProAccordionTrigger>
              <ProAccordionContent>
                Sign up with a university email (.edu, .ac.in, .ac.uk, etc.) and the discount is applied automatically
                at checkout. No verification code needed. Note: Student discount only applies to the Pro plan.
              </ProAccordionContent>
            </ProAccordionItem>
            <ProAccordionItem value="q3">
              <ProAccordionTrigger>What payment methods do you accept?</ProAccordionTrigger>
              <ProAccordionContent>
                Credit/debit cards, UPI, PayPal, Apple Pay, Google Pay, Amazon Pay, Klarna, Affirm, SEPA, ACH, and more.
                Indian users can also pay via UPI and net banking.
              </ProAccordionContent>
            </ProAccordionItem>
            <ProAccordionItem value="q4">
              <ProAccordionTrigger>Is there a refund policy?</ProAccordionTrigger>
              <ProAccordionContent>
                All subscription fees are final and non-refundable. You can cancel anytime and your access continues
                until the end of the billing period.
              </ProAccordionContent>
            </ProAccordionItem>
          </ProAccordion>
        </div>
      </div>

      {/* Final CTA */}
      <div className="border-t border-border/50 bg-muted/10">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-light tracking-tight font-be-vietnam-pro mb-3">
            Ready to unlock <span className="font-pixel text-2xl">unlimited</span> research?
          </h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            Join 100K+ users who research and get things done with Scira.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              className="rounded-full px-8 h-11"
              onClick={() => !hasProAccess() && (user ? handleCheckout(STARTER_SLUG!) : router.push(getSignUpUrl()))}
            >
              {isMaxUser ? "You're on Max" : hasProAccess() ? 'Upgrade to Max' : 'Get Pro now'}{' '}
              <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            By subscribing, you agree to our{' '}
            <Link href="/terms" className="text-foreground hover:underline underline-offset-2">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="text-foreground hover:underline underline-offset-2">
              Privacy Policy
            </Link>
            . Questions?{' '}
            <a href="mailto:zaid@scira.ai" className="text-foreground hover:underline underline-offset-2">
              zaid@scira.ai
            </a>
          </p>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="border-t border-border/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8">
            <div className="flex items-center gap-3">
              <SciraLogo className="size-4" />
              <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Scira</span>
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
              <Link
                href="/privacy-policy"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
