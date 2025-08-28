'use client';

import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { useState, useEffect } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { SciraLogo } from '@/components/logos/scira-logo';

const testimonials = [
  {
    content:
      '"Scira @sciraai is better than Grok at digging up information from X, its own platform! I asked it 3 different queries to help scrape and find some data points I was interested in about my own account and Scira did much much better with insanely accurate answers!"',
    author: 'Chris Universe',
    handle: '@chrisuniverseb',
    link: 'https://x.com/chrisuniverseb/status/1943025911043100835',
  },
  {
    content: '"scira dot ai does a really good job scraping through the reddit mines btw"',
    author: 'nyaaier',
    handle: '@nyaaier',
    link: 'https://x.com/nyaaier/status/1932810453107065284',
  },
  {
    content:
      "Hi @sciraai, just for curiosity, I searched for myself using its Gemini 2.5 Pro and in extreme mode to see what results it could generate. And it created this 👇🏻 It is not just the best, it is wild. And the best part is it's 10000% accurate.",
    author: 'Aniruddha Dak',
    handle: '@aniruddhadak',
    link: 'https://x.com/aniruddhadak/status/1917140602107445545',
  },
  {
    content:
      '"read nothing the whole sem and here I am with @sciraai to top my mid sems !! Literally so good to get all the related diagram, points and even topics from the website my professor uses to teach us 🙌"',
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
    <div className="flex items-center justify-between h-screen bg-background">
      <div className="hidden lg:flex lg:w-1/2 h-full bg-muted/30 flex-col">
        <div className="flex-1 flex flex-col justify-between p-12">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <SciraLogo className="size-8" />
              <span className="text-lg font-medium">Scira AI</span>
            </Link>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-semibold text-foreground mb-3">AI Search that actually understands you</h2>
              <p className="text-muted-foreground">Skip the ads. Get real answers. From the latest AI models.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                What people are saying
              </h3>

              <Carousel
                className="w-full"
                opts={{ loop: true }}
                setApi={setApi}
                plugins={[
                  Autoplay({
                    delay: 4000,
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
                        rel="noopener noreferrer"
                        className="block group h-full"
                      >
                        <blockquote className="relative h-full flex flex-col bg-background/50 backdrop-blur-sm border border-border/50 rounded-lg p-6 transition-all duration-200 hover:bg-background/70">
                          <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1 text-balance">
                            {testimonial.content}
                          </div>
                          <footer className="mt-3">
                            <div className="flex items-center gap-2">
                              <cite className="text-sm font-medium not-italic text-foreground">
                                {testimonial.author}
                              </cite>
                              <span className="text-xs text-muted-foreground">{testimonial.handle}</span>
                            </div>
                          </footer>
                        </blockquote>
                      </Link>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="flex items-center justify-center gap-1 mt-4">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => api?.scrollTo(index)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        index === current ? 'bg-foreground' : 'bg-muted-foreground/30'
                      }`}
                      aria-label={`Go to testimonial ${index + 1}`}
                    />
                  ))}
                </div>
              </Carousel>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a
                href="https://git.new/scira"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Open Source
              </a>
              <span>•</span>
              <span>Live Search</span>
              <span>•</span>
              <span>1M+ Searches served</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Featured on{' '}
              <a
                href="https://vercel.com/blog/ai-sdk-4-1"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Vercel
              </a>{' '}
              •{' '}
              <a
                href="https://peerlist.io/zaidmukaddam/project/scira-ai-20"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                #1 Product of the Week on Peerlist
              </a>
            </p>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center px-4 md:px-8">{children}</div>
    </div>
  );
}
