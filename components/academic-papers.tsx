import { Book, ArrowUpRight, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { CustomUIDataTypes, DataQueryCompletionPart } from '@/lib/types';
import type { DataUIPart } from 'ai';

interface AcademicResult {
  title: string;
  url: string;
  author?: string | null;
  publishedDate?: string;
  summary: string;
}

interface AcademicSearchQueryResult {
  query: string;
  results: AcademicResult[];
}

interface AcademicSearchResponse {
  searches: AcademicSearchQueryResult[];
}

interface AcademicSearchArgs {
  queries?: (string | undefined)[] | string | null;
  maxResults?: (number | undefined)[] | number | null;
}

interface NormalizedAcademicSearchArgs {
  queries: string[];
  maxResults: number[];
}

interface AcademicPapersProps {
  results?: AcademicResult[];
  response?: AcademicSearchResponse | null;
  args?: AcademicSearchArgs;
  annotations?: DataQueryCompletionPart[];
}

// Academic Paper Source Card Component
const AcademicSourceCard: React.FC<{
  paper: AcademicResult;
  onClick?: () => void;
}> = ({ paper, onClick }) => {
  const formatAuthors = (author: string | null | undefined) => {
    if (!author) return null;
    const authors = author.split(';').slice(0, 2);
    return authors.join(', ') + (author.split(';').length > 2 ? ' et al.' : '');
  };

  const formattedAuthors = formatAuthors(paper.author);

  return (
    <div
      className={cn(
        'group relative',
        'px-3.5 py-2 transition-colors',
        'hover:bg-muted/10',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        <Book className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium text-foreground line-clamp-1 flex-1">{paper.title}</h3>
            <ArrowUpRight className="w-2.5 h-2.5 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {formattedAuthors && (
              <span className="text-[10px] text-muted-foreground/60 truncate">{formattedAuthors}</span>
            )}
            {formattedAuthors && paper.publishedDate && <span className="text-[10px] text-muted-foreground/30">·</span>}
            {paper.publishedDate && (
              <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                {new Date(paper.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
          {paper.summary && (
            <p className="text-[10px] text-muted-foreground/50 line-clamp-1 mt-0.5 leading-relaxed">
              {paper.summary.length > 150 ? paper.summary.substring(0, 150) + '...' : paper.summary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Academic Papers Sheet Component
const AcademicPapersSheet: React.FC<{
  searches: AcademicSearchQueryResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ searches, open, onOpenChange }) => {
  const isMobile = useIsMobile();
  const totalResults = searches.reduce((sum, search) => sum + search.results.length, 0);

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper open={open} onOpenChange={onOpenChange}>
      <SheetContentWrapper className={cn(isMobile ? 'h-[85vh]' : 'w-[600px] sm:max-w-[600px]', 'p-0')}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-2 mb-0.5">
              <Book className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Academic Papers</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {totalResults} from {searches.length} {searches.length === 1 ? 'query' : 'queries'}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {searches.map((search, searchIndex) => (
              <div key={searchIndex} className="border-b border-border/30 last:border-0">
                <div className="px-5 py-2 bg-muted/20 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{search.query}</span>
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">{search.results.length}</span>
                  </div>
                </div>

                <div className="divide-y divide-border/20">
                  {search.results.map((paper, resultIndex) => (
                    <a key={resultIndex} href={paper.url} target="_blank" className="block">
                      <AcademicSourceCard paper={paper} />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

// Loading state component - Similar to reddit-search.tsx and x-search.tsx
const AcademicSearchLoadingState: React.FC<{ queries: string[]; annotations: DataUIPart<CustomUIDataTypes>[] }> = ({
  queries,
  annotations,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const loadingQueryTagsRef = React.useRef<HTMLDivElement>(null);
  const totalResults = annotations.reduce((sum, a) => sum + (a.data.resultsCount || 0), 0);

  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (e.deltaY === 0) return;
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) return;
    e.stopPropagation();
    const isAtLeftEdge = container.scrollLeft <= 1;
    const isAtRightEdge = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;
    if (!isAtLeftEdge && !isAtRightEdge) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtLeftEdge && e.deltaY > 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtRightEdge && e.deltaY < 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="w-full my-3">
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Book className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Academic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{totalResults || 0}</span>
            <ChevronDown
              className={cn(
                'h-3 w-3 text-muted-foreground/60 transition-transform duration-200',
                isExpanded && 'rotate-180',
              )}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border/40">
            <div
              ref={loadingQueryTagsRef}
              className="px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-border/30"
              onWheel={handleWheelScroll}
            >
              {queries.length ? (
                queries.map((query, i) => {
                  const isCompleted = annotations.some((a) => a.data.query === query && a.data.status === 'completed');
                  const annotation = annotations.find((a) => a.data.query === query);
                  const resultsCount = annotation?.data.resultsCount || 0;
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5 text-[10px] shrink-0">
                      {isCompleted ? (
                        <svg className="w-2.5 h-2.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <Spinner className="w-2.5 h-2.5" />
                      )}
                      <span className={cn('font-medium', isCompleted ? 'text-foreground' : 'text-muted-foreground')}>{query}</span>
                      {resultsCount > 0 && <span className="text-[9px] text-muted-foreground/50 tabular-nums">({resultsCount})</span>}
                      {i < queries.length - 1 && <span className="text-muted-foreground/30 ml-1">/</span>}
                    </span>
                  );
                })
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Spinner className="w-2.5 h-2.5" />
                  <span className="font-medium">Searching papers...</span>
                </span>
              )}
            </div>

            <div className="divide-y divide-border/20">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="px-3.5 py-2 flex items-center gap-2.5">
                  <Book className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted/30 rounded animate-pulse w-3/4" style={{ animationDelay: `${i * 100}ms` }} />
                    <div className="h-2 bg-muted/20 rounded animate-pulse w-1/2" style={{ animationDelay: `${i * 100 + 50}ms` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AcademicPapersCard = ({ results, response, args, annotations = [] }: AcademicPapersProps) => {
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const normalizedArgs = React.useMemo<NormalizedAcademicSearchArgs>(
    () => ({
      queries: args
        ? (Array.isArray(args.queries) ? args.queries : [args.queries ?? '']).filter(
            (q): q is string => typeof q === 'string' && q.length > 0,
          )
        : [],
      maxResults: args
        ? (Array.isArray(args.maxResults) ? args.maxResults : [args.maxResults ?? 20]).filter(
            (n): n is number => typeof n === 'number',
          )
        : [],
    }),
    [args],
  );

  const searches: AcademicSearchQueryResult[] = React.useMemo(() => {
    if (response?.searches) {
      return response.searches;
    } else if (results) {
      return [{ query: 'Academic Papers', results }];
    }
    return [];
  }, [results, response]);

  const allResults = searches.flatMap((search) => search.results);
  const totalResults = allResults.length;

  if (!response && !results && normalizedArgs.queries.length > 0) {
    return <AcademicSearchLoadingState queries={normalizedArgs.queries} annotations={annotations} />;
  }

  return (
    <div className="w-full my-3">
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Book className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Academic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{totalResults}</span>
            {totalResults > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSourcesSheetOpen(true);
                }}
                className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 hover:bg-muted/30 rounded flex items-center gap-1"
              >
                View all
                <ArrowUpRight className="w-2.5 h-2.5" />
              </button>
            )}
            <ChevronDown
              className={cn(
                'h-3 w-3 text-muted-foreground/60 transition-transform duration-200',
                isExpanded && 'rotate-180',
              )}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border/40">
            {searches.length > 1 && normalizedArgs.queries.length > 0 && (
              <div className="px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-border/30">
                {searches.map((search, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] shrink-0">
                    <span className="font-medium text-foreground/80">{search.query}</span>
                    {i < searches.length - 1 && <span className="text-muted-foreground/30 ml-1">/</span>}
                  </span>
                ))}
              </div>
            )}

            <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
              {allResults.map((paper, index) => (
                <a key={index} href={paper.url} target="_blank" rel="noopener noreferrer" className="block">
                  <AcademicSourceCard paper={paper} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <AcademicPapersSheet searches={searches} open={sourcesSheetOpen} onOpenChange={setSourcesSheetOpen} />
    </div>
  );
};

// Memoize the component for better performance
export default React.memo(AcademicPapersCard);
