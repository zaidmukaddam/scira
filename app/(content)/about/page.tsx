import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  FlaskConical,
  Globe,
  BookOpen,
  Cpu,
  ShieldCheck,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { SouthernCrossLogo } from '@/components/logos/southerncross-logo';

const features = [
  {
    icon: Search,
    title: 'Multi-modal AI search',
    description: 'Intelligent web, academic, and domain-specific search with automatic tool selection based on query context.',
  },
  {
    icon: FlaskConical,
    title: 'Deep research',
    description: 'Citations, cross-referencing, and in-depth analysis with peer-reviewed academic sources.',
  },
  {
    icon: Globe,
    title: 'Real-time retrieval',
    description: 'Live information synthesis from the web, social platforms, and real-time data feeds.',
  },
  {
    icon: Cpu,
    title: 'Domain-specific tools',
    description: 'Finance, crypto, weather, maps, and more — specialist tools invoked automatically.',
  },
  {
    icon: BookOpen,
    title: 'Scholarly assistance',
    description: 'Academic paper discovery and research guidance across all disciplines.',
  },
  {
    icon: ShieldCheck,
    title: 'Data sovereignty',
    description: 'GPT-OSS & MAGPiE models with Australian context, processed on Australian infrastructure.',
  },
];

function CardDecorator() {
  return (
    <>
      <span className="absolute -left-px -top-px block size-2 border-l-2 border-t-2 border-primary transition-colors duration-300" />
      <span className="absolute -right-px -top-px block size-2 border-r-2 border-t-2 border-primary transition-colors duration-300" />
      <span className="absolute -bottom-px -left-px block size-2 border-b-2 border-l-2 border-primary transition-colors duration-300" />
      <span className="absolute -bottom-px -right-px block size-2 border-b-2 border-r-2 border-primary transition-colors duration-300" />
    </>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between h-14 px-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <SouthernCrossLogo
                variant="square"
                className="size-5 transition-transform duration-300 group-hover:scale-110"
              />
              <span className="text-lg font-light tracking-tighter">SCX.ai</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6">
            <Zap className="size-3" />
            Sovereign Australian AI
          </div>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-foreground mb-5 leading-[1.15]">
            Built for Australia,{' '}
            <span className="text-primary neon-glow">open to the world</span>
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
            SCX.ai demonstrates how locally-hosted AI can deliver enterprise-grade performance
            while maintaining data sovereignty and Australian context awareness.
          </p>
        </div>

        <div className="space-y-6">
          {/* Mission + Notice - 2 column */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Mission */}
            <div className="group relative border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all duration-300">
              <CardDecorator />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
                Our Mission
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We provide sovereign Australian AI chat capabilities powered by advanced language models —
                proving that locally-hosted AI can match global enterprise performance.
              </p>
            </div>

            {/* Notice */}
            <div className="group relative border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all duration-300">
              <CardDecorator />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Important Notice
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This platform is designed for educational and exploratory purposes — a showcase of what&apos;s
                possible with modern AI on Australian infrastructure. Contact us for commercial applications.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="relative border border-border bg-card p-6 sm:p-8">
            <CardDecorator />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
              Capabilities
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="group/item flex flex-col gap-3 p-4 rounded-sm border border-border/50 bg-background/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="flex items-center justify-center size-8 rounded-sm border border-border bg-card text-primary group-hover/item:border-primary/40 transition-colors duration-200">
                    <Icon className="size-4" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learn More */}
          <div className="group relative border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all duration-300">
            <CardDecorator />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Commercial Offerings
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enterprise solutions, custom deployments, and commercial partnerships.
                </p>
              </div>
              <a
                href="https://www.southerncrossai.com.au"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 shrink-0 group/link"
              >
                southerncrossai.com.au
                <ExternalLink className="size-3.5 opacity-60 group-hover/link:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-11 px-8 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 rounded-sm neon-glow-box"
          >
            Start researching
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-11 px-6 border border-border bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all duration-200 rounded-sm"
          >
            Back to home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <SouthernCrossLogo variant="square" className="size-4" />
              <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} SCX.ai</span>
            </div>
            <nav className="flex items-center gap-6">
              {[
                { label: 'Home', href: '/' },
                { label: 'About', href: '/about', active: true },
                { label: 'Terms', href: '/terms' },
                { label: 'Privacy', href: '/privacy-policy' },
              ].map(({ label, href, active }) => (
                <Link
                  key={label}
                  href={href}
                  className={`text-xs transition-colors ${active ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
