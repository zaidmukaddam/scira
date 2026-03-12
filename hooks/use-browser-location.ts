'use client';

import { useCallback, useRef } from 'react';

export interface BrowserLocation {
  lat: number;
  lon: number;
}

const STORAGE_KEY = 'scx-browser-location';
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes — re-request if cached location is stale

interface CachedLocation {
  lat: number;
  lon: number;
  timestamp: number;
}

function readCache(): BrowserLocation | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cached: CachedLocation = JSON.parse(raw);
    if (Date.now() - cached.timestamp > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { lat: cached.lat, lon: cached.lon };
  } catch {
    return null;
  }
}

function writeCache(loc: BrowserLocation) {
  try {
    const value: CachedLocation = { ...loc, timestamp: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // sessionStorage may not be available (private browsing edge cases)
  }
}

export function useBrowserLocation() {
  // Use a ref so multiple rapid calls share one in-flight promise
  const pendingRef = useRef<Promise<BrowserLocation | null> | null>(null);

  const requestLocation = useCallback((): Promise<BrowserLocation | null> => {
    // Return cached value if still fresh
    const cached = readCache();
    if (cached) return Promise.resolve(cached);

    // Return existing in-flight request if one is pending
    if (pendingRef.current) return pendingRef.current;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return Promise.resolve(null);
    }

    const promise = new Promise<BrowserLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: BrowserLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          writeCache(loc);
          pendingRef.current = null;
          resolve(loc);
        },
        () => {
          // User denied, timeout, or unavailable — fail silently and fall back to IP geo
          pendingRef.current = null;
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });

    pendingRef.current = promise;
    return promise;
  }, []);

  return { requestLocation };
}
