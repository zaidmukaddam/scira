'use client';

import { FlameIcon, MonitorIcon, MoonStarIcon, SunIcon, WavesIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: string; icon: React.ReactNode; label: string }[] = [
  { value: 'system',  icon: <MonitorIcon  size={14} />, label: 'System'  },
  { value: 'light',   icon: <SunIcon      size={14} />, label: 'Light'   },
  { value: 'dark',    icon: <MoonStarIcon size={14} />, label: 'Dark'    },
  { value: 'reef',    icon: <WavesIcon    size={14} />, label: 'Reef'    },
  { value: 'outback', icon: <FlameIcon    size={14} />, label: 'Outback' },
];

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) {
    return <div className="h-7 w-full rounded-full bg-primary/10" />;
  }

  return (
    <motion.div
      key="theme-switcher"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex w-full items-center justify-between rounded-full bg-primary/10 ring-1 ring-border ring-inset p-0.5"
      role="radiogroup"
      aria-label="Theme"
    >
      {THEME_OPTIONS.map(({ value, icon, label }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            aria-label={`${label} theme`}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'relative flex flex-1 h-6 items-center justify-center rounded-full transition-colors',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="theme-pill"
                transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                className="absolute inset-0 rounded-full bg-background shadow-xs ring-1 ring-border/50"
              />
            )}
            <span className="relative z-10">{icon}</span>
          </button>
        );
      })}
    </motion.div>
  );
}

export { ThemeSwitcher };
