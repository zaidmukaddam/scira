'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import NextImage from 'next/image';
import { ExternalLink } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-50/30 to-transparent dark:from-neutral-950/30 dark:to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />

        <div className="relative pt-24 pb-12 px-4">
          <motion.div
            className="container max-w-3xl mx-auto space-y-8"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {/* Logo */}
            <motion.div variants={item} className="text-center">
              <Link href="/" className="inline-flex items-center gap-3 font-be-vietnam-pro font-bold">
                <div className="relative w-14 h-14 rounded-full bg-white/90 dark:bg-black/90 shadow-sm flex items-center justify-center border border-neutral-200 dark:border-neutral-800">
                  <NextImage
                    src="/scira.png"
                    alt="Scira Logo"
                    className="h-8 w-8 opacity-90 invert dark:invert-0"
                    width={32}
                    height={32}
                    unoptimized
                    quality={100}
                  />
                </div>
              </Link>
            </motion.div>

            <motion.div variants={item} className="text-center">
              <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-3">
                Last updated:{' '}
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-16 px-4">
        <div className="container max-w-3xl mx-auto prose dark:prose-invert prose-neutral prose-headings:font-be-vietnam-pro prose-p:text-neutral-600 dark:prose-p:text-neutral-400 prose-a:text-neutral-900 dark:prose-a:text-neutral-200 prose-a:no-underline hover:prose-a:text-black dark:hover:prose-a:text-white prose-headings:tracking-tight">
          <p className="text-lg">
            At Scira AI, we respect your privacy and are committed to protecting your personal data. This Privacy Policy
            explains how we collect, use, and safeguard your information when you use our AI-powered search engine.
          </p>

          <h2>Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul>
            <li>
              <strong>Search Queries:</strong> The questions and searches you submit to our search engine.
            </li>
            <li>
              <strong>Usage Data:</strong> Information about how you interact with our service, including features used
              and time spent on the platform.
            </li>
            <li>
              <strong>Device Information:</strong> Information about your device, browser type, IP address, and
              operating system.
            </li>
            <li>
              <strong>Cookies and Similar Technologies:</strong> We use cookies and similar tracking technologies to
              enhance your experience and collect usage information.
            </li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>We use your information for the following purposes:</p>
          <ul>
            <li>To provide and improve our search service</li>
            <li>To understand how users interact with our platform</li>
            <li>To personalize and enhance your experience</li>
            <li>To monitor and analyze usage patterns and trends</li>
            <li>To detect, prevent, and address technical issues</li>
          </ul>

          <h2>Data Sharing and Disclosure</h2>
          <p>We may share your information in the following circumstances:</p>
          <ul>
            <li>
              <strong>Service Providers:</strong> With third-party service providers who help us operate, improve, and
              analyze our service. Specifically, we use services from:
            </li>
            <ul>
              <li>
                <strong>Vercel:</strong> Our hosting and infrastructure provider
              </li>
              <li>
                <strong>AI Processing Partners:</strong> We utilize services from companies including OpenAI, Anthropic,
                xAI, and others to process search queries and provide results
              </li>
            </ul>
            <li>
              <strong>Compliance with Laws:</strong> When required by applicable law, regulation, legal process, or
              governmental request.
            </li>
            <li>
              <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.
            </li>
          </ul>

          <h2>Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information.
            However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot
            guarantee absolute security.
          </p>

          <h2>Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Request correction or deletion of your personal information</li>
            <li>Object to or restrict certain processing activities</li>
            <li>Data portability</li>
            <li>Withdraw consent where applicable</li>
          </ul>

          <h2>Children&apos;s Privacy</h2>
          <p>
            Our service is not directed to children under the age of 13. We do not knowingly collect personal
            information from children under 13. If you are a parent or guardian and believe your child has provided us
            with personal information, please contact us.
          </p>

          <h2>Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
            Privacy Policy on this page and updating the &quot;Last updated&quot; date.
          </p>

          <h2>Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at:</p>
          <p>
            <a href="mailto:zaid@scira.ai" className="flex items-center gap-1">
              zaid@scira.ai <ExternalLink className="h-4 w-4" />
            </a>
          </p>

          <div className="my-8 border-t border-neutral-200 dark:border-neutral-800 pt-8">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              By using Scira AI, you agree to our Privacy Policy and our{' '}
              <Link href="/terms" className="underline">
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-10 mt-10">
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />
        <div className="container max-w-3xl mx-auto px-4 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                <NextImage
                  src="/scira.png"
                  alt="Scira Logo"
                  className="h-4 w-4 opacity-80 invert dark:invert-0"
                  width={16}
                  height={16}
                  unoptimized
                  quality={100}
                />
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                © {new Date().getFullYear()} Scira AI by Zaid Mukaddam
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-neutral-500 dark:text-neutral-400">
              <Link href="/" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                Home
              </Link>
              <Link href="/about" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                About
              </Link>
              <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                Terms
              </Link>
              <Link href="/privacy-policy" className="text-neutral-900 dark:text-neutral-100 font-medium">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
