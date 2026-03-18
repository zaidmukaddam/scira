"use client";

import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import useMeasure from "react-use-measure";

export interface TooltipRow {
  color: string;
  label: string;
  value: string | number;
}

export interface TooltipContentProps {
  title?: string;
  rows: TooltipRow[];
  /** Optional additional content (e.g., markers) */
  children?: ReactNode;
}

export function TooltipContent({ title, rows, children }: TooltipContentProps) {
  const [measureRef, bounds] = useMeasure({ debounce: 0, scroll: false });
  const [committedHeight, setCommittedHeight] = useState<number | null>(null);
  // Track the children state that we've committed to (not the current one)
  const committedChildrenStateRef = useRef<boolean | null>(null);
  const frameRef = useRef<number | null>(null);

  const hasChildren = !!children;
  const markerKey = hasChildren ? "has-marker" : "no-marker";

  // Check if we're waiting for a structural change to settle
  // This is true when children state differs from our last committed state
  const isWaitingForSettlement =
    committedChildrenStateRef.current !== null &&
    committedChildrenStateRef.current !== hasChildren;

  // Commit height changes with a frame delay when structure changes
  useEffect(() => {
    if (bounds.height <= 0) {
      return;
    }

    // Cancel any pending frame
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (isWaitingForSettlement) {
      // Structure changed - wait for layout to settle before committing
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = requestAnimationFrame(() => {
          setCommittedHeight(bounds.height);
          committedChildrenStateRef.current = hasChildren;
        });
      });
    } else {
      // No structural change, commit immediately
      setCommittedHeight(bounds.height);
      committedChildrenStateRef.current = hasChildren;
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [bounds.height, hasChildren, isWaitingForSettlement]);

  // Animate if we have a committed height
  const shouldAnimate = committedHeight !== null;

  return (
    <motion.div
      // Only animate if we have a committed height, otherwise use auto
      animate={
        committedHeight !== null ? { height: committedHeight } : undefined
      }
      className="overflow-hidden"
      // Skip initial animation
      initial={false}
      // Apply spring transition when we have a committed height
      transition={
        shouldAnimate
          ? {
              type: "spring",
              stiffness: 500,
              damping: 35,
              mass: 0.8,
            }
          : { duration: 0 }
      }
    >
      <div className="px-3 py-2.5" ref={measureRef}>
        {title && (
          <div className="mb-2 font-medium text-xs text-chart-tooltip-muted">{title}</div>
        )}
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div
              className="flex items-center justify-between gap-4"
              key={`${row.label}-${row.color}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                <span className="text-sm text-chart-tooltip-muted">
                  {row.label}
                </span>
              </div>
              <span className="font-medium text-sm text-chart-tooltip-foreground tabular-nums">
                {typeof row.value === "number"
                  ? row.value.toLocaleString()
                  : row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Animated additional content */}
        <AnimatePresence mode="wait">
          {children && (
            <motion.div
              animate={{ opacity: 1, filter: "blur(0px)" }}
              className="mt-2"
              exit={{ opacity: 0, filter: "blur(4px)" }}
              initial={{ opacity: 0, filter: "blur(4px)" }}
              key={markerKey}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

TooltipContent.displayName = "TooltipContent";

export default TooltipContent;
