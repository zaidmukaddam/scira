import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SouthernCrossLogo } from '@/components/logos/southerncross-logo';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between h-14 px-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <SouthernCrossLogo variant="square" className="size-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-lg font-light tracking-tighter font-be-vietnam-pro">SCX.ai</span>
            </Link>
            <Link
              href="/"
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
          <p className="text-xs text-muted-foreground tracking-wide mb-3">About</p>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro mb-4">
            About SCX.ai
          </h1>
        </div>

        <div className="space-y-8">
          {/* Mission */}
          <div className="border border-border p-6">
            <h2 className="text-lg font-medium mb-3 text-foreground">Our Mission</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              SCX.ai is dedicated to providing sovereign Australian AI chat capabilities powered by advanced language
              models. We demonstrate how locally-hosted AI can deliver enterprise-grade performance while maintaining
              data sovereignty and Australian context awareness.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This platform serves as an educational tool to explore the potential of AI technology in various domains
              including search, research, and information synthesis.
            </p>
          </div>

          {/* Important Notice */}
          <div className="border border-border p-6">
            <h2 className="text-lg font-medium mb-3 text-foreground">Important Notice</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              This site is designed for educational and exploratory purposes. The AI models and tools showcased here
              are examples of what&apos;s possible with modern AI technology hosted on Australian infrastructure.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For commercial applications or enterprise solutions, please contact us through our main website.
            </p>
          </div>

          {/* Features */}
          <div className="border border-border p-6">
            <h2 className="text-lg font-medium mb-3 text-foreground">Features</h2>
            <ul className="space-y-2">
              {[
                'Multi-modal AI search capabilities',
                'Deep research with citations and cross-referencing',
                'Real-time information retrieval and synthesis',
                'Domain-specific tools (finance, crypto, weather, etc.)',
                'Academic and scholarly research assistance',
                'Automatic tool selection based on query context',
                'GPT-OSS & MAGPiE models with Australian context',
                'Data sovereignty — processed on Australian infrastructure',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Learn More */}
          <div className="border border-border p-6">
            <h2 className="text-lg font-medium mb-3 text-foreground">Learn More</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              To learn more about SCX.ai and our commercial offerings, please visit our main website:
            </p>
            <a
              href="https://www.southerncrossai.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground hover:underline underline-offset-4 transition-colors"
            >
              www.southerncrossai.com.au →
            </a>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-8 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Continue to SCX.ai
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <SouthernCrossLogo variant="square" className="size-4" />
              <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} SCX.ai</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-xs text-foreground font-medium">
                About
              </Link>
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
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
