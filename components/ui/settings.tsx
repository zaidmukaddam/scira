'use client';

import type { Transition } from 'motion/react';
import { motion, useAnimation } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface SettingsIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SettingsIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const defaultTransition: Transition = {
  type: 'spring',
  stiffness: 100,
  damping: 12,
  mass: 0.4,
};

const SettingsIcon = forwardRef<SettingsIconHandle, SettingsIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave],
    );

    return (
      <div className={cn(className)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.line
            x1="21"
            x2="14"
            y1="4"
            y2="4"
            initial={false}
            variants={{
              normal: {
                x2: 14,
              },
              animate: {
                x2: 10,
              },
            }}
            animate={controls}
            transition={defaultTransition}
          />
          <motion.line
            x1="10"
            x2="3"
            y1="4"
            y2="4"
            variants={{
              normal: {
                x1: 10,
              },
              animate: {
                x1: 5,
              },
            }}
            animate={controls}
            transition={defaultTransition}
          />

          <motion.line
            x1="21"
            x2="12"
            y1="12"
            y2="12"
            variants={{
              normal: {
                x2: 12,
              },
              animate: {
                x2: 18,
              },
            }}
            animate={controls}
            transition={defaultTransition}
          />

          <motion.line
            x1="8"
            x2="3"
            y1="12"
            y2="12"
            variants={{
              normal: {
                x1: 8,
              },
              animate: {
                x1: 13,
              },
            }}
            animate={controls}
            transition={defaultTransition}
          />

          <motion.line
            x1="3"
            x2="12"
            y1="20"
            y2="20"
            variants={{
              normal: {
                x2: 12,
              },
              animate: {
                x2: 4,
              },
            }}
            animate={controls}
            transition={defaultTransition}
          />

          <motion.line
            x1="16"
            x2="21"
            y1="20"
            y2="20"
            variants={{
              normal: {
                x1: 16,
              },
              animate: {
                x1: 8,
              },
            }}
            animate={controls}
            transition={defaultTransition}
          />

          <motion.line
            x1="14"
            x2="14"
            y1="2"
            y2="6"
            variants={{
              normal: {
                x1: 14,
                x2: 14,
              },
              animate: {
                x1: 9,
                x2: 9,
              },
            }}
            animate={controls}
            transition={defaultTransition}
          />

          <motion.line
            x1="8"
            x2="8"
            y1="10"
            y2="14"
            variants={{
              normal: {
                x1: 8,
                x2: 8,
              },
              animate: {
                x1: 14,
                x2: 14,
              },
            }}
            animate={controls}
            transition={defaultTransition}
          />

          <motion.line
            x1="16"
            x2="16"
            y1="18"
            y2="22"
            variants={{
              normal: {
                x1: 16,
                x2: 16,
              },
              animate: {
                x1: 8,
                x2: 8,
              },
            }}
            animate={controls}
            transition={defaultTransition}
          />
        </svg>
      </div>
    );
  },
);

SettingsIcon.displayName = 'SettingsIcon';

export { SettingsIcon };
