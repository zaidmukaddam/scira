'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Loader2, Copy, Check, X } from 'lucide-react';
import { CodeIcon, XLogoIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Tweet } from 'react-tweet';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { XQLProUpgradeScreen } from '@/components/xql-pro-upgrade-screen';
import { BorderTrail } from '@/components/core/border-trail';
import { TextShimmer } from '@/components/core/text-shimmer';
import { cn } from '@/lib/utils';
import { type XQLMessage } from '@/app/api/xql/route';
import { highlight } from 'sugar-high';
import { SciraLogo } from '@/components/logos/scira-logo';

export default function XQLPage() {
  const [input, setInput] = useState<string>('');
  const [copiedResult, setCopiedResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user, isProUser, isLoading: isProStatusLoading } = useUser();
  const router = useRouter();

  const { messages, sendMessage, status } = useChat<XQLMessage>({
    transport: new DefaultChatTransport({
      api: '/api/xql',
    }),
    onError: (error) => {
      toast.error('Query failed', {
        description: error.message,
      });
    },
  });

  const handleRun = useCallback(async () => {
    if (!input.trim() || status !== 'ready') return;

    await sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: `Convert this natural language query to SQL: ${input}` }],
    });
  }, [input, status, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    },
    [handleRun],
  );

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedResult(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedResult(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  }, []);

  React.useEffect(() => {
    if (!isProStatusLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, router, isProStatusLoading]);

  const lastMessage = messages[messages.length - 1];

  if (!isProStatusLoading && !isProUser) {
    return <XQLProUpgradeScreen />;
  }

  return (
    <div
      className={cn(
        'min-h-screen bg-background overflow-x-hidden transition-[justify-content,align-items] duration-700 ease-in-out',
        messages.length === 0 ? 'flex items-center justify-center' : '',
      )}
    >
      <div
        className={cn(
          'max-w-3xl w-full mx-auto px-4 transition-[padding] duration-700 ease-in-out',
          messages.length === 0 ? 'py-12 sm:py-14' : 'pt-12 sm:pt-14 pb-12 sm:pb-10',
        )}
      >
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 text-2xl sm:text-3xl md:text-5xl font-be-vietnam-pro -tracking-normal font-medium">
          <span className="text-foreground">Scira</span>
          <div className="flex items-center relative">
            <XLogoIcon className="size-6 sm:size-8 md:size-12 text-foreground -mr-1 sm:-mr-2 font-medium" />
            <h1 className="text-foreground">QL</h1>
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 md:-top-3 md:-right-4">
              <div className="bg-primary text-primary-foreground px-1 sm:px-1.5 pt-0.5 pb-0.5 sm:pb-0.75 rounded-sm text-[8px] sm:text-xs font-semibold">
                β
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border border-border rounded-full px-3 sm:px-4 py-2 bg-muted/20 w-full">
          <XLogoIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          <div className="relative flex-1 min-w-0 !m-0 !p-0">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask in natural language…"
              disabled={isProStatusLoading || status !== 'ready'}
              maxLength={200}
              className="w-full border-0 p-0 focus-visible:ring-0 text-sm sm:text-base !bg-transparent pr-12 sm:pr-14 shadow-none placeholder:text-muted-foreground"
            />
            {input.trim() && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInput('')}
                className="absolute size-8 sm:size-9 right-0 top-1/2 -translate-y-1/2 rounded-full !p-0 !m-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          {input.trim() && <div className="w-px h-8 sm:h-9 bg-border flex-shrink-0 self-center rounded" />}
          <Button
            onClick={handleRun}
            disabled={!input.trim() || status !== 'ready' || isProStatusLoading}
            size="sm"
            className="h-8 sm:h-9 px-3 sm:px-4 rounded-full font-semibold text-xs sm:text-sm"
          >
            {status === 'streaming' || status === 'submitted' ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <Play className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
          </Button>
        </div>

        {isProStatusLoading && (
          <div className="mt-8 space-y-4">
            <div className="text-center space-y-2">
              <div className="h-4 w-48 bg-muted rounded mx-auto animate-pulse" />
              <div className="h-3 w-64 bg-muted/60 rounded mx-auto animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="shadow-none animate-pulse p-0">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-4 sm:h-5 sm:w-5 bg-muted rounded" />
                      <div className="h-3 w-3 bg-muted rounded ml-auto" />
                    </div>
                    <div className="h-4 w-full bg-muted rounded mb-1" />
                    <div className="h-3 w-2/3 bg-muted/60 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {messages.length === 0 && status === 'ready' && !isProStatusLoading && (
          <div className="mt-8 space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Try these XQL queries:</p>
              <p className="text-xs text-muted-foreground/70">Search X posts with natural language</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[
                {
                  query: 'Scira AI tweets from last week',
                  description: 'Popular content with date range',
                },
                {
                  query: 'Posts from @elonmusk about Tesla',
                  description: 'Specific user + topic filter',
                },
                {
                  query: 'Research Paper discussions with 1000+ views today',
                  description: 'High engagement + recent',
                },
                {
                  query: 'Hugging Face tweets about new AI models',
                  description: 'Topic with handle exclusion',
                },
                {
                  query: 'Posts from @openai @anthropicai with 500+ likes',
                  description: 'Multiple handles + engagement',
                },
                {
                  query: 'Tech news from past 3 days with 2000+ views',
                  description: 'Date range + view threshold',
                },
              ].map((example, i) => (
                <Card
                  key={i}
                  className="cursor-pointer hover:border-primary/30 shadow-none group p-0 transition-colors"
                  onClick={() => setInput(example.query)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1 rounded bg-secondary flex-shrink-0">
                        <XLogoIcon className="h-3 w-3 text-foreground" />
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 ml-auto transition-opacity">
                        <Play className="h-3 w-3 text-primary" />
                      </div>
                    </div>
                    <p className="text-sm text-foreground mb-1 font-medium leading-tight">{example.query}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{example.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 p-3 sm:p-4 bg-accent rounded-lg border border-muted/30">
              <div className="flex items-start gap-2 sm:gap-3">
                <CodeIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-muted-foreground">
                  <p className="font-medium mb-1 sm:mb-2">XQL supports advanced filtering:</p>
                  <ul className="space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                    <li>• Date ranges (ISO format: YYYY-MM-DD or natural language)</li>
                    <li>• User handles (include up to 10 or exclude up to 10, not both)</li>
                    <li>• Engagement thresholds (minimum likes/views required)</li>
                    <li>• Topic and keyword combinations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="mt-8 space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
            {lastMessage &&
              (() => {
                console.log('All message parts:', lastMessage.parts);
                return null;
              })()}

            {lastMessage &&
              lastMessage.parts.map((part, index) => {
                if (
                  part.type === 'tool-xql' &&
                  'input' in part &&
                  (part.state === 'input-streaming' ||
                    part.state === 'input-available' ||
                    part.state === 'output-available' ||
                    part.state === 'output-error')
                ) {
                  console.log('Tool part found:', part); // Debug log
                  const input = part.input;

                  if (!input || typeof input !== 'object') {
                    console.log('Input is invalid:', input);
                    return null;
                  }

                  // Build SQL-like statement
                  const buildSQLQuery = () => {
                    let sql = 'SELECT * FROM x_posts\n';

                    const conditions = [] as string[];

                    if (input?.query) {
                      conditions.push(`  content LIKE '%${input.query}%'`);
                    }

                    // Ensure dates are always shown (default: last 30 days to today)
                    const toYMD = (d: Date) => d.toISOString().slice(0, 10);
                    const today = new Date();
                    const thirtyDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
                    const startDate =
                      input?.startDate && String(input.startDate).trim().length > 0
                        ? input.startDate
                        : toYMD(thirtyDaysAgo);
                    const endDate =
                      input?.endDate && String(input.endDate).trim().length > 0 ? input.endDate : toYMD(today);

                    conditions.push(`  created_at >= '${startDate}'`);
                    conditions.push(`  created_at <= '${endDate}'`);

                    if (
                      input?.includeXHandles &&
                      Array.isArray(input.includeXHandles) &&
                      input.includeXHandles.length > 0
                    ) {
                      const handles = input.includeXHandles.map((h) => `'${h ?? ''}'`).join(', ');
                      conditions.push(`  author_handle IN (${handles})`);
                    }

                    if (
                      input?.excludeXHandles &&
                      Array.isArray(input.excludeXHandles) &&
                      input.excludeXHandles.length > 0
                    ) {
                      const handles = input.excludeXHandles.map((h) => `'${h ?? ''}'`).join(', ');
                      conditions.push(`  author_handle NOT IN (${handles})`);
                    }

                    if (input?.postFavoritesCount) {
                      conditions.push(`  favorites_count >= ${input.postFavoritesCount}`);
                    }

                    if (input?.postViewCount) {
                      conditions.push(`  view_count >= ${input.postViewCount}`);
                    }

                    if (conditions.length > 0) {
                      sql += 'WHERE\n' + conditions.join(' AND\n');
                    }

                    sql += '\nORDER BY created_at DESC';

                    if (input?.maxResults) {
                      sql += `\nLIMIT ${input.maxResults}`;
                    }

                    return sql;
                  };

                  return (
                    <Card key={index} className="bg-muted/20 p-0 shadow-none">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start gap-3">
                          <div className="grow min-w-0">
                            <div className="flex items-center gap-2 sm:gap-3 mb-3">
                              <CodeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                              <p className="text-sm font-medium text-muted-foreground">XQL Code</p>
                            </div>
                            <div className="relative">
                              <pre className="text-xs sm:text-sm bg-muted/30 p-2 sm:p-3 rounded-lg border font-mono leading-relaxed overflow-x-auto w-full max-w-full">
                                <code dangerouslySetInnerHTML={{ __html: highlight(buildSQLQuery()) }} />
                              </pre>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              })}

            {/* Show loading state */}
            {(status === 'streaming' || status === 'submitted') && (
              <Card className="relative w-full h-[80px] sm:h-[100px] my-4 overflow-hidden shadow-none p-0">
                <BorderTrail className={cn('bg-gradient-to-r from-primary/20 via-primary to-primary/20')} size={80} />
                <CardContent className="px-4 py-4 sm:px-6 sm:py-6">
                  <div className="relative flex items-center gap-2 sm:gap-3">
                    <div
                      className={cn(
                        'relative h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center bg-primary/10 flex-shrink-0',
                      )}
                    >
                      <BorderTrail
                        className={cn('bg-gradient-to-r from-primary/20 via-primary to-primary/20')}
                        size={40}
                      />
                      {lastMessage &&
                      lastMessage.parts.some(
                        (part) =>
                          part.type === 'tool-xql' &&
                          (part.state === 'input-streaming' || part.state === 'input-available'),
                      ) ? (
                        <CodeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      ) : (
                        <XLogoIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      )}
                    </div>
                    <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                      <TextShimmer className="text-sm sm:text-base font-medium" duration={2}>
                        {lastMessage &&
                        lastMessage.parts.some(
                          (part) =>
                            part.type === 'tool-xql' &&
                            (part.state === 'input-streaming' || part.state === 'input-available'),
                        )
                          ? 'Executing XQL...'
                          : 'Writing XQL code...'}
                      </TextShimmer>
                      <div className="flex gap-1 sm:gap-2">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="h-1 sm:h-1.5 rounded-full bg-muted animate-pulse"
                            style={{
                              width: `${Math.random() * 30 + 15}px`,
                              animationDelay: `${i * 0.2}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Show the citations */}
            {lastMessage &&
              lastMessage.parts.map((part, index) => {
                if (part.type === 'tool-xql' && part.state === 'output-available') {
                  const citations = 'output' in part && Array.isArray(part.output) ? part.output : [];
                  return (
                    <Card key={index} className="p-0 shadow-none">
                      <CardContent className="p-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <SciraLogo className="size-6 text-foreground flex-shrink-0" />
                            <span className="font-semibold text-foreground text-sm sm:text-base">
                              Scira found {citations.length} Posts
                            </span>
                          </div>

                          {citations.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(citations.join('\n'))}
                              className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0"
                            >
                              {copiedResult ? (
                                <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                              ) : (
                                <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </Button>
                          )}
                        </div>

                        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                          {citations.length > 0 ? (
                            <div className="flex flex-col items-center gap-2">
                              {citations.map((url: string, i: number) => {
                                // Extract tweet ID from URL
                                const tweetIdMatch = url.match(/\/status\/(\d+)/);
                                const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

                                if (tweetId) {
                                  return (
                                    <div key={i} className="w-full max-w-lg sm:max-w-xl tweet-wrapper-sheet">
                                      <Tweet id={tweetId} />
                                    </div>
                                  );
                                }

                                // Fallback for URLs that don't match tweet pattern
                                return (
                                  <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    className="flex items-center gap-3 p-3 sm:p-4 bg-muted/20 hover:bg-muted/30 border border-border rounded-lg group max-w-lg sm:max-w-xl w-full transition-colors"
                                  >
                                    <XLogoIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">
                                        {url.replace('https://x.com/', '').replace('https://twitter.com/', '')}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {url.startsWith('https://x.com') ? 'x.com' : 'twitter.com'}
                                      </p>
                                    </div>
                                  </a>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-6 sm:py-8 text-muted-foreground">
                              <XLogoIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                              <p className="text-sm sm:text-base">No X citations found for this query</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              })}

            {/* Show errors */}
            {lastMessage &&
              lastMessage.parts.map((part, index) => {
                if (part.type === 'tool-xql' && part.state === 'output-error') {
                  return (
                    <Card key={index} className="border-destructive shadow-none">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start gap-2 sm:gap-3 text-destructive">
                          <XLogoIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base">Search Error</p>
                            <p className="text-xs sm:text-sm leading-relaxed">
                              {'errorText' in part ? part.errorText : 'Unknown error occurred'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              })}
          </div>
        )}
      </div>
    </div>
  );
}
