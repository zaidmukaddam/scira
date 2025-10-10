'use client';

import { useEffect, useState } from 'react';

export function useLocalSession() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((j) => {
        if (mounted) setData(j?.user || null);
      })
      .catch(() => {
        if (mounted) setData(null);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { data, isLoading };
}
