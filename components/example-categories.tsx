'use client';

import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  RedditIcon,
  NewTwitterIcon,
  YoutubeIcon,
  GlobalSearchIcon,
  MicroscopeIcon,
  ArrowRight01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@/components/ui/hugeicons';

interface ExampleItem {
  text: string;
  group?: string;
}

interface Category {
  id: string;
  name: string;
  icon: typeof RedditIcon;
  examples: ExampleItem[];
  badge?: string;
}

const categories: Category[] = [
  {
    id: 'x',
    name: 'X Search',
    icon: NewTwitterIcon,
    examples: [
      { text: "What has Elon Musk posted about AI this week?", group: 'x' },
      { text: 'Latest announcements from OpenAI', group: 'x' },
      { text: 'Tips for using Claude Code with other models', group: 'x' },
      { text: 'What are developers saying about Cursor IDE?', group: 'x' },
    ],
  },
  {
    id: 'reddit',
    name: 'Reddit Search',
    icon: RedditIcon,
    examples: [
      { text: 'Best mechanical keyboards for programming', group: 'reddit' },
      { text: 'Productivity apps that actually work', group: 'reddit' },
      { text: 'Is the M5 MacBook Pro worth buying?', group: 'reddit' },
      { text: 'Budget headphones under $100', group: 'reddit' },
    ],
  },
  {
    id: 'research',
    name: 'Research',
    icon: MicroscopeIcon,
    badge: 'Deep',
    examples: [
      { text: 'Latest research on transformer architectures', group: 'academic' },
      { text: 'Compare RAG vs fine-tuning for LLMs with sources', group: 'extreme' },
      { text: 'Peer-reviewed papers on climate adaptation', group: 'academic' },
      { text: 'In-depth analysis of quantum computing progress', group: 'extreme' },
    ],
  },
  {
    id: 'media',
    name: 'Videos',
    icon: YoutubeIcon,
    examples: [
      { text: 'Best tutorials for learning Rust', group: 'youtube' },
      { text: 'Top tech review channels for MacBook Pro', group: 'youtube' },
      { text: 'Documentary recommendations about space', group: 'youtube' },
      { text: 'Recent conference talks on system design', group: 'youtube' },
    ],
  },
  {
    id: 'factcheck',
    name: 'Fact Check',
    icon: GlobalSearchIcon,
    examples: [
      { text: 'Is it true that honey never spoils?', group: 'web' },
      { text: 'Verify: humans only use 10% of their brain', group: 'web' },
      { text: 'Did Einstein really fail math?', group: 'web' },
      { text: 'Fact check the 5-second rule for food', group: 'web' },
    ],
  },
];

interface ExampleCategoriesProps {
  onSelectExample: (text: string, group?: string) => void;
  className?: string;
}

export const ExampleCategories = memo(({ onSelectExample, className }: ExampleCategoriesProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCategoryClick = useCallback((categoryId: string) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  const handleExampleSelect = useCallback(
    (text: string, group?: string) => {
      onSelectExample(text, group);
      setSelectedCategory(null);
    },
    [onSelectExample],
  );

  const handleDismiss = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  // Click outside to dismiss
  useEffect(() => {
    if (!selectedCategory) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setSelectedCategory(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCategory(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [selectedCategory]);

  const activeCategory = categories.find((c) => c.id === selectedCategory);

  return (
    <div className={cn('w-full relative', className)}>
      {/* Category Buttons - always visible and in flow */}
      <div
        className={cn(
          'flex items-center justify-center gap-2 flex-wrap transition-opacity duration-150',
          selectedCategory ? 'opacity-0 pointer-events-none' : 'opacity-100',
        )}
      >
        {categories.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
              'border border-border bg-background text-muted-foreground',
              'hover:bg-secondary hover:text-secondary-foreground hover:border-secondary',
              'transition-colors duration-150',
            )}
            whileTap={{ scale: 0.97 }}
          >
            <HugeiconsIcon icon={category.icon} size={14} strokeWidth={1.5} />
            <span>{category.name}</span>
            {category.badge && (
              <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide rounded bg-secondary text-secondary-foreground">
                {category.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Expanded Card - absolutely positioned overlay */}
      <AnimatePresence>
        {activeCategory && (
          <motion.div
            ref={cardRef}
            key={activeCategory.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-0 z-10 border rounded-md bg-card"
          >
            {/* Header - clickable to dismiss */}
            <button
              onClick={handleDismiss}
              className="flex items-center justify-between w-full px-3 sm:px-4 py-2.5 sm:py-3"
            >
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={activeCategory.icon} size={16} className="sm:size-[18px]" strokeWidth={1.5} />
                <span className="text-sm sm:text-base font-medium">{activeCategory.name}</span>
                {activeCategory.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium uppercase tracking-wide rounded bg-secondary text-secondary-foreground">
                    {activeCategory.badge}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  'flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-md',
                  'text-muted-foreground',
                  'bg-muted/50',
                )}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={12} className="sm:size-[14px]" strokeWidth={2} />
              </div>
            </button>

            {/* Examples */}
            <div className="p-1 sm:p-1.5">
              {activeCategory.examples.map((example) => (
                <button
                  key={example.text}
                  onClick={() => handleExampleSelect(example.text, example.group)}
                  className={cn(
                    'group flex items-center justify-between w-full px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-sm',
                    'text-left text-xs sm:text-sm transition-colors',
                    'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  <span className="line-clamp-1">{example.text}</span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={12}
                    className="sm:size-[14px] shrink-0 ml-2 opacity-0 -translate-x-1 transition-all group-hover:opacity-50 group-hover:translate-x-0"
                    strokeWidth={2}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ExampleCategories.displayName = 'ExampleCategories';
