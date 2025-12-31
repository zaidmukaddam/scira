'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Eye, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { getStudentDomainsAction } from '@/app/actions';

interface SupportedDomainsListProps {
  className?: string;
}

interface DomainsData {
  success: boolean;
  domains: string[];
  count: number;
  fallback?: boolean;
  error?: string;
}

export function SupportedDomainsList({ className }: SupportedDomainsListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [domainsData, setDomainsData] = useState<DomainsData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadDomains = async () => {
    if (domainsData) return;

    setIsLoading(true);
    try {
      const result = await getStudentDomainsAction();
      setDomainsData(result);

      if (result.fallback && result.error) {
        toast.error('Failed to load latest domains, showing fallback list');
      } else if (result.fallback) {
        toast.info('Showing basic domain list');
      }
    } catch (error) {
      console.error('Failed to load domains:', error);
      toast.error('Failed to load supported domains');
      setDomainsData({
        success: false,
        domains: ['.edu', '.ac.in'],
        count: 2,
        fallback: true,
        error: 'Failed to load',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDomains = async () => {
    setDomainsData(null);
    await loadDomains();
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadDomains();
    } else {
      setSearchTerm('');
    }
  };

  const filteredDomains =
    domainsData?.domains.filter((domain) => domain.toLowerCase().includes(searchTerm.toLowerCase())) || [];

  const getDomainDisplayName = (domain: string) => {
    if (domain === '.edu') return 'US Educational Institutions (.edu)';
    if (domain === '.ac.in') return 'Indian Academic Institutions (.ac.in)';
    if (domain.startsWith('.')) return `${domain} domains`;
    return domain;
  };

  const getDomainType = (domain: string) => {
    if (domain === '.edu') return 'US';
    if (domain === '.ac.in') return 'India';
    if (domain.includes('.edu')) return 'Educational';
    if (domain.includes('.ac.')) return 'Academic';
    return 'University';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className={`rounded-none gap-2 ${className}`}>
          <Eye className="w-3.5 h-3.5" />
          View Universities
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Supported University Domains</DialogTitle>
          <DialogDescription className="text-sm">
            Universities that automatically qualify for the student discount.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 max-h-[70vh] flex flex-col min-w-0">
          {/* Header controls */}
          <div className="flex items-center justify-between gap-2 pb-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5">
                {domainsData?.count || 0} domains
              </span>
              {domainsData?.fallback && (
                <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Basic list
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={refreshDomains} disabled={isLoading} className="rounded-none h-8 w-8 p-0">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Search */}
          <form className="pb-3 min-w-0" onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 inset-y-0 my-auto w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search domains..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 rounded-none h-10"
                autoFocus
              />
            </div>
          </form>

          {/* Scrollable list area */}
          <div className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Loading domains...
              </div>
            ) : domainsData ? (
              <ScrollArea className="h-full w-full">
                <div className="space-y-px pr-2">
                  {filteredDomains.length > 0 ? (
                    filteredDomains.map((domain, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border border-border hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">{getDomainDisplayName(domain)}</div>
                          <div className="text-xs text-muted-foreground">
                            Pattern: <code className="bg-muted px-1.5 py-0.5 text-[10px]">{domain}</code>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5">
                          {getDomainType(domain)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {searchTerm ? 'No domains found matching your search' : 'No domains available'}
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : null}
          </div>

          {/* Footer info */}
          <div className="pt-3">
            <div className="text-xs text-muted-foreground bg-muted/30 border border-border p-4">
              <p className="mb-1">
                <span className="font-medium text-foreground">How it works:</span> Sign up with an email from any of these domains to automatically receive the student discount.
              </p>
              <p>Don&apos;t see your university? Use the &quot;Request Domain&quot; button to add it.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
