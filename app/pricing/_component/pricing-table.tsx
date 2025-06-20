"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SEARCH_LIMITS, PRICING } from "@/lib/constants";
import { DiscountBanner } from "@/components/ui/discount-banner";
import { getDiscountConfigAction } from "@/app/actions";
import { DiscountConfig } from "@/lib/discount";
import { SlidingNumber } from "@/components/core/sliding-number";

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
  errorType?: "CANCELED" | "EXPIRED" | "GENERAL";
};

interface PricingTableProps {
  subscriptionDetails: SubscriptionDetailsResult;
}

export default function PricingTable({
  subscriptionDetails,
}: PricingTableProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [discountConfig, setDiscountConfig] = useState<DiscountConfig>({ enabled: false });
  const [countdownTime, setCountdownTime] = useState<{ days: number, hours: number, minutes: number, seconds: number }>({ days: 0, hours: 23, minutes: 59, seconds: 59 });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession();
        setIsAuthenticated(!!session.data?.user);
      } catch {
        setIsAuthenticated(false);
      }
    };
    
    const fetchDiscountConfig = async () => {
      try {
        const config = await getDiscountConfigAction();
        // Add original price if not already present (let edge config handle discount details)
        if (config.enabled && !config.originalPrice) {
          config.originalPrice = PRICING.PRO_MONTHLY;
        }
        setDiscountConfig(config);

        // Set initial countdown
        if (config.expiresAt) {
          updateCountdown(config.expiresAt);
        } else {
          // Default 24-hour countdown if no expiration set
          const endTime = new Date();
          endTime.setHours(endTime.getHours() + 24);
          updateCountdown(endTime);
        }
      } catch (error) {
        console.error('Failed to fetch discount config:', error);
      }
    };

    const updateCountdown = (endTime: Date) => {
      const calculateTimeLeft = () => {
        const now = new Date().getTime();
        const difference = new Date(endTime).getTime() - now;
        
        if (difference > 0) {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);
          
          setCountdownTime({ days, hours, minutes, seconds });
        }
      };
      
      calculateTimeLeft();
      const countdownInterval = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(countdownInterval);
    };
    
    checkAuth();
    fetchDiscountConfig();
  }, []);

  const handleCheckout = async (productId: string, slug: string) => {
    if (isAuthenticated === false) {
      router.push("/sign-in");
      return;
    }

    try {
      const checkoutOptions: any = {
        products: [productId],
        slug: slug,
      };
      
      await authClient.checkout(checkoutOptions);
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleManageSubscription = async () => {
    try {
      await authClient.customer.portal();
    } catch (error) {
      console.error("Failed to open customer portal:", error);
      toast.error("Failed to open subscription management");
    }
  };

  const STARTER_TIER = process.env.NEXT_PUBLIC_STARTER_TIER;
  const STARTER_SLUG = process.env.NEXT_PUBLIC_STARTER_SLUG;

  if (!STARTER_TIER || !STARTER_SLUG) {
    throw new Error("Missing required environment variables for Starter tier");
  }

  const isCurrentPlan = (tierProductId: string) => {
    return (
      subscriptionDetails.hasSubscription &&
      subscriptionDetails.subscription?.productId === tierProductId &&
      subscriptionDetails.subscription?.status === "active"
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDiscountClaim = (code: string) => {
    // Copy discount code to clipboard
    navigator.clipboard.writeText(code);
    toast.success(`Discount code "${code}" copied to clipboard!`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Back to Home Link */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link 
          href="/"
          className="inline-flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Home
        </Link>
      </div>

      {/* Header */}
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        <div className="text-center">
          <h1 className="text-[2.5rem] font-black font-syne text-zinc-900 dark:text-zinc-100 mb-6 tracking-[-0.02em] leading-tight">
            Pricing
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg font-medium font-syne leading-relaxed">
            Choose the plan that works best for you
          </p>
        </div>
      </div>

      {/* Discount Banner with Countdown */}
      {discountConfig.enabled && (
        <div className="max-w-4xl mx-auto px-6 mb-8">
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden animate-in slide-in-from-top-2 duration-500">
            <div className="px-6 py-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-base font-medium">Special Limited-Time Offer</h3>
                    {discountConfig.percentage && (
                      <Badge className="bg-black dark:bg-white text-white dark:text-black px-2.5 py-1 text-xs font-medium">
                        {discountConfig.percentage}% OFF
                      </Badge>
                    )}
                  </div>

                  {/* Pricing Information */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-zinc-500 dark:text-zinc-400 line-through">
                      ${discountConfig.originalPrice}/month
                    </span>
                    <span className="text-lg font-semibold">
                      ${discountConfig.finalPrice ? discountConfig.finalPrice.toFixed(2) : (discountConfig.originalPrice || 0) - ((discountConfig.originalPrice || 0) * (discountConfig.percentage || 0) / 100)}/month
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
                        First month
                      </span>
                    </span>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="flex flex-col items-center">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Offer ends in:</p>
                  <div className="flex items-center gap-1.5">
                    {countdownTime.days > 0 && (
                      <>
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md min-w-[42px] text-center">
                          <SlidingNumber value={countdownTime.days} padStart={true} />
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">days</span>
                        </div>
                        <span className="text-lg font-medium">:</span>
                      </>
                    )}
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md min-w-[42px] text-center">
                      <SlidingNumber value={countdownTime.hours} padStart={true} />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">hrs</span>
                    </div>
                    <span className="text-lg font-medium">:</span>
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md min-w-[42px] text-center">
                      <SlidingNumber value={countdownTime.minutes} padStart={true} />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">min</span>
                    </div>
                    <span className="text-lg font-medium">:</span>
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md min-w-[42px] text-center">
                      <SlidingNumber value={countdownTime.seconds} padStart={true} />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">sec</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Claim Button */}
              {discountConfig.code && (
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <Button
                    variant="outline"
                    onClick={() => handleDiscountClaim(discountConfig.code || '')}
                    className="w-full sm:w-auto"
                  >
                    {discountConfig.code ? `Claim discount: ${discountConfig.code}` : 'Claim discount'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <DiscountBanner 
        discountConfig={discountConfig}
        onClaim={handleDiscountClaim}
        className="max-w-4xl mx-auto px-6 mb-8 hidden"
      />

      {/* Pricing Cards */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid lg:grid-cols-2 gap-8">

          {/* Free Plan */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-10 relative hover:border-zinc-300/80 dark:hover:border-zinc-700/80 transition-colors duration-200">
            <div className="mb-10">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-3 tracking-[-0.01em]">Free</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8 leading-relaxed">Get started with essential features</p>
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-light text-zinc-900 dark:text-zinc-100 tracking-tight">$0</span>
                <span className="text-zinc-400 dark:text-zinc-500 ml-2 text-sm">/month</span>
              </div>
            </div>

            <div className="mb-10">
              <ul className="space-y-4">
                <li className="flex items-center text-[15px]">
                  <div className="w-1 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mr-4 flex-shrink-0"></div>
                  <span className="text-zinc-700 dark:text-zinc-300">{SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches per day (other models)</span>
                </li>
                <li className="flex items-center text-[15px]">
                  <div className="w-1 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mr-4 flex-shrink-0"></div>
                  <span className="text-zinc-700 dark:text-zinc-300">Unlimited Grok 3 Mini & Grok 2 Vision</span>
                </li>
                <li className="flex items-center text-[15px]">
                  <div className="w-1 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mr-4 flex-shrink-0"></div>
                  <span className="text-zinc-700 dark:text-zinc-300">{SEARCH_LIMITS.EXTREME_SEARCH_LIMIT} extreme searches per month</span>
                </li>
                <li className="flex items-center text-[15px]">
                  <div className="w-1 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mr-4 flex-shrink-0"></div>
                  <span className="text-zinc-700 dark:text-zinc-300">Search history</span>
                </li>
              </ul>
            </div>

            {!subscriptionDetails.hasSubscription || subscriptionDetails.subscription?.status !== "active" ? (
              <Button
                variant="outline"
                className="w-full h-9 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-normal text-sm tracking-[-0.01em]"
                disabled
              >
                Current plan
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full h-9 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-normal text-sm tracking-[-0.01em]"
                disabled
              >
                Free plan
              </Button>
            )}
          </div>

          {/* Pro Plan */}
          <div className="relative">
            {isCurrentPlan(STARTER_TIER) && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="bg-black dark:bg-white text-white dark:text-black px-4 py-1.5 text-xs font-normal tracking-wide">
                  CURRENT PLAN
                </Badge>
              </div>
            )}

            <div className="bg-white dark:bg-zinc-900 border-[1.5px] border-black dark:border-white rounded-xl p-10 relative shadow-sm">
              <div className="mb-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 tracking-[-0.01em]">Scira Pro</h3>
                  <Badge variant="secondary" className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-normal px-2.5 py-1">
                    Popular
                  </Badge>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-8 leading-relaxed">Everything you need for unlimited usage</p>
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-light text-zinc-900 dark:text-zinc-100 tracking-tight">$15</span>
                  <span className="text-zinc-500 dark:text-zinc-400 ml-2 text-sm">/month</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 tracking-wide">CANCEL ANYTIME</p>
              </div>

              <div className="mb-10">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-6 tracking-[-0.01em]">Everything in Free, plus:</p>
                <ul className="space-y-4">
                  <li className="flex items-center text-[15px]">
                    <div className="w-1 h-1 bg-black dark:bg-white rounded-full mr-4 flex-shrink-0"></div>
                    <span className="text-zinc-700 dark:text-zinc-300">Unlimited searches</span>
                  </li>
                  <li className="flex items-center text-[15px]">
                    <div className="w-1 h-1 bg-black dark:bg-white rounded-full mr-4 flex-shrink-0"></div>
                    <span className="text-zinc-700 dark:text-zinc-300">All AI models</span>
                  </li>
                  <li className="flex items-center text-[15px]">
                    <div className="w-1 h-1 bg-black dark:bg-white rounded-full mr-4 flex-shrink-0"></div>
                    <span className="text-zinc-700 dark:text-zinc-300">PDF document analysis</span>
                  </li>
                  <li className="flex items-center text-[15px]">
                    <div className="w-1 h-1 bg-black dark:bg-white rounded-full mr-4 flex-shrink-0"></div>
                    <span className="text-zinc-700 dark:text-zinc-300">Priority support</span>
                  </li>
                  <li className="flex items-center text-[15px]">
                    <div className="w-1 h-1 bg-black dark:bg-white rounded-full mr-4 flex-shrink-0"></div>
                    <span className="text-zinc-700 dark:text-zinc-300">Early access to features</span>
                  </li>
                </ul>
              </div>

              {isCurrentPlan(STARTER_TIER) ? (
                <div className="space-y-4">
                  <Button
                    className="w-full h-9 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-normal text-sm tracking-[-0.01em] transition-colors duration-200"
                    onClick={handleManageSubscription}
                  >
                    Manage subscription
                  </Button>
                  {subscriptionDetails.subscription && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center leading-relaxed">
                      {subscriptionDetails.subscription.cancelAtPeriodEnd
                        ? `Expires ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`
                        : `Renews ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`}
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full h-9 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black group font-normal text-sm tracking-[-0.01em] transition-all duration-200"
                  onClick={() => handleCheckout(STARTER_TIER, STARTER_SLUG)}
                >
                  {isAuthenticated === false ? "Sign in to upgrade" : "Upgrade to Scira Pro"}
                  <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Terms Notice */}
        <div className="text-center mt-16 mb-8">
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-6 py-4 inline-block">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              By subscribing, you agree to our{" "}
              <Link href="/terms" className="text-black dark:text-white font-medium hover:underline underline-offset-4 transition-colors duration-200">
                Terms of Service
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
            Have questions?{" "}
            <a href="mailto:zaid@scira.ai" className="text-black dark:text-white hover:underline underline-offset-4 decoration-zinc-400 dark:decoration-zinc-600 transition-colors duration-200">
              Get in touch
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}