import { useRef, useCallback } from 'react';

export function useOptimizedScroll(targetRef: React.RefObject<HTMLElement | null>) {
  const hasManuallyScrolledRef = useRef(false);

  // Simple auto scroll
  const scrollToBottom = useCallback(() => {
    if (targetRef.current && !hasManuallyScrolledRef.current) {
      targetRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }, [targetRef]);

  // Mark as manually scrolled
  const markManualScroll = useCallback(() => {
    hasManuallyScrolledRef.current = true;
  }, []);

  // Reset for new message
  const resetManualScroll = useCallback(() => {
    hasManuallyScrolledRef.current = false;
  }, []);

  return {
    scrollToBottom,
    markManualScroll,
    resetManualScroll,
  };
}
