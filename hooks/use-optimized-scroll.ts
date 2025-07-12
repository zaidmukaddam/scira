import { useEffect, useRef, useCallback, useState } from 'react';

interface UseOptimizedScrollOptions {
  enabled?: boolean;
  threshold?: number;
  behavior?: ScrollBehavior;
  debounceMs?: number;
}

export function useOptimizedScroll(
  targetRef: React.RefObject<HTMLElement | null>,
  options: UseOptimizedScrollOptions = {}
) {
  const {
    enabled = true,
    threshold = 100,
    behavior = 'smooth',
    debounceMs = 100
  } = options;

  const [isAtBottom, setIsAtBottom] = useState(false);
  const [hasManuallyScrolled, setHasManuallyScrolled] = useState(false);
  const isAutoScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced scroll handler
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!isAutoScrollingRef.current) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        
        const atBottom = scrollHeight - (scrollTop + clientHeight) < threshold;
        setIsAtBottom(atBottom);
        
        if (!atBottom) {
          setHasManuallyScrolled(true);
        }
      }
    }, debounceMs);
  }, [threshold, debounceMs]);

  // Auto scroll to element
  const scrollToElement = useCallback((instant = false) => {
    if (!enabled || !targetRef.current) return;

    isAutoScrollingRef.current = true;
    
    targetRef.current.scrollIntoView({
      behavior: instant ? 'instant' : behavior,
      block: 'end'
    });

    // Reset auto-scrolling flag after animation
    setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, instant ? 0 : 500);
  }, [enabled, targetRef, behavior]);

  // Reset manual scroll state
  const resetManualScroll = useCallback(() => {
    setHasManuallyScrolled(false);
  }, []);

  // Set up scroll listener
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [enabled, handleScroll]);

  return {
    isAtBottom,
    hasManuallyScrolled,
    scrollToElement,
    resetManualScroll
  };
} 