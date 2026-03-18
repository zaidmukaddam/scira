'use client';

import {
  Brain,
  Search,
  ArrowUpRight,
  ArrowRight,
  Bot,
  GraduationCap,
  Eye,
  Filter,
  X,
  Sparkles,
  Check,
  Quote,
  Globe,
  FileText,
  Mic,
  Code,
  BarChart3,
  Newspaper,
  BookOpen,
  Music,
  TrendingUp,
  MessageSquare,
  Bitcoin,
  Plug,
  Database,
  Headphones,
  ChartNoAxesCombined,
} from 'lucide-react';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import Link from 'next/link';
import Image from 'next/image';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useRouter } from 'next/navigation';
import { GithubLogoIcon, XLogoIcon } from '@phosphor-icons/react';
import {
  ProAccordion,
  ProAccordionItem,
  ProAccordionTrigger,
  ProAccordionContent,
} from '@/components/ui/pro-accordion';
import { useGitHubStars } from '@/hooks/use-github-stars';
import { models } from '@/ai/models';
import { VercelLogo } from '@/components/logos/vercel-logo';
import { ExaLogo } from '@/components/logos/exa-logo';
import { ElevenLabsLogo } from '@/components/logos/elevenlabs-logo';
import { PRICING, SEARCH_LIMITS } from '@/lib/constants';

import { ThemeSwitcher } from '@/components/theme-switcher';
import { SciraLogo } from '@/components/logos/scira-logo';
import { getSearchGroups } from '@/lib/utils';

const testimonials = [
  {
    content:
      'Scira is better than Grok at digging up information from X, its own platform! Scira did much much better with insanely accurate answers!',
    author: 'Chris Universe',
    handle: '@chrisuniverseb',
  },
  {
    content: 'Scira does a really good job scraping through the reddit mines.',
    author: 'nyaaier',
    handle: '@nyaaier',
  },
  {
    content:
      "I searched for myself using Gemini 2.5 Pro in extreme mode. It is not just the best, it is wild. And the best part is it's 100% accurate.",
    author: 'Aniruddha Dak',
    handle: '@aniruddhadak',
  },
  {
    content:
      'Read nothing the whole sem and here I am with Scira to top my mid sems! Literally so good to get all the related diagrams, points and topics.',
    author: 'Rajnandinit',
    handle: '@itsRajnandinit',
  },
];

function AnimatedCounter({ target, suffix = '' }: { target: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      {target}
      {suffix}
    </span>
  );
}

const AppCircle = React.forwardRef<HTMLDivElement, { favicon: string; label: string; className?: string }>(
  ({ favicon, label, className }, ref) => (
    <div
      ref={ref}
      className={cn(
        'z-10 flex size-12 items-center justify-center rounded-full border-2 bg-background p-2.5 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/proxy-image?url=${encodeURIComponent(`https://www.google.com/s2/favicons?domain=${favicon}&sz=64`)}`}
        alt={label}
        width={24}
        height={24}
        className="rounded object-contain"
      />
    </div>
  ),
);
AppCircle.displayName = 'AppCircle';

function AppsBeamSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const l0 = useRef<HTMLDivElement>(null);
  const l1 = useRef<HTMLDivElement>(null);
  const l2 = useRef<HTMLDivElement>(null);
  const l3 = useRef<HTMLDivElement>(null);
  const l4 = useRef<HTMLDivElement>(null);
  const r0 = useRef<HTMLDivElement>(null);
  const r1 = useRef<HTMLDivElement>(null);
  const r2 = useRef<HTMLDivElement>(null);
  const r3 = useRef<HTMLDivElement>(null);
  const r4 = useRef<HTMLDivElement>(null);

  return (
    <section className="border-t border-border/50 bg-muted/10">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16 max-w-xl mx-auto">
          <span className="font-pixel text-lg uppercase tracking-[0.2em] text-primary/80 mb-4 block">Apps</span>
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-be-vietnam-pro mb-4">
            Your tools, <span className="font-pixel text-3xl sm:text-4xl">connected.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Connect 100+ apps via MCP and let Scira take action inside them. Research and act, without leaving the
            conversation.
          </p>
        </div>

        <div
          className="relative flex h-[600px] w-full items-center justify-center overflow-hidden p-14"
          ref={containerRef}
        >
          <div className="flex size-full max-h-[500px] max-w-2xl flex-col items-stretch justify-between">
            {/* Row 1 — top */}
            <div className="flex flex-row items-center justify-between">
              <AppCircle ref={l0} favicon="github.com" label="GitHub" />
              <AppCircle ref={r0} favicon="vercel.com" label="Vercel" />
            </div>
            {/* Row 2 */}
            <div className="flex flex-row items-center justify-between">
              <AppCircle ref={l1} favicon="notion.so" label="Notion" />
              <AppCircle ref={r1} favicon="stripe.com" label="Stripe" />
            </div>
            {/* Row 3 — center */}
            <div className="flex flex-row items-center justify-between">
              <AppCircle ref={l2} favicon="slack.com" label="Slack" />
              <div
                ref={centerRef}
                className="z-10 flex size-16 items-center justify-center rounded-2xl border-2 border-primary/30 bg-background p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
              >
                <SciraLogo className="size-8" />
              </div>
              <AppCircle ref={r2} favicon="linear.app" label="Linear" />
            </div>
            {/* Row 4 */}
            <div className="flex flex-row items-center justify-between">
              <AppCircle ref={l3} favicon="google.com" label="Google" />
              <AppCircle ref={r3} favicon="huggingface.co" label="Hugging Face" />
            </div>
            {/* Row 5 — bottom */}
            <div className="flex flex-row items-center justify-between">
              <AppCircle ref={l4} favicon="cloudflare.com" label="Cloudflare" />
              <AppCircle ref={r4} favicon="trivago.com" label="Trivago" />
            </div>
          </div>

          {/* Left beams */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={l0}
            toRef={centerRef}
            curvature={-75}
            endYOffset={-10}
            gradientStartColor="var(--primary)"
            gradientStopColor="var(--secondary)"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={l1}
            toRef={centerRef}
            curvature={-30}
            endYOffset={-5}
            gradientStartColor="var(--primary)"
            gradientStopColor="var(--secondary)"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={l2}
            toRef={centerRef}
            gradientStartColor="var(--primary)"
            gradientStopColor="var(--secondary)"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={l3}
            toRef={centerRef}
            curvature={30}
            endYOffset={5}
            gradientStartColor="var(--primary)"
            gradientStopColor="var(--secondary)"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={l4}
            toRef={centerRef}
            curvature={75}
            endYOffset={10}
            gradientStartColor="var(--primary)"
            gradientStopColor="var(--secondary)"
          />
          {/* Right beams */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={r0}
            toRef={centerRef}
            curvature={-75}
            endYOffset={-10}
            reverse
            gradientStartColor="var(--secondary)"
            gradientStopColor="var(--primary)"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={r1}
            toRef={centerRef}
            curvature={-30}
            endYOffset={-5}
            reverse
            gradientStartColor="var(--secondary)"
            gradientStopColor="var(--primary)"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={r2}
            toRef={centerRef}
            reverse
            gradientStartColor="var(--secondary)"
            gradientStopColor="var(--primary)"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={r3}
            toRef={centerRef}
            curvature={30}
            endYOffset={5}
            reverse
            gradientStartColor="var(--secondary)"
            gradientStopColor="var(--primary)"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={r4}
            toRef={centerRef}
            curvature={75}
            endYOffset={10}
            reverse
            gradientStartColor="var(--secondary)"
            gradientStopColor="var(--primary)"
          />
        </div>

        <div className="text-center mt-6">
          <Link
            href="/apps"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            Browse all apps
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [openCategory, setOpenCategory] = useState(false);
  const [openCapabilities, setOpenCapabilities] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);
  const { data: githubStars, isLoading: isLoadingStars } = useGitHubStars();
  const visibleGroups = useMemo(
    () =>
      getSearchGroups('parallel').filter(
        (g) => g.show && !['extreme', 'connectors', 'memory'].includes(g.id as string),
      ),
    [],
  );
  const [selectedGroup, setSelectedGroup] = useState<string>(visibleGroups[0]?.id || 'web');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('query')?.toString();
    if (query) {
      const params = new URLSearchParams({ q: query, group: String(selectedGroup) });
      router.push(`/?${params.toString()}`);
    }
  };

  const searchModes = [
    { icon: Globe, name: 'Web', description: 'Search the entire web with AI-powered analysis' },
    { icon: MessageSquare, name: 'Chat', description: 'Talk to the model directly, no search' },
    { icon: XLogoIcon, name: 'X', description: 'Real-time posts, trends, and conversations' },
    { icon: TrendingUp, name: 'Stocks', description: 'Market data, charts, and financial analysis' },
    { icon: Code, name: 'Code', description: 'Get context about languages and frameworks' },
    { icon: BookOpen, name: 'Academic', description: 'Research papers, citations, and scholarly sources' },
    { icon: BarChart3, name: 'Extreme', description: 'Deep research with multiple sources and analysis' },
    { icon: Newspaper, name: 'Reddit', description: 'Discussions, opinions, and community insights' },
    { icon: Search, name: 'GitHub', description: 'Repositories, code, and developer discussions' },
    { icon: Bitcoin, name: 'Crypto', description: 'Cryptocurrency research powered by CoinGecko' },
    { icon: ChartNoAxesCombined, name: 'Prediction', description: 'Prediction markets from Polymarket and Kalshi' },
    { icon: Music, name: 'YouTube', description: 'Video summaries, transcripts, and analysis' },
    { icon: Headphones, name: 'Spotify', description: 'Search songs, artists, and albums' },
    { icon: Plug, name: 'Connectors', description: 'Search Google Drive, Notion & OneDrive', pro: true },
    { icon: Database, name: 'Memory', description: 'Your personal memory companion', pro: true },
    { icon: Mic, name: 'Voice', description: 'Conversational AI with real-time voice', pro: true },
    { icon: FileText, name: 'XQL', description: 'Advanced X query language for tweet analysis', pro: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between h-14 px-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <SciraLogo className="size-6 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-xl font-light tracking-tighter font-be-vietnam-pro">scira</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link
                href="https://git.new/scira"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
              >
                <GithubLogoIcon className="h-3.5 w-3.5" />
                GitHub
                {!isLoadingStars && githubStars && (
                  <span className="text-[10px] tabular-nums text-muted-foreground/70">
                    {githubStars > 1000 ? `${(githubStars / 1000).toFixed(1)}k` : githubStars}
                  </span>
                )}
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <Button size="sm" className="h-8 px-5 text-sm rounded-full font-medium" onClick={() => router.push('/')}>
                Try Scira
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pixel-grid-bg opacity-40" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 sm:pt-32 pb-24">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="animate-fade-in-up inline-flex items-center gap-2.5 mb-8 px-3 py-1.5 bg-muted/50 border border-border/50 rounded-full">
              <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Open Source
              </span>
              <span className="w-1 h-1 rounded-full bg-primary/60 animate-pulse-subtle" />
              <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AGPL-3.0</span>
            </div>

            {/* Title */}
            <h1 className="animate-fade-in-up delay-100 text-5xl sm:text-6xl lg:text-[5.5rem] font-light tracking-tight leading-[1.05] text-foreground font-be-vietnam-pro mb-3">
              Research anything.
            </h1>
            <p className="animate-fade-in-up delay-200 font-pixel text-5xl sm:text-6xl lg:text-7xl tracking-tight text-foreground/90 mb-8">
              Do anything.
            </p>

            {/* Description */}
            <p className="animate-fade-in-up delay-300 text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-xl">
              The AI assistant that searches the web in depth, cites its sources, and connects to 100+ apps so you can
              act on what you find.
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="animate-fade-in-up delay-400 mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative group">
                  <input
                    name="query"
                    type="text"
                    placeholder="Ask anything..."
                    className="w-full h-12 px-5 text-base bg-background border border-border rounded-xl focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all placeholder:text-muted-foreground/60"
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-12 px-4 text-sm text-muted-foreground bg-background border border-border rounded-xl hover:border-primary/30 transition-all flex items-center justify-between gap-2 min-w-[140px]"
                    >
                      <span>{visibleGroups.find((g) => g.id === selectedGroup)?.name || 'Mode'}</span>
                      <ArrowUpRight className="h-3 w-3 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 w-64 rounded-xl">
                    <Command>
                      <CommandInput placeholder="Search modes..." className="h-10" />
                      <CommandList>
                        <CommandEmpty>No mode found.</CommandEmpty>
                        <CommandGroup>
                          {visibleGroups.map((g) => (
                            <CommandItem
                              key={g.id}
                              value={g.id}
                              onSelect={() => setSelectedGroup(g.id)}
                              className="text-sm"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{g.name}</span>
                                <span className="text-xs text-muted-foreground">{g.description}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <button
                  type="submit"
                  className="h-12 px-8 bg-foreground text-background font-medium rounded-xl hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Quick Links */}
            <div className="animate-fade-in-up delay-500 flex flex-wrap items-center gap-4">
              <Link
                href="https://git.new/scira"
                className="inline-flex items-center gap-2 text-sm text-foreground hover:text-foreground/70 transition-colors group"
                target="_blank"
              >
                <GithubLogoIcon className="h-4 w-4" />
                <span>Star on GitHub</span>
                {!isLoadingStars && githubStars && (
                  <span className="text-xs text-muted-foreground font-pixel">
                    {githubStars > 1000 ? `${(githubStars / 1000).toFixed(1)}k` : githubStars}
                  </span>
                )}
              </Link>
              <span className="w-px h-4 bg-border" />
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <span>Try now</span>
                <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 lg:absolute lg:right-6 lg:top-32 lg:mt-0">
            <div className="flex lg:flex-col gap-10 lg:gap-8">
              {[
                { value: '5M', suffix: '+', label: 'Searches' },
                { value: '100K', suffix: '+', label: 'Users' },
                {
                  value: isLoadingStars
                    ? '...'
                    : `${githubStars && githubStars > 1000 ? `${(githubStars / 1000).toFixed(1)}k` : githubStars || '11k'}`,
                  suffix: '+',
                  label: 'Stars',
                },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl lg:text-4xl font-pixel tracking-tight text-foreground">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-[0.15em]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border/50 bg-muted/10">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">
              How it works
            </span>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-be-vietnam-pro">
              Three steps. <span className="font-pixel text-2xl sm:text-3xl">Zero friction.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '01',
                title: 'Ask anything',
                description: 'Type a question, upload a PDF, or paste a URL. Pick a mode or let Scira decide for you.',
              },
              {
                step: '02',
                title: 'Scira plans & retrieves',
                description:
                  'The agent breaks your question into sub-tasks, searches live sources, and cross-checks the evidence.',
              },
              {
                step: '03',
                title: 'Get cited answers',
                description: 'Receive a grounded answer with inline citations. Click any source to verify it yourself.',
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center group">
                <div className="font-pixel-grid text-7xl sm:text-8xl text-border/60 group-hover:text-primary/15 transition-colors duration-500 mb-3 select-none">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold mb-2 text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-14">
            <Button className="rounded-full px-8 h-11" onClick={() => router.push('/')}>
              Try it now &mdash; it&apos;s free
              <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features - Bento Grid */}
      <section className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="mb-16 max-w-lg">
            <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">
              Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-be-vietnam-pro mb-4">
              Built for the way <span className="font-pixel text-3xl sm:text-4xl">you</span> think
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Research, plan, connect, and act. Everything in one place.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Large card - Agentic Planning */}
            <div className="md:col-span-4 group p-8 sm:p-10 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300 min-h-[240px]">
              <div className="flex items-start justify-between mb-6">
                <Brain className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="font-pixel-grid text-5xl text-border/40 group-hover:text-border/60 transition-colors select-none leading-none">
                  01
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Agentic Planning</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-6">
                Breaks complex questions into steps, selects the right models and tools, then executes multi-step
                workflows end to end. Ask one question, get a research report.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {['Multi-step reasoning', 'Tool orchestration', 'Auto-planning'].map((tag) => (
                  <span
                    key={tag}
                    className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Small card - Grounded Retrieval */}
            <div className="md:col-span-2 group p-8 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300 min-h-[240px]">
              <div className="flex items-start justify-between mb-6">
                <Search className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="font-pixel-grid text-5xl text-border/40 group-hover:text-border/60 transition-colors select-none leading-none">
                  02
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Grounded Retrieval</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every answer comes with inline citations. Click any source to audit the evidence yourself.
              </p>
            </div>

            {/* Small card - Extensible & Open */}
            <div className="md:col-span-2 group p-8 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300 min-h-[240px]">
              <div className="flex items-start justify-between mb-6">
                <Bot className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="font-pixel-grid text-5xl text-border/40 group-hover:text-border/60 transition-colors select-none leading-none">
                  03
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Extensible & Open</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AGPL-3.0. Self-host, bring your own models, connect custom tools, and tailor everything to your
                workflow.
              </p>
            </div>

            {/* Large card - Lookouts */}
            <div className="md:col-span-4 group p-8 sm:p-10 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300 min-h-[240px]">
              <div className="flex items-start justify-between mb-6">
                <Eye className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="font-pixel-grid text-5xl text-border/40 group-hover:text-border/60 transition-colors select-none leading-none">
                  04
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Lookouts</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-6">
                Schedule recurring research agents that monitor topics, track changes, and email you updates. Set it
                once, stay informed forever.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {['Scheduled runs', 'Email alerts', 'Change detection'].map((tag) => (
                  <span
                    key={tag}
                    className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Modes Showcase */}
      <section className="border-t border-border/50 bg-muted/10">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
            <div className="max-w-lg">
              <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">
                {searchModes.length} Modes
              </span>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-be-vietnam-pro mb-4">
                One box, <span className="font-pixel text-3xl sm:text-4xl">every</span> source
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Each mode is fine-tuned for a specific type of research. Pick one, or let Scira choose.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                {searchModes.filter((m) => !('pro' in m && m.pro)).length} Free
              </span>
              <span className="font-pixel text-[9px] uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {searchModes.filter((m) => 'pro' in m && m.pro).length} Pro
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {searchModes.map((mode, i) => (
              <div
                key={mode.name}
                className="group relative p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/30 hover:bg-card hover:border-border transition-all duration-200 cursor-default"
              >
                <div className="flex items-start justify-between mb-4">
                  <mode.icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  {'pro' in mode && mode.pro ? (
                    <span className="font-pixel text-[8px] uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      Pro
                    </span>
                  ) : (
                    <span className="font-pixel-grid text-lg text-border/40 select-none leading-none">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  )}
                </div>
                <h3 className="text-xs sm:text-sm font-medium text-foreground mb-1">{mode.name}</h3>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">{mode.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apps Section */}
      <AppsBeamSection />

      {/* Testimonials */}
      <section className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16 max-w-lg mx-auto">
            <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">
              Wall of Love
            </span>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-be-vietnam-pro">
              Don&apos;t take our word for it
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {testimonials.map((t) => (
              <div
                key={t.handle}
                className="p-6 rounded-2xl border border-border/50 bg-card/30 hover:bg-card hover:border-border transition-all duration-200"
              >
                <Quote className="h-4 w-4 text-primary/40 mb-4" />
                <p className="text-sm text-foreground/80 leading-relaxed mb-5">{t.content}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{t.author}</span>
                  <span className="text-xs text-muted-foreground font-pixel">{t.handle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Marquee */}
      <section className="border-t border-border/50 bg-muted/20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-3 group">
                <Image
                  src="https://cdn.prod.website-files.com/657b3d8ca1cab4015f06c850/680a4d679063da73487739e0_No1prgold-caps-removebg-preview.png"
                  alt="Tiny Startups"
                  width={28}
                  height={28}
                  className="opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">#1 Product</p>
                  <p className="text-[10px] text-muted-foreground font-pixel uppercase tracking-wider">Tiny Startups</p>
                </div>
              </div>
              <span className="w-px h-8 bg-border/50" />
              <div className="flex items-center gap-3 group">
                <Image
                  src="/Winner-Medal-Weekly.svg"
                  alt="Peerlist"
                  width={28}
                  height={28}
                  className="opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">#1 Project</p>
                  <p className="text-[10px] text-muted-foreground font-pixel uppercase tracking-wider">Peerlist</p>
                </div>
              </div>
            </div>
            <a
              href="https://openalternative.co/scira?utm_source=openalternative&utm_medium=badge&utm_campaign=embed&utm_content=tool-scira"
              target="_blank"
              className="opacity-50 hover:opacity-100 transition-opacity duration-300"
            >
              <Image
                src="https://openalternative.co/scira/badge.svg?theme=dark&width=200&height=50"
                width={150}
                height={38}
                alt="Scira badge"
              />
            </a>
          </div>
        </div>
      </section>

      {/* Built With */}
      <section className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-16">
            <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-muted-foreground shrink-0">
              Built with
            </span>
            <div className="flex flex-wrap items-center gap-10 md:gap-14">
              {[
                { logo: VercelLogo, name: 'Vercel AI SDK' },
                { logo: ExaLogo, name: 'Exa Search' },
                { logo: ElevenLabsLogo, name: 'ElevenLabs' },
              ].map((partner) => (
                <div
                  key={partner.name}
                  className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity duration-300"
                >
                  <partner.logo />
                  <span className="text-sm text-muted-foreground">{partner.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured on Vercel */}
      <section className="border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="px-6 py-20 lg:py-28 lg:pr-16 relative">
              {/* Decorative number */}
              <span className="font-pixel-grid text-[120px] sm:text-[160px] text-border/20 absolute -top-4 -left-4 select-none leading-none pointer-events-none">
                V
              </span>
              <div className="relative">
                <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">
                  Press
                </span>
                <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-be-vietnam-pro mb-2">Featured on</h2>
                <p className="font-pixel text-3xl sm:text-4xl text-foreground/90 mb-6">Vercel Blog</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-md">
                  Recognized for innovative use of AI technology and pushing the boundaries of what&apos;s possible with
                  the Vercel AI SDK.
                </p>
                <Link
                  href="https://vercel.com/blog/ai-sdk-4-1"
                  className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/70 transition-colors group px-5 py-2.5 border border-border rounded-full hover:border-foreground/20"
                  target="_blank"
                >
                  Read the feature
                  <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            </div>
            <div className="relative aspect-video lg:aspect-auto lg:h-full border-t lg:border-t-0 lg:border-l border-border/50 overflow-hidden">
              <Image src="/vercel-featured.png" alt="Featured on Vercel Blog" fill className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Inline CTA */}
      <section className="border-t border-border/50 bg-muted/10">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight font-be-vietnam-pro mb-4">
              Ready to <span className="font-pixel">think faster?</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join 100K+ users who research smarter and get things done with Scira.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button className="rounded-full px-8 h-11" onClick={() => router.push('/')}>
                Start for free
                <ArrowRight className="w-3.5 h-3.5 ml-2" />
              </Button>
              <Button variant="outline" className="rounded-full px-8 h-11" onClick={() => router.push('/pricing')}>
                See pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Models Section */}
      <section className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
            <div className="max-w-lg">
              <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">
                AI Providers
              </span>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-be-vietnam-pro mb-4">
                Every model, <span className="font-pixel text-3xl sm:text-4xl">one place</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Switch between models on the fly. Use the best tool for each question.
              </p>
            </div>
            <div className="font-pixel-grid text-6xl sm:text-7xl text-border/30 select-none leading-none shrink-0">
              {models.length}
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Popover open={openCategory} onOpenChange={setOpenCategory}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCategory}
                  className="h-9 justify-between rounded-full text-xs"
                >
                  {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                  <ArrowUpRight className="ml-2 h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0 rounded-xl">
                <Command>
                  <CommandInput placeholder="Search..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup>
                      {[
                        { value: 'all', label: 'All Categories' },
                        { value: 'Free', label: 'Free' },
                        { value: 'Pro', label: 'Pro' },
                        { value: 'Experimental', label: 'Experimental' },
                      ].map((category) => (
                        <CommandItem
                          key={category.value}
                          value={category.value}
                          onSelect={(v) => {
                            setSelectedCategory(v);
                            setOpenCategory(false);
                          }}
                        >
                          {category.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Popover open={openCapabilities} onOpenChange={setOpenCapabilities}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCapabilities}
                  className="h-9 justify-between rounded-full text-xs"
                >
                  {selectedCapabilities.length === 0
                    ? 'All Capabilities'
                    : selectedCapabilities.length === 1
                      ? selectedCapabilities[0]
                      : `${selectedCapabilities.length} selected`}
                  <ArrowUpRight className="ml-2 h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0 rounded-xl">
                <Command>
                  <CommandInput placeholder="Search..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No capability found.</CommandEmpty>
                    <CommandGroup>
                      {[
                        { value: 'vision', label: 'Vision' },
                        { value: 'reasoning', label: 'Reasoning' },
                        { value: 'pdf', label: 'PDF' },
                      ].map((capability) => (
                        <CommandItem
                          key={capability.value}
                          value={capability.value}
                          onSelect={(v) => {
                            setSelectedCapabilities((prev) =>
                              prev.includes(v) ? prev.filter((item) => item !== v) : [...prev, v],
                            );
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full transition-colors ${selectedCapabilities.includes(capability.value) ? 'bg-foreground' : 'bg-border'}`}
                            />
                            {capability.label}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {(selectedCategory !== 'all' || selectedCapabilities.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedCapabilities([]);
                }}
                className="h-9 text-muted-foreground rounded-full text-xs"
              >
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>

          {/* Models Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(() => {
              const filteredModels = models.filter((model) => {
                const categoryMatch = selectedCategory === 'all' || model.category === selectedCategory;
                const capabilityMatch =
                  selectedCapabilities.length === 0 ||
                  selectedCapabilities.some((c) => {
                    if (c === 'vision') return model.vision;
                    if (c === 'reasoning') return model.reasoning;
                    if (c === 'pdf') return model.pdf;
                    return false;
                  });
                return categoryMatch && capabilityMatch;
              });

              const groupedModels = filteredModels.reduce(
                (acc, model) => {
                  const category = model.category;
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(model);
                  return acc;
                },
                {} as Record<string, typeof models>,
              );

              const sortedModels = ['Free', 'Experimental', 'Pro']
                .filter((c) => groupedModels[c]?.length > 0)
                .flatMap((c) => groupedModels[c]);

              if (sortedModels.length === 0) {
                return (
                  <div className="col-span-full p-12 text-center border border-border/50 rounded-2xl">
                    <Filter className="w-6 h-6 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">No models match your filters</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedCapabilities([]);
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                );
              }

              const modelsToShow = showAllModels ? sortedModels : sortedModels.slice(0, 9);

              return (
                <>
                  {modelsToShow.map((model: any) => (
                    <div
                      key={model.value}
                      className="p-5 rounded-xl border border-border/50 bg-card/30 hover:bg-card hover:border-border transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-medium text-foreground">{model.label}</h3>
                        <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                          {model.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                        {model.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {model.vision && (
                          <span className="font-pixel text-[8px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                            Vision
                          </span>
                        )}
                        {model.reasoning && (
                          <span className="font-pixel text-[8px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                            Reasoning
                          </span>
                        )}
                        {model.pdf && (
                          <span className="font-pixel text-[8px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                            PDF
                          </span>
                        )}
                        {model.fast && (
                          <span className="font-pixel text-[8px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                            Fast
                          </span>
                        )}
                        {model.isNew && (
                          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {sortedModels.length > 9 && (
                    <div className="col-span-full flex justify-center pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setShowAllModels(!showAllModels)}
                      >
                        {showAllModels ? 'Show less' : `Show ${sortedModels.length - 9} more`}
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="border-t border-border/50 bg-muted/10">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="mb-16 text-center max-w-lg mx-auto">
            <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">Plans</span>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-be-vietnam-pro mb-4">
              Simple, <span className="font-pixel text-3xl sm:text-4xl">honest</span> pricing
            </h2>
            <p className="text-muted-foreground">Start free. Upgrade when you need unlimited power.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="p-8 lg:p-10 flex flex-col rounded-2xl border border-border/50 bg-card/30">
              <h3 className="text-lg font-semibold mb-2 text-foreground">Free</h3>
              <p className="text-sm text-muted-foreground mb-6">Get started with the essentials</p>
              <div className="flex items-baseline mb-8">
                <span className="text-5xl font-pixel tracking-tight text-foreground">$0</span>
                <span className="text-sm text-muted-foreground ml-2">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  `${SEARCH_LIMITS.DAILY_SEARCH_LIMIT} research runs per day`,
                  'Basic AI models',
                  'Research history',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-11 rounded-xl mt-auto" onClick={() => router.push('/')}>
                Get Started
              </Button>
            </div>

            <div className="p-8 lg:p-10 flex flex-col rounded-2xl border border-primary/20 bg-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary/60 via-primary to-primary/60" />
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-foreground">Pro</h3>
                <span className="font-pixel text-[9px] uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  Popular
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Everything for serious research</p>
              <div className="mb-1">
                <span className="text-5xl font-pixel tracking-tight text-foreground">${PRICING.PRO_MONTHLY}</span>
                <span className="text-sm text-muted-foreground ml-2">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-8">Less than a coffee a day</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited research',
                  'All standard AI models',
                  'Scira Apps (100+ integrations)',
                  'PDF analysis',
                  'Voice mode',
                  'XQL (X Query Language)',
                  'Scira Lookout',
                  'Priority support',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-11 rounded-xl mt-auto" onClick={() => router.push('/pricing')}>
                Upgrade to Pro <Sparkles className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>

            <div className="p-8 lg:p-10 flex flex-col rounded-2xl border border-border/50 bg-card/30">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-foreground">Max</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">All paid features + Anthropic Claude models</p>
              <div className="mb-1">
                <span className="text-5xl font-pixel tracking-tight text-foreground">$60</span>
                <span className="text-sm text-muted-foreground ml-2">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-8">For Anthropic Sonnet, Opus, and Thinking models</p>
              <ul className="space-y-3 mb-8">
                {[
                  'All paid features',
                  'Claude Sonnet models',
                  'Claude Opus models',
                  'Thinking variants',
                  'Canvas support for Max models',
                  'Priority support',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl mt-auto"
                onClick={() => router.push('/pricing')}
              >
                Upgrade to Max <Sparkles className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border border-border/50 rounded-2xl bg-card/30">
            <div className="flex items-start gap-4">
              <GraduationCap className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium mb-1">Student discount</h3>
                <p className="text-xs text-muted-foreground">
                  Get Pro for $5/month with a university email. Student pricing applies to Pro only.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full shrink-0"
              onClick={() => router.push('/pricing')}
            >
              Get Student Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
            <div className="lg:col-span-2">
              <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-4 block">
                Support
              </span>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-be-vietnam-pro mb-4">
                Questions?
                <br />
                <span className="font-pixel text-2xl sm:text-3xl">Answers.</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Can&apos;t find what you need? Reach out at{' '}
                <a href="mailto:zaid@scira.ai" className="text-foreground hover:underline underline-offset-2">
                  zaid@scira.ai
                </a>
              </p>
              <div className="flex gap-3">
                <Button size="sm" className="rounded-full" onClick={() => router.push('/')}>
                  Start searching <ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => router.push('/pricing')}>
                  View pricing
                </Button>
              </div>
            </div>

            <div className="lg:col-span-3">
              <ProAccordion type="single" collapsible className="w-full">
                <ProAccordionItem value="item-1">
                  <ProAccordionTrigger>What is Scira?</ProAccordionTrigger>
                  <ProAccordionContent>
                    Scira is an open-source AI assistant built for research and action. It searches the web in depth,
                    cites its sources, and connects to 100+ apps via MCP so you can act on what you find without leaving
                    the conversation.
                  </ProAccordionContent>
                </ProAccordionItem>
                <ProAccordionItem value="item-2">
                  <ProAccordionTrigger>What&apos;s the difference between Free, Pro, and Max?</ProAccordionTrigger>
                  <ProAccordionContent>
                    Free includes limited daily research runs with essential models. Pro ($15/month) unlocks unlimited
                    research, standard paid models, PDF analysis, Lookout automations, and priority support. Max
                    ($60/month) includes all paid features plus Anthropic Claude Sonnet, Opus, and Thinking models.
                  </ProAccordionContent>
                </ProAccordionItem>
                <ProAccordionItem value="item-3">
                  <ProAccordionTrigger>Is there a student discount?</ProAccordionTrigger>
                  <ProAccordionContent>
                    Yes! Students with university emails (.edu, .ac.in, .ac.uk, etc.) automatically get Pro for just
                    $5/month &mdash; that&apos;s $120 saved per year. Applied automatically at checkout.
                  </ProAccordionContent>
                </ProAccordionItem>
                <ProAccordionItem value="item-4">
                  <ProAccordionTrigger>Can I cancel anytime?</ProAccordionTrigger>
                  <ProAccordionContent>
                    Yes, cancel any time. Your benefits continue until the end of your billing period.
                  </ProAccordionContent>
                </ProAccordionItem>
                <ProAccordionItem value="item-5">
                  <ProAccordionTrigger>What AI models does Scira use?</ProAccordionTrigger>
                  <ProAccordionContent>
                    Scira uses a range of advanced models including Grok, Claude, GPT, Gemini, and more. Switch between
                    them for each query based on what works best.
                  </ProAccordionContent>
                </ProAccordionItem>
                <ProAccordionItem value="item-6">
                  <ProAccordionTrigger>How does Scira ensure accuracy?</ProAccordionTrigger>
                  <ProAccordionContent>
                    Scira grounds outputs in retrieved sources (RAG + search grounding) and includes inline citations so
                    you can audit the evidence. Agents cross-check multiple sources before synthesizing an answer.
                  </ProAccordionContent>
                </ProAccordionItem>
              </ProAccordion>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8">
            <div className="flex items-center gap-3">
              <SciraLogo className="size-4" />
              <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Scira</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link
                href="/privacy-policy"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <span className="w-px h-4 bg-border/50" />
              <Link
                href="https://x.com/sciraai"
                className="text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
              >
                <XLogoIcon className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="https://git.new/scira"
                className="text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
              >
                <GithubLogoIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
