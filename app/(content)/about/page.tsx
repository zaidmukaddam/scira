'use client';

import { Brain, Search, ArrowUpRight, Bot, GraduationCap, Eye, Filter, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useRouter } from 'next/navigation';
import { GithubLogoIcon, XLogoIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import {
  ProAccordion,
  ProAccordionItem,
  ProAccordionTrigger,
  ProAccordionContent,
} from '@/components/ui/pro-accordion';
import { useGitHubStars } from '@/hooks/use-github-stars';
import { models } from '@/ai/providers';
import { VercelLogo } from '@/components/logos/vercel-logo';
import { ExaLogo } from '@/components/logos/exa-logo';
import { ElevenLabsLogo } from '@/components/logos/elevenlabs-logo';
import { PRICING, SEARCH_LIMITS } from '@/lib/constants';

import { ThemeSwitcher } from '@/components/theme-switcher';
import { SciraLogo } from '@/components/logos/scira-logo';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu';
import { getSearchGroups } from '@/lib/utils';

export default function AboutPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [openCategory, setOpenCategory] = useState(false);
  const [openCapabilities, setOpenCapabilities] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);
  const { data: githubStars, isLoading: isLoadingStars } = useGitHubStars();
  // Marketing hero: simple group selector (exclude Extreme)
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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/95 border-b border-t border-border">
        <div className="container max-w-7xl mx-auto">
          <div className="grid grid-cols-12 items-center h-16 border-x border-border">
            <div className="col-span-6 flex items-center h-full pl-4 border-border">
              <Link href="/" className="flex items-center gap-2 group">
                <SciraLogo className="size-7 transition-transform group-hover:scale-110" />
                <span className="text-2xl font-normal tracking-tighter font-be-vietnam-pro">Scira</span>
              </Link>
            </div>

            <div className="col-span-6 flex items-center justify-end gap-2 h-full px-4">
              <Link
                href="https://git.new/scira"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors rounded-none"
                target="_blank"
              >
                <GithubLogoIcon className="h-4 w-4" />
                <span className="hidden lg:inline">
                  {!isLoadingStars && githubStars && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {githubStars > 1000 ? `${(githubStars / 1000).toFixed(1)}k` : githubStars}
                    </Badge>
                  )}
                </span>
              </Link>

              <div className="w-px h-6 bg-border hidden sm:block" />

              <div className="block">
                <ThemeSwitcher />
              </div>

              <div className="w-px h-6 bg-border hidden sm:block" />

              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-none h-8 md:h-9 px-3 md:px-4"
                onClick={() => router.push('/')}
              >
                <span>Try Free</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Hero Section - Grid Layout */}
      <section className="border-b border-border bg-muted/30">
        <div className="container max-w-7xl mx-auto">
          <div className="grid grid-cols-12 border-l border-r border-border">
            {/* Hero Content - Takes 8 columns */}
            <div className="col-span-12 lg:col-span-8 bg-card p-10 border-r border-b border-border">
              <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30">
                <span className="text-xs font-medium text-primary uppercase tracking-wider">Open Source</span>
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-6 tracking-tight">Agentic Research Platform</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                A clean, minimalistic agentic research platform for grounded, up-to-date answers. Scira plans multi-step
                work, uses tools for web grounding and document retrieval (including PDFs), cites sources, and can
                automate recurring research with Lookout.
              </p>
              <form onSubmit={handleSearch} className="mb-6">
                <div className="mb-4 border border-border bg-background flex flex-col">
                  {/* Textarea area */}
                  <div className="px-4 pt-3">
                    <textarea
                      name="query"
                      placeholder="Ask anything..."
                      rows={2}
                      className="w-full leading-6 text-base bg-transparent focus:outline-none placeholder:text-muted-foreground resize-none"
                    />
                  </div>
                  {/* Bottom toolbar: boxy strip */}
                  <div className="border-t border-border flex items-stretch h-12">
                    {/* XS: Group selector visible on mobile */}
                    <div className="flex sm:hidden pl-2 pr-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="px-3 text-sm flex items-center justify-center text-muted-foreground hover:bg-accent/50 transition-colors border-r border-border"
                          >
                            <span className="truncate max-w-32">
                              {visibleGroups.find((g) => g.id === selectedGroup)?.name || 'Mode'}
                            </span>
                            <ArrowUpRight className="h-4 w-4 opacity-60 ml-2" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" sideOffset={6} className="p-0 w-64 rounded-none">
                          <Command className="rounded-none border-0">
                            <CommandInput placeholder="Search modes..." className="h-9" />
                            <CommandList className="max-h-60">
                              <CommandEmpty>No mode found.</CommandEmpty>
                              <CommandGroup heading="Search Mode">
                                {visibleGroups.map((g) => (
                                  <CommandItem
                                    key={g.id}
                                    value={g.id}
                                    onSelect={() => setSelectedGroup(g.id)}
                                    className="text-sm rounded-none"
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
                    </div>
                    {/* Left: Group selector (sm+) */}
                    <div className="hidden sm:flex sm:w-48 md:w-56">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex-1 px-3 text-sm flex items-center justify-between text-muted-foreground hover:bg-accent/50 transition-colors border-r border-border"
                          >
                            <span className="truncate">
                              {visibleGroups.find((g) => g.id === selectedGroup)?.name || 'Mode'}
                            </span>
                            <ArrowUpRight className="h-4 w-4 opacity-60" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" sideOffset={6} className="p-0 w-64 rounded-none">
                          <Command className="rounded-none border-0">
                            <CommandInput placeholder="Search modes..." className="h-9" />
                            <CommandList className="max-h-60">
                              <CommandEmpty>No mode found.</CommandEmpty>
                              <CommandGroup heading="Search Mode">
                                {visibleGroups.map((g) => (
                                  <CommandItem
                                    key={g.id}
                                    value={g.id}
                                    onSelect={() => setSelectedGroup(g.id)}
                                    className="text-sm rounded-none"
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
                    </div>
                    {/* Spacer */}
                    <div className="flex-1" />
                    {/* Right: Submit button */}
                    <div className="w-auto sm:w-40 md:w-44 border-l border-border">
                      <button
                        type="submit"
                        className="w-full h-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors px-4"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>
              </form>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
                <Link
                  href="https://git.new/scira"
                  className="flex items-center justify-center h-11 gap-2 px-6 bg-foreground text-background hover:bg-foreground/90 transition-colors rounded-none border-r border-border group/link"
                  target="_blank"
                >
                  <GithubLogoIcon className="h-4 w-4 group-hover/link:rotate-12 transition-transform duration-300" />
                  <span className="font-medium">GitHub</span>
                  {!isLoadingStars && githubStars && (
                    <Badge variant="secondary" className="ml-2">
                      {githubStars && githubStars > 1000
                        ? `${(githubStars / 1000).toFixed(1)}k`
                        : githubStars.toLocaleString()}
                    </Badge>
                  )}
                </Link>
                <Link
                  href="/"
                  className="flex items-center justify-center h-11 gap-2 px-6 border border-border hover:border-primary hover:bg-accent transition-colors rounded-none group/link"
                >
                  <span className="font-medium">Try Now</span>
                  <ArrowUpRight className="h-4 w-4 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform duration-300" />
                </Link>
              </div>
            </div>

            {/* Stats Card - Takes 4 columns */}
            <div className="col-span-12 lg:col-span-4 bg-card p-8 border-b border-border group">
              <h3 className="text-lg font-semibold mb-6 group-hover:text-primary transition-colors">Platform Stats</h3>
              <div className="grid grid-cols-1 gap-px bg-border">
                <div className="bg-background p-4 group/stat hover:bg-accent/50 transition-colors">
                  <div className="text-3xl font-bold mb-1 group-hover/stat:scale-110 transition-transform inline-block">
                    1M+
                  </div>
                  <p className="text-sm text-muted-foreground group-hover/stat:text-foreground transition-colors">
                    Questions Answered
                  </p>
                </div>
                <div className="bg-background p-4 group/stat hover:bg-accent/50 transition-colors">
                  <div className="text-3xl font-bold mb-1 group-hover/stat:scale-110 transition-transform inline-block">
                    100K+
                  </div>
                  <p className="text-sm text-muted-foreground group-hover/stat:text-foreground transition-colors">
                    Active Users
                  </p>
                </div>
                <div className="bg-background p-4 group/stat hover:bg-accent/50 transition-colors">
                  <div className="text-3xl font-bold mb-1 group-hover/stat:scale-110 transition-transform inline-block">
                    {isLoadingStars ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      `${githubStars && githubStars > 1000 ? `${(githubStars / 1000).toFixed(1)}k` : githubStars && githubStars > 1000 ? githubStars.toLocaleString() : '9,000'}+`
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground group-hover/stat:text-foreground transition-colors">
                    GitHub Stars
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section - Grid Layout */}
      <section className="border-b border-border">
        <div className="container max-w-7xl mx-auto">
          <div className="grid grid-cols-12 border-l border-r border-border">
            {/* Section Header */}
            <div className="col-span-12 bg-card p-6 border-b border-border">
              <h2 className="text-2xl font-semibold mb-2">Key Features</h2>
              <p className="text-muted-foreground">
                Built for multi-step research: planning, tool use, citations, and automation
              </p>
            </div>

            {/* Features Grid */}
            <div className="col-span-12 grid grid-cols-12">
              <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-card p-6 border-r border-border group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                </div>
                <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                  <Brain className="h-6 w-6 text-primary group-hover:rotate-6 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  Agentic Planning
                </h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                  Breaks complex questions into steps, selects the right models/tools, and executes the workflow end to
                  end.
                </p>
              </div>

              <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-card p-6 border-r border-border group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                </div>
                <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                  <Search className="h-6 w-6 text-primary group-hover:rotate-6 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  Grounded Retrieval
                </h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                  Pulls up-to-date sources, extracts the relevant parts, and produces answers with citations you can
                  audit.
                </p>
              </div>

              <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-card p-6 border-r border-border group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                </div>
                <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                  <Bot className="h-6 w-6 text-primary group-hover:rotate-6 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  Extensible & Open
                </h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                  Open source by default. Self-host, bring your own models/tools, and tailor Scira to your research
                  stack.
                </p>
              </div>

              <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-card p-6 border-border group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                </div>
                <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                  <Eye className="h-6 w-6 text-primary group-hover:rotate-6 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  Lookouts & Automations
                </h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                  Schedule recurring research agents to monitor topics and get regular updates when something changes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Awards Section - Grid Layout */}
      <section className="border-b border-border">
        <div className="container max-w-7xl mx-auto">
          <div className="grid grid-cols-12 border-l border-r border-border">
            {/* Section Header */}
            <div className="col-span-12 bg-card p-6 border-b border-border">
              <h2 className="text-2xl font-semibold mb-2">Recognition & Awards</h2>
              <p className="text-muted-foreground">Recognized by leading platforms and communities</p>
            </div>

            {/* Awards Grid */}
            <div className="col-span-12 grid grid-cols-12">
              <div className="col-span-12 md:col-span-4 bg-card p-8 text-center border-r border-border group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                </div>
                <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Image
                    src="https://cdn.prod.website-files.com/657b3d8ca1cab4015f06c850/680a4d679063da73487739e0_No1prgold-caps-removebg-preview.png"
                    alt="Tiny Startups #1 Product"
                    width={64}
                    height={64}
                    className="size-16 object-contain mx-auto"
                  />
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                  #1 Product of the Week
                </h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                  Tiny Startups
                </p>
              </div>

              <div className="col-span-12 md:col-span-4 bg-card p-8 text-center border-r border-border group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                </div>
                <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Image
                    src="/Winner-Medal-Weekly.svg"
                    alt="Peerlist #1 Project"
                    width={64}
                    height={64}
                    className="h-16 w-16 object-contain mx-auto"
                  />
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                  #1 Project of the Week
                </h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                  Peerlist
                </p>
              </div>

              <div className="col-span-12 md:col-span-4 bg-card p-6 text-center flex items-center justify-center border-border group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                </div>
                <a
                  href="https://openalternative.co/scira?utm_source=openalternative&utm_medium=badge&utm_campaign=embed&utm_content=tool-scira"
                  target="_blank"
                  className="inline-block"
                >
                  <Image
                    src="https://openalternative.co/scira/badge.svg?theme=dark&width=200&height=50"
                    width={200}
                    height={50}
                    alt="Scira badge"
                    className="mx-auto"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Technology Stack - Grid Layout */}
      <section className="border-b border-border">
        <div className="container max-w-7xl mx-auto">
          <div className="grid grid-cols-12 border-l border-r border-border">
            {/* Section Header */}
            <div className="col-span-12 bg-card p-6 border-b border-border">
              <h2 className="text-2xl font-semibold mb-2">Built With Industry Leaders</h2>
              <p className="text-muted-foreground">Powered by cutting-edge technology from leading companies</p>
            </div>

            {/* Tech Stack Grid */}
            <div className="col-span-12 grid grid-cols-12">
              <div className="col-span-12 md:col-span-4 bg-card p-8 text-center border-r border-border group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                </div>
                <div className="mb-6 flex justify-center group-hover:scale-110 transition-transform duration-300">
                  <VercelLogo />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">Vercel AI SDK</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                  Advanced AI framework powering intelligent responses
                </p>
              </div>

              <div className="col-span-12 md:col-span-4 bg-card p-8 text-center border-r border-border group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                </div>
                <div className="mb-6 flex justify-center group-hover:scale-110 transition-transform duration-300">
                  <ExaLogo />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">Exa Search</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                  Real-time web grounding for agentic research
                </p>
              </div>

              <div className="col-span-12 md:col-span-4 bg-card p-8 text-center group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                </div>
                <div className="mb-6 flex justify-center group-hover:scale-110 transition-transform duration-300">
                  <ElevenLabsLogo />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  ElevenLabs Voice
                </h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                  Natural voice synthesis with human-like quality
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Featured on Vercel - Grid Layout */}
      <section className="border-b border-border">
        <div className="container max-w-7xl mx-auto">
          <div className="grid grid-cols-12 border-l border-r border-border">
            <div className="col-span-12 lg:col-span-6 bg-card p-8 border-r border-border group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
              </div>
              <h2 className="text-2xl font-semibold mb-4 group-hover:text-primary transition-colors">
                Featured on Vercel&apos;s Blog
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6 group-hover:text-foreground/80 transition-colors">
                Recognized for our innovative use of AI technology and contribution to the developer community through
                the Vercel AI SDK.
              </p>
              <Link
                href="https://vercel.com/blog/ai-sdk-4-1"
                className="inline-flex items-center gap-2 font-medium text-primary hover:text-primary/80 transition-all duration-300 hover:gap-3 group/link"
                target="_blank"
              >
                Read the Feature
                <ArrowUpRight className="h-4 w-4 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform duration-300" />
              </Link>
            </div>
            <div className="col-span-12 lg:col-span-6 bg-card overflow-hidden group hover:bg-card/95 transition-all duration-300">
              <div className="relative aspect-video w-full h-full group-hover:scale-105 transition-transform duration-500">
                <Image src="/vercel-featured.png" alt="Featured on Vercel Blog" fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Models Section - Grid Layout */}
      <section className="border-b border-border">
        <div className="container max-w-7xl mx-auto">
          <div className="grid grid-cols-12 border-l border-r border-border">
            {/* Section Header */}
            <div className="col-span-12 bg-card p-6 border-b border-border">
              <h2 className="text-2xl font-semibold mb-2">AI Models</h2>
              <p className="text-muted-foreground">
                Production-ready models from leading AI providers, each optimized for specific use cases.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="col-span-12 bg-card p-4 border-b border-border">
              <div className="grid grid-cols-12 gap-px bg-border">
                <Popover open={openCategory} onOpenChange={setOpenCategory}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCategory}
                      className="col-span-12 sm:col-span-4 justify-between rounded-none border-0 bg-background"
                    >
                      {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                      <ArrowUpRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[92.5vw] sm:w-[280px] p-0 rounded-none border border-border bg-card shadow-none">
                    <Command className="rounded-none bg-background">
                      <CommandInput
                        placeholder="Search categories..."
                        className="h-10 rounded-none border-0 bg-background"
                      />
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
                              onSelect={(currentValue) => {
                                setSelectedCategory(currentValue);
                                setOpenCategory(false);
                              }}
                              className="h-10 px-3 rounded-none"
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
                      className="col-span-12 sm:col-span-4 justify-between rounded-none border-0 bg-background"
                    >
                      {selectedCapabilities.length === 0
                        ? 'All Capabilities'
                        : selectedCapabilities.length === 1
                          ? selectedCapabilities[0]
                          : `${selectedCapabilities.length} selected`}
                      <ArrowUpRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[92.5vw] sm:w-[280px] p-0 rounded-none border border-border bg-card shadow-none">
                    <Command className="rounded-none bg-background">
                      <CommandInput placeholder="Search capabilities..." className="h-10 rounded-none bg-background" />
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
                              onSelect={(currentValue) => {
                                setSelectedCapabilities((prev) =>
                                  prev.includes(currentValue)
                                    ? prev.filter((item) => item !== currentValue)
                                    : [...prev, currentValue],
                                );
                              }}
                              className="h-10 px-3 rounded-none"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-2.5 h-2.5 ${
                                    selectedCapabilities.includes(capability.value) ? 'bg-primary' : 'bg-muted'
                                  }`}
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
                    className="col-span-12 sm:col-span-4 text-muted-foreground hover:text-foreground rounded-none border-0 bg-background h-9"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Models Grid */}
            <div className="col-span-12 grid grid-cols-12 border-b border-border">
              {(() => {
                let filteredModels = models.filter((model) => {
                  const categoryMatch = selectedCategory === 'all' || model.category === selectedCategory;
                  const capabilityMatch =
                    selectedCapabilities.length === 0 ||
                    selectedCapabilities.some((capability) => {
                      if (capability === 'vision') return model.vision;
                      if (capability === 'reasoning') return model.reasoning;
                      if (capability === 'pdf') return model.pdf;
                      return false;
                    });
                  return categoryMatch && capabilityMatch;
                });

                const groupedModels = filteredModels.reduce(
                  (acc, model) => {
                    const category = model.category;
                    if (!acc[category]) {
                      acc[category] = [];
                    }
                    acc[category].push(model);
                    return acc;
                  },
                  {} as Record<string, typeof models>,
                );

                const groupOrder = ['Free', 'Experimental', 'Pro'];
                const orderedGroupEntries = groupOrder
                  .filter((category) => groupedModels[category] && groupedModels[category].length > 0)
                  .map((category) => [category, groupedModels[category]] as const);

                const sortedModels = orderedGroupEntries.flatMap(([_, categoryModels]) => categoryModels);

                if (sortedModels.length === 0) {
                  return (
                    <div className="col-span-12 bg-card p-12 text-center border-b border-border">
                      <div className="w-16 h-16 mx-auto mb-4 bg-muted flex items-center justify-center">
                        <Filter className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">No models found</h3>
                      <p className="text-muted-foreground mb-4">Try adjusting your filters to see more models</p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedCategory('all');
                          setSelectedCapabilities([]);
                        }}
                        className="rounded-none"
                      >
                        Clear all filters
                      </Button>
                    </div>
                  );
                }

                const modelsToShow = showAllModels ? sortedModels : sortedModels.slice(0, 12);

                return (
                  <>
                    {modelsToShow.map((model: any, index: number) => (
                      <div
                        key={model.value}
                        className="col-span-12 md:col-span-6 lg:col-span-4 bg-card p-6 group relative overflow-hidden hover:bg-card/90 transition-all duration-300 border-r border-b border-border"
                      >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                        </div>
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {model.label}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="text-xs group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                          >
                            {model.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 group-hover:text-foreground/80 transition-colors">
                          {model.description}
                        </p>
                        <div className="flex flex-wrap gap-px">
                          {model.vision && (
                            <span className="text-xs font-mono text-muted-foreground border border-border px-2 py-1 group-hover:border-primary/50 group-hover:text-foreground/80 transition-all duration-200 hover:scale-105 hover:border-primary cursor-default">
                              Vision
                            </span>
                          )}
                          {model.reasoning && (
                            <span className="text-xs font-mono text-muted-foreground border border-border px-2 py-1 group-hover:border-primary/50 group-hover:text-foreground/80 transition-all duration-200 hover:scale-105 hover:border-primary cursor-default">
                              Reasoning
                            </span>
                          )}
                          {model.pdf && (
                            <span className="text-xs font-mono text-muted-foreground border border-border px-2 py-1 group-hover:border-primary/50 group-hover:text-foreground/80 transition-all duration-200 hover:scale-105 hover:border-primary cursor-default">
                              PDF
                            </span>
                          )}
                          {model.fast && (
                            <span className="text-xs font-mono text-muted-foreground border border-border px-2 py-1 group-hover:border-primary/50 group-hover:text-foreground/80 transition-all duration-200 hover:scale-105 hover:border-primary cursor-default">
                              Fast
                            </span>
                          )}
                          {model.isNew && (
                            <span className="text-xs font-mono text-muted-foreground border border-border px-2 py-1 group-hover:border-primary/50 group-hover:text-foreground/80 transition-all duration-200 hover:scale-105 hover:border-primary cursor-default">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {sortedModels.length > 12 && (
                      <div className="col-span-12 flex justify-center py-6 bg-card">
                        <Button
                          variant="outline"
                          onClick={() => setShowAllModels(!showAllModels)}
                          className="rounded-none"
                        >
                          {showAllModels ? (
                            <>
                              Show Less
                              <ArrowUpRight className="ml-2 h-4 w-4 rotate-180" />
                            </>
                          ) : (
                            <>
                              Show More ({sortedModels.length - 12} more)
                              <ArrowUpRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Models Footer */}
            <div className="col-span-12 bg-card p-6">
              <div className="grid grid-cols-12 gap-px bg-border">
                <div className="col-span-12 md:col-span-8 bg-background p-4">
                  <p className="text-sm text-muted-foreground">
                    {models.length} models available across multiple providers
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Search with any model, switch anytime</p>
                </div>
                <div className="col-span-12 md:col-span-4 bg-background p-4 flex items-center justify-center">
                  <Button
                    onClick={() => router.push('/')}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6 py-2.5 w-full rounded-none"
                  >
                    Start Searching
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Pricing Section - Grid Layout */}
      <section className="border-b border-border">
        <div className="container max-w-7xl mx-auto">
          <div className="grid grid-cols-12 border-l border-r border-border">
            {/* Section Header */}
            <div className="col-span-12 bg-card p-6 border-b border-border">
              <h2 className="text-2xl font-semibold mb-2">Pricing</h2>
              <p className="text-muted-foreground">Simple, transparent pricing for everyone</p>
            </div>

            {/* Pricing Grid */}
            <div className="col-span-12 grid grid-cols-12">
              {/* Free Plan */}
              <div className="col-span-12 md:col-span-6 bg-card p-8 flex flex-col border-b border-border group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                </div>
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">Free</h3>
                  <p className="text-muted-foreground mb-4 group-hover:text-foreground/80 transition-colors">
                    Get started with essential features
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-baseline transition-colors duration-200">
                      <span className="text-3xl font-light tracking-tight">$0</span>
                      <span className="text-muted-foreground ml-2">/month</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-2xl font-medium text-muted-foreground">₹0</span>
                      <span className="text-muted-foreground ml-2 text-sm">/month</span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary/60 mt-2 shrink-0"></div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      {SEARCH_LIMITS.DAILY_SEARCH_LIMIT} research runs per day
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary/60 mt-2 shrink-0"></div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      Basic AI models
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary/60 mt-2 shrink-0"></div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      Research history
                    </span>
                  </li>
                </ul>

                <Button
                  variant="outline"
                  className="w-full border-border hover:border-primary hover:bg-primary/5 rounded-none transition-colors duration-200"
                  onClick={() => router.push('/')}
                >
                  Get Started
                </Button>
              </div>

              {/* Pro Plan */}
              <div className="col-span-12 md:col-span-6 bg-card p-8 flex flex-col border-l border-b border-border group relative overflow-hidden hover:bg-card/95 transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-px bg-primary animate-reveal-line" />
                </div>
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">Pro</h3>
                    <Badge
                      variant="secondary"
                      className="text-xs group-hover:bg-primary/20 group-hover:text-primary transition-colors"
                    >
                      Popular
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4 group-hover:text-foreground/80 transition-colors">
                    Everything you need for serious work
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-baseline transition-colors duration-200">
                      <span className="text-3xl font-light tracking-tight">${PRICING.PRO_MONTHLY}</span>
                      <span className="text-muted-foreground ml-2">/month</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-2xl font-medium text-muted-foreground">₹{PRICING.PRO_MONTHLY_INR}</span>
                      <span className="text-muted-foreground ml-2 text-sm">(excl. GST)/month</span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary mt-2 shrink-0"></div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      Unlimited research
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary mt-2 shrink-0"></div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      All AI models
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary mt-2 shrink-0"></div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      PDF analysis
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary mt-2 shrink-0"></div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      Priority support
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary mt-2 shrink-0"></div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      Scira Lookout
                    </span>
                  </li>
                </ul>

                <Button
                  className="w-full rounded-none transition-colors duration-200"
                  onClick={() => router.push('/pricing')}
                >
                  Upgrade to Pro
                </Button>
              </div>
            </div>

            {/* Student Discount */}
            <div className="col-span-12 bg-card p-6 border-border">
              <div className="grid grid-cols-12 gap-px bg-border">
                <div className="col-span-12 md:col-span-8 bg-background p-6 text-center md:text-left">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center mx-auto md:mx-0 mb-3">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Student discount available</h3>
                  <p className="text-sm text-muted-foreground">
                    Get Pro for just $5/month! Simply sign up with your university email address and the discount will
                    be applied automatically.
                  </p>
                </div>
                <div className="col-span-12 md:col-span-4 bg-background p-6 flex items-center justify-center">
                  <Button
                    onClick={() => router.push('/pricing')}
                    variant="outline"
                    size="sm"
                    className="rounded-none w-full"
                  >
                    Get Student Pricing
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* FAQ Section - Grid Layout */}
      <section className="border-b border-border">
        <div className="container max-w-7xl mx-auto">
          <div className="grid grid-cols-12 border-l border-r border-border">
            {/* Section Header */}
            <div className="col-span-12 bg-card p-6 border-b border-border">
              <h2 className="text-2xl font-semibold mb-2">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">Find answers to common questions about Scira</p>
            </div>

            {/* FAQ Accordion */}
            <div className="col-span-12 bg-card p-6 border-b border-border">
              <ProAccordion type="single" collapsible className="w-full">
                <ProAccordionItem value="item-1">
                  <ProAccordionTrigger>What is Scira?</ProAccordionTrigger>
                  <ProAccordionContent>
                    Scira is an open-source agentic research platform. It combines planning + tool use with RAG
                    (Retrieval-Augmented Generation) and search grounding to produce accurate, up-to-date answers with
                    citations.
                  </ProAccordionContent>
                </ProAccordionItem>

                <ProAccordionItem value="item-2">
                  <ProAccordionTrigger>What&apos;s the difference between Free and Pro plans?</ProAccordionTrigger>
                  <ProAccordionContent>
                    The Free plan includes limited daily research runs with essential models, while the Pro plan
                    ($15/month) unlocks unlimited research, access to all AI models, PDF document analysis, Lookout
                    automations, and priority support.
                  </ProAccordionContent>
                </ProAccordionItem>

                <ProAccordionItem value="item-3">
                  <ProAccordionTrigger>Is there a student discount?</ProAccordionTrigger>
                  <ProAccordionContent>
                    Yes! Students with university email addresses (.edu, .ac.in, .ac.uk, etc.) automatically get Pro for
                    just $5/month - that&apos;s $120 in annual savings. No verification required, the discount is
                    applied automatically at checkout.
                  </ProAccordionContent>
                </ProAccordionItem>

                <ProAccordionItem value="item-4">
                  <ProAccordionTrigger>Can I cancel my subscription anytime?</ProAccordionTrigger>
                  <ProAccordionContent>
                    Yes, you can cancel your Pro subscription at any time. Your benefits will continue until the end of
                    your current billing period.
                  </ProAccordionContent>
                </ProAccordionItem>

                <ProAccordionItem value="item-5">
                  <ProAccordionTrigger>What AI models does Scira use?</ProAccordionTrigger>
                  <ProAccordionContent>
                    Scira uses a range of advanced AI models including Grok, Claude, OpenAI GPT, Gemini, and more to
                    provide the best possible answers for different types of queries.
                  </ProAccordionContent>
                </ProAccordionItem>

                <ProAccordionItem value="item-6">
                  <ProAccordionTrigger>How does Scira ensure information accuracy?</ProAccordionTrigger>
                  <ProAccordionContent>
                    Scira grounds outputs in retrieved sources (RAG + search grounding) and includes citations so you
                    can audit the evidence. Agents can cross-check multiple sources before synthesizing an answer.
                  </ProAccordionContent>
                </ProAccordionItem>
              </ProAccordion>
            </div>

            {/* FAQ Footer */}
            <div className="col-span-12 bg-card p-6 border-border">
              <div className="grid grid-cols-12 gap-px bg-border">
                <div className="col-span-12 md:col-span-8 bg-background p-4">
                  <p className="text-sm font-medium text-foreground mb-1">Ready to get started?</p>
                  <p className="text-xs text-muted-foreground">
                    Have more questions?{' '}
                    <a href="mailto:zaid@scira.ai" className="text-primary hover:text-primary/80 transition-colors">
                      Contact us
                    </a>
                  </p>
                </div>
                <div className="col-span-12 md:col-span-4 bg-background p-4 grid grid-cols-2">
                  <Button
                    onClick={() => router.push('/')}
                    size="sm"
                    className="rounded-none border-0 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Start now
                    <Search className="ml-1 h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => router.push('/pricing')}
                    variant="outline"
                    size="sm"
                    className="rounded-none border-0"
                  >
                    View pricing
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Footer - Grid Layout */}
      <footer>
        <div className="container max-w-7xl mx-auto">
          <div className="grid grid-cols-12 border-l border-r border-border">
            <div className="col-span-12 md:col-span-8 bg-card p-4 md:p-6 border-r border-b border-border">
              <div className="flex items-center gap-3">
                <SciraLogo className="size-8" />
                <p className="text-sm text-muted-foreground">
                  © {new Date().getFullYear()} Scira. All rights reserved.
                </p>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4 bg-card p-0 border-b border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border h-full">
                <Link
                  href="/terms"
                  className="flex items-center justify-center h-12 text-sm text-muted-foreground hover:text-foreground transition-colors border-r md:border-r-0 md:border-0 border-border"
                >
                  Terms
                </Link>
                <Link
                  href="/privacy-policy"
                  className="flex items-center justify-center h-12 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="https://x.com/sciraai"
                  className="flex items-center justify-center h-12 text-muted-foreground hover:text-foreground transition-colors border-r md:border-r-0 md:border-0 border-border"
                  target="_blank"
                >
                  <XLogoIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="https://git.new/scira"
                  className="flex items-center justify-center h-12 text-muted-foreground hover:text-foreground transition-colors"
                  target="_blank"
                >
                  <GithubLogoIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
