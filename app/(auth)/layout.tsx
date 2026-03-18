'use client';

import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { useState, useEffect } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { SciraLogo } from '@/components/logos/scira-logo';
import { Brain, Search, Eye, Mic, Blocks } from 'lucide-react';

const testimonials = [
  {
    content:
      'Scira is better than Grok at digging up information from X, its own platform! I asked it 3 different queries to help scrape and find some data points I was interested in about my own account and Scira did much much better with insanely accurate answers!',
    author: 'Chris Universe',
    handle: '@chrisuniverseb',
    link: 'https://x.com/chrisuniverseb/status/1943025911043100835',
  },
  {
    content: 'Scira does a really good job scraping through the reddit mines.',
    author: 'nyaaier',
    handle: '@nyaaier',
    link: 'https://x.com/nyaaier/status/1932810453107065284',
  },
  {
    content:
      "I searched for myself using Gemini 2.5 Pro in extreme mode to see what results it could generate. It is not just the best, it is wild. And the best part is it's 100% accurate.",
    author: 'Aniruddha Dak',
    handle: '@aniruddhadak',
    link: 'https://x.com/aniruddhadak/status/1917140602107445545',
  },
  {
    content:
      'Read nothing the whole sem and here I am with Scira to top my mid sems! Literally so good to get all the related diagrams, points and topics from the website my professor uses.',
    author: 'Rajnandinit',
    handle: '@itsRajnandinit',
    link: 'https://x.com/itsRajnandinit/status/1897896134837682288',
  },
];

const features = [
  { icon: Brain, label: 'Agentic Planning', description: 'Multi-step research, automated' },
  { icon: Search, label: 'Cited Answers', description: 'Every claim linked to a source' },
  { icon: Eye, label: 'Lookouts', description: 'Scheduled research, auto-delivered' },
  { icon: Mic, label: 'Voice Mode', description: 'Conversational AI research' },
  { icon: Blocks, label: 'Apps', description: '100+ connected tools via MCP' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="flex min-h-svh w-full bg-background">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] flex-col relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pixel-grid-bg opacity-30" />
        <div className="absolute inset-0 bg-linear-to-br from-background via-background to-muted/30" />

        {/* Content */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-12 xl:px-20">
          <div className="w-full max-w-md">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center gap-3 mb-12 group">
              <SciraLogo className="size-10 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-4xl font-light tracking-tighter font-be-vietnam-pro text-foreground">
                scira
              </span>
            </Link>

            {/* Tagline */}
            <div className="mb-12">
              <p className="text-2xl xl:text-3xl font-light tracking-tight leading-snug text-foreground/90 font-be-vietnam-pro">
                Research anything.
                <br />
                Do anything.
              </p>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-sm">
                Deep web research, cited answers, and 100+ connected apps. One assistant for everything you need.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2.5 mb-12">
              {features.map((f) => (
                <div key={f.label} className="flex items-start gap-3 p-3 rounded-xl border border-border/30 bg-card/20">
                  <f.icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground leading-tight">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial Carousel */}
            <div className="relative">
              <Carousel
                className="w-full"
                opts={{ loop: true }}
                setApi={setApi}
                plugins={[
                  Autoplay({
                    delay: 6000,
                    stopOnInteraction: true,
                    stopOnMouseEnter: true,
                  }),
                ]}
              >
                <CarouselContent>
                  {testimonials.map((testimonial, index) => (
                    <CarouselItem key={index}>
                      <Link
                        href={testimonial.link}
                        target="_blank"
                        className="block group/testimonial"
                      >
                        <div className="p-5 rounded-xl border border-border/50 bg-card/30 hover:bg-card hover:border-border transition-all duration-300">
                          <blockquote className="text-sm leading-relaxed text-muted-foreground group-hover/testimonial:text-foreground/80 transition-colors mb-4 line-clamp-3">
                            &ldquo;{testimonial.content}&rdquo;
                          </blockquote>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {testimonial.author}
                            </span>
                            <span className="text-xs text-muted-foreground font-pixel">
                              {testimonial.handle}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {/* Indicators */}
              <div className="flex items-center gap-2 mt-5">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={`h-1 rounded-full transition-all duration-500 ${index === current
                        ? 'w-8 bg-foreground'
                        : 'w-2 bg-foreground/15 hover:bg-foreground/30'
                      }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="relative px-12 xl:px-20 pb-10">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            {[
              { num: '5M+', label: 'searches' },
              { num: '100K+', label: 'users' },
              { num: '11K+', label: 'stars' },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-1.5">
                {i > 0 && <span className="w-px h-3 bg-border/50 mr-1.5" />}
                <span className="font-pixel">{s.num}</span>
                <span className="text-[10px]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 lg:w-[55%] xl:w-[50%] flex flex-col bg-background lg:border-l lg:border-border/50">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between h-16 border-b border-border/50 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <SciraLogo className="size-6" />
            <span className="text-2xl font-light tracking-tighter font-be-vietnam-pro">scira</span>
          </Link>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="font-pixel">5M+ searches</span>
            <span className="w-px h-3 bg-border/50" />
            <span className="font-pixel">100K+ users</span>
          </div>
        </header>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          {children}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-center gap-6 h-12 text-xs text-muted-foreground px-6">
          <span>Trusted by researchers worldwide</span>
          <span className="w-px h-3 bg-border/30" />
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        </footer>
      </div>
    </div>
  );
}
