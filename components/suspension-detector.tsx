'use client';

import { useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher-client';
import { useLocalSession } from '@/hooks/use-local-session';
import { SuspendedDialog } from '@/components/suspended-dialog';

const SUSPENSION_MESSAGE = "L’accès à ce compte a été restreint suite à une mesure de sécurité. Merci de contacter l’administrateur du système afin d’examiner la situation et rétablir votre accès si nécessaire.";

export function SuspensionDetector() {
  const { data: user, isLoading } = useLocalSession();
  const [message, setMessage] = useState<string | null>(null);
  const [manualOverride, setManualOverride] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (user?.status === "suspended") {
      if (!manualOverride) {
        setMessage(SUSPENSION_MESSAGE);
      }
    } else {
      setMessage(null);
      setManualOverride(false);
    }
  }, [user?.status, isLoading, manualOverride]);

  useEffect(() => {
    if (!pusherClient || !user?.id || isLoading) return;

    const channel = pusherClient.subscribe(`private-user-${user.id}`);

    const handleSuspend = (payload: any) => {
      const incomingMessage = payload?.message;
      setManualOverride(false);
      setMessage(incomingMessage && typeof incomingMessage === "string" ? incomingMessage : SUSPENSION_MESSAGE);
    };

    const handleReactivate = () => {
      setManualOverride(true);
      setMessage(null);
    };

    channel.bind("suspended", handleSuspend);
    channel.bind("reactivated", handleReactivate);

    return () => {
      try {
        channel.unbind("suspended", handleSuspend);
        channel.unbind("reactivated", handleReactivate);
        pusherClient.unsubscribe(`private-user-${user.id}`);
      } catch {}
    };
  }, [user?.id, isLoading]);

  return <SuspendedDialog open={Boolean(message)} message={message ?? SUSPENSION_MESSAGE} />;
}
