import Link from 'next/link';
import { SouthernCrossLogo } from '@/components/logos/southerncross-logo';

const features = [
  {
    title: 'GPT-OSS & MAGPiE',
    description: 'Advanced reasoning with Australian cultural and legal context',
  },
  {
    title: 'Data Sovereignty',
    description: 'Every query processed on Australian sovereign cloud infrastructure',
  },
  {
    title: 'Local Knowledge',
    description: 'Australian spelling, dates, legislation, and regional context',
  },
  {
    title: 'Enterprise Ready',
    description: 'Secure, compliant, and built to scale with your organisation',
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full bg-background">
      {/* Left Panel - Minimal Brand */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] flex-col bg-background">
        {/* Centered Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-12 xl:px-20">
          <div className="w-full max-w-md">
            <Link href="/" className="inline-flex items-center gap-3 mb-16 group">
              <SouthernCrossLogo variant="square" className="size-12 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-5xl font-light tracking-tighter font-be-vietnam-pro text-foreground">
                SCX.ai
              </span>
            </Link>

            {/* Tagline */}
            <div className="mb-12">
              <p className="text-2xl xl:text-3xl font-light tracking-tight leading-snug text-foreground/90">
                Sovereign Australian AI.
                <br />
                Your data stays in Australia.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-muted/40 border border-border/50 rounded-lg p-4"
                >
                  <h4 className="font-medium text-sm mb-1 text-foreground">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Stats & Links */}
        <div className="px-12 xl:px-20 pb-12">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Powered by SCX.ai • Australian sovereign cloud infrastructure
            </p>
            <div className="flex items-center gap-6 text-xs">
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/privacy-policy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 lg:w-[55%] xl:w-[50%] flex flex-col bg-background lg:border-l lg:border-border">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-center h-16 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5">
            <SouthernCrossLogo variant="square" className="size-6" />
            <span className="text-2xl font-light tracking-tighter font-be-vietnam-pro">SCX.ai</span>
          </Link>
        </header>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          {children}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-center h-12 text-xs text-muted-foreground">
          <span>Trusted by researchers across Australia &amp; New Zealand</span>
        </footer>
      </div>
    </div>
  );
}
