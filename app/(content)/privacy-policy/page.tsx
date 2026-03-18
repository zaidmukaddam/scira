import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Shield, ArrowUpRight } from 'lucide-react';
import { SciraLogo } from '@/components/logos/scira-logo';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Scira AI Privacy Policy — how we collect, use, and protect your personal data.',
  alternates: {
    canonical: 'https://scira.ai/privacy-policy',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const sections = [
  { id: 'info-collect', label: 'Information Collected' },
  { id: 'how-use', label: 'How We Use It' },
  { id: 'sharing', label: 'Data Sharing' },
  { id: 'security', label: 'Data Security' },
  { id: 'rights', label: 'Your Rights' },
  { id: 'children', label: "Children's Privacy" },
  { id: 'retention', label: 'Data Retention' },
  { id: 'changes', label: 'Changes' },
  { id: 'contact', label: 'Contact' },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between h-14 px-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <SciraLogo className="size-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-lg font-light tracking-tighter font-be-vietnam-pro">scira</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service <ArrowUpRight className="w-3 h-3" />
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
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-16">
          <main>
            {/* Title */}
            <div className="mb-12">
              <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">Legal</span>
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro mb-4">
                Privacy Policy
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Last updated: July 24, 2025</span>
                <span className="w-px h-3 bg-border/50" />
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> 5 min read</span>
              </div>
            </div>

            {/* TLDR */}
            <div className="mb-12 p-5 rounded-2xl border border-primary/15 bg-primary/3">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary/60" />
                <span className="font-pixel text-[10px] uppercase tracking-[0.15em] text-primary/80">Quick Summary</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                We collect search queries, usage data, and account info to run the service. We never store payment card details &mdash; those go directly to our payment processors. We don&apos;t sell your data. You can request deletion of your data anytime by emailing us.
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-be-vietnam-pro prose-headings:font-light prose-headings:tracking-tight prose-h2:text-lg prose-h2:mt-14 prose-h2:mb-4 prose-h2:scroll-mt-20 prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-[15px] prose-li:text-muted-foreground prose-li:text-[15px] prose-a:text-foreground prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-strong:font-medium">
              <p className="text-base text-foreground/80 leading-relaxed">
                At Scira AI, we respect your privacy and are committed to protecting your personal data. This Privacy Policy
                explains how we collect, use, and safeguard your information when you use our AI-powered research and app integration platform.
              </p>

              <h2 id="info-collect"><span className="font-pixel text-xs text-muted-foreground/50 mr-2">01</span>Information We Collect</h2>
              <p>We may collect the following types of information:</p>
              <ul>
                <li><strong>Search Queries:</strong> The questions and searches you submit to our platform.</li>
                <li><strong>Usage Data:</strong> Information about how you interact with our service, including features used and time spent.</li>
                <li><strong>Device Information:</strong> Information about your device, browser type, IP address, and operating system.</li>
                <li><strong>Account Information:</strong> Email address and profile information when you create an account.</li>
                <li><strong>Subscription Data:</strong> Information about your subscription status and payment history (but not payment details).</li>
                <li><strong>Cookies and Similar Technologies:</strong> We use cookies and similar tracking technologies to enhance your experience.</li>
              </ul>
              <p>
                <strong>Important Note on Payment Data:</strong> Scira AI does not collect, store, or process any payment
                card details, bank information, UPI details, or other sensitive payment data. All payment information is
                handled directly by our payment processors (Polar and DodoPayments).
              </p>

              <h2 id="how-use"><span className="font-pixel text-xs text-muted-foreground/50 mr-2">02</span>How We Use Your Information</h2>
              <p>We use your information for the following purposes:</p>
              <ul>
                <li>To provide and improve our search service</li>
                <li>To understand how users interact with our platform</li>
                <li>To personalize and enhance your experience</li>
                <li>To monitor and analyze usage patterns and trends</li>
                <li>To detect, prevent, and address technical issues</li>
              </ul>

              <h2 id="sharing"><span className="font-pixel text-xs text-muted-foreground/50 mr-2">03</span>Data Sharing and Disclosure</h2>
              <p>We may share your information in the following circumstances:</p>
              <ul>
                <li><strong>Service Providers:</strong> With third-party service providers who help us operate and improve our service, including:
                  <ul>
                    <li><strong>Vercel:</strong> Our hosting and infrastructure provider</li>
                    <li><strong>AI Processing Partners:</strong> OpenAI, Anthropic, xAI, and others for processing search queries</li>
                    <li><strong>Payment Processors:</strong> Polar and DodoPayments for billing and subscription management</li>
                  </ul>
                </li>
                <li><strong>Compliance with Laws:</strong> When required by applicable law, regulation, or legal process.</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
              </ul>

              <h2 id="security"><span className="font-pixel text-xs text-muted-foreground/50 mr-2">04</span>Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information.
                However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot
                guarantee absolute security.
              </p>

              <h2 id="rights"><span className="font-pixel text-xs text-muted-foreground/50 mr-2">05</span>Your Rights</h2>
              <p>Depending on your location, you may have the right to:</p>
              <ul>
                <li>Access the personal information we hold about you</li>
                <li>Request correction or deletion of your personal information</li>
                <li>Object to or restrict certain processing activities</li>
                <li>Data portability</li>
                <li>Withdraw consent where applicable</li>
              </ul>

              <h2 id="children"><span className="font-pixel text-xs text-muted-foreground/50 mr-2">06</span>Children&apos;s Privacy</h2>
              <p>
                Our service is not directed to children under the age of 13. We do not knowingly collect personal
                information from children under 13. If you are a parent or guardian and believe your child has provided us
                with personal information, please contact us.
              </p>

              <h2 id="retention"><span className="font-pixel text-xs text-muted-foreground/50 mr-2">07</span>Data Retention &amp; Deletion</h2>
              <p>
                We retain your personal information for as long as necessary to provide our services and fulfil the
                purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by
                law. When the applicable retention period expires, we will securely delete or anonymize your data.
              </p>
              <p>
                You may request deletion of your personal data at any time by emailing{' '}
                <a href="mailto:zaid@scira.ai">zaid@scira.ai</a>. We will action deletion requests within 30 days,
                except where we are required to retain data for legal or compliance reasons.
              </p>

              <h2 id="changes"><span className="font-pixel text-xs text-muted-foreground/50 mr-2">08</span>Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
                Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              </p>

              <h2 id="contact"><span className="font-pixel text-xs text-muted-foreground/50 mr-2">09</span>Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us at:</p>
              <p><a href="mailto:zaid@scira.ai">zaid@scira.ai</a></p>
            </div>

            {/* Agreement Note */}
            <div className="mt-16 pt-8 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                By using Scira AI, you agree to our Privacy Policy and our{' '}
                <Link href="/terms" className="text-foreground hover:underline underline-offset-2">Terms of Service</Link>.
              </p>
              <Link href="/terms" className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/70 transition-colors group shrink-0">
                Read Terms <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </main>

          {/* Sidebar - Table of Contents */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <p className="font-pixel text-[9px] uppercase tracking-[0.15em] text-muted-foreground mb-4">On this page</p>
              <nav className="space-y-1">
                {sections.map((s, i) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 group"
                  >
                    <span className="font-pixel text-[9px] text-muted-foreground/40 group-hover:text-primary/60 transition-colors w-4 text-right">{String(i + 1).padStart(2, '0')}</span>
                    {s.label}
                  </a>
                ))}
              </nav>

              <div className="mt-8 pt-6 border-t border-border/30">
                <p className="text-[11px] text-muted-foreground mb-2">Related</p>
                <Link href="/terms" className="flex items-center gap-1.5 text-xs text-foreground hover:text-foreground/70 transition-colors">
                  Terms of Service <ArrowUpRight className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8">
            <div className="flex items-center gap-3">
              <SciraLogo className="size-4" />
              <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Scira</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">About</Link>
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
              <Link href="/privacy-policy" className="text-xs text-foreground font-medium">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
