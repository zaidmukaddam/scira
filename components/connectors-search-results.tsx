'use client';

import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  ArrowUpRight,
  Search,
  Folder,
  Calendar,
  Star,
  Clock,
  File,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  FileType,
  FileCode,
  FileArchive,
  Presentation,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { CONNECTOR_ICONS } from '@/lib/connectors';

interface Document {
  documentId: string;
  title: string | null;
  type: string | null;
  chunks: Array<{
    content: string;
    score: number;
    isRelevant: boolean;
  }>;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  score: number;
  content?: string | null;
  summary?: string | null;
  provider?: string | null;
  providerConfig?: {
    name: string;
    description: string;
    icon: string;
  } | null;
  url?: string; // URL provided by the tool
}

interface ConnectorsSearchResultsProps {
  results: Document[];
  query: string;
  totalResults: number;
  isLoading?: boolean;
}

// Skeleton Card Component
const SkeletonCard: React.FC = () => {
  return (
    <div className="group p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
      {/* Header skeleton */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded bg-muted animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-muted rounded animate-pulse mb-2" />
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-muted rounded animate-pulse" />
            <div className="w-16 h-3 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-20 h-3 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-10 h-5 bg-muted rounded-full animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="pt-3 border-t">
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded animate-pulse" />
          <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
          <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
        </div>
      </div>
    </div>
  );
};

// Document Card Component
const DocumentCard: React.FC<{ document: Document; onClick?: () => void }> = ({ document, onClick }) => {
  const getFileIcon = (type: string | null) => {
    if (!type) return <File className="h-4 w-4" />;

    const lowerType = type.toLowerCase();

    // Images
    if (
      lowerType.includes('image') ||
      lowerType.includes('jpeg') ||
      lowerType.includes('jpg') ||
      lowerType.includes('png') ||
      lowerType.includes('gif') ||
      lowerType.includes('webp')
    ) {
      return <ImageIcon className="h-4 w-4" />;
    }

    // PDFs
    if (lowerType.includes('pdf')) {
      return <FileType className="h-4 w-4" />;
    }

    // Spreadsheets
    if (lowerType.includes('sheet') || lowerType.includes('excel') || lowerType.includes('csv')) {
      return <FileSpreadsheet className="h-4 w-4" />;
    }

    // Presentations
    if (
      lowerType.includes('presentation') ||
      lowerType.includes('slides') ||
      lowerType.includes('powerpoint') ||
      lowerType.includes('keynote')
    ) {
      return <Presentation className="h-4 w-4" />;
    }

    // Videos
    if (
      lowerType.includes('video') ||
      lowerType.includes('mp4') ||
      lowerType.includes('mov') ||
      lowerType.includes('avi')
    ) {
      return <FileVideo className="h-4 w-4" />;
    }

    // Audio
    if (
      lowerType.includes('audio') ||
      lowerType.includes('mp3') ||
      lowerType.includes('wav') ||
      lowerType.includes('m4a')
    ) {
      return <FileAudio className="h-4 w-4" />;
    }

    // Code files
    if (
      lowerType.includes('code') ||
      lowerType.includes('javascript') ||
      lowerType.includes('python') ||
      lowerType.includes('html') ||
      lowerType.includes('css') ||
      lowerType.includes('json')
    ) {
      return <FileCode className="h-4 w-4" />;
    }

    // Archives
    if (
      lowerType.includes('zip') ||
      lowerType.includes('rar') ||
      lowerType.includes('tar') ||
      lowerType.includes('archive')
    ) {
      return <FileArchive className="h-4 w-4" />;
    }

    // Text documents
    if (
      lowerType.includes('text') ||
      lowerType.includes('document') ||
      lowerType.includes('doc') ||
      lowerType.includes('rtf')
    ) {
      return <FileText className="h-4 w-4" />;
    }

    // Default fallback
    return <File className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  return (
    <div
      className={cn(
        'group relative bg-card',
        'border',
        'rounded-lg p-4 transition-all duration-200',
        'hover:bg-accent/5',
        'hover:border-accent-foreground/20',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
          {getFileIcon(document.type)}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-2 max-h-12 truncate">
            {document.title || 'Untitled Document'}
          </h3>
          <div className="flex items-center gap-2 mb-1">
            {document.providerConfig && (
              <span className="flex items-center gap-1.5">
                {CONNECTOR_ICONS[document.providerConfig.icon] &&
                  React.createElement(CONNECTOR_ICONS[document.providerConfig.icon], {
                    className: 'w-3 h-3 flex-shrink-0 text-muted-foreground',
                  })}
                <span className="text-xs text-muted-foreground truncate">{document.providerConfig.name}</span>
              </span>
            )}
            {document.type && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">
                {document.type.replace(/[/_]/g, ' ')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatDate(document.updatedAt)}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            Open
            <ArrowUpRight className="w-3 h-3" />
          </Badge>
        </div>
      </div>

      {/* Content preview */}
      <div className="pt-3 border-t">
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 max-h-16">
          {(() => {
            // Prioritize relevant chunks, then summary, then content
            const relevantChunk = document.chunks?.find((chunk) => chunk.isRelevant)?.content;
            if (relevantChunk) {
              return truncateText(relevantChunk, 150);
            }
            if (document.summary) {
              return truncateText(document.summary, 150);
            }
            if (document.content) {
              return truncateText(document.content, 150);
            }
            return 'No preview available';
          })()}
        </p>
      </div>
    </div>
  );
};

// Documents Sheet Component
const DocumentsSheet: React.FC<{
  documents: Document[];
  query: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ documents, query, open, onOpenChange }) => {
  const isMobile = useIsMobile();

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper open={open} onOpenChange={onOpenChange}>
      <SheetContentWrapper className={cn(isMobile ? 'h-[85vh]' : 'w-[600px] sm:max-w-[600px]', 'p-0')}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border bg-card">
            <div>
              <h2 className="text-lg font-semibold text-foreground">All Documents</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {documents.length} results for &ldquo;{query}&rdquo;
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="p-6 space-y-4">
              {documents.map((document) => (
                <a key={document.documentId} href={document.url || '#'} target="_blank" className="block">
                  <DocumentCard document={document} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

export function ConnectorsSearchResults({
  results,
  query,
  totalResults,
  isLoading = false,
}: ConnectorsSearchResultsProps) {
  const [isClient, setIsClient] = React.useState(false);
  const [documentsOpen, setDocumentsOpen] = React.useState(false);
  const previewResultsRef = React.useRef<HTMLDivElement>(null);

  // Ensure hydration safety
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Add horizontal scroll support with mouse wheel
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;

    // Only handle vertical scrolling
    if (e.deltaY === 0) return;

    // Check if container can scroll horizontally
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) return;

    // Always stop propagation first to prevent page scroll interference
    e.stopPropagation();

    // Check scroll position to determine if we should handle the event
    const isAtLeftEdge = container.scrollLeft <= 1;
    const isAtRightEdge = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;

    // Only prevent default if we're not at edges OR if we're scrolling in the direction that would move within bounds
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

  if (results.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="p-4 rounded-lg bg-muted mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No documents found</h3>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          No relevant documents were found in your connected files for &ldquo;{query}&rdquo;. Make sure your documents
          are synchronized and try a different search term.
        </p>
      </div>
    );
  }

  // Prevent hydration mismatches by only rendering after client-side mount
  if (!isClient) {
    return <div className="w-full space-y-4" />;
  }

  return (
    <div className="w-full space-y-4">
      {/* Documents Accordion */}
      <Accordion
        type="single"
        collapsible
        defaultValue="documents"
        className="w-full [&_[data-state=open]>div]:animate-none [&_[data-state=closed]>div]:animate-none"
      >
        <AccordionItem value="documents" className="border-none">
          <AccordionTrigger
            className={cn(
              'py-3 px-4 hover:no-underline group',
              'bg-card border rounded-lg',
              'data-[state=open]:rounded-b-none',
              '[&>svg]:hidden', // Hide default chevron
              '[&[data-state=open]_[data-chevron]]:rotate-180', // Rotate custom chevron when open
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-muted">
                  <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="font-medium text-sm text-foreground">Connected Documents</h2>
                  {isLoading && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" />
                      <span className="text-[10px] text-muted-foreground">Searching...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full text-xs px-2 py-0.5">
                  {isLoading ? '...' : totalResults}
                </Badge>
                {totalResults > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDocumentsOpen(true);
                    }}
                  >
                    View all
                    <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
                <ChevronDown
                  className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200"
                  data-chevron
                />
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-0">
            <div className="p-4 space-y-4 bg-card border-x border-b rounded-b-lg">
              {/* Query badge */}
              <div className="flex gap-2">
                <Badge variant="outline" className="rounded-full text-xs px-3 py-1 shrink-0 flex items-center gap-1.5">
                  <Search className="w-3 h-3" />
                  <span>{query}</span>
                </Badge>
              </div>

              {/* Preview results */}
              <div
                ref={previewResultsRef}
                className="flex gap-4 overflow-x-auto no-scrollbar pb-2"
                onWheel={handleWheelScroll}
              >
                {isLoading && results.length === 0 ? (
                  <>
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={`skeleton-${i}`} className="flex-shrink-0 w-[320px]">
                        <SkeletonCard />
                      </div>
                    ))}
                  </>
                ) : (
                  results.map((document) => (
                    <a
                      key={document.documentId}
                      href={document.url || '#'}
                      target="_blank"
                      className="block flex-shrink-0 w-[320px]"
                    >
                      <DocumentCard document={document} />
                    </a>
                  ))
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Documents Sheet */}
      <DocumentsSheet documents={results} query={query} open={documentsOpen} onOpenChange={setDocumentsOpen} />
    </div>
  );
}
