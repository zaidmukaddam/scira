import { useState, useCallback, useEffect } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Always initialize with defaultValue to ensure server/client consistency
  const [storedValue, setStoredValue] = useState<T>(defaultValue);

  // Sync with localStorage after mount
  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        // Handle special case for undefined
        if (item === 'undefined') {
          setStoredValue(defaultValue);
        } else {
          setStoredValue(JSON.parse(item));
        }
      }
    } catch (error) {
      console.warn(`Error reading from localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

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
        }
      } catch (error) {
        console.warn(`Error saving to localStorage key "${key}":`, error);
      }
    },
    [key, storedValue],
  );

  return [storedValue, setValue];
}
