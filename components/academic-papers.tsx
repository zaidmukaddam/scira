import { Book, Calendar, Download, FileText, User2, ArrowUpRight, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface AcademicResult {
  title: string;
  url: string;
  author?: string | null;
  publishedDate?: string;
  summary: string;
}

interface AcademicPapersProps {
  results: AcademicResult[];
}

// Academic Paper Source Card Component
const AcademicSourceCard: React.FC<{ 
  paper: AcademicResult; 
  onClick?: () => void 
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
        'group relative bg-white dark:bg-neutral-900',
        'border border-neutral-200 dark:border-neutral-800',
        'rounded-xl p-4 transition-all duration-200',
        'hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
          <Book className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-neutral-900 dark:text-neutral-100 line-clamp-1 mb-1">
            {paper.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="truncate">Academic Paper</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-3">
        {paper.summary.length > 150 ? paper.summary.substring(0, 150) + '...' : paper.summary}
      </p>

      {/* Footer */}
      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
        {formattedAuthors && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <User2 className="w-3 h-3" />
            <span className="truncate">{formattedAuthors}</span>
          </div>
        )}
        {paper.publishedDate && (
          <time className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {new Date(paper.publishedDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
        )}
      </div>
    </div>
  );
};

// Academic Papers Sheet Component
const AcademicPapersSheet: React.FC<{
  papers: AcademicResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ papers, open, onOpenChange }) => {
  const isMobile = useIsMobile();

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper open={open} onOpenChange={onOpenChange}>
      <SheetContentWrapper className={cn(isMobile ? 'h-[85vh]' : 'w-[600px] sm:max-w-[600px]', 'p-0')}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-violet-50 dark:bg-violet-900/20">
                <Book className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">All Academic Papers</h2>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {papers.length} research papers
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-3">
              {papers.map((paper, index) => (
                <a
                  key={index}
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <AcademicSourceCard paper={paper} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

const AcademicPapersCard = ({ results }: AcademicPapersProps) => {
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

  // Add horizontal scroll support with mouse wheel
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  // Show first 5 papers in preview
  const previewPapers = results.slice(0, 5);

  return (
    <div className="w-full space-y-3 my-4">
      <Accordion type="single" collapsible defaultValue="academic_papers" className="w-full">
        <AccordionItem value="academic_papers" className="border-none">
          <AccordionTrigger 
            className={cn(
              'py-3 px-4 rounded-xl hover:no-underline',
              'bg-white dark:bg-neutral-900',
              'border border-neutral-200 dark:border-neutral-800',
              'data-[state=open]:rounded-b-none',
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-violet-50 dark:bg-violet-900/20">
                  <Book className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="font-medium text-sm">Academic Papers</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5">
                  {results.length}
                </Badge>
                {results.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSourcesSheetOpen(true);
                    }}
                  >
                    View all
                    <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-0">
            <div
              className={cn(
                'p-3 space-y-3',
                'bg-white dark:bg-neutral-900',
                'border-x border-b border-neutral-200 dark:border-neutral-800',
                'rounded-b-xl',
              )}
            >
              {/* Preview results */}
              <div 
                className="flex gap-3 overflow-x-auto no-scrollbar pb-1"
                onWheel={handleWheelScroll}
              >
                {previewPapers.map((paper, index) => (
                  <a
                    key={index}
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block flex-shrink-0 w-[320px]"
                  >
                    <AcademicSourceCard paper={paper} />
                  </a>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Sources Sheet */}
      <AcademicPapersSheet 
        papers={results} 
        open={sourcesSheetOpen} 
        onOpenChange={setSourcesSheetOpen} 
      />
    </div>
  );
};

// Memoize the component for better performance
export default React.memo(AcademicPapersCard);
