/* eslint-disable @next/next/no-img-element */
'use client';

import {
  Brain,
  Command,
  GraduationCap,
  Image as ImageIcon,
  Search,
  Sparkles,
  Users,
  FileText,
  ShieldCheck,
  ArrowUpRight,
  Check,
  Bot,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TextLoop } from '@/components/core/text-loop';
import { TextShimmer } from '@/components/core/text-shimmer';
import { VercelLogo } from '@/components/logos/vercel-logo';
import { TavilyLogo } from '@/components/logos/tavily-logo';
import { ElevenLabsLogo } from '@/components/logos/elevenlabs-logo';
import { useRouter } from 'next/navigation';
import { GithubLogo, XLogo } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import {
  ProAccordion,
  ProAccordionItem,
  ProAccordionTrigger,
  ProAccordionContent,
} from '@/components/ui/pro-accordion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function AboutPage() {
  const router = useRouter();
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    // Check if user has seen the terms
    const hasAcceptedTerms = localStorage.getItem('hasAcceptedTerms');
    if (!hasAcceptedTerms) {
      setShowTermsDialog(true);
    }
  }, []);

  const handleAcceptTerms = () => {
    if (acceptedTerms) {
      setShowTermsDialog(false);
      localStorage.setItem('hasAcceptedTerms', 'true');
    }
  };

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
      {/* Terms Dialog */}
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
                By using Scira, you agree to our Terms of Service which outline the rules for using our platform. This
                includes guidelines on acceptable use, intellectual property rights, and limitations of liability.
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
                Our Privacy Policy describes how we collect, use, and protect your personal information. We take your
                privacy seriously and are committed to maintaining the confidentiality of your data.
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

      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-neutral-200 dark:border-neutral-800">
        <div className="container max-w-screen-xl mx-auto py-4 px-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/scira.png"
              alt="Scira"
              width={100}
              height={100}
              className="size-7 invert dark:invert-0"
              quality={100}
            />
            <span className="font-normal font-be-vietnam-pro">Scira</span>
          </Link>

          <nav className="flex items-center gap-8">
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Terms
            </Link>
            <Link
              href="/privacy-policy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Privacy
            </Link>
            <Link
              href="https://git.new/scira"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubLogo className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50/40 to-transparent dark:from-gray-950/40" />
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
        <div className="relative container max-w-screen-xl mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto space-y-8 text-center"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {/* Logo */}
            <motion.div variants={item}>
              <Link href="/" className="inline-flex items-center gap-3">
                <Image
                  src="/scira.png"
                  alt="Scira"
                  width={100}
                  height={100}
                  className="size-14 invert dark:invert-0"
                  quality={100}
                />
                <span className="text-4xl font-medium tracking-tight font-be-vietnam-pro">Scira</span>
              </Link>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={item}
              className="text-2xl sm:text-3xl font-normal tracking-tight text-balance font-be-vietnam-pro"
            >
              Minimalistic Open Source AI-Powered Search Engine
            </motion.h1>

            {/* Description */}
            <motion.p variants={item} className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A minimalistic AI-powered search engine with RAG and search grounding capabilities. Open source and built
              for everyone.
            </motion.p>

            {/* Search Box */}
            <motion.form variants={item} className="max-w-xl mx-auto w-full" onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  name="query"
                  placeholder="Ask anything..."
                  className="w-full h-14 px-6 rounded-xl bg-background border border-input focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const query = e.currentTarget.value;
                      if (query) {
                        router.push(`/?q=${encodeURIComponent(query)}`);
                      }
                    }
                  }}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  Search
                </button>
              </div>
            </motion.form>

            {/* CTA Buttons */}
            <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="https://git.new/scira"
                className="inline-flex h-11 items-center gap-2 px-5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubLogo className="h-5 w-5" />
                <span className="font-medium">View Source</span>
              </Link>
              <Link
                href="/"
                className="inline-flex h-11 items-center gap-2 px-5 rounded-lg bg-secondary text-secondary-foreground border border-input hover:border-ring transition-all"
              >
                <span className="font-medium">Try Now</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Search Simulation */}
      <section className="py-24 px-4 border-y border-border bg-accent/20">
        <div className="container max-w-screen-xl mx-auto">
          <motion.div
            className="max-w-3xl mx-auto space-y-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-medium tracking-tight">RAG & Search Grounding</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Scira combines RAG and search grounding to deliver accurate, up-to-date answers from reliable sources.
              </p>
            </div>

            <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="text-xs text-muted-foreground">Search Demo</div>
              </div>
              <div className="p-6 space-y-6">
                {/* Query */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent shrink-0"></div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Query</p>
                    <p className="font-medium">Explain quantum computing and its real-world applications</p>
                  </div>
                </div>

                {/* Processing */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Processing</p>
                      <TextLoop interval={1.5}>
                        <p className="text-sm font-medium">🔍 Retrieving relevant information...</p>
                        <p className="text-sm font-medium">📚 Processing search results...</p>
                        <p className="text-sm font-medium">🤖 Generating response...</p>
                        <p className="text-sm font-medium">✨ Enhancing with context...</p>
                      </TextLoop>
                    </div>
                    <div className="space-y-1.5">
                      <TextShimmer className="text-sm leading-relaxed font-medium">
                        Combining insights from multiple reliable sources...
                      </TextShimmer>
                    </div>
                  </div>
                </div>

                {/* Response */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 shrink-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Response</p>
                    <div className="prose prose-neutral dark:prose-invert prose-sm max-w-none">
                      <p>
                        Quantum computing is a revolutionary technology that harnesses quantum mechanics to solve
                        complex problems traditional computers cannot handle efficiently...
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <div className="text-xs py-1 px-2 bg-accent rounded-md text-accent-foreground">
                          Nature Physics
                        </div>
                        <div className="text-xs py-1 px-2 bg-accent rounded-md text-accent-foreground">
                          IBM Research
                        </div>
                        <div className="text-xs py-1 px-2 bg-accent rounded-md text-accent-foreground">
                          MIT Technology Review
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Powered By Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-accent/10">
        <div className="container max-w-screen-2xl mx-auto !w-full">
          <motion.div
            className="max-w-6xl mx-auto space-y-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-6">
              <motion.h2
                className="text-4xl font-medium tracking-tight"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                Powered By Industry Leaders
              </motion.h2>
              <motion.p
                className="text-muted-foreground max-w-3xl mx-auto text-lg leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Built with cutting-edge technology from the world&apos;s most innovative companies
              </motion.p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              <motion.div
                className="group relative p-12 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 flex flex-col items-center justify-center gap-8 shadow-lg hover:shadow-xl transition-all duration-300 min-h-[240px] overflow-hidden"
                whileHover={{ y: -4, scale: 1.02 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 w-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                  <VercelLogo />
                </div>
                <div className="relative z-10 text-center space-y-2">
                  <h3 className="font-semibold text-lg">Vercel AI SDK</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Advanced AI framework powering intelligent responses
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="group relative p-12 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 flex flex-col items-center justify-center gap-8 shadow-lg hover:shadow-xl transition-all duration-300 min-h-[240px] overflow-hidden"
                whileHover={{ y: -4, scale: 1.02 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 w-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                  <TavilyLogo />
                </div>
                <div className="relative z-10 text-center space-y-2">
                  <h3 className="font-semibold text-lg">Tavily Search</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Real-time search grounding with reliable sources
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="group relative p-12 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 flex flex-col items-center justify-center gap-8 shadow-lg hover:shadow-xl transition-all duration-300 min-h-[240px] overflow-hidden"
                whileHover={{ y: -4, scale: 1.02 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 w-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                  <ElevenLabsLogo />
                </div>
                <div className="relative z-10 text-center space-y-2">
                  <h3 className="font-semibold text-lg">ElevenLabs Voice</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Natural voice synthesis with human-like quality
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-4 border-y border-border bg-muted/30">
        <div className="container max-w-screen-xl mx-auto">
          <motion.div
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-12 gap-x-8">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="text-5xl font-medium">1M+</div>
                <p className="text-muted-foreground">Questions Answered</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="text-5xl font-medium">100K+</div>
                <p className="text-muted-foreground">Active Users</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="text-5xl font-medium">7K+</div>
                <p className="text-muted-foreground">GitHub Stars</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Highlight Section */}
      <section className="py-24 px-4 bg-background">
        <div className="container max-w-screen-xl mx-auto">
          <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
              <div className="lg:col-span-3 space-y-5">
                <h2 className="text-3xl font-medium tracking-tight">Featured on Vercel&apos;s Blog</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Recognized for our innovative use of AI technology and contribution to the developer community through
                  the Vercel AI SDK.
                </p>
                <Link
                  href="https://vercel.com/blog/ai-sdk-4-1"
                  className="inline-flex items-center gap-2 font-medium hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read the Feature
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="lg:col-span-2 relative aspect-video rounded-lg overflow-hidden border border-border">
                <Image src="/vercel-featured.png" alt="Featured on Vercel Blog" fill className="object-cover" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Models Section */}
      <section className="py-24 px-4 bg-accent/10 border-y border-border">
        <div className="container max-w-screen-xl mx-auto">
          <motion.div
            className="max-w-3xl mx-auto space-y-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-medium tracking-tight">Powered By Advanced Models</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Each model is carefully selected for its unique strengths
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch justify-center">
              <div className="p-5 rounded-lg bg-card border border-border shadow-sm">
                <h3 className="font-medium">Grok 3.0</h3>
                <p className="text-sm text-muted-foreground mt-1">xAI&apos;s most intelligent model</p>
              </div>
              <div className="p-5 rounded-lg bg-card border border-border shadow-sm">
                <h3 className="font-medium">Grok 3.0 Mini</h3>
                <p className="text-sm text-muted-foreground mt-1">xAI&apos;s most efficient model</p>
              </div>
              <div className="p-5 rounded-lg bg-card border border-border shadow-sm">
                <h3 className="font-medium">Grok 2.0 Vision</h3>
                <p className="text-sm text-muted-foreground mt-1">xAI&apos;s most advanced vision model</p>
              </div>
              <div className="p-5 rounded-lg bg-card border border-border shadow-sm">
                <h3 className="font-medium">OpenAI GPT 4o</h3>
                <p className="text-sm text-muted-foreground mt-1">OpenAI&apos;s smartest model</p>
              </div>
              <div className="p-5 rounded-lg bg-card border border-border shadow-sm">
                <h3 className="font-medium">OpenAI o4 mini</h3>
                <p className="text-sm text-muted-foreground mt-1">OpenAI&apos;s reasoning model</p>
              </div>
              <div className="p-5 rounded-lg bg-card border border-border shadow-sm">
                <h3 className="font-medium">Claude 3.7 Sonnet</h3>
                <p className="text-sm text-muted-foreground mt-1">Anthropic&apos;s most advanced model</p>
              </div>
              <div className="p-5 rounded-lg bg-card border border-border shadow-sm">
                <h3 className="font-medium">Gemini 2.5 Flash (Thinking)</h3>
                <p className="text-sm text-muted-foreground mt-1">Google&apos;s most advanced model</p>
              </div>
              <div className="p-5 rounded-lg bg-card border border-border shadow-sm">
                <h3 className="font-medium">Gemini 2.5 Pro (Preview)</h3>
                <p className="text-sm text-muted-foreground mt-1">Google&apos;s most advanced model</p>
              </div>
              <div className="p-5 rounded-lg bg-card border border-border shadow-sm">
                <h3 className="font-medium">Llama 4 Maverick</h3>
                <p className="text-sm text-muted-foreground mt-1">Meta&apos;s most advanced model</p>
              </div>
              <div className="p-5 rounded-lg bg-card border border-border shadow-sm">
                <h3 className="font-medium">Qwen QWQ 32B</h3>
                <p className="text-sm text-muted-foreground mt-1">Alibaba&apos;s most advanced model</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Community Recognition Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-accent/10 to-background">
        <div className="container max-w-screen-xl mx-auto">
          <motion.div
            className="max-w-3xl mx-auto space-y-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-medium tracking-tight">Community Recognition</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Join thousands of developers and researchers who trust Scira
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                className="group relative p-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden"
                whileHover={{ y: -2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <img src="/Winner-Medal-Weekly.svg" alt="Award" className="h-10 w-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">#3 Project of the Week</h3>
                    <p className="text-sm text-muted-foreground">Peerlist</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="group relative p-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden"
                whileHover={{ y: -2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <GithubLogo className="h-10 w-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">7,000+ Stars</h3>
                    <p className="text-sm text-muted-foreground">GitHub</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="group relative p-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden"
                whileHover={{ y: -2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-10 w-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">100K+ Monthly Users</h3>
                    <p className="text-sm text-muted-foreground">Active Community</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-accent/10">
        <div className="container max-w-screen-xl mx-auto">
          <motion.div
            className="max-w-3xl mx-auto space-y-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-medium tracking-tight">Built For Everyone</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Whether you need quick answers or in-depth research, Scira adapts to your needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                className="group relative p-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden"
                whileHover={{ y: -2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-4">
                  <h3 className="font-medium">Students</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Research paper assistance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Complex topic explanations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Math problem solving</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
              <motion.div
                className="group relative p-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden"
                whileHover={{ y: -2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-4">
                  <h3 className="font-medium">Researchers</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Academic paper analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Data interpretation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Literature review</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
              <motion.div
                className="group relative p-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden"
                whileHover={{ y: -2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-4">
                  <h3 className="font-medium">Professionals</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Market research</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Technical documentation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Data analysis</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-muted/20">
        <div className="container max-w-screen-xl mx-auto">
          <motion.div
            className="max-w-3xl mx-auto space-y-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-medium tracking-tight">Advanced Features</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Experience a smarter way to search with AI-powered capabilities
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Brain,
                  title: 'Smart Understanding',
                  description: 'Uses multiple AI models to understand complex questions',
                },
                {
                  icon: Search,
                  title: 'Comprehensive Search',
                  description: 'Searches across multiple sources for complete answers',
                },
                {
                  icon: ImageIcon,
                  title: 'Image Understanding',
                  description: 'Can understand and explain images you share',
                },
                {
                  icon: Command,
                  title: 'Smart Calculations',
                  description: 'Performs complex calculations and analysis in real-time',
                },
                {
                  icon: GraduationCap,
                  title: 'Research Assistant',
                  description: 'Helps find and explain academic research',
                },
                {
                  icon: Sparkles,
                  title: 'Natural Conversations',
                  description: 'Responds in a clear, conversational way',
                },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  className="group relative p-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden"
                  whileHover={{ y: -2 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative space-y-4">
                    <div className="p-2.5 w-fit rounded-lg bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-white dark:bg-zinc-950 border-y border-border">
        <div className="container max-w-screen-xl mx-auto">
          <motion.div
            className="max-w-4xl mx-auto space-y-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-medium tracking-tight">Pricing Plans</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Choose the plan that works best for you</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Free Plan */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-8 relative hover:border-zinc-300/80 dark:hover:border-zinc-700/80 transition-colors duration-200">
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-3 tracking-[-0.01em]">Free</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 leading-relaxed">
                    Get started with essential features
                  </p>
                  <div className="flex items-baseline mb-2">
                    <span className="text-3xl font-light text-zinc-900 dark:text-zinc-100 tracking-tight">$0</span>
                    <span className="text-zinc-400 dark:text-zinc-500 ml-2 text-sm">/month</span>
                  </div>
                </div>

                <div className="mb-6">
                  <ul className="space-y-3">
                    <li className="flex items-center text-[15px]">
                      <div className="w-1 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mr-4 flex-shrink-0"></div>
                      <span className="text-zinc-700 dark:text-zinc-300">Limited daily searches (other models)</span>
                    </li>
                    <li className="flex items-center text-[15px]">
                      <div className="w-1 h-1 bg-green-500 dark:bg-green-400 rounded-full mr-4 flex-shrink-0"></div>
                      <span className="text-zinc-700 dark:text-zinc-300">Unlimited Grok 3 Mini & Grok 2 Vision</span>
                    </li>
                    <li className="flex items-center text-[15px]">
                      <div className="w-1 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mr-4 flex-shrink-0"></div>
                      <span className="text-zinc-700 dark:text-zinc-300">Basic AI models</span>
                    </li>
                    <li className="flex items-center text-[15px]">
                      <div className="w-1 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mr-4 flex-shrink-0"></div>
                      <span className="text-zinc-700 dark:text-zinc-300">Search history</span>
                    </li>
                  </ul>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-9 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-normal text-sm tracking-[-0.01em]"
                  onClick={() => router.push('/')}
                >
                  Get Started
                </Button>
              </div>

              {/* Pro Plan */}
              <div className="bg-white dark:bg-zinc-900 border-[1.5px] border-black dark:border-white rounded-xl p-8 relative shadow-sm">
                <div className="absolute -top-3 right-8 z-10">
                  <Badge className="bg-black dark:bg-white text-white dark:text-black px-3 py-1 text-xs font-normal tracking-wide">
                    POPULAR
                  </Badge>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-3 tracking-[-0.01em]">
                    Scira Pro
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6 leading-relaxed">
                    Everything you need for unlimited usage
                  </p>
                  <div className="flex items-baseline mb-2">
                    <span className="text-3xl font-light text-zinc-900 dark:text-zinc-100 tracking-tight">$15</span>
                    <span className="text-zinc-500 dark:text-zinc-400 ml-2 text-sm">/month</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 tracking-wide">CANCEL ANYTIME</p>
                </div>

                <div className="mb-6">
                  <ul className="space-y-3">
                    <li className="flex items-center text-[15px]">
                      <div className="w-1 h-1 bg-black dark:bg-white rounded-full mr-4 flex-shrink-0"></div>
                      <span className="text-zinc-700 dark:text-zinc-300">Unlimited searches</span>
                    </li>
                    <li className="flex items-center text-[15px]">
                      <div className="w-1 h-1 bg-black dark:bg-white rounded-full mr-4 flex-shrink-0"></div>
                      <span className="text-zinc-700 dark:text-zinc-300">All AI models</span>
                    </li>
                    <li className="flex items-center text-[15px]">
                      <div className="w-1 h-1 bg-black dark:bg-white rounded-full mr-4 flex-shrink-0"></div>
                      <span className="text-zinc-700 dark:text-zinc-300">PDF document analysis</span>
                    </li>
                    <li className="flex items-center text-[15px]">
                      <div className="w-1 h-1 bg-black dark:bg-white rounded-full mr-4 flex-shrink-0"></div>
                      <span className="text-zinc-700 dark:text-zinc-300">Priority support</span>
                    </li>
                  </ul>
                </div>

                <Button
                  className="w-full h-9 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-normal text-sm tracking-[-0.01em] transition-colors duration-200"
                  onClick={() => router.push('/pricing')}
                >
                  Upgrade to Pro
                </Button>
              </div>
            </div>

            {/* Student Discount */}
            <div className="max-w-3xl mx-auto bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 mt-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                <div className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                  <GraduationCap className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <h3 className="font-medium text-base">Student Discount: $10 off Pro Plan</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Students can get the Pro plan for just $5/month. Email zaid@scira.ai with your student ID and a
                    brief description of how you use Scira for your studies.
                  </p>
                  <div className="pt-1">
                    <a
                      href="mailto:zaid@scira.ai?subject=Student%20Discount%20Request"
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-300 dark:border-zinc-700 bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 h-9 px-4 py-2"
                    >
                      Request Student Discount
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Free Unlimited Models Highlight */}
            <div className="max-w-3xl mx-auto bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 mt-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                <div className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <h3 className="font-medium text-base">
                    Free Unlimited Access to Advanced Models
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Registered users get unlimited access to Grok 3 Mini and Grok 2 Vision models - no daily limits, no
                    restrictions. Perfect for students, researchers, and professionals who need reliable AI assistance
                    without breaking the bank.
                  </p>
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      onClick={() => router.push('/sign-up')}
                    >
                      Create Free Account
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 font-medium hover:text-primary transition-colors"
              >
                View full pricing details
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4 bg-accent/10">
        <div className="container max-w-screen-xl mx-auto">
          <motion.div
            className="max-w-3xl mx-auto space-y-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-medium tracking-tight">Frequently Asked Questions</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Find answers to common questions about Scira</p>
            </div>

            <ProAccordion type="single" collapsible className="w-full">
              <ProAccordionItem value="item-1">
                <ProAccordionTrigger>What is Scira?</ProAccordionTrigger>
                <ProAccordionContent>
                  Scira is a minimalistic open-source AI-powered search engine that uses RAG (Retrieval-Augmented
                  Generation) and search grounding to provide accurate, up-to-date answers from reliable sources.
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
                  Yes, students can get $10 off the Pro plan, bringing it down to $5/month. To apply, email
                  zaid@scira.ai with your student verification details and a brief description of how you use Scira for
                  your academic work or studies.
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
                  Scira uses a range of advanced AI models including Grok 3.0, Claude 3.7 Sonnet, OpenAI GPT 4o, Gemini
                  2.5 Pro, and more to provide the best possible answers.
                </ProAccordionContent>
              </ProAccordionItem>

              <ProAccordionItem value="item-6">
                <ProAccordionTrigger>How does Scira ensure information accuracy?</ProAccordionTrigger>
                <ProAccordionContent>
                  Scira combines RAG technology with search grounding to retrieve information from reliable sources and
                  verify it before providing answers. Each response includes source attribution.
                </ProAccordionContent>
              </ProAccordionItem>

              <ProAccordionItem value="item-7">
                <ProAccordionTrigger>How do I apply for the student discount?</ProAccordionTrigger>
                <ProAccordionContent>
                  Email zaid@scira.ai with a copy of your student ID or enrollment proof. In your email, include a brief
                  description of how you use or plan to use Scira for your academic work or studies. Once verified,
                  you&apos;ll receive a special discount code for $10 off the Pro plan.
                </ProAccordionContent>
              </ProAccordionItem>
            </ProAccordion>

            <div className="text-center pt-4">
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                Have more questions?{' '}
                <a
                  href="mailto:zaid@scira.ai"
                  className="text-black dark:text-white hover:underline underline-offset-4 decoration-zinc-400 dark:decoration-zinc-600 transition-colors duration-200"
                >
                  Get in touch
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container max-w-screen-xl mx-auto py-12 px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image src="/scira.png" alt="Scira" width={32} height={32} className="h-8 w-8 invert dark:invert-0" />
              <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} All rights reserved.</p>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link
                href="/privacy-policy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <div className="flex items-center gap-1">
                <Link
                  href="https://x.com/sciraai"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <XLogo className="h-4 w-4" />
                </Link>
                <Link
                  href="https://git.new/scira"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GithubLogo className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
