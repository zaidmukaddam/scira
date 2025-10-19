import { Book, Calendar, Download, FileText, User2, ArrowUpRight, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

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
}

// Academic Paper Source Card Component - Compact List View
const AcademicSourceCard: React.FC<{
  paper: AcademicResult;
  onClick?: () => void;
}> = ({ paper, onClick }) => {
  // Format authors for display
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
        'border-b border-border',
        'py-2.5 px-3 transition-all duration-150',
        'hover:bg-accent/50',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div className="relative w-4 h-4 mt-0.5 flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-muted">
          <Book className="w-3 h-3 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Title */}
          <div className="flex items-baseline gap-1.5">
            <h3 className="font-medium text-[13px] text-foreground line-clamp-1 flex-1">
              {paper.title}
            </h3>
            <ArrowUpRight className="w-3 h-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
            {formattedAuthors && (
              <>
                <User2 className="w-2.5 h-2.5" />
                <span className="truncate">{formattedAuthors}</span>
              </>
            )}
            {formattedAuthors && paper.publishedDate && <span>·</span>}
            {paper.publishedDate && (
              <>
                <Calendar className="w-2.5 h-2.5" />
                <span>
                  {new Date(paper.publishedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </>
            )}
          </div>

          {/* Summary */}
          <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
            {paper.summary.length > 150 ? paper.summary.substring(0, 150) + '...' : paper.summary}
          </p>
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
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-muted">
                <Book className="h-4 w-4 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">All Academic Papers</h2>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {totalResults} from {searches.length} {searches.length === 1 ? 'query' : 'queries'}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {searches.map((search, searchIndex) => (
              <div key={searchIndex} className="border-b border-neutral-200 dark:border-neutral-800 last:border-0">
                <div className="px-6 py-3 bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200/60 dark:border-neutral-800/60">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {search.query}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {search.results.length}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-3">
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

const AcademicPapersCard = ({ results, response, args }: AcademicPapersProps) => {
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Normalize args to ensure required arrays for UI rendering
  const normalizedArgs = React.useMemo<NormalizedAcademicSearchArgs>(
    () => ({
      queries: args ? (Array.isArray(args.queries) ? args.queries : [args.queries ?? '']).filter(
        (q): q is string => typeof q === 'string' && q.length > 0
      ) : [],
      maxResults: args ? (Array.isArray(args.maxResults) ? args.maxResults : [args.maxResults ?? 20]).filter(
        (n): n is number => typeof n === 'number'
      ) : [],
    }),
    [args]
  );

  // Support both old format (results) and new format (response)
  const searches: AcademicSearchQueryResult[] = React.useMemo(() => {
    if (response?.searches) {
      return response.searches;
    } else if (results) {
      // Legacy format - wrap in single search
      return [{ query: 'Academic Papers', results }];
    }
    return [];
  }, [results, response]);

  const allResults = searches.flatMap((search) => search.results);
  const totalResults = allResults.length;

  return (
    <div className="w-full my-3">
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted">
              <Book className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">Academic Papers</span>
            <span className="text-[11px] text-muted-foreground">
              {totalResults} {totalResults === 1 ? 'paper' : 'papers'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {totalResults > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSourcesSheetOpen(true);
                }}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 hover:bg-accent rounded-md flex items-center gap-1"
              >
                View all
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </div>
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="border-t border-border">
            {/* Query tags */}
            {searches.length > 1 && normalizedArgs.queries.length > 0 && (
              <div className="px-3 pt-2.5 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-border">
                {searches.map((search, i) => (
                  <span 
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] shrink-0 border bg-muted border-border text-foreground font-medium"
                  >
                    <Book className="w-2.5 h-2.5" />
                    <span>{search.query}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Results list */}
            <div className="max-h-80 overflow-y-auto">
              {allResults.map((paper, index) => (
                <a
                  key={index}
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block last:border-0"
                >
                  <AcademicSourceCard paper={paper} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sources Sheet */}
      <AcademicPapersSheet searches={searches} open={sourcesSheetOpen} onOpenChange={setSourcesSheetOpen} />
    </div>
  );
};

// Memoize the component for better performance
export default React.memo(AcademicPapersCard);
