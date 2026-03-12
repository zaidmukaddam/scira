import { Globe, MapPin, Mail } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Service Not Available in Your Region',
};

export default function NotAvailablePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="mb-8">
          <Globe className="w-24 h-24 mx-auto text-gray-400 dark:text-gray-600 animate-pulse" />
        </div>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Service Not Available in Your Region
        </h1>

        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          SCX.ai Chat is a sovereign Australian AI platform available to users in select regions.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
            Supported Regions
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Free Access
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'Australia', note: 'All territories' },
                  { name: 'New Zealand', note: 'All territories' },
                ].map(({ name, note }) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800"
                  >
                    <MapPin className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Pro Access
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Pro subscribers can access SCX.ai from additional regions:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['USA', 'Canada', 'United Kingdom', 'Singapore', 'EU countries'].map((region) => (
                  <span
                    key={region}
                    className="px-3 py-1 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200 text-sm rounded-full"
                  >
                    {region}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              View Pro Plans
            </Link>
            <Link
              href={`mailto:support@scx.ai?subject=${encodeURIComponent('Region Access Request')}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-colors"
            >
              <Mail className="w-5 h-5" />
              Contact Support
            </Link>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            These restrictions ensure compliance with Australian data sovereignty requirements.
          </p>
        </div>
      </div>
    </div>
  );
}
