'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { XLogoIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { ColorPanels } from '@paper-design/shaders-react';
import { TextShimmer } from '@/components/core/text-shimmer';
import { TextLoop } from '@/components/core/text-loop';
import { Badge } from '@/components/ui/badge';

interface XWrappedData {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  followersCount?: number;
  verified?: boolean;
  totalPosts: number;
  topTopics: string[];
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  mostActiveMonth: string;
  engagementScore: number;
  writingStyle: string;
  yearSummary: string;
  topPosts: Array<{
    text: string;
    url: string;
    date: string;
  }>;
}

function StatCard({
  label,
  value,
  subtext,
  delay = 0,
  className,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-colors hover:border-border',
        className
      )}
    >
      <div className="relative z-10">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        {subtext && <p className="mt-1 text-sm text-muted-foreground">{subtext}</p>}
      </div>
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-muted/30 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
    </motion.div>
  );
}

function SentimentBar({ positive, neutral, negative, delay = 0 }: { positive: number; neutral: number; negative: number; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      style={{ transformOrigin: 'left' }}
      className="flex h-3 w-full overflow-hidden rounded-full"
    >
      <div className="bg-primary" style={{ width: `${positive}%` }} />
      <div className="bg-secondary" style={{ width: `${neutral}%` }} />
      <div className="bg-destructive" style={{ width: `${negative}%` }} />
    </motion.div>
  );
}

export default function XWrappedUsernamePage() {
  const params = useParams();
  const router = useRouter();
  const username = (params?.username as string) || '';
  const [loading, setLoading] = useState(true);
  const [wrappedData, setWrappedData] = useState<XWrappedData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username) {
      router.push('/x-wrapped');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/x-wrapped', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, year: 2025 }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate X Wrapped');
        }

        const data: XWrappedData = await response.json();
        setWrappedData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate X Wrapped');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username, router]);

  const handleShare = () => {
    if (!wrappedData) return;

    const shareUrl = `${window.location.origin}/x-wrapped/${encodeURIComponent(wrappedData.username)}`;
    const text = `My X Wrapped 2025 ✨\n\n@${wrappedData.username}\n${wrappedData.mostActiveMonth} was my month\n\nTop topics: ${wrappedData.topTopics.slice(0, 3).join(', ')}\n\n${shareUrl}`;

    // Open X (Twitter) compose with pre-filled text
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  const reset = () => {
    router.push('/x-wrapped');
  };

  if (loading) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center p-6">
        {/* Shader Background */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <ColorPanels
            style={{ width: '100%', height: '100%' }}
            colors={['#786654', '#f5e6c8', '#d95545', '#c9a87c']}
            colorBack="#00000000"
            density={1.6}
            angle1={0.3}
            angle2={0.3}
            length={1}
            edges
            blur={0.25}
            fadeIn={0.85}
            fadeOut={0.3}
            gradient={0}
            speed={0.6}
            rotation={112}
          />
          <div className="absolute inset-0 bg-background/20" />
        </div>
        <div className="flex flex-col items-center gap-4">
          <Badge variant="outline" className="text-sm bg-background/70 border-border/50 flex items-center gap-2">
            <Spinner className="size-4" />
            <TextLoop interval={2}>
              <TextShimmer>{`Analyzing @${username}...`}</TextShimmer>
              <TextShimmer>Searching through posts...</TextShimmer>
              <TextShimmer>Calculating insights...</TextShimmer>
              <TextShimmer>Almost there...</TextShimmer>
            </TextLoop>
          </Badge>
        </div>
      </div>
    );
  }

  if (error || !wrappedData) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center p-6">
        {/* Shader Background */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <ColorPanels
            style={{ width: '100%', height: '100%' }}
            colors={['#786654', '#f5e6c8', '#d95545', '#c9a87c']}
            colorBack="#00000000"
            density={1.6}
            angle1={0.3}
            angle2={0.3}
            length={1}
            edges
            blur={0.25}
            fadeIn={0.85}
            fadeOut={0.3}
            gradient={0}
            speed={0.6}
            rotation={112}
          />
          <div className="absolute inset-0 bg-background/20" />
        </div>
        <div className="text-center space-y-4">
          <p className="text-destructive">{error || 'Failed to load data'}</p>
          <Button onClick={reset} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const d = wrappedData;

  return (
    <div className="relative min-h-screen">
      {/* Shader Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <ColorPanels
          style={{ width: '100%', height: '100%' }}
          colors={['#786654', '#f5e6c8', '#d95545', '#c9a87c']}
          colorBack="#00000000"
          density={1.6}
          angle1={0.3}
          angle2={0.3}
          length={1}
          edges
          blur={0.25}
          fadeIn={0.85}
          fadeOut={0.3}
          gradient={0}
          speed={0.6}
          rotation={112}
        />
        <div className="absolute inset-0 bg-background/20" />
      </div>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col items-center gap-4 text-center"
        >
          {d.avatarUrl ? (
            <Image
              src={d.avatarUrl}
              alt={d.displayName ?? d.username}
              width={400}
              height={400}
              className="size-20 rounded-full border-2 border-border object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full border-2 border-border bg-muted">
              <XLogoIcon className="size-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <div className="flex items-center justify-center gap-2">
              {d.displayName && <h1 className="text-2xl font-semibold tracking-tight">{d.displayName}</h1>}
              {d.verified && (
                <svg
                  viewBox="0 0 22 22"
                  aria-label="Verified account"
                  className="size-5 text-blue-500 dark:text-blue-400"
                  fill="currentColor"
                >
                  <g>
                    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44-.54-.354-1.17-.551-1.816-.57-.646-.018-1.273.201-1.814.55-.54.354-.968.857-1.24 1.447-.607-.223-1.263-.27-1.896-.14-.634.13-1.218.437-1.688.882-.444.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.434 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.168.551 1.816.569.647.02 1.276-.202 1.817-.559.54-.354.968-.857 1.245-1.447.604.223 1.26.27 1.896.14.634-.132 1.218-.437 1.688-.882.443-.47.747-1.055.878-1.687.13-.634.084-1.29-.136-1.897.586-.273 1.084-.704 1.439-1.245.354-.54.56-1.17.578-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                  </g>
                </svg>
              )}
            </div>
            <p className={cn('text-foreground', d.displayName ? 'text-base' : 'text-xl font-semibold text-foreground')}>
              @{d.username}
            </p>
            {d.followersCount !== undefined && (
              <div className="mt-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{d.followersCount.toLocaleString()}</span> Followers
              </div>
            )}
          </div>
          <p className="text-sm text-foreground">2025 Year in Review</p>
        </motion.header>

        {/* Bento Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Posts Analyzed" value={d.totalPosts} delay={0.1} />
          <StatCard label="Best Month" value={d.mostActiveMonth} delay={0.15} />
          <StatCard label="Engagement" value={d.engagementScore} subtext="out of 100" delay={0.2} />
        </div>

        {/* Sentiment */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4 rounded-2xl border border-border/50 bg-card p-6"
        >
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Sentiment</p>
          <SentimentBar positive={d.sentiment.positive} neutral={d.sentiment.neutral} negative={d.sentiment.negative} delay={0.35} />
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" /> Positive {d.sentiment.positive}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-secondary" /> Neutral {d.sentiment.neutral}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-destructive" /> Negative {d.sentiment.negative}%
            </span>
          </div>
        </motion.section>

        {/* Topics */}
        {d.topTopics.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 rounded-2xl border border-border/50 bg-card p-6"
          >
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Top Topics</p>
            <div className="flex flex-wrap gap-2">
              {d.topTopics.map((t) => (
                <span key={t} className="rounded-full border border-border bg-muted/60 px-3 py-1 text-sm">
                  {t}
                </span>
              ))}
            </div>
          </motion.section>
        )}

        {/* Writing Style */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-4 rounded-2xl border border-border/50 bg-card p-6"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Writing Style</p>
          <p className="text-lg font-medium leading-relaxed">{d.writingStyle}</p>
        </motion.section>

        {/* Summary */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 rounded-2xl border border-border/50 bg-card p-6"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Year Summary</p>
          <p className="leading-relaxed text-muted-foreground">{d.yearSummary}</p>
        </motion.section>

        {/* Interesting Posts */}
        {d.topPosts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-4 rounded-2xl border border-border/50 bg-card p-6"
          >
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Interesting Posts</p>
            <ul className="space-y-3">
              {d.topPosts.map((post, i) => (
                <li key={i}>
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start justify-between gap-4 rounded-xl border border-border/40 bg-muted/30 p-4 transition-colors hover:border-border hover:bg-muted/50"
                  >
                    <p className="line-clamp-2 text-sm">{post.text}</p>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 grid grid-cols-2 gap-2 sm:gap-3"
        >
          <Button onClick={handleShare} size="lg" className="w-full gap-1.5 sm:gap-2 text-sm sm:text-base">
            Share
            <ArrowUpRight className="size-3.5 sm:size-4" />
          </Button>
          <Button onClick={reset} variant="outline" size="lg" className="w-full gap-1.5 sm:gap-2 text-sm sm:text-base">
            <RotateCcw className="size-3.5 sm:size-4" />
            <span className="hidden sm:inline">Start Over</span>
            <span className="sm:hidden">Reset</span>
          </Button>
        </motion.div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Powered by{' '}
          <a href="https://x.ai/api" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
            Grok
          </a>{' '}
          · Built with Scira
          <br />
          Results are cached for 5 minutes
        </p>
      </div>
    </div>
  );
}
