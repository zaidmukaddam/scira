"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Research } from "@/ai/extreme-search";
import type { JSONValue, ToolInvocation } from "ai";
import { useEffect, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, ArrowUpRight, Loader2, Globe, Search } from "lucide-react";
import { TextShimmer } from "@/components/core/text-shimmer";
import { Skeleton } from "@/components/ui/skeleton";

interface QueryBlockData {
  query: string;
  sources: Array<{ title: string; url: string; favicon?: string }>;
  content: Array<{ title: string; url: string; text: string; favicon?: string }>;
}

type QueryStatus = 'loading' | 'success' | 'no_results';

const getQueryStatus = (
  queryData: QueryBlockData,
  queryIndex: number,
  allQueries: QueryBlockData[],
  overallToolState: ToolInvocation['state']
): QueryStatus => {
  const isLastQuery = queryIndex === allQueries.length - 1;
  const sourcesPresent = queryData.sources.length > 0;
  const toolIsActive = overallToolState === "call" || overallToolState === "partial-call";

  if (sourcesPresent) {
    return 'success'; // Green: Has sources, regardless of anything else.
  }

  // At this point, !sourcesPresent (no sources for this queryData)
  if (isLastQuery && toolIsActive) {
    return 'loading'; // Blue: It's the current focus of active work.
  }

  // At this point, !sourcesPresent, AND (it's not the last query OR tool is not active).
  // This means it's an earlier query that yielded no sources, or it's the last query but the tool has finished.
  return 'no_results'; // Amber
};

const statusColors: Record<Exclude<QueryStatus, 'pending'>, string> = {
  loading: 'bg-[#4ade80]',
  success: 'bg-neutral-500',
  no_results: 'bg-amber-500',
};

const ExtremeSearchComponent = ({
  toolInvocation,
  annotations,
}: {
  toolInvocation: ToolInvocation;
  annotations?: JSONValue[];
}) => {
  const { state } = toolInvocation;
  const [expandedQueries, setExpandedQueries] = useState<Record<string, boolean>>({});

  // Get the latest status update
  const latestStatusAnnotation = (annotations as any[])
    ?.filter(ann => ann && (ann.status || ann.plan) && (typeof ann.status?.title === 'string' || ann.plan))
    .pop();
  const latestStatusTitle = latestStatusAnnotation?.status?.title || (state === "call" || state === "partial-call" ? "Thinking..." : "Processing...");

  // Add new type for plan data
  const planData = (annotations as any[])?.find(ann => ann.plan)?.plan;

  const queriesWithSources: QueryBlockData[] = (annotations as any[])
  ?.reduce((acc: QueryBlockData[], annotation: any) => {
    if (!annotation) return acc;

    if (annotation.type === "search_query" && typeof annotation.query === 'string') {
      if (!acc.find(q => q.query === annotation.query)) {
        acc.push({ query: annotation.query, sources: [], content: [] });
      }
    } else if (annotation.type === "source" && annotation.source && typeof annotation.source.url === 'string') {
      const lastQuery = acc.length > 0 ? acc[acc.length - 1] : null;
      if(lastQuery && !lastQuery.sources.find(s => s.url === annotation.source.url)) {
        lastQuery.sources.push({
            title: annotation.source.title || '',
            url: annotation.source.url,
            favicon: annotation.source.favicon || `https://www.google.com/s2/favicons?sz-128&domain_url=${encodeURIComponent(annotation.source.url)}`
        });
      }
    } else if (annotation.type === "content" && annotation.content && typeof annotation.content.url === 'string') {
      const lastQuery = acc.length > 0 ? acc[acc.length - 1] : null;
      if(lastQuery && !lastQuery.content.find(c => c.url === annotation.content.url)) {
        lastQuery.content.push({
            title: annotation.content.title || '',
            url: annotation.content.url,
            text: annotation.content.text || '',
            favicon: annotation.content.favicon || `https://www.google.com/s2/favicons?sz-128&domain_url=${encodeURIComponent(annotation.content.url)}`
        });
      }
    }
    return acc;
  }, [] as QueryBlockData[])
  || [];
  
  useEffect(() => {
    if (queriesWithSources.length > 0) {
      const lastQuery = queriesWithSources[queriesWithSources.length - 1].query;
      if (!expandedQueries[lastQuery]) {
        setExpandedQueries(prev => ({ ...prev, [lastQuery]: true }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queriesWithSources.length]);

  const toggleQueryExpansion = (query: string) => {
    setExpandedQueries(prev => ({ ...prev, [query]: !prev[query] }));
  };

  // Render source pills in a wrapping container
  const renderSourcePills = (sources: QueryBlockData['sources']) => {
    if (sources.length === 0) return null;
    
    return (
      <motion.div 
        className="flex flex-wrap gap-1.5 py-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, staggerChildren: 0.02 }}
      >
        {sources.map((source, index) => {
          let hostname = "source";
          try {
            hostname = new URL(source.url).hostname.replace('www.', '');
          } catch (e) {
            console.warn("Invalid source URL for hostname:", source.url);
          }
          return (
            <motion.a 
              key={index} 
              href={source.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.1 }}
              title={source.title || hostname}
            >
              <img
                src={source.favicon}
                alt=""
                className="w-3.5 h-3.5 rounded-full"
                onError={(e) => {
                  e.currentTarget.src = 'https://www.google.com/s2/favicons?sz-128&domain_url=example.com';
                  (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(100%)';
                }}
              />
              <span className="text-neutral-600 dark:text-neutral-400 truncate max-w-[120px]" title={source.title || hostname}>
                {hostname}
              </span>
            </motion.a>
          );
        })}
      </motion.div>
    );
  };

  if (state === "result") {
    const { result } = toolInvocation;

    // Ensure result is not null and has the expected structure
    const researchData = result as { research: Research } | null;
    const research = researchData?.research;

    // Deduplicate sources based on URL for the final display
    const uniqueSources = Array.from(
      new Map(
        (research?.sources || []).map(s => [
          s.url,
          { ...s, favicon: s.favicon || `https://www.google.com/s2/favicons?sz-128&domain_url=${encodeURIComponent(s.url)}` }
        ])
      ).values()
    ).filter(source => source && source.url);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full mx-auto gap-0 py-0 mb-4 shadow-none overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800/50 rounded-xl">
          <div className="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-800/50">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Sources Found</p>
            </div>
            {uniqueSources.length > 0 && (
              <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-xl">
                <Search className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  {uniqueSources.length} Result{uniqueSources.length === 1 ? '' : 's'}
                </p>
              </div>
            )}
          </div>
          <CardContent className="p-3 pt-2">
            {uniqueSources.length > 0 ? (
              <div className="relative">
                <div className="absolute right-1.5 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-neutral-900 via-transparent to-transparent rounded opacity-0 transition-opacity hover:opacity-100" />
                <div className="overflow-x-auto pb-2 -mx-3 px-3 scrollbar-thin scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 dark:hover:scrollbar-thumb-neutral-600 scrollbar-track-transparent">
                  <div className="flex flex-row gap-3 min-w-min">
                    {uniqueSources.map((source, index) => {
                      let displayTitle = "View Source";
                      let displayHostname = "";
                      if (source && source.url) {
                          try {
                            const urlObj = new URL(source.url);
                            displayHostname = urlObj.hostname.replace('www.', '');
                            displayTitle = source.title || displayHostname;
                          } catch (e) {
                            console.warn("Invalid source URL for result display:", source.url);
                            displayTitle = source.title || source.url;
                          }
                      } else if (source && source.title) {
                          displayTitle = source.title;
                      } else if (source && source.url) {
                          displayTitle = source.url;
                      }

                      const sourceContent = queriesWithSources.flatMap(q => 
                        q.content.filter(c => c.url === source.url)
                      )[0]?.text || "";

                      return (
                        <motion.div
                          key={index}
                          className="flex flex-col min-w-[200px] max-w-[280px] bg-neutral-50 dark:bg-neutral-900 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 flex-shrink-0"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="flex items-center gap-2.5 p-3 pb-2">
                            <img
                              src={source.favicon}
                              alt=""
                              className="w-5 h-5 rounded-full flex-shrink-0 opacity-90"
                              onError={(e) => {
                                e.currentTarget.src = 'https://www.google.com/s2/favicons?sz-128&domain_url=example.com';
                                (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(100%) brightness(150%)';
                              }}
                            />
                            <span className="truncate text-neutral-900 dark:text-neutral-100 text-sm font-medium flex-1" title={displayTitle}>
                              {displayTitle}
                            </span>
                          </div>

                          <div className="px-3 pb-2 text-xs">
                            <a 
                              href={source.url} 
                              target="_blank"
                              rel="noopener noreferrer" 
                              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300 truncate flex items-center gap-1 group w-fit"
                            >
                              {displayHostname}
                              <ArrowUpRight className="w-3 h-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                            </a>
                          </div>
                          
                          {sourceContent && (
                            <div className="px-3 pb-3 text-xs text-neutral-600 dark:text-neutral-400 overflow-y-auto max-h-[80px] leading-relaxed scrollbar-thin scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 dark:hover:scrollbar-thumb-neutral-600 scrollbar-track-transparent">
                              {sourceContent.length > 250 ? 
                                sourceContent.substring(0, 250) + "..." : 
                                sourceContent}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <motion.p 
                className="text-neutral-500 dark:text-neutral-400 text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                No sources found for this research.
              </motion.p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // In-progress view
  return (
    <Card className="w-full mx-auto gap-0 py-0 mb-4 shadow-none overflow-hidden">
      <div className="p-3 border-b bg-neutral-50 dark:bg-neutral-900">
        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
          {latestStatusTitle}
        </div>
      </div>
      <CardContent className="p-3 pt-2">
        <AnimatePresence initial={false}>
          {queriesWithSources.length === 0 && (state === "call" || state === "partial-call") && (
            <motion.div
              key="initial-loading"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 relative ml-5"
            >
              {planData ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-3">Research Plan</h3>
                  {planData.map((plan: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative"
                    >
                      {/* Background circle to prevent line showing through */}
                      <div
                        className="absolute w-2.5 h-2.5 rounded-full bg-white dark:bg-neutral-900 z-5"
                        style={{
                          left: '-1rem',
                          top: '6px',
                          transform: 'translateX(-50%)',
                        }}
                      />
                      
                      {/* Status bullet */}
                      <div
                        className="absolute size-2 rounded-full bg-[#4ade80] z-10"
                        style={{
                          left: '-1rem',
                          top: '7px',
                          transform: 'translateX(-50%)',
                        }}
                      />

                      {/* Add vertical line above bullet for non-first items */}
                      {index > 0 && (
                        <div
                          className="absolute w-0.25 bg-neutral-200 dark:bg-neutral-700"
                          style={{
                            left: '-1rem',
                            top: '-12px',
                            height: '19px',
                            transform: 'translateX(-50%)',
                          }}
                        />
                      )}

                      {/* Add vertical line below bullet */}
                      <div
                        className="absolute w-0.25 bg-neutral-200 dark:bg-neutral-700"
                        style={{
                          left: '-1rem',
                          top: '9px',
                          height: index === planData.length - 1 ? '10px' : '24px',
                          transform: 'translateX(-50%)',
                        }}
                      />

                      <h3 className="text-sm text-neutral-800 dark:text-neutral-200 pl-2">
                        {plan.title}
                      </h3>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Preparing Research Plan</h3>
                  <Skeleton className="h-5 w-full bg-[#4ade80]/20" />
                  <Skeleton className="h-5 w-3/4 bg-[#4ade80]/20" />
                  <Skeleton className="h-5 w-5/6 bg-[#4ade80]/20" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="space-y-2">
          {queriesWithSources.map((queryData, queryIndex: number) => {
            const { query, sources } = queryData;
            const calculatedQueryStatus = getQueryStatus(queryData, queryIndex, queriesWithSources, state);
            const systemIsReadingThisSpecificQueryContent = 
                (state === "call" || state === "partial-call") && 
                latestStatusAnnotation?.status?.title?.includes(`Reading content from search results for "${query}"`);

            let finalBulletStatusForColor: Exclude<QueryStatus, 'pending'>;
            if (systemIsReadingThisSpecificQueryContent && calculatedQueryStatus !== 'no_results') {
                finalBulletStatusForColor = 'loading';
            } else {
                finalBulletStatusForColor = calculatedQueryStatus;
            }
            const bulletColor = statusColors[finalBulletStatusForColor];

            return (
            <motion.div 
              key={query} 
              className="space-y-1 relative ml-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: queryIndex * 0.1 }}
            >
              {/* Background circle to prevent line showing through during animation */}
              <div
                className="absolute w-2.5 h-2.5 rounded-full bg-white dark:bg-neutral-900 z-5"
                style={{
                  left: '-1rem',
                  top: '6px',
                  transform: 'translateX(-50%)',
                }}
              />
              
              <div
                className={`absolute size-2 rounded-full ${
                  finalBulletStatusForColor === 'loading' 
                    ? 'bg-[#4ade80] animate-[pulse_1s_ease-in-out_infinite]!' 
                    : bulletColor
                } transition-colors duration-300 z-10`}
                style={{
                  left: '-1rem',
                  top: '7px',
                  transform: 'translateX(-50%)',
                }}
                title={`Status: ${calculatedQueryStatus.replace('_', ' ')}`}
              />

              {/* Add vertical line above bullet */}
              {queryIndex > 0 && (
                <div
                  className="absolute w-0.25 bg-neutral-200 dark:bg-neutral-700"
                  style={{
                    left: '-1rem',
                    top: '-12px', // Start higher to connect to previous bullet
                    height: '19px', // Extend to just touch the current bullet
                    transform: 'translateX(-50%)',
                  }}
                />
              )}

              {/* Add vertical line below bullet that extends to content when expanded */}
              <div
                className="absolute w-0.25 bg-neutral-200 dark:bg-neutral-700"
                style={{
                  left: '-1rem',
                  top: '9px', // Start just below the bullet
                  height: expandedQueries[query] ? 
                    // If this is the last item, don't extend too far when expanded
                    (queryIndex === queriesWithSources.length - 1 ? 'calc(100% - 9px)' : '100%') : 
                    // If not the last item, extend to connect with next item
                    (queryIndex === queriesWithSources.length - 1 ? '12px' : '24px'),
                  transform: 'translateX(-50%)',
                }}
              />

              <div 
                className="flex items-center gap-1.5 cursor-pointer p-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded relative min-h-[24px]"
                onClick={() => toggleQueryExpansion(query)}
              >
                <span className="text-neutral-800 dark:text-neutral-200 text-xs min-w-0 flex-1">
                  {(calculatedQueryStatus === 'loading') ? (
                    <TextShimmer className="w-full" duration={1.5}>
                      {query}
                    </TextShimmer>
                  ) : (
                    query
                  )}
                </span>
                {expandedQueries[query] ? 
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 flex-shrink-0 ml-auto" /> : 
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 flex-shrink-0 ml-auto" />
                }
              </div>
  
              <AnimatePresence initial={false}>
                {expandedQueries[query] && (
                  <motion.div
                    key="content"
                    initial="collapsed"
                    animate="open"
                    exit="collapsed"
                    variants={{
                      open: { opacity: 1, height: "auto", marginTop: '4px' },
                      collapsed: { opacity: 0, height: 0, marginTop: '0px' }
                    }}
                    transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                    className="dark:border-neutral-700" 
                  >
                    <div className="pl-1 py-1"> 
                      {sources.length > 0 && renderSourcePills(sources)}

                      {(() => {
                        const statusForText = systemIsReadingThisSpecificQueryContent && calculatedQueryStatus !== 'no_results' 
                                              ? 'loading' 
                                              : calculatedQueryStatus;

                        if (systemIsReadingThisSpecificQueryContent && sources.length > 0) {
                          return (
                            <TextShimmer className="text-xs py-0.5" duration={2.5}>
                              Reading content...
                            </TextShimmer>
                          );
                        } else if (statusForText === 'loading') { 
                          return (
                            <TextShimmer className="text-xs py-0.5" duration={2.5}>
                              Searching sources...
                            </TextShimmer>
                          );
                        } else if (statusForText === 'no_results' && sources.length === 0) {
                          return (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 py-1 mt-1">
                              No sources found for this query.
                            </p>
                          );
                        }
                        return null; 
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )})}
        </div>
      </CardContent>
    </Card>
  );
};

export const ExtremeSearch = memo(ExtremeSearchComponent); 