import { useState, useCallback } from 'react';

// Get the initial value synchronously during initialization
function getStoredValue<T>(key: string, defaultValue: T): T {
  // Always return defaultValue on server-side
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    // Handle special case for undefined
    if (item === 'undefined') return defaultValue;
    
    return JSON.parse(item);
  } catch {
    // If error, return default value
    return defaultValue;
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize with the stored value immediately
  const [storedValue, setStoredValue] = useState<T>(() => getStoredValue(key, defaultValue));

  const setValue = useCallback((value: T | ((val: T) => T)) => {
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
      }
    } catch (error) {
      console.warn(`Error saving to localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
} 