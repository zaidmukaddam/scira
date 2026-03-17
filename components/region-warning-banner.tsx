'use client';

import { useState, useEffect } from 'react';
import { useLocation } from '@/hooks/use-location';
import { useIsProUser } from '@/hooks/use-user-data';
import { isUserAllowedInRegion, isProOnlyAllowedCountry } from '@/lib/allowed-regions';
import { AlertCircle, Globe, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Displays a non-blocking banner for users whose region has limited or no access.
 * - Orange banner: user is outside all allowed regions (free or pro)
 * - Purple banner: user is in a Pro-only region and can upgrade to gain access
 * - Hidden: user is in an allowed region for their plan
 */
export function RegionWarningBanner() {
  const [mounted, setMounted] = useState(false);
  const location = useLocation();
  const { isProUser, isLoading: isProLoading } = useIsProUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch — render nothing on the server
  if (!mounted) return null;

  // Wait until both location and Pro status are resolved
  if (location.loading || isProLoading) return null;

  // No location data — fail open to avoid false positives
  if (!location.countryCode || location.country === 'Unknown') return null;

  if (isUserAllowedInRegion(location.countryCode, isProUser)) return null;

  if (isProOnlyAllowedCountry(location.countryCode)) {
    return (
      <div className="w-full bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-b border-purple-200 dark:border-purple-900 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <p className="text-sm text-purple-800 dark:text-purple-200 flex-1">
            SCX.ai Pro is available in your region ({location.country}).{' '}
            <Link
              href="/pricing"
              className="font-semibold underline hover:text-purple-900 dark:hover:text-purple-100 transition-colors"
            >
              Upgrade to Pro
            </Link>{' '}
            to access all features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-orange-50 dark:bg-orange-950/20 border-b border-orange-200 dark:border-orange-900 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
        <p className="text-sm text-orange-800 dark:text-orange-200 flex-1">
          This site is only available to users in Australia and New Zealand.{' '}
          <Link
            href="https://scx.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline hover:text-orange-900 dark:hover:text-orange-100 transition-colors"
          >
            Visit SCX.ai to learn more
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Pages that must remain accessible regardless of region,
 * so users can sign in, upgrade, or read legal pages.
 */
const BYPASS_PATHS = [
  '/pricing',
  '/sign-in',
  '/sign-up',
  '/checkout',
  '/terms',
  '/privacy-policy',
  '/about',
  '/search/', // shared chat links — individual page-level ownership checks protect private content
];

/**
 * Full-screen overlay that blocks access for users outside all allowed regions.
 * Supports a ?testRegion=XX&testPro=true URL parameter for QA testing in development.
 */
export function RegionBlockingOverlay() {
  const [mounted, setMounted] = useState(false);
  const [testRegion, setTestRegion] = useState<string | null>(null);
  const [testPro, setTestPro] = useState(false);

  const location = useLocation();
  const { isProUser, isLoading: isProLoading } = useIsProUser();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    setTestRegion(params.get('testRegion'));
    setTestPro(params.get('testPro') === 'true');
  }, []);

  if (!mounted) return null;

  // Always allow access to auth / legal / upgrade pages
  if (BYPASS_PATHS.some((p) => pathname?.startsWith(p))) return null;

  // --- Development test mode ---
  if (testRegion) {
    const effectiveProStatus = testPro || isProUser;
    if (isUserAllowedInRegion(testRegion, effectiveProStatus)) return null;

    const canUpgrade = isProOnlyAllowedCountry(testRegion);

    return (
      <div className="fixed inset-0 z-[9999] bg-background/98 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden relative">
          <div className="absolute top-4 right-4 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
            TEST MODE: {testRegion} {testPro ? '(Pro)' : '(Free)'}
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 px-8 py-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 dark:bg-orange-950/50 rounded-full mb-6">
              <Globe className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Region Restricted</h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Test location: {testRegion}</span>
            </div>
          </div>
          <div className="px-8 py-8 text-center space-y-6">
            {canUpgrade ? (
              <>
                <p className="text-foreground leading-relaxed">
                  SCX.ai Pro is available in your region. Upgrade to access all features.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center w-full h-11 px-6 font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Link>
              </>
            ) : (
              <p className="text-foreground leading-relaxed">
                SCX.ai Chat is exclusively available to users in <span className="font-semibold">Australia</span> and{' '}
                <span className="font-semibold">New Zealand</span>.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Remove <code className="bg-muted px-1 py-0.5 rounded">?testRegion={testRegion}</code> from URL to exit
              test mode
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Don't block while location / Pro status is still loading
  if (location.loading || isProLoading) return null;

  // No location data — fail open
  if (!location.countryCode || location.country === 'Unknown') return null;

  if (isUserAllowedInRegion(location.countryCode, isProUser)) return null;

  const canUpgrade = isProOnlyAllowedCountry(location.countryCode);

  return (
    <div className="fixed inset-0 z-[9999] bg-background/98 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className={`px-8 py-10 text-center ${canUpgrade
              ? 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10 dark:from-purple-500/20 dark:to-indigo-500/20'
              : 'bg-gradient-to-br from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20'
            }`}
        >
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${canUpgrade ? 'bg-purple-100 dark:bg-purple-950/50' : 'bg-orange-100 dark:bg-orange-950/50'
              }`}
          >
            {canUpgrade ? (
              <Sparkles className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            ) : (
              <Globe className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            )}
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            {canUpgrade ? 'Pro Subscription Required' : 'Region Restricted'}
          </h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Detected location: {location.country}</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-8 text-center space-y-6">
          {canUpgrade ? (
            <>
              <p className="text-foreground leading-relaxed">
                SCX.ai is available in <span className="font-semibold">{location.country}</span> for Pro subscribers.
                Upgrade your account to access our AI-powered search and chat features.
              </p>
              <p className="text-sm text-muted-foreground">
                Pro users get unlimited access, priority support, and access from USA, Canada, UK, EU, and Singapore.
              </p>
              <div className="pt-4 space-y-3">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center w-full h-11 px-6 font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  View Pro Plans
                </Link>
                <p className="text-xs text-muted-foreground">
                  Already have Pro?{' '}
                  <Link href="/sign-in" className="text-purple-600 dark:text-purple-400 hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-foreground leading-relaxed">
                SCX.ai Chat is a sovereign AI platform exclusively available to users in{' '}
                <span className="font-semibold">Australia</span> and{' '}
                <span className="font-semibold">New Zealand</span>.
              </p>
              <p className="text-sm text-muted-foreground">
                This restriction ensures compliance with Australian data sovereignty requirements and helps us deliver
                the best possible service to our local users.
              </p>
              <div className="pt-4 space-y-3">
                <Link
                  href="https://scx.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full h-11 px-6 font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                >
                  Learn more about SCX.ai
                </Link>
                <p className="text-xs text-muted-foreground">
                  If you believe this is an error, please{' '}
                  <Link href="mailto:support@scx.ai" className="text-orange-600 dark:text-orange-400 hover:underline">
                    contact support
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
