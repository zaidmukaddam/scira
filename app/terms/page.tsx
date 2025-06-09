"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import NextImage from 'next/image';
import { ExternalLink } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function TermsPage() {
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
              <Link href="/" className="inline-flex items-center gap-3 font-syne font-bold">
                <div className="relative w-14 h-14 rounded-full bg-white/90 dark:bg-black/90 shadow-sm flex items-center justify-center border border-neutral-200 dark:border-neutral-800">
                  <NextImage src="/scira.png" alt="Scira Logo" className="h-8 w-8 opacity-90 invert dark:invert-0" width={32} height={32} unoptimized quality={100}/>
                </div>
              </Link>
            </motion.div>
            
            <motion.div variants={item} className="text-center">
              <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-3">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-16 px-4">
        <div className="container max-w-3xl mx-auto prose dark:prose-invert prose-neutral prose-headings:font-syne prose-p:text-neutral-600 dark:prose-p:text-neutral-400 prose-a:text-neutral-900 dark:prose-a:text-neutral-200 prose-a:no-underline hover:prose-a:text-black dark:hover:prose-a:text-white prose-headings:tracking-tight">
          <p className="text-lg">
            Welcome to Scira AI. These Terms of Service govern your use of our website and services. By using Scira AI, you agree to these terms in full. If you disagree with any part of these terms, please do not use our service.
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Scira AI, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. We reserve the right to modify these terms at any time, and such modifications shall be effective immediately upon posting. Your continued use of Scira AI after any modifications indicates your acceptance of the modified terms.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Scira AI is a minimalistic AI-powered search engine that helps users find information on the internet. Our service utilizes artificial intelligence to process search queries and provide relevant results and information.
          </p>
          <p>
            Our service is hosted on Vercel and integrates with various AI technology providers, including OpenAI, Anthropic, xAI, and others, to deliver search results and content generation capabilities.
          </p>

          <h2>3. User Conduct</h2>
          <p>
            You agree not to use Scira AI to:
          </p>
          <ul>
            <li>Engage in any activity that violates applicable laws or regulations</li>
            <li>Infringe upon the rights of others, including intellectual property rights</li>
            <li>Distribute malware, viruses, or other harmful computer code</li>
            <li>Attempt to gain unauthorized access to our systems or networks</li>
            <li>Conduct automated queries or scrape our service</li>
            <li>Generate or distribute illegal, harmful, or offensive content</li>
            <li>Interfere with the proper functioning of the service</li>
          </ul>

          <h2>4. Content and Results</h2>
          <p>
            While we strive to provide accurate and reliable information, Scira AI:
          </p>
          <ul>
            <li>Does not guarantee the accuracy, completeness, or reliability of any results</li>
            <li>Is not responsible for content generated based on your search queries</li>
            <li>May provide links to third-party websites over which we have no control</li>
          </ul>
          <p>
            You should exercise judgment and critical thinking when evaluating search results and generated content. Scira AI should not be used as the sole source for making important decisions, especially in professional, medical, legal, or financial contexts.
          </p>

          <h2>5. Intellectual Property</h2>
          <p>
            All content, features, and functionality of Scira AI, including but not limited to text, graphics, logos, icons, images, audio clips, and software, are the property of Scira AI or its licensors and are protected by copyright, trademark, and other intellectual property laws.
          </p>
          <p>
            You may not copy, modify, distribute, sell, or lease any part of our service or included software without explicit permission.
          </p>

          <h2>6. Third-Party Services</h2>
          <p>
            Scira AI relies on third-party services to provide its functionality:
          </p>
          <ul>
            <li>Our service is hosted on Vercel&apos;s infrastructure</li>
            <li>We integrate with AI technology providers including OpenAI, Anthropic, xAI, and others</li>
            <li>These third-party services have their own terms of service and privacy policies</li>
            <li>We are not responsible for the practices or policies of these third-party services</li>
          </ul>
          <p>
            By using Scira AI, you acknowledge and agree that your data may be processed by these third-party services as described in our Privacy Policy.
          </p>

          <h2>7. Pricing and Billing</h2>
          <p>
            Scira AI offers both free and paid subscription plans. For detailed pricing information, visit our <Link href="/pricing" className="underline">Pricing page</Link>.
          </p>
          <ul>
            <li><strong>Free Plan:</strong> Includes limited searches per month with basic AI models</li>
            <li><strong>Scira Pro:</strong> $15/month subscription with unlimited searches and access to all AI models</li>
          </ul>
          <p>
            For paid subscriptions:
          </p>
          <ul>
            <li>Billing is processed monthly and charged automatically to your payment method</li>
            <li>All fees are non-refundable except as expressly stated in our refund policy</li>
            <li>We reserve the right to change subscription prices with 30 days advance notice</li>
            <li>You are responsible for all applicable taxes</li>
            <li>Failed payments may result in service suspension or termination</li>
          </ul>

          <h2>8. Cancellation and Refunds</h2>
          <p>
            You may cancel your subscription at any time through your account settings or by contacting us. Upon cancellation:
          </p>
          <ul>
            <li>Your subscription will remain active until the end of your current billing period</li>
            <li>You will retain access to paid features until the subscription expires</li>
            <li>Your account will automatically revert to the free plan</li>
            <li>No partial refunds will be provided for unused portions of your subscription</li>
          </ul>
          <p>
            <strong>No Refund Policy:</strong> All subscription fees are final and non-refundable. We do not provide refunds, credits, or prorated billing for partial subscription periods, regardless of usage or circumstances. Please consider this policy carefully before subscribing to our paid plans.
          </p>

          <h2>9. Privacy</h2>
          <p>
            Your use of Scira AI is also governed by our <Link href="/privacy-policy" className="underline">Privacy Policy</Link>, which is incorporated into these Terms of Service by reference.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Scira AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising out of or in connection with your use of or inability to use the service.
          </p>

          <h2>11. Disclaimers</h2>
          <p>
            Scira AI is provided &quot;as is&quot; and &quot;as available&quot; without any warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </p>

          <h2>12. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your access to Scira AI, with or without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for any other reason at our discretion.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Scira AI operates, without regard to its conflict of law provisions.
          </p>

          <h2>14. Contact Us</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p>
            <a href="mailto:zaid@scira.ai" className="flex items-center gap-1">
              zaid@scira.ai <ExternalLink className="h-4 w-4" />
            </a>
          </p>

          <div className="my-8 border-t border-neutral-200 dark:border-neutral-800 pt-8">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              By using Scira AI, you agree to these Terms of Service and our <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
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
                <NextImage src="/scira.png" alt="Scira Logo" className="h-4 w-4 opacity-80 invert dark:invert-0" width={16} height={16} unoptimized quality={100}/>
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
              <Link href="/terms" className="text-neutral-900 dark:text-neutral-100 font-medium">
                Terms
              </Link>
              <Link href="/privacy-policy" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 