'use client';

import { Brain, Search, ArrowUpRight, ArrowRight, Bot, GraduationCap, Eye, Filter, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useMemo } from 'react';
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
import { models } from '@/ai/providers';
import { VercelLogo } from '@/components/logos/vercel-logo';
import { ExaLogo } from '@/components/logos/exa-logo';
import { ElevenLabsLogo } from '@/components/logos/elevenlabs-logo';
import { PRICING, SEARCH_LIMITS } from '@/lib/constants';

import { ThemeSwitcher } from '@/components/theme-switcher';
import { SciraLogo } from '@/components/logos/scira-logo';
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
      {/* Navigation - Clean & Minimal */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between h-14 px-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <SciraLogo className="size-6 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-xl font-light tracking-tighter font-be-vietnam-pro">scira</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="https://git.new/scira"
                className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
              >
                <GithubLogoIcon className="h-4 w-4" />
                {!isLoadingStars && githubStars && (
                  <span className="text-xs tabular-nums">
                    {githubStars > 1000 ? `${(githubStars / 1000).toFixed(1)}k` : githubStars}
                  </span>
                )}
              </Link>

              <ThemeSwitcher />

              <Button
                size="sm"
                variant="outline"
                className="h-8 px-4 text-sm rounded-none"
                onClick={() => router.push('/')}
              >
                Try Scira
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Minimal & Impactful */}
      <section className="relative">
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-8">
              <span className="text-xs text-muted-foreground tracking-wide">Open Source</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-xs text-muted-foreground tracking-wide">AGPL-3.0 License</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.05] text-foreground font-be-vietnam-pro mb-8">
              Research at the
              <br />
              speed of thought
            </h1>

            {/* Description */}
            <p className="text-lg text-muted-foreground leading-relaxed mb-12 max-w-xl">
              An agentic research platform that plans multi-step work, grounds answers in real sources, and automates recurring research.
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    name="query"
                    type="text"
                    placeholder="Ask anything..."
                    className="w-full h-12 px-4 text-base bg-background border border-border focus:border-foreground/30 focus:outline-none transition-colors placeholder:text-muted-foreground"
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-12 px-4 text-sm text-muted-foreground bg-background border border-border hover:border-foreground/30 transition-colors flex items-center justify-between gap-2 min-w-[140px]"
                    >
                      <span>{visibleGroups.find((g) => g.id === selectedGroup)?.name || 'Mode'}</span>
                      <ArrowUpRight className="h-3 w-3 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 w-64">
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
                  className="h-12 px-8 bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="https://git.new/scira"
                className="inline-flex items-center gap-2 text-sm text-foreground hover:text-foreground/70 transition-colors group"
                target="_blank"
              >
                <GithubLogoIcon className="h-4 w-4" />
                <span>Star on GitHub</span>
                {!isLoadingStars && githubStars && (
                  <span className="text-xs text-muted-foreground">
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

          {/* Stats - Right aligned on desktop */}
          <div className="mt-16 lg:absolute lg:right-6 lg:top-24 lg:mt-0">
            <div className="flex lg:flex-col gap-8 lg:gap-6">
              <div>
                <div className="text-3xl lg:text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro">5M+</div>
                <div className="text-xs text-muted-foreground mt-1">Searches</div>
              </div>
              <div>
                <div className="text-3xl lg:text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro">100K+</div>
                <div className="text-xs text-muted-foreground mt-1">Users</div>
              </div>
              <div>
                <div className="text-3xl lg:text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro">
                  {isLoadingStars ? '...' : `${githubStars && githubStars > 1000 ? `${(githubStars / 1000).toFixed(1)}k` : githubStars || '11k'}+`}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Stars</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-12">
            <p className="text-xs text-muted-foreground tracking-wide mb-3">Capabilities</p>
            <h2 className="text-2xl font-light tracking-tight font-be-vietnam-pro">What makes Scira different</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            <div className="bg-background p-8 group">
              <Brain className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors mb-6" />
              <h3 className="text-base font-medium mb-2 text-foreground">Agentic Planning</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Breaks complex questions into steps, selects the right models and tools, executes workflows end to end.
              </p>
            </div>

            <div className="bg-background p-8 group">
              <Search className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors mb-6" />
              <h3 className="text-base font-medium mb-2 text-foreground">Grounded Retrieval</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pulls up-to-date sources, extracts relevant parts, produces answers with citations you can audit.
              </p>
            </div>

            <div className="bg-background p-8 group">
              <Bot className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors mb-6" />
              <h3 className="text-base font-medium mb-2 text-foreground">Extensible & Open</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Open source by default. Self-host, bring your own models and tools, tailor to your stack.
              </p>
            </div>

            <div className="bg-background p-8 group">
              <Eye className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors mb-6" />
              <h3 className="text-base font-medium mb-2 text-foreground">Lookouts</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Schedule recurring research agents to monitor topics and get updates when something changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Awards Section */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 group">
                <Image
                  src="https://cdn.prod.website-files.com/657b3d8ca1cab4015f06c850/680a4d679063da73487739e0_No1prgold-caps-removebg-preview.png"
                  alt="Tiny Startups"
                  width={32}
                  height={32}
                  className="opacity-60 group-hover:opacity-100 transition-opacity"
                />
                <div>
                  <p className="text-xs font-medium text-foreground">#1 Product</p>
                  <p className="text-xs text-muted-foreground">Tiny Startups</p>
                </div>
              </div>

              <span className="w-px h-8 bg-border" />

              <div className="flex items-center gap-3 group">
                <Image
                  src="/Winner-Medal-Weekly.svg"
                  alt="Peerlist"
                  width={32}
                  height={32}
                  className="opacity-60 group-hover:opacity-100 transition-opacity"
                />
                <div>
                  <p className="text-xs font-medium text-foreground">#1 Project</p>
                  <p className="text-xs text-muted-foreground">Peerlist</p>
                </div>
              </div>
            </div>

            <a
              href="https://openalternative.co/scira?utm_source=openalternative&utm_medium=badge&utm_campaign=embed&utm_content=tool-scira"
              target="_blank"
              className="opacity-60 hover:opacity-100 transition-opacity"
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

      {/* Built With Section */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-16">
            <p className="text-xs text-muted-foreground tracking-wide shrink-0">Built with</p>
            <div className="flex flex-wrap items-center gap-8 md:gap-12">
              <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                <VercelLogo />
                <span className="text-sm text-muted-foreground">Vercel AI SDK</span>
              </div>
              <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                <ExaLogo />
                <span className="text-sm text-muted-foreground">Exa Search</span>
              </div>
              <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                <ElevenLabsLogo />
                <span className="text-sm text-muted-foreground">ElevenLabs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured on Vercel */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="px-6 py-16 lg:py-24 lg:pr-16">
              <p className="text-xs text-muted-foreground tracking-wide mb-3">Press</p>
              <h2 className="text-2xl font-light tracking-tight font-be-vietnam-pro mb-4">Featured on Vercel</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Recognized for innovative use of AI technology and contribution to the developer community through the Vercel AI SDK.
              </p>
              <Link
                href="https://vercel.com/blog/ai-sdk-4-1"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/70 transition-colors group"
                target="_blank"
              >
                Read the feature
                <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
            <div className="relative aspect-video lg:aspect-auto lg:h-full border-t lg:border-t-0 lg:border-l border-border overflow-hidden">
              <Image
                src="/vercel-featured.png"
                alt="Featured on Vercel Blog"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Models Section */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-8">
            <p className="text-xs text-muted-foreground tracking-wide mb-3">AI Providers</p>
            <h2 className="text-2xl font-light tracking-tight font-be-vietnam-pro">Models</h2>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Popover open={openCategory} onOpenChange={setOpenCategory}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCategory}
                  className="h-9 justify-between rounded-none"
                >
                  {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                  <ArrowUpRight className="ml-2 h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
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
                          onSelect={(currentValue) => {
                            setSelectedCategory(currentValue);
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
                  className="h-9 justify-between rounded-none"
                >
                  {selectedCapabilities.length === 0
                    ? 'All Capabilities'
                    : selectedCapabilities.length === 1
                      ? selectedCapabilities[0]
                      : `${selectedCapabilities.length} selected`}
                  <ArrowUpRight className="ml-2 h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
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
                          onSelect={(currentValue) => {
                            setSelectedCapabilities((prev) =>
                              prev.includes(currentValue)
                                ? prev.filter((item) => item !== currentValue)
                                : [...prev, currentValue],
                            );
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 ${selectedCapabilities.includes(capability.value) ? 'bg-foreground' : 'bg-border'
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
                className="h-9 text-muted-foreground rounded-none"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Models Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
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
                  <div className="col-span-full bg-background p-12 text-center">
                    <Filter className="w-6 h-6 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">No models found</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-none"
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
                      className="bg-background p-6 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-medium text-foreground">{model.label}</h3>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {model.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                        {model.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {model.vision && (
                          <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5">Vision</span>
                        )}
                        {model.reasoning && (
                          <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5">Reasoning</span>
                        )}
                        {model.pdf && (
                          <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5">PDF</span>
                        )}
                        {model.fast && (
                          <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5">Fast</span>
                        )}
                        {model.isNew && (
                          <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5">New</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {sortedModels.length > 9 && (
                    <div className="col-span-full bg-background flex justify-center py-6">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-none"
                        onClick={() => setShowAllModels(!showAllModels)}
                      >
                        {showAllModels ? 'Show Less' : `Show More (${sortedModels.length - 9} more)`}
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Models Footer */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">{models.length} models available</p>
              <p className="text-xs text-muted-foreground">Search with any model, switch anytime</p>
            </div>
            <Button size="sm" className="rounded-none" onClick={() => router.push('/')}>
              Start Searching
              <ArrowRight className="w-3 h-3 ml-1.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-12">
            <p className="text-xs text-muted-foreground tracking-wide mb-3">Plans</p>
            <h2 className="text-2xl font-light tracking-tight font-be-vietnam-pro">Pricing</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            {/* Free Plan */}
            <div className="bg-background p-8 lg:p-10 flex flex-col">
              <h3 className="text-lg font-medium mb-2 text-foreground">Free</h3>
              <p className="text-sm text-muted-foreground mb-6">Get started with essential features</p>
              <div className="flex items-baseline mb-8">
                <span className="text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro">$0</span>
                <span className="text-sm text-muted-foreground ml-2">/month</span>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />
                  {SEARCH_LIMITS.DAILY_SEARCH_LIMIT} research runs per day
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />
                  Basic AI models
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />
                  Research history
                </li>
              </ul>

              <Button variant="outline" className="w-full h-11 rounded-none mt-auto" onClick={() => router.push('/')}>
                Get Started
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="bg-muted/20 p-8 lg:p-10 flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-medium text-foreground">Pro</h3>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5">
                  Popular
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Everything for serious research</p>
              <div className="mb-1">
                <span className="text-4xl font-light tracking-tight text-foreground font-be-vietnam-pro">${PRICING.PRO_MONTHLY}</span>
                <span className="text-sm text-muted-foreground ml-2">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8">
                ₹{PRICING.PRO_MONTHLY_INR} <span className="text-xs">(excl. GST)</span>
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />
                  Unlimited research
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />
                  All AI models
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />
                  PDF analysis
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />
                  Priority support
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-foreground/40 mt-2 shrink-0" />
                  Scira Lookout
                </li>
              </ul>

              <Button className="w-full h-11 rounded-none mt-auto" onClick={() => router.push('/pricing')}>
                Upgrade to Pro
              </Button>
            </div>
          </div>

          {/* Student Discount */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border border-border">
            <div className="flex items-start gap-4">
              <GraduationCap className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium mb-1">Student discount</h3>
                <p className="text-xs text-muted-foreground">Get Pro for $5/month with a university email address.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-none" onClick={() => router.push('/pricing')}>
              Get Student Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-12">
            <p className="text-xs text-muted-foreground tracking-wide mb-3">Support</p>
            <h2 className="text-2xl font-light tracking-tight font-be-vietnam-pro">FAQ</h2>
          </div>

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

          {/* FAQ Footer */}
          <div className="mt-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Have more questions?</p>
              <p className="text-xs text-muted-foreground">
                Reach out at{' '}
                <a href="mailto:zaid@scira.ai" className="text-foreground hover:underline">
                  zaid@scira.ai
                </a>
              </p>
            </div>
            <div className="flex gap-3">
              <Button size="sm" className="rounded-none" onClick={() => router.push('/')}>
                Start searching
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-none" onClick={() => router.push('/pricing')}>
                View pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <SciraLogo className="size-4" />
              <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} Scira</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <span className="w-px h-4 bg-border" />
              <Link
                href="https://x.com/sciraai"
                className="text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
              >
                <XLogoIcon className="h-4 w-4" />
              </Link>
              <Link
                href="https://git.new/scira"
                className="text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
              >
                <GithubLogoIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
