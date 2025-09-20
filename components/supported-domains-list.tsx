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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Eye, Search, University, AlertCircle, RefreshCw } from 'lucide-react';
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
        <Button variant="default" size="sm" className={className}>
          <Eye className="w-4 h-4 mr-2" />
          View supported universities
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <University className="w-5 h-5" />
            Supported University Domains
          </DialogTitle>
          <DialogDescription>
            Universities and educational institutions that automatically qualify for the student discount.
          </DialogDescription>
        </DialogHeader>

        {/* Body layout: header controls + scrollable list + footer info all inside dialog */}
        <div className="mt-2 max-h-[70vh] flex flex-col min-w-0">
          {/* Header controls */}
          <div className="flex items-center justify-between gap-2 pb-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="secondary">
                {domainsData?.count || 0} {(domainsData?.count || 0) === 1 ? 'domain' : 'domains'} supported
              </Badge>
              {domainsData?.fallback && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Basic list
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={refreshDomains} disabled={isLoading}>
              <RefreshCw className="w-4 h-4" />
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
                className="w-full pl-9"
                autoFocus
              />
            </div>
          </form>

          {/* Scrollable list area */}
          <div className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                Loading domains...
              </div>
            ) : domainsData ? (
              <ScrollArea className="h-full w-full">
                <div className="space-y-2 pr-2">
                  {filteredDomains.length > 0 ? (
                    filteredDomains.map((domain, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{getDomainDisplayName(domain)}</div>
                          <div className="text-xs text-muted-foreground">
                            Domain pattern: <code className="bg-muted px-1 rounded">{domain}</code>
                          </div>
                        </div>
                        <Badge variant="outline">{getDomainType(domain)}</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No domains found matching your search' : 'No domains available'}
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : null}
          </div>

          {/* Footer info stays inside dialog */}
          <div className="pt-3">
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p className="mb-1">
                <strong>How it works:</strong> Sign up with an email from any of these domains to automatically receive
                the student discount.
              </p>
              <p>Don&apos;t see your university? Use the &quot;Request University Domain&quot; button to add it.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
