import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SciraLogo } from '@/components/logos/scira-logo';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between h-14 px-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <SciraLogo className="size-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-lg font-light tracking-tighter font-be-vietnam-pro">scira</span>
            </Link>
            <Link
              href="/about"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="mb-12">
          <p className="text-xs text-muted-foreground tracking-wide mb-3">Legal</p>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro mb-4">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: July 24, 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-be-vietnam-pro prose-headings:font-light prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-12 prose-h2:mb-4 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-a:text-foreground prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-strong:font-medium">
          <p className="text-base text-foreground/80 leading-relaxed">
            Welcome to Scira AI. These Terms of Service govern your use of our website and services. By using Scira AI,
            you agree to these terms in full. If you disagree with any part of these terms, please do not use our
            service.
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Scira AI, you acknowledge that you have read, understood, and agree to be bound by
            these Terms of Service. We reserve the right to modify these terms at any time, and such modifications shall
            be effective immediately upon posting. Your continued use of Scira AI after any modifications indicates your
            acceptance of the modified terms.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Scira AI is a minimalistic AI-powered search engine that helps users find information on the internet. Our
            service utilizes artificial intelligence to process search queries and provide relevant results and
            information.
          </p>
          <p>
            Our service is hosted on Vercel and integrates with various AI technology providers, including OpenAI,
            Anthropic, xAI, and others, to deliver search results and content generation capabilities.
          </p>

          <h2>3. User Conduct</h2>
          <p>You agree not to use Scira AI to:</p>
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
          <p>While we strive to provide accurate and reliable information, Scira AI:</p>
          <ul>
            <li>Does not guarantee the accuracy, completeness, or reliability of any results</li>
            <li>Is not responsible for content generated based on your search queries</li>
            <li>May provide links to third-party websites over which we have no control</li>
          </ul>
          <p>
            You should exercise judgment and critical thinking when evaluating search results and generated content.
            Scira AI should not be used as the sole source for making important decisions, especially in professional,
            medical, legal, or financial contexts.
          </p>

          <h2>5. Intellectual Property</h2>
          <p>
            All content, features, and functionality of Scira AI, including but not limited to text, graphics, logos,
            icons, images, audio clips, and software, are the property of Scira AI or its licensors and are protected by
            copyright, trademark, and other intellectual property laws.
          </p>
          <p>
            You may not copy, modify, distribute, sell, or lease any part of our service or included software without
            explicit permission.
          </p>

          <h2>6. Third-Party Services</h2>
          <p>Scira AI relies on third-party services to provide its functionality:</p>
          <ul>
            <li>Our service is hosted on Vercel&apos;s infrastructure</li>
            <li>We integrate with AI technology providers including OpenAI, Anthropic, xAI, and others</li>
            <li>We use payment processors including Polar and DodoPayments for billing and subscription management</li>
            <li>These third-party services have their own terms of service and privacy policies</li>
            <li>We are not responsible for the practices or policies of these third-party services</li>
          </ul>
          <p>
            By using Scira AI, you acknowledge and agree that your data may be processed by these third-party services
            as described in our Privacy Policy. This includes payment data being processed by our payment providers
            according to their respective privacy policies and security standards.
          </p>

          <h2>7. Pricing and Billing</h2>
          <p>
            Scira AI offers both free and paid subscription plans. For detailed pricing information, visit our{' '}
            <Link href="/pricing">Pricing page</Link>.
          </p>
          <ul>
            <li>
              <strong>Free Plan:</strong> Includes limited daily searches with access to basic AI models
            </li>
            <li>
              <strong>Scira Pro:</strong> $15/month subscription with unlimited searches and access to all AI models
            </li>
          </ul>
          <p>
            <strong>Payment Processing:</strong> We use third-party payment processors to handle billing and payments:
          </p>
          <ul>
            <li>
              <strong>Polar:</strong> For recurring monthly subscriptions (international users)
            </li>
            <li>
              <strong>DodoPayments:</strong> For one-time payments (primarily for Indian users)
            </li>
          </ul>
          <p>
            <strong>Important:</strong> Scira AI does not store any payment card details, bank information, or other
            sensitive payment data. All payment information is processed directly by our payment providers according to
            their respective privacy policies and security standards.
          </p>
          <p>For paid subscriptions:</p>
          <ul>
            <li>Billing is processed monthly and charged automatically to your payment method</li>
            <li>All fees are non-refundable except as expressly stated in our refund policy</li>
            <li>We reserve the right to change subscription prices with 30 days advance notice</li>
            <li>You are responsible for all applicable taxes</li>
            <li>Failed payments may result in service suspension or termination</li>
          </ul>

          <h2>8. Cancellation and Refunds</h2>
          <p>
            You may cancel your subscription at any time through your account settings or by contacting us. Upon
            cancellation:
          </p>
          <ul>
            <li>Your subscription will remain active until the end of your current billing period</li>
            <li>You will retain access to paid features until the subscription expires</li>
            <li>Your account will automatically revert to the free plan</li>
            <li>No partial refunds will be provided for unused portions of your subscription</li>
          </ul>
          <p>
            <strong>No Refund Policy:</strong> All subscription fees are final and non-refundable. We do not provide
            refunds, credits, or prorated billing for partial subscription periods, regardless of usage or
            circumstances. Please consider this policy carefully before subscribing to our paid plans.
          </p>

          <h2>9. Privacy</h2>
          <p>
            Your use of Scira AI is also governed by our{' '}
            <Link href="/privacy-policy">Privacy Policy</Link>, which is incorporated into these Terms of Service by reference.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Scira AI shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including loss of profits, data, or goodwill, arising out of or in
            connection with your use of or inability to use the service.
          </p>

          <h2>11. Disclaimers</h2>
          <p>
            Scira AI is provided &quot;as is&quot; and &quot;as available&quot; without any warranties of any kind,
            either express or implied, including but not limited to warranties of merchantability, fitness for a
            particular purpose, or non-infringement.
          </p>

          <h2>12. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your access to Scira AI, with or without notice, for conduct
            that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for
            any other reason at our discretion.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which
            Scira AI operates, without regard to its conflict of law provisions.
          </p>

          <h2>14. Contact Us</h2>
          <p>If you have any questions about these Terms of Service, please contact us at:</p>
          <p>
            <a href="mailto:zaid@scira.ai">zaid@scira.ai</a>
          </p>
        </div>

        {/* Agreement Note */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            By using Scira AI, you agree to these Terms of Service and our{' '}
            <Link href="/privacy-policy" className="text-foreground hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <SciraLogo className="size-4" />
              <span className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} Scira
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="/terms" className="text-xs text-foreground font-medium">
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
