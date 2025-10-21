'use client';

import { useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher-client';
import { useLocalSession } from '@/hooks/use-local-session';
import { SuspendedDialog } from '@/components/suspended-dialog';

export function SuspensionDetector() {
  const { data: user, isLoading } = useLocalSession();
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    if (!pusherClient || !user?.id || isLoading) return;

    const channel = pusherClient.subscribe(`private-user-${user.id}`);
    
    const handleSuspend = () => {
      setIsSuspended(true);
    };

    channel.bind('suspended', handleSuspend);

    return () => {
      try {
        channel.unbind('suspended', handleSuspend);
        pusherClient.unsubscribe(`private-user-${user.id}`);
      } catch {}
    };
  }, [user?.id, isLoading]);

  return <SuspendedDialog open={isSuspended} />;
}
