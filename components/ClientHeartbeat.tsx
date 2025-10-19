"use client";
import { useEffect, useRef, useState } from 'react';

export function ClientHeartbeat({ intervalMs = 35000 }: { intervalMs?: number }) {
  const timerRef = useRef<any>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        if (j?.user) setEnabled(true);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const send = () => {
      fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
    };
    // fire once immediately
    send();
    timerRef.current = setInterval(send, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [enabled, intervalMs]);

  return null;
}
