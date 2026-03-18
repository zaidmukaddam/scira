import { useRef, useCallback } from 'react';

const NEAR_BOTTOM_THRESHOLD = 80; // px from bottom to consider "at bottom"

export interface UseOptimizedScrollOptions {
  /** When this ref is true, scrollToBottom is a no-op (e.g. touch active so we don't fight the user). */
  skipScrollWhen?: React.RefObject<boolean>;
}

export function useOptimizedScroll(
  targetRef: React.RefObject<HTMLElement | null>,
  options?: UseOptimizedScrollOptions,
) {
  const hasManuallyScrolledRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const skipWhen = options?.skipScrollWhen;

  const isNearBottom = useCallback(() => {
    const target = targetRef.current;
    if (!target) return true;

    if (target.scrollHeight > target.clientHeight) {
      const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      return distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
    }

    const docEl = document.documentElement;
    const distanceFromBottom = docEl.scrollHeight - window.scrollY - window.innerHeight;
    return distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
  }, [targetRef]);

  const scrollToBottom = useCallback(() => {
    if (hasManuallyScrolledRef.current) return;
    if (skipWhen?.current) return;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (hasManuallyScrolledRef.current || skipWhen?.current) return;
        const target = targetRef.current;
        if (!target) return;

        if (target.scrollHeight > target.clientHeight) {
          target.scrollTop = target.scrollHeight;
        } else {
          target.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
      });
    });
  }, [targetRef, skipWhen]);

  const markManualScroll = useCallback(
    (options?: { userScrolledUp?: boolean }) => {
      if (options?.userScrolledUp) {
        hasManuallyScrolledRef.current = true;
        return;
      }
      hasManuallyScrolledRef.current = !isNearBottom();
    },
    [isNearBottom],
  );

  const resetManualScroll = useCallback(() => {
    hasManuallyScrolledRef.current = false;
  }, []);

  return { scrollToBottom, markManualScroll, resetManualScroll, isNearBottom };
}
