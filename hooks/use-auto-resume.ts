"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { useDataStream } from "@/components/data-stream-provider";
import type { ChatMessage } from "@/lib/types";

export type UseAutoResumeParams = {
  autoResume: boolean;
  initialMessages: ChatMessage[];
  messages: ChatMessage[];
  resumeStream: UseChatHelpers<ChatMessage>["resumeStream"];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  status: string;
};

export function useAutoResume({
  autoResume,
  initialMessages,
  messages,
  resumeStream,
  setMessages,
  status,
}: UseAutoResumeParams) {
  const { dataStream, clearDataStream } = useDataStream();

  // Keep a ref that always reflects the latest messages array so that the
  // data-appendMessage effect never reads a stale mount-time snapshot.
  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  });

  // Guard so we only ever call resumeStream() once per component mount,
  // even if autoResume or resumeStream change reference after the initial render.
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!autoResume || hasFiredRef.current) {
      return;
    }

    // Only attempt to resume when the hook is in a stable ready state.
    // If status is 'streaming' or 'submitted', a stream is already active in
    // this tab — calling resumeStream() would cancel it and wipe the UI.
    if (status !== "ready") {
      return;
    }

    const mostRecentMessage = initialMessages.at(-1);

    if (mostRecentMessage?.role === "user") {
      hasFiredRef.current = true;
      resumeStream();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoResume, initialMessages, resumeStream, status]);

  useEffect(() => {
    if (!dataStream || dataStream.length === 0) {
      return;
    }

    // Process ALL buffered data-appendMessage parts, not just the first one.
    // Multiple messages can arrive between render cycles (e.g. on stream resume
    // after a disconnect where several turns were buffered server-side).
    const appendParts = dataStream.filter((p) => p.type === "data-appendMessage");
    if (appendParts.length === 0) return;

    const newMessages = appendParts.map((p) => JSON.parse(p.data) as ChatMessage);

    // Use the live ref (not the stale mount-time prop) so that messages
    // accumulated during this streaming session are preserved.
    const currentMessages = messagesRef.current;
    const newMessageIds = new Set(newMessages.map((m) => m.id));
    const deduped = currentMessages.filter((m) => !newMessageIds.has(m.id));
    setMessages([...deduped, ...newMessages]);

    // Clear processed data so stale entries don't re-trigger on the next render.
    clearDataStream();
  }, [dataStream, setMessages, clearDataStream]);
}