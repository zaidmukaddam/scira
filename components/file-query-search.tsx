// /components/file-query-search.tsx
import React, { useState, useMemo } from 'react';
import { FileText, FileSpreadsheet, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { DataQueryCompletionPart } from '@/lib/types';

// Icons
const Icons = {
  ChevronDown: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  Check: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
};

// Types
interface FileQueryResult {
  fileName: string;
  content: string;
  score: number;
}

interface QuerySearchResult {
  query: string;
  results: FileQueryResult[];
}

interface FileQuerySearchResponse {
  success?: boolean;
  error?: string;
  searches?: QuerySearchResult[];
  totalResults?: number;
  filesSearched?: string[];
}

interface FileQuerySearchArgs {
  queries?: (string | undefined)[] | string | null;
  maxResults?: number;
  rerank?: boolean;
}

// Get file icon based on extension
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const spreadsheetExts = ['csv', 'xlsx', 'xls'];
  const codeExts = ['json', 'xml', 'html', 'js', 'ts', 'jsx', 'tsx'];
  
  if (spreadsheetExts.includes(ext)) {
    return FileSpreadsheet;
  }
  if (codeExts.includes(ext)) {
    return FileCode;
  }
  return FileText;
};

// File Query Result Card
const FileQueryResultCard: React.FC<{ result: FileQueryResult }> = ({ result }) => {
  const FileIcon = getFileIcon(result.fileName);

  return (
    <div className="group relative px-3.5 py-2 transition-colors hover:bg-muted/10">
      <div className="flex items-center gap-2.5">
        <FileIcon className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium text-foreground line-clamp-1 flex-1">
              {result.fileName}
            </h3>
            <span className="font-pixel text-[9px] text-muted-foreground/50 tabular-nums shrink-0 tracking-wider">
              {(result.score * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50 line-clamp-1 mt-0.5 leading-relaxed">
            {result.content.length > 200 ? result.content.substring(0, 200) + '...' : result.content}
          </p>
        </div>
      </div>
    </div>
  );
};

// Loading State Component
const SearchLoadingState: React.FC<{ queries: string[]; annotations: DataQueryCompletionPart[] }> = ({ queries, annotations }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const queryAnnotations = annotations.filter((a) => a.type === 'data-query_completion');
  const totalResults = queryAnnotations.reduce((sum, a) => sum + (a.data.resultsCount || 0), 0);

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
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Documents</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{totalResults || 0}</span>
            <Icons.ChevronDown
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
              className="px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-border/30"
              onWheel={handleWheelScroll}
            >
              {queries.length ? (
                queries.map((query, i) => {
                  const isCompleted = queryAnnotations.some((a) => a.data.query === query && a.data.status === 'completed');
                  const annotation = queryAnnotations.find((a) => a.data.query === query);
                  const resultsCount = annotation?.data.resultsCount || 0;
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5 text-[10px] shrink-0">
                      {isCompleted ? <Icons.Check className="w-2.5 h-2.5 text-muted-foreground" /> : <Spinner className="w-2.5 h-2.5" />}
                      <span className={cn('font-medium', isCompleted ? 'text-foreground' : 'text-muted-foreground')}>{query}</span>
                      {resultsCount > 0 && <span className="text-[9px] text-muted-foreground/50 tabular-nums">({resultsCount})</span>}
                      {i < queries.length - 1 && <span className="text-muted-foreground/30 ml-1">/</span>}
                    </span>
                  );
                })
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Spinner className="w-2.5 h-2.5" />
                  <span className="font-medium">Searching documents...</span>
                </span>
              )}
            </div>

            <div className="divide-y divide-border/20">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="px-3.5 py-2 flex items-center gap-2.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0 animate-pulse" />
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

// Main FileQuerySearch Component
const FileQuerySearch: React.FC<{
  result: FileQuerySearchResponse | null;
  args: FileQuerySearchArgs;
  annotations?: DataQueryCompletionPart[];
}> = ({ result, args: _args, annotations = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const normalizedQueries = useMemo(() => {
    const raw = Array.isArray(_args?.queries) ? _args.queries : [_args?.queries ?? ''];
    return raw.filter((q): q is string => typeof q === 'string' && q.length > 0);
  }, [_args?.queries]);

  if (!result) {
    return <SearchLoadingState queries={normalizedQueries} annotations={annotations} />;
  }

  const { success, error, searches = [], totalResults: propTotalResults, filesSearched = [] } = result;
  const totalResults = propTotalResults ?? searches.reduce((sum, s) => sum + s.results.length, 0);
  const allResults = searches.flatMap((s) => s.results);

  // Error state
  if (!success) {
    return (
      <div className="w-full my-3">
        <div className="rounded-xl border border-destructive/20 overflow-hidden bg-destructive/5">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs font-medium text-destructive">Search Failed</span>
          </div>
          <div className="px-4 pb-3 pt-0.5">
            <p className="text-[10px] text-destructive/70">{error || 'Unable to search uploaded documents'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty results
  if (totalResults === 0) {
    const queryText = searches.map((s) => s.query).join(', ');
    return (
      <div className="w-full my-3">
        <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Documents</span>
            <span className="text-[10px] text-muted-foreground/50">No results</span>
          </div>
          <div className="px-4 pb-3 pt-0.5 border-t border-border/40">
            <p className="text-[10px] text-muted-foreground/50">
              No relevant content found{queryText && ` for "${queryText}"`}
              {filesSearched.length > 0 && ` in ${filesSearched.length} file${filesSearched.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success with results
  return (
    <div className="w-full my-3">
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Documents</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{totalResults}</span>
            <Icons.ChevronDown
              className={cn(
                'h-3 w-3 text-muted-foreground/60 transition-transform duration-200',
                isExpanded && 'rotate-180',
              )}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border/40">
            {/* Query tags */}
            <div className="px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-border/30">
              {searches.map((search, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[10px] shrink-0">
                  <span className="font-medium text-foreground/80">{search.query}</span>
                  <span className="text-[9px] text-muted-foreground/50 tabular-nums">({search.results.length})</span>
                  {i < searches.length - 1 && <span className="text-muted-foreground/30 ml-1">/</span>}
                </span>
              ))}
              {filesSearched.length > 0 && (
                <span className="text-[9px] text-muted-foreground/40 ml-1">
                  {filesSearched.length} file{filesSearched.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Results list */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
              {allResults
                .sort((a, b) => b.score - a.score)
                .map((result, index) => (
                  <FileQueryResultCard key={index} result={result} />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileQuerySearch;
