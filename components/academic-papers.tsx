import { Book, Calendar, Download, FileText, User2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import React from "react";

// CSS for the masking effect
const styles = {
  maskBottom: {
    WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
    maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
  }
};

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

const AcademicPapersCard = ({ results }: AcademicPapersProps) => {
  return (
    <Card className="w-full my-4 overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-xs">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
            <Book className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle>Academic Papers</CardTitle>
            <p className="text-sm text-muted-foreground">Found {results.length} papers</p>
          </div>
        </div>
      </CardHeader>
      <div className="px-4 pb-4">
        <div className="flex overflow-x-auto gap-3 no-scrollbar hover:overflow-x-scroll pb-1">
          {results.map((paper: AcademicResult, index: number) => (
            <motion.div
              key={paper.url || index}
              className="w-[360px] flex-none"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <div className="h-[300px] relative group overflow-y-auto">
                <div className="h-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 flex flex-col transition-all duration-200 hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-xs">
                  <h3 className="font-semibold text-lg tracking-tight mb-2 line-clamp-2 text-neutral-900 dark:text-neutral-100">
                    {paper.title}
                  </h3>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {paper.author && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 rounded-md text-neutral-700 dark:text-neutral-300">
                        <User2 className="h-3 w-3 text-violet-500" />
                        <span className="line-clamp-1">
                          {paper.author.split(';')
                            .slice(0, 2)
                            .join(', ') +
                            (paper.author.split(';').length > 2 ? ' et al.' : '')
                          }
                        </span>
                      </div>
                    )}

                    {paper.publishedDate && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 rounded-md text-neutral-700 dark:text-neutral-300">
                        <Calendar className="h-3 w-3 text-violet-500" />
                        {new Date(paper.publishedDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 mb-3 overflow-hidden relative">
                    <div className="h-full pr-1 overflow-y-auto" style={styles.maskBottom}>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {paper.summary}
                      </p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-white dark:from-neutral-900 to-transparent pointer-events-none" />
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="outline"
                      onClick={() => window.open(paper.url, '_blank')}
                      className="flex-1 text-sm hover:bg-violet-50 dark:hover:bg-violet-900/10 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Paper
                    </Button>

                    {paper.url.includes('arxiv.org') && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(paper.url.replace('abs', 'pdf'), '_blank')}
                        className="text-sm hover:bg-violet-50 dark:hover:bg-violet-900/10 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                        size="sm"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
};

// Memoize the component for better performance
export default React.memo(AcademicPapersCard); 