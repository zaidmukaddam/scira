'use client';

import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { useState, useEffect } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { SciraLogo } from '@/components/logos/scira-logo';

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
      {/* Left Panel - Minimal Brand */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] flex-col bg-background">
        {/* Centered Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-12 xl:px-20">
          {/* Logo and Title */}
          <div className="w-full max-w-md">
            <Link href="/" className="inline-flex items-center gap-3 mb-16 group">
              <SciraLogo className="size-12 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-5xl font-light tracking-tighter font-be-vietnam-pro text-foreground">
                scira
              </span>
            </Link>

            {/* Tagline */}
            <div className="mb-16">
              <p className="text-2xl xl:text-3xl font-light tracking-tight leading-snug text-foreground/90">
                Research that moves
                <br />
                at the speed of thought.
              </p>
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
                        <div className="pr-4">
                          <blockquote className="text-sm leading-relaxed text-muted-foreground group-hover/testimonial:text-foreground/80 transition-colors mb-4">
                            "{testimonial.content}"
                          </blockquote>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {testimonial.author}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {testimonial.handle}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {/* Minimal Indicators */}
              <div className="flex items-center gap-1.5 mt-6">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={`h-px transition-all duration-500 ${index === current
                        ? 'w-8 bg-foreground'
                        : 'w-4 bg-foreground/20 hover:bg-foreground/40'
                      }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats & Links */}
        <div className="px-12 xl:px-20 pb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8 text-xs text-muted-foreground">
              <span>5M+ searches</span>
              <span className="w-px h-3 bg-border" />
              <span>100K+ users</span>
              <span className="w-px h-3 bg-border" />
              <span>11K+ stars</span>
            </div>
            <div className="flex items-center gap-6 text-xs">
            <Link
                href="https://git.new/scira"
                target="_blank"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </Link>
              <Link
                href="https://vercel.com/blog/ai-sdk-4-1"
                target="_blank"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Featured on Vercel
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
            <SciraLogo className="size-6" />
            <span className="text-2xl font-light tracking-tighter font-be-vietnam-pro">scira</span>
          </Link>
        </header>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          {children}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-center h-12 text-xs text-muted-foreground">
          <span>Trusted by researchers worldwide</span>
        </footer>
      </div>
    </div>
  );
}
