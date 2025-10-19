'use client';

import {
  Brain,
  Search,
  ArrowUpRight,
  Bot,
  GraduationCap,
  Eye,
  Sparkles,
  Filter,
  X,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
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

export default function AboutPage() {
  const router = useRouter();
  /*
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showCryptoAlert, setShowCryptoAlert] = useState(true);
  */
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [openCategory, setOpenCategory] = useState(false);
  const [openCapabilities, setOpenCapabilities] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);
  const { data: githubStars, isLoading: isLoadingStars } = useGitHubStars();

  /*
  useEffect(() => {
    const hasAcceptedTerms = localStorage.getItem('hasAcceptedTerms');
    if (!hasAcceptedTerms) {
      setShowTermsDialog(true);
    }

    const hasDismissedCryptoAlert = localStorage.getItem('hasDismissedCryptoAlert');
    if (hasDismissedCryptoAlert) {
      setShowCryptoAlert(false);
    }
  }, []);
  */

  /*
  const handleAcceptTerms = () => {
    if (acceptedTerms) {
      setShowTermsDialog(false);
      localStorage.setItem('hasAcceptedTerms', 'true');
    }
  };
  */

  /*
  const handleDismissCryptoAlert = () => {
    setShowCryptoAlert(false);
    localStorage.setItem('hasDismissedCryptoAlert', 'true');
  };
  */

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('query')?.toString();
    if (query) {
      router.push(`/?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Crypto Disclaimer Alert - commented out */}
      {/**
      {showCryptoAlert && (
        <div className="sticky top-0 z-50 border-b border-border bg-amber-50 dark:bg-amber-950/20">
          <Alert className="border-0 rounded-none bg-transparent">
            <AlertDescription className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Scira is not connected to any cryptocurrency tokens or coins. We are purely an AI search engine.
                </span>
              </div>
              <button
                onClick={handleDismissCryptoAlert}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      */}
      {/* Terms Dialog - commented out */}
      {/**
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="sm:max-w-[500px] p-0 bg-background border border-border">
          <div className="p-6 border-b border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <FileText className="size-5" />
                Terms and Privacy
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-2">
                Please review our Terms of Service and Privacy Policy before continuing.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[300px] overflow-y-auto">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Terms of Service
              </h3>
              <p className="text-xs text-muted-foreground">
                By using Scira, you agree to our Terms of Service which outline the rules for using our platform.
              </p>
              <Link href="/terms" className="text-xs text-primary hover:underline inline-flex items-center">
                Read full Terms of Service
                <ArrowUpRight className="size-3 ml-1" />
              </Link>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Privacy Policy
              </h3>
              <p className="text-xs text-muted-foreground">
                Our Privacy Policy describes how we collect, use, and protect your personal information.
              </p>
              <Link href="/privacy-policy" className="text-xs text-primary hover:underline inline-flex items-center">
                Read full Privacy Policy
                <ArrowUpRight className="size-3 ml-1" />
              </Link>
            </div>
          </div>

          <div className="px-6 pt-1 pb-4">
            <div className="flex items-start space-x-3 p-3 rounded-md bg-accent/50 border border-border">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={() => setAcceptedTerms(!acceptedTerms)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                I agree to the Terms of Service and Privacy Policy
              </label>
            </div>
          </div>

          <DialogFooter className="p-6 pt-2">
            <Button onClick={handleAcceptTerms} disabled={!acceptedTerms} className="w-full">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      */}
      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
        <div className="container max-w-6xl mx-auto px-4 sm:px-1">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex justify-items-end gap-1.5 group">
              <SciraLogo className="size-7 transition-transform group-hover:scale-110" />
              <span className="text-2xl font-normal tracking-tighter font-be-vietnam-pro">Scira</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center">
              <div className="flex items-center gap-1">
                <Link
                  href="/"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
                >
                  Search
                </Link>
                <Link
                  href="/pricing"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/terms"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="/privacy-policy"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
                >
                  Privacy
                </Link>
              </div>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              <Link
                href="https://git.new/scira"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                target="_blank"
              >
                <GithubLogoIcon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {!isLoadingStars && githubStars && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {githubStars > 1000 ? `${(githubStars / 1000).toFixed(1)}k` : githubStars}
                    </Badge>
                  )}
                </span>
              </Link>

              <div className="w-px h-6 bg-border hidden sm:block" />

              <ThemeSwitcher />

              <div className="w-px h-6 bg-border hidden sm:block" />

              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                onClick={() => router.push('/')}
              >
                Try Free
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="py-24 px-4">
        <div className="container max-w-4xl mx-auto text-center space-y-12">
          <div className="space-y-6">
            <div className="flex items-end justify-center gap-1 mb-8">
              <SciraLogo className="size-12" />
              <h1 className="text-4xl font-normal font-be-vietnam-pro tracking-tighter">Scira</h1>
            </div>

            <h2 className="text-2xl md:text-3xl font-semibold text-foreground max-w-3xl mx-auto">
              Open Source AI-Powered Search Engine
            </h2>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A clean, minimalistic search engine with RAG and search grounding capabilities. Get accurate, up-to-date
              answers from reliable sources.
            </p>
          </div>

          {/* Search Interface */}
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  name="query"
                  placeholder="Ask anything..."
                  className="w-full h-14 px-6 pr-20 text-base rounded-lg bg-background border-2 border-border focus:border-primary focus:outline-none transition-colors placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 h-10 px-5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="https://git.new/scira"
              className="inline-flex h-11 items-center gap-2 px-6 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
              target="_blank"
            >
              <GithubLogoIcon className="h-4 w-4" />
              <span className="font-medium">View Source</span>
              {!isLoadingStars && githubStars && (
                <Badge variant="secondary" className="ml-2">
                  {githubStars.toLocaleString()}
                </Badge>
              )}
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 px-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-colors"
            >
              <span className="font-medium">Try Now</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      {/* Stats Section */}
      <section className="py-16 px-4 border-y border-border">
        <div className="container max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold">1M+</div>
              <p className="text-muted-foreground">Questions Answered</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">100K+</div>
              <p className="text-muted-foreground">Active Users</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {isLoadingStars ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  `${githubStars?.toLocaleString() || '9,000'}+`
                )}
              </div>
              <p className="text-muted-foreground">GitHub Stars</p>
            </div>
          </div>
        </div>

        {/* Elegant CTA */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-muted/50 border border-border/50 hover:border-border transition-colors">
            <span className="text-sm text-muted-foreground">Ready to explore?</span>
            <Button onClick={() => router.push('/')} size="sm" className="h-8 px-4 text-xs font-medium">
              Start Searching
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </section>
      {/* Awards Section */}
      <section className="py-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold mb-4">Recognition & Awards</h2>
            <p className="text-muted-foreground">Recognized by leading platforms and communities</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="mb-4">
                <Image
                  src="https://cdn.prod.website-files.com/657b3d8ca1cab4015f06c850/680a4d679063da73487739e0_No1prgold-caps-removebg-preview.png"
                  alt="Tiny Startups #1 Product"
                  width={64}
                  height={64}
                  className="size-16 object-contain mx-auto"
                />
              </div>
              <h3 className="font-semibold mb-1">#1 Product of the Week</h3>
              <p className="text-sm text-muted-foreground">Tiny Startups</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="mb-4">
                <Image
                  src="/Winner-Medal-Weekly.svg"
                  alt="Peerlist #1 Project"
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain mx-auto"
                />
              </div>
              <h3 className="font-semibold mb-1">#1 Project of the Week</h3>
              <p className="text-sm text-muted-foreground">Peerlist</p>
            </div>
          </div>

          <div className="text-center">
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

          {/* Subtle CTA */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <span>Try our award-winning search</span>
              <Button
                onClick={() => router.push('/')}
                variant="link"
                size="sm"
                className="h-auto p-0 text-sm font-normal text-primary hover:text-primary/80"
              >
                Get started
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built with modern AI technology to provide accurate and reliable search results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Advanced AI Models</h3>
              <p className="text-muted-foreground">
                Uses multiple state-of-the-art AI models to understand and answer complex questions accurately.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Search</h3>
              <p className="text-muted-foreground">
                Combines RAG and search grounding to retrieve up-to-date information from reliable sources.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Open Source</h3>
              <p className="text-muted-foreground">
                Fully open source and transparent. Contribute to development or self-host your own instance.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Scira Lookout</h3>
              <p className="text-muted-foreground">
                Schedule automated searches to monitor trends and get regular updates on topics that matter to you.
              </p>
            </div>
          </div>

          {/* Feature CTA */}
          <div className="mt-16 text-center">
            <div className="max-w-md mx-auto p-4 sm:p-6 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
              <p className="text-sm text-muted-foreground mb-4">Experience all features in action</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => router.push('/')} size="sm" className="px-4 py-2 text-sm w-full sm:w-auto">
                  Try Now
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
                <Button
                  onClick={() => router.push('/lookout')}
                  variant="outline"
                  size="sm"
                  className="px-4 py-2 text-sm w-full sm:w-auto"
                >
                  Try Lookout
                  <Eye className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Technology Stack */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-semibold mb-4">Built With Industry Leaders</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powered by cutting-edge technology from leading companies
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="mb-6 flex justify-center">
                <VercelLogo />
              </div>
              <h3 className="text-lg font-semibold mb-2">Vercel AI SDK</h3>
              <p className="text-muted-foreground text-sm">Advanced AI framework powering intelligent responses</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="mb-6 flex justify-center">
                <ExaLogo />
              </div>
              <h3 className="text-lg font-semibold mb-2">Exa Search</h3>
              <p className="text-muted-foreground text-sm">Real-time search grounding with reliable sources</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="mb-6 flex justify-center">
                <ElevenLabsLogo />
              </div>
              <h3 className="text-lg font-semibold mb-2">ElevenLabs Voice</h3>
              <p className="text-muted-foreground text-sm">Natural voice synthesis with human-like quality</p>
            </div>
          </div>

          {/* Tech Stack CTA */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/30">
              <span className="text-sm text-muted-foreground">Powered by the best</span>
              <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary hover:text-primary/80">
                <Link href="https://git.new/scira" target="_blank">
                  View source
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* Featured on Vercel Section */}
      <section className="py-16 px-4 border-y border-border">
        <div className="container max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Featured on Vercel&apos;s Blog</h2>
              <p className="text-muted-foreground leading-relaxed">
                Recognized for our innovative use of AI technology and contribution to the developer community through
                the Vercel AI SDK.
              </p>
              <Link
                href="https://vercel.com/blog/ai-sdk-4-1"
                className="inline-flex items-center gap-2 font-medium text-primary hover:text-primary/80 transition-colors"
                target="_blank"
              >
                Read the Feature
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
              <Image src="/vercel-featured.png" alt="Featured on Vercel Blog" fill className="object-cover" />
            </div>
          </div>

          {/* Vercel CTA */}
          <div className="mt-12 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 px-4 sm:px-5 py-3 rounded-lg bg-gradient-to-r from-background to-muted/20 border border-border/50 max-w-xs sm:max-w-none mx-auto">
              <span className="text-sm text-muted-foreground text-center">Featured technology</span>
              <Button onClick={() => router.push('/')} size="sm" className="h-7 px-3 text-xs w-full sm:w-auto">
                Try it now
                <Sparkles className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* Models Section */}
      <section className="py-24 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="mb-20">
            <h2 className="text-3xl font-medium tracking-tight mb-4">AI Models</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Production-ready models from leading AI providers, each optimized for specific use cases.
            </p>
          </div>

          {/* Magical Filter Interface */}
          <div className="mb-12">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filter models</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Category Filter */}
                <Popover open={openCategory} onOpenChange={setOpenCategory}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCategory}
                      className="justify-between w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                      <ArrowUpRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[92.5vw] sm:w-[280px] p-0">
                    <Command>
                      <CommandInput placeholder="Search categories..." className="h-10" />
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
                              className="h-10 px-3"
                            >
                              {category.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Capabilities Filter */}
                <Popover open={openCapabilities} onOpenChange={setOpenCapabilities}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCapabilities}
                      className="justify-between w-full sm:w-auto sm:min-w-[160px]"
                    >
                      {selectedCapabilities.length === 0
                        ? 'All Capabilities'
                        : selectedCapabilities.length === 1
                          ? selectedCapabilities[0]
                          : `${selectedCapabilities.length} selected`}
                      <ArrowUpRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[92.5vw] sm:w-[280px] p-0">
                    <Command>
                      <CommandInput placeholder="Search capabilities..." className="h-10" />
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
                              className="h-10 px-3"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-2.5 h-2.5 rounded-full ${selectedCapabilities.includes(capability.value) ? 'bg-primary' : 'bg-muted'
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

                {/* Clear Filters */}
                {(selectedCategory !== 'all' || selectedCapabilities.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedCapabilities([]);
                    }}
                    className="text-muted-foreground hover:text-foreground w-full sm:w-auto"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {(selectedCategory !== 'all' || selectedCapabilities.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedCategory !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedCategory}
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {selectedCapabilities.map((capability) => (
                  <Badge key={capability} variant="secondary" className="gap-1">
                    {capability}
                    <button
                      onClick={() => setSelectedCapabilities((prev) => prev.filter((item) => item !== capability))}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Models List */}
          <div className="space-y-px bg-border/40 rounded-lg overflow-hidden border border-border/40">
            {(() => {
              // Filter models based on selected filters
              let filteredModels = models.filter((model) => {
                // Category filter
                const categoryMatch = selectedCategory === 'all' || model.category === selectedCategory;

                // Capabilities filter
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

              // Group filtered models by category
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

              // Define order based on user type (assuming non-pro for about page)
              const groupOrder = ['Free', 'Experimental', 'Pro'];
              const orderedGroupEntries = groupOrder
                .filter((category) => groupedModels[category] && groupedModels[category].length > 0)
                .map((category) => [category, groupedModels[category]] as const);

              // Flatten the ordered groups back to a single array
              const sortedModels = orderedGroupEntries.flatMap(([_, categoryModels]) => categoryModels);

              if (sortedModels.length === 0) {
                return (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
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
                    >
                      Clear all filters
                    </Button>
                  </div>
                );
              }

              const modelsToShow = showAllModels ? sortedModels : sortedModels.slice(0, 8);

              return (
                <>
                  {modelsToShow.map((model: any, index: number) => (
                    <div
                      key={model.value}
                      className="group bg-background hover:bg-muted/30 transition-colors duration-150 border-b border-border/30 last:border-b-0"
                    >
                      <div className="py-4 px-4 sm:py-6 sm:px-8">
                        {/* Desktop Layout */}
                        <div className="hidden sm:flex items-center justify-between">
                          {/* Left Side - Model Info */}
                          <div className="flex items-center gap-6 flex-1">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <div className="w-2 h-2 rounded-full bg-muted-foreground group-hover:bg-foreground transition-colors" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <h3 className="font-medium text-foreground truncate">{model.label}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{model.description}</p>
                              </div>
                            </div>
                          </div>

                          {/* Right Side - Capabilities & Category */}
                          <div className="flex items-center gap-8 text-sm">
                            <div className="flex items-center gap-3">
                              {model.vision && <span className="text-muted-foreground font-mono text-xs">Vision</span>}
                              {model.reasoning && (
                                <span className="text-muted-foreground font-mono text-xs">Reasoning</span>
                              )}
                              {model.pdf && <span className="text-muted-foreground font-mono text-xs">PDF</span>}
                              {model.fast && <span className="text-muted-foreground font-mono text-xs">Fast</span>}
                              {model.isNew && <span className="text-muted-foreground font-mono text-xs">New</span>}
                            </div>
                            <div className="text-muted-foreground font-mono text-xs min-w-[60px] text-right">
                              {model.category}
                            </div>
                          </div>
                        </div>

                        {/* Mobile Layout */}
                        <div className="sm:hidden">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-2 h-2 rounded-full bg-muted-foreground group-hover:bg-foreground transition-colors mt-1.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium text-foreground truncate">{model.label}</h3>
                                  {model.pro && (
                                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex-shrink-0">
                                      Pro
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{model.description}</p>
                              </div>
                            </div>
                            <div className="text-muted-foreground font-mono text-xs ml-2 flex-shrink-0">
                              {model.category}
                            </div>
                          </div>

                          {/* Mobile Capabilities - Only show if any exist */}
                          {(model.vision || model.reasoning || model.pdf || model.fast || model.isNew) && (
                            <div className="flex items-center gap-3 ml-5 pt-1">
                              {model.vision && <span className="text-muted-foreground font-mono text-xs">Vision</span>}
                              {model.reasoning && (
                                <span className="text-muted-foreground font-mono text-xs">Reasoning</span>
                              )}
                              {model.pdf && <span className="text-muted-foreground font-mono text-xs">PDF</span>}
                              {model.fast && <span className="text-muted-foreground font-mono text-xs">Fast</span>}
                              {model.isNew && <span className="text-muted-foreground font-mono text-xs">New</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Show More/Less Button */}
                  {sortedModels.length > 8 && (
                    <div className="my-6 flex justify-center">
                      <Button variant="outline" onClick={() => setShowAllModels(!showAllModels)} className="px-6 py-2">
                        {showAllModels ? (
                          <>
                            Show Less
                            <ArrowUpRight className="ml-2 h-4 w-4 rotate-180" />
                          </>
                        ) : (
                          <>
                            Show More ({sortedModels.length - 8} more)
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

          {/* Footer */}
          <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-border/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {models.length} models available across multiple providers
                </p>
                <p className="text-xs text-muted-foreground/60">Search with any model, switch anytime</p>
              </div>
              <Button
                onClick={() => router.push('/')}
                className="bg-foreground text-background hover:bg-foreground/90 font-medium px-6 py-2.5 w-full sm:w-auto"
              >
                Start Searching
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-medium mb-4 tracking-tight">Pricing</h2>
            <p className="text-muted-foreground/80 max-w-lg mx-auto">Simple, transparent pricing for everyone</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="bg-background/50 border border-border/50 rounded-xl p-8 hover:border-border/80 transition-colors flex flex-col">
              <div className="mb-8">
                <h3 className="text-xl font-medium mb-2">Free</h3>
                <p className="text-muted-foreground/70 mb-4">Get started with essential features</p>
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-light tracking-tight">$0</span>
                    <span className="text-muted-foreground/70 ml-2">/month</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-medium text-muted-foreground/60">₹0</span>
                    <span className="text-muted-foreground/60 ml-2 text-sm">/month</span>
                  </div>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">{SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches per day</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Basic AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Search history</span>
                </li>
              </ul>

              <Button
                variant="outline"
                className="w-full border-border/60 hover:border-border"
                onClick={() => router.push('/')}
              >
                Get Started
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="bg-background border border-primary/30 rounded-xl p-8 relative hover:border-primary/50 transition-colors flex flex-col">
              <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>

              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-medium">Pro</h3>
                  <span className="text-xs font-medium text-primary/80 bg-primary/10 px-2.5 py-1 rounded-full">
                    Popular
                  </span>
                </div>
                <p className="text-muted-foreground/70 mb-4">Everything you need for serious work</p>
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-light tracking-tight">${PRICING.PRO_MONTHLY}</span>
                    <span className="text-muted-foreground/70 ml-2">/month</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-medium text-muted-foreground/60">₹{PRICING.PRO_MONTHLY_INR}</span>
                    <span className="text-muted-foreground/60 ml-2 text-sm">1 month access</span>
                  </div>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Unlimited searches</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">All AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">PDF analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Scira Lookout</span>
                </li>
              </ul>

              <Button className="w-full" onClick={() => router.push('/pricing')}>
                Upgrade to Pro
              </Button>
            </div>
          </div>

          {/* Student Discount */}
          <div className="max-w-2xl mx-auto bg-muted/20 border border-border/40 rounded-xl p-6 mt-8">
            <div className="text-center">
              <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="h-5 w-5 text-primary/70" />
              </div>
              <h3 className="font-medium mb-2">🎓 Student discount available</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get Pro for just $5/month! Simply sign up with your university email address and the discount will be
                applied automatically.
              </p>
              <Button onClick={() => router.push('/pricing')} variant="outline" size="sm" className="px-4 py-2">
                Get Student Pricing
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Find answers to common questions about Scira</p>
          </div>

          <ProAccordion type="single" collapsible className="w-full">
            <ProAccordionItem value="item-1">
              <ProAccordionTrigger>What is Scira?</ProAccordionTrigger>
              <ProAccordionContent>
                Scira is an open-source AI-powered search engine that uses RAG (Retrieval-Augmented Generation) and
                search grounding to provide accurate, up-to-date answers from reliable sources.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-2">
              <ProAccordionTrigger>What&apos;s the difference between Free and Pro plans?</ProAccordionTrigger>
              <ProAccordionContent>
                The Free plan offers limited daily searches with basic AI models, while the Pro plan ($15/month)
                provides unlimited searches, access to all AI models, PDF document analysis, and priority support.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-3">
              <ProAccordionTrigger>Is there a student discount?</ProAccordionTrigger>
              <ProAccordionContent>
                Yes! Students with university email addresses (.edu, .ac.in, .ac.uk, etc.) automatically get Pro for
                just $5/month - that&apos;s $120 in annual savings. No verification required, the discount is applied
                automatically at checkout.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-4">
              <ProAccordionTrigger>Can I cancel my subscription anytime?</ProAccordionTrigger>
              <ProAccordionContent>
                Yes, you can cancel your Pro subscription at any time. Your benefits will continue until the end of your
                current billing period.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-5">
              <ProAccordionTrigger>What AI models does Scira use?</ProAccordionTrigger>
              <ProAccordionContent>
                Scira uses a range of advanced AI models including Grok, Claude, OpenAI GPT, Gemini, and more to provide
                the best possible answers for different types of queries.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-6">
              <ProAccordionTrigger>How does Scira ensure information accuracy?</ProAccordionTrigger>
              <ProAccordionContent>
                Scira combines RAG technology with search grounding to retrieve information from reliable sources and
                verify it before providing answers. Each response includes source attribution for transparency.
              </ProAccordionContent>
            </ProAccordionItem>
          </ProAccordion>

          <div className="text-center mt-12 space-y-6">
            <p className="text-muted-foreground">
              Have more questions?{' '}
              <a href="mailto:zaid@scira.ai" className="text-primary hover:text-primary/80 transition-colors">
                Contact us
              </a>
            </p>

            {/* FAQ CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 sm:px-6 py-4 rounded-xl bg-muted/40 border border-border/40 max-w-lg mx-auto">
              <div className="text-center sm:text-left flex-1">
                <p className="text-sm font-medium text-foreground">Ready to get started?</p>
                <p className="text-xs text-muted-foreground">Join thousands using Scira</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={() => router.push('/')} size="sm" className="px-4 py-2 text-sm w-full sm:w-auto">
                  Start now
                  <Search className="ml-1 h-3 w-3" />
                </Button>
                <Button
                  onClick={() => router.push('/pricing')}
                  variant="outline"
                  size="sm"
                  className="px-4 py-2 text-sm w-full sm:w-auto"
                >
                  View pricing
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <SciraLogo className="size-8" />
              <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Scira. All rights reserved.</p>
            </div>

            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link
                href="/privacy-policy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href="https://x.com/sciraai"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  target="_blank"
                >
                  <XLogoIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="https://git.new/scira"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
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
