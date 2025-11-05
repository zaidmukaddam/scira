"use client";

import { ReactNode, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface JsonViewPopupProps {
  data?: unknown;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function JsonViewPopup({ data, open, onOpenChange, children }: JsonViewPopupProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const raw = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(raw ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="ghost" size="sm" className="text-xs">
            JSON
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>JSON Preview</DialogTitle>
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </DialogHeader>
        <pre className="mt-4 max-h-[60vh] overflow-auto rounded-md border bg-muted/40 p-4 text-xs leading-6 whitespace-pre-wrap">
          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
