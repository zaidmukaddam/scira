'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { ChatMessage } from '@/lib/types';

interface UseMessagePollerProps {
  chatId?: string;
  enabled: boolean;
  onMessagesUpdate: (messages: ChatMessage[]) => void;
  status?: 'streaming' | 'ready' | 'waiting';
}

export function useMessagePoller({
  chatId,
  enabled,
  onMessagesUpdate,
  status,
}: UseMessagePollerProps) {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(0);
  const [isStreamingComplete, setIsStreamingComplete] = useState(false);

  const fetchLatestMessages = useCallback(async () => {
    if (!chatId || !enabled) return;

    try {
      const [messagesResponse, statusResponse] = await Promise.all([
        fetch(`/api/chat/${chatId}/messages?limit=100`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch(`/api/chat/${chatId}/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!messagesResponse.ok) return;

      const messagesData = await messagesResponse.json();
      const messages = messagesData.messages as ChatMessage[];

      if (messages.length > lastMessageCountRef.current) {
        lastMessageCountRef.current = messages.length;
        onMessagesUpdate(messages);
      }

      // Check if streaming is complete
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.isStreamingComplete) {
          setIsStreamingComplete(true);
        }
      }
    } catch (error) {
      console.error('Error polling for latest messages:', error);
    }
  }, [chatId, enabled, onMessagesUpdate]);

  useEffect(() => {
    if (!enabled || !chatId) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // If streaming is complete, stop polling
    if (isStreamingComplete) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Start polling with adaptive interval
    // Poll more frequently at the start, less frequently as time goes on
    const pollingInterval = 1500; // 1.5 seconds during streaming

    pollingIntervalRef.current = setInterval(() => {
      fetchLatestMessages();
    }, pollingInterval);

    // Also fetch immediately
    fetchLatestMessages();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [enabled, chatId, isStreamingComplete, fetchLatestMessages]);

  return {
    isStreamingComplete,
  };
}
