'use client';

import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

interface ThemeOption {
  label: string;
  value: string;
  scopeClassName?: string;
  description?: string;
}

function ThemeMiniPreview({
  scopeClassName,
  variant,
}: {
  scopeClassName?: string;
  variant: 'full' | 'compact';
}) {
  return (
    <div
      className={cn(
        variant === 'compact'
          ? 'relative h-12 overflow-hidden rounded-md border bg-background text-foreground shadow-xs sm:h-14'
          : 'relative h-16 overflow-hidden rounded-md border bg-background text-foreground shadow-xs sm:h-20',
        scopeClassName,
      )}
    >
      <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-secondary/10" />

      <div className={cn('relative', variant === 'compact' ? 'p-1.5' : 'p-1.5 sm:p-2')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <div className="h-2 w-12 rounded bg-muted" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-7 rounded bg-secondary" />
            <div className="h-2 w-2 rounded bg-accent" />
          </div>
        </div>

        <div className={cn('grid grid-cols-[1fr_40%] gap-2', variant === 'compact' ? 'mt-1.5' : 'mt-2')}>
          <div className="space-y-1.5">
            <div className="h-2 w-20 rounded bg-muted" />
            <div className="h-2 w-16 rounded bg-muted" />
            <div className="h-6 rounded-md border bg-card">
              <div className="h-full w-2/3 rounded-md bg-primary/15" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-8 rounded-md border bg-card p-1.5">
              <div className="h-2 w-12 rounded bg-muted" />
              <div className="mt-1.5 h-2 w-16 rounded bg-muted" />
            </div>
            <div className="h-6 rounded-md bg-primary/15" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemePreviews({ className, variant = 'full' }: { className?: string; variant?: 'full' | 'compact' }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const options = useMemo<ThemeOption[]>(
    () => [
      {
        label: 'System',
        value: 'system',
        scopeClassName: resolvedTheme === 'dark' ? 'dark' : 'light',
        description: `Follows OS (${resolvedTheme ?? '…'})`,
      },
      { label: 'Light', value: 'light', scopeClassName: 'light', description: 'Clean & bright' },
      { label: 'Dark', value: 'dark', scopeClassName: 'dark', description: 'Dim & focused' },
      { label: 'Colorful', value: 'colourful', scopeClassName: 'colourful', description: 'Warm & playful' },
      { label: 'T3 Chat', value: 't3chat', scopeClassName: 't3chat', description: 'High-contrast chat vibe' },
      { label: 'Claude Dark', value: 'claudedark', scopeClassName: 'claudedark', description: 'Ink & paper, dark' },
      { label: 'Claude Light', value: 'claudelight', scopeClassName: 'claudelight', description: 'Ink & paper, light' },
      { label: 'Neutral Light', value: 'neutrallight', scopeClassName: 'neutrallight', description: 'Minimal & warm' },
      { label: 'Neutral Dark', value: 'neutraldark', scopeClassName: 'neutraldark', description: 'Muted & focused' },
    ],
    [resolvedTheme],
  );

  if (!isMounted) {
    return (
      <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4', className)}>
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className={cn('rounded-lg border bg-muted/40', variant === 'compact' ? 'h-[86px]' : 'h-[118px]')} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4', className)} role="radiogroup">
      {options.map((option) => {
        const isActive = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              'group rounded-lg border bg-card p-2 text-left transition sm:p-3',
              'hover:bg-accent/30 hover:border-border',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isActive && 'border-ring ring-2 ring-ring ring-offset-2 ring-offset-background',
            )}
            role="radio"
            aria-checked={isActive}
            aria-label={`Switch to ${option.label} theme`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium leading-none sm:text-sm">{option.label}</p>
                {variant === 'full' && option.description && (
                  <p className="mt-1 hidden text-[11px] text-muted-foreground line-clamp-1 sm:block">{option.description}</p>
                )}
              </div>
              <div
                className={cn(
                  'mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border bg-background',
                  isActive ? 'border-ring bg-primary' : 'border-border',
                )}
              />
            </div>

            <div className={cn(variant === 'compact' ? 'mt-2' : 'mt-3')}>
              <ThemeMiniPreview scopeClassName={option.scopeClassName} variant={variant} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export { ThemePreviews };

