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
import { sileo } from 'sileo';
import { Eye, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { getStudentDomainsAction } from '@/app/actions';
import { cn } from '@/lib/utils';

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
        sileo.error({ title: 'Failed to load latest domains, showing fallback list' });
      } else if (result.fallback) {
        sileo.info({ title: 'Showing basic domain list' });
      }
    } catch (error) {
      console.error('Failed to load domains:', error);
      sileo.error({ title: 'Failed to load supported domains' });
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
    if (domain === '.edu') return 'US Educational Institutions';
    if (domain === '.ac.in') return 'Indian Academic Institutions';
    if (domain.startsWith('.')) return `${domain} domains`;
    return domain;
  };

  const getDomainType = (domain: string) => {
    if (domain === '.edu') return 'US';
    if (domain === '.ac.in') return 'India';
    if (domain.includes('.edu')) return 'Edu';
    if (domain.includes('.ac.')) return 'Academic';
    return 'Uni';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn('rounded-lg gap-1.5 h-8 text-xs', className)}>
          <Eye className="w-3.5 h-3.5" />
          Universities
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">Supported Domains</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Universities that qualify for the student discount.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 max-h-[65vh] flex flex-col min-w-0">
          {/* Search + controls */}
          <div className="flex items-center gap-2 pb-3 min-w-0">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <Input
                placeholder="Search domains..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 rounded-lg h-8 text-xs border-border/60"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {domainsData && (
                <span className="font-pixel text-[9px] text-muted-foreground/40 uppercase tracking-wider tabular-nums">
                  {filteredDomains.length}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={refreshDomains} disabled={isLoading} className="rounded-lg h-8 w-8 p-0">
                <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {/* Fallback warning */}
          {domainsData?.fallback && (
            <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 pb-2">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>Showing basic list</span>
            </div>
          )}

          {/* Domain list */}
          <div className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />
                Loading...
              </div>
            ) : domainsData ? (
              <ScrollArea className="h-full w-full">
                <div className="rounded-xl border border-border/60 divide-y divide-border/30 overflow-hidden">
                  {filteredDomains.length > 0 ? (
                    filteredDomains.map((domain, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2.5 px-3.5 hover:bg-accent/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{getDomainDisplayName(domain)}</p>
                          <code className="font-pixel text-[9px] text-muted-foreground/40 uppercase tracking-wider">{domain}</code>
                        </div>
                        <span className="font-pixel text-[8px] text-muted-foreground/30 uppercase tracking-wider shrink-0 ml-3">
                          {getDomainType(domain)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center">
                      <p className="text-xs text-muted-foreground">{searchTerm ? 'No domains match your search' : 'No domains available'}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : null}
          </div>

          {/* Footer */}
          <div className="pt-3">
            <p className="text-[11px] text-muted-foreground/60">
              Don&apos;t see your university? Use &quot;Request Domain&quot; to add it.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
