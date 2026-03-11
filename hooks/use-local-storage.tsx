import { useState, useCallback, useEffect } from 'react';

function getStoredValue<T>(key: string, defaultValue: T): T {
  // Always return defaultValue on server-side
  if (typeof window === 'undefined') return defaultValue;

  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined') return defaultValue;
    return JSON.parse(item);
  } catch {
    return defaultValue;
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Read localStorage synchronously on first client render so derived state
  // (e.g. isProUser) is stable from the start and doesn't change after mount,
  // which would trigger unnecessary effect re-runs. The hydration mismatch this
  // can cause for elements that differ between server and client must be handled
  // at the component level with suppressHydrationWarning or a useMounted guard.
  const [storedValue, setStoredValue] = useState<T>(() => getStoredValue(key, defaultValue));

  // Listen for storage changes from other components/tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue);
          setStoredValue(newValue);
        } catch {
          // If parsing fails, use the raw value
          setStoredValue(e.newValue as unknown as T);
        }
      }
    };

    // Listen for custom events (for same-tab updates)
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.value);
      }
    };

    // Add event listeners
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorage-change', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorage-change', handleCustomStorageChange as EventListener);
    };
  }, [key]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const nextValue = value instanceof Function ? value(storedValue) : value;
        // Update React state
        setStoredValue(nextValue);
        // Update localStorage
        if (typeof window !== 'undefined') {
          if (nextValue === undefined) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, JSON.stringify(nextValue));
          }

          // Dispatch custom event for same-tab synchronization
          const customEvent = new CustomEvent('localStorage-change', {
            detail: { key, value: nextValue },
          });
          window.dispatchEvent(customEvent);
        }
      } catch (error) {
        console.warn(`Error saving to localStorage key "${key}":`, error);
      }
    },
    [key, storedValue],
  );

  return [storedValue, setValue];
}
