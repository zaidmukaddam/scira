'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/user-context';

type PreferenceKey =
  | 'scira-search-provider'
  | 'scira-extreme-search-model'
  | 'scira-group-order'
  | 'scira-model-order-global'
  | 'scira-blur-personal-info'
  | 'scira-custom-instructions-enabled'
  | 'scira-scroll-to-latest-on-open'
  | 'scira-location-metadata-enabled'
  | 'scira-auto-router-enabled'
  | 'scira-auto-router-config'
  | 'scira-preferred-models'
  | 'scira-visible-modes';

type AutoRouterConfig = {
  routes: Array<{
    name: string;
    description: string;
    model: string;
  }>;
};

type PreferenceValue = string | string[] | boolean | AutoRouterConfig | undefined;

const DEBOUNCE_MS = 300; // Debounce DB writes by 300ms
const MIGRATION_KEY_PREFIX = 'scira-prefs-migrated-';

interface UserPreferencesRecord {
  preferences?: Partial<Record<PreferenceKey, PreferenceValue>>;
}

async function fetchUserPreferences(): Promise<UserPreferencesRecord | null> {
  const response = await fetch('/api/preferences', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  });

  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Failed to fetch user preferences');

  return response.json();
}

async function persistUserPreferences(
  preferences: Partial<Record<PreferenceKey, PreferenceValue>>,
): Promise<void> {
  const response = await fetch('/api/preferences', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ preferences }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Failed to save user preferences');
  }
}

// Get the initial value from localStorage synchronously
function getStoredValue<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  const item = localStorage.getItem(key);
  if (!item) return defaultValue;

  if (item === 'undefined') return defaultValue;

  try {
    return JSON.parse(item);
  } catch {
    return item as unknown as T;
  }
}

// Check if preferences have been migrated for this user
function hasMigratedPreferences(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`${MIGRATION_KEY_PREFIX}${userId}`) === 'true';
}

// Mark preferences as migrated for this user
function markPreferencesMigrated(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${MIGRATION_KEY_PREFIX}${userId}`, 'true');
}

// Collect all localStorage preferences
function collectLocalStoragePreferences(): Partial<Record<PreferenceKey, PreferenceValue>> {
  if (typeof window === 'undefined') return {};

  const preferences: Partial<Record<PreferenceKey, PreferenceValue>> = {};

  const keys: PreferenceKey[] = [
    'scira-search-provider',
    'scira-extreme-search-model',
    'scira-group-order',
    'scira-model-order-global',
    'scira-blur-personal-info',
    'scira-custom-instructions-enabled',
    'scira-scroll-to-latest-on-open',
    'scira-location-metadata-enabled',
    'scira-auto-router-enabled',
    'scira-auto-router-config',
    'scira-preferred-models',
    'scira-visible-modes',
  ];

  keys.forEach((key) => {
    try {
      const item = localStorage.getItem(key);
      if (item && item !== 'undefined') {
        preferences[key] = JSON.parse(item);
      }
    } catch {
      // Ignore parse errors
    }
  });

  return preferences;
}

export function useSyncedPreferences<T extends PreferenceValue>(
  key: PreferenceKey,
  defaultValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<Partial<Record<PreferenceKey, PreferenceValue>> | null>(null);
  // Track pending saves to prevent overwriting local changes with stale DB data
  const pendingSaveRef = useRef<boolean>(false);

  // Initialize with localStorage value immediately
  const [localValue, setLocalValue] = useState<T>(() => getStoredValue(key, defaultValue));

  // Fetch preferences from DB
  const { data: dbPreferences } = useQuery({
    queryKey: ['userPreferences', user?.id],
    queryFn: fetchUserPreferences,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Migrate localStorage to DB on first load
  useEffect(() => {
    if (!user?.id || hasMigratedPreferences(user.id)) return;

    const localPrefs = collectLocalStoragePreferences();
    if (Object.keys(localPrefs).length === 0) {
      markPreferencesMigrated(user.id);
      return;
    }

    // Migrate to DB
    persistUserPreferences(localPrefs)
      .then(() => {
        markPreferencesMigrated(user.id);
        queryClient.invalidateQueries({ queryKey: ['userPreferences', user.id] });
      })
      .catch((error) => {
        console.error('Failed to migrate preferences:', error);
        // Still mark as migrated to avoid retrying constantly
        markPreferencesMigrated(user.id);
      });
  }, [user?.id, queryClient]);

  // Track the last user ID to detect login
  const lastSyncedUserIdRef = useRef<string | null>(null);
  // Track current local value to compare without causing re-renders
  const localValueRef = useRef<T>(localValue);
  
  // Keep ref in sync with state
  useEffect(() => {
    localValueRef.current = localValue;
  }, [localValue]);

  // Sync DB preferences when user logs in or DB data changes
  // This handles: 1) Login sync, 2) Cross-device sync
  useEffect(() => {
    if (!user?.id || !dbPreferences?.preferences) return;

    const dbValue = dbPreferences.preferences[key];
    const isUserLogin = lastSyncedUserIdRef.current !== user.id;

    // On login: always sync from DB (user expects their synced preferences)
    if (isUserLogin) {
      lastSyncedUserIdRef.current = user.id;
      if (dbValue !== undefined) {
        setLocalValue(dbValue as T);
        localStorage.setItem(key, JSON.stringify(dbValue));
        window.dispatchEvent(new CustomEvent('localStorage-change', { detail: { key, value: dbValue } }));
      }
      return;
    }

    // After login: only sync if no pending save (don't overwrite user's current changes)
    if (pendingSaveRef.current) return;
    if (dbValue !== undefined && dbValue !== localValueRef.current) {
      setLocalValue(dbValue as T);
      localStorage.setItem(key, JSON.stringify(dbValue));
      window.dispatchEvent(new CustomEvent('localStorage-change', { detail: { key, value: dbValue } }));
    }
  }, [dbPreferences, key, user?.id]); // No localValue in deps - use ref instead

  // Listen for storage changes from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue);
          setLocalValue(newValue);
        } catch {
          // Ignore parse errors
        }
      }
    };

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === key) {
        setLocalValue(e.detail.value);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorage-change', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorage-change', handleCustomStorageChange as EventListener);
    };
  }, [key]);

  // Debounced function to save to DB
  const saveToDB = useCallback(
    (updates: Partial<Record<PreferenceKey, PreferenceValue>>) => {
      if (!user?.id) return;

      // Mark that we have a pending save
      pendingSaveRef.current = true;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Merge with pending updates
      pendingUpdateRef.current = {
        ...pendingUpdateRef.current,
        ...updates,
      };

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        const toSave = pendingUpdateRef.current;
        if (!toSave) {
          pendingSaveRef.current = false;
          return;
        }

        // Send only the changes - the server will handle merging
        persistUserPreferences(toSave)
          .then(() => {
            // Clear pending save flag after successful save
            pendingSaveRef.current = false;
            queryClient.invalidateQueries({ queryKey: ['userPreferences', user.id] });
          })
          .catch((error) => {
            console.error('Failed to save preferences to DB:', error);
            // Clear pending save flag even on error to allow retry
            pendingSaveRef.current = false;
          });

        pendingUpdateRef.current = null;
      }, DEBOUNCE_MS);
    },
    [user?.id, queryClient], // Removed dbPreferencesRef as we don't need it anymore
  );

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const nextValue = value instanceof Function ? value(localValue) : value;

        // Update React state immediately (optimistic update)
        setLocalValue(nextValue);

        // Update localStorage immediately
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

        // Sync to DB in background (debounced)
        if (user?.id) {
          saveToDB({ [key]: nextValue });
        }
      } catch (error) {
        console.warn(`Error saving preference "${key}":`, error);
      }
    },
    [key, localValue, user?.id, saveToDB],
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return [localValue, setValue];
}

