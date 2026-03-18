'use client';

import { MonitorIcon, SunIcon, MoonStarIcon, ChevronDownIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useRef } from 'react';

import { cn } from '@/lib/utils';

interface ThemeConfig {
  value: string;
  label: string;
  icon: React.ReactNode;
  colors: [string, string, string]; // [bg, primary, accent] for the swatch
  description: string;
}

const THEMES: ThemeConfig[] = [
  {
    value: 'system',
    label: 'System',
    icon: <MonitorIcon className="w-3.5 h-3.5" />,
    colors: ['#F9F9F9', '#6B5B4F', '#E8DFD5'],
    description: 'Follows your OS',
  },
  {
    value: 'light',
    label: 'Light',
    icon: <SunIcon className="w-3.5 h-3.5" />,
    colors: ['#FAFAFA', '#6B5B4F', '#EBE0C8'],
    description: 'Clean & bright',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: <MoonStarIcon className="w-3.5 h-3.5" />,
    colors: ['#1A1A1A', '#E8D5A3', '#3A3020'],
    description: 'Dim & focused',
  },
  {
    value: 'colourful',
    label: 'Colorful',
    icon: <span className="text-[10px] font-pixel leading-none">C</span>,
    colors: ['#3D3428', '#C4A96A', '#5A4D3A'],
    description: 'Warm & earthy',
  },
  {
    value: 't3chat',
    label: 'T3 Chat',
    icon: <span className="text-[10px] font-pixel leading-none">T3</span>,
    colors: ['#2A1F35', '#9B2B5A', '#4A2D5A'],
    description: 'Bold & vibrant',
  },
  {
    value: 'claudedark',
    label: 'Claude Dark',
    icon: <span className="text-[10px] font-pixel leading-none">CD</span>,
    colors: ['#352F28', '#C07A3E', '#2A2520'],
    description: 'Ink & paper, dark',
  },
  {
    value: 'claudelight',
    label: 'Claude Light',
    icon: <span className="text-[10px] font-pixel leading-none">CL</span>,
    colors: ['#F5F0E8', '#B86030', '#E8DDD0'],
    description: 'Ink & paper, light',
  },
  {
    value: 'neutrallight',
    label: 'Neutral Light',
    icon: <span className="text-[10px] font-pixel leading-none">NL</span>,
    colors: ['#FFFFFF', '#BF6E35', '#F1F1F1'],
    description: 'Minimal & warm',
  },
  {
    value: 'neutraldark',
    label: 'Neutral Dark',
    icon: <span className="text-[10px] font-pixel leading-none">ND</span>,
    colors: ['#252525', '#9C5B2C', '#434343'],
    description: 'Muted & focused',
  },
];

function ThemeSwatch({ colors, size = 'sm' }: { colors: [string, string, string]; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 16 : 20;
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" className="shrink-0 rounded-[4px] border border-border/50 overflow-hidden">
      <rect width="20" height="20" fill={colors[0]} />
      <circle cx="7" cy="10" r="4" fill={colors[1]} />
      <rect x="12" y="6" width="6" height="8" rx="1.5" fill={colors[2]} />
    </svg>
  );
}

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (!isMounted) {
    return <div className="h-8 w-8 rounded-full bg-muted/30" />;
  }

  const currentTheme = THEMES.find((t) => t.value === theme) || THEMES[0];

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 h-8 pl-2 pr-1.5 rounded-full',
          'bg-muted/40 hover:bg-muted/60 border border-border/50',
          'transition-all duration-200',
          'text-muted-foreground hover:text-foreground',
          isOpen && 'bg-muted/60 text-foreground border-border',
        )}
        aria-label="Switch theme"
        aria-expanded={isOpen}
      >
        <ThemeSwatch colors={currentTheme.colors} size="sm" />
        <ChevronDownIcon className={cn('w-3 h-3 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-border/50 bg-popover p-1.5 shadow-lg"
            role="radiogroup"
            aria-label="Theme selection"
          >
            {THEMES.map((t) => {
              const isActive = theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setTheme(t.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors duration-150',
                    isActive
                      ? 'bg-accent/50 text-foreground'
                      : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                  )}
                  role="radio"
                  aria-checked={isActive}
                  aria-label={`Switch to ${t.label} theme`}
                >
                  <ThemeSwatch colors={t.colors} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium leading-tight">{t.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t.description}</div>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { ThemeSwitcher };
