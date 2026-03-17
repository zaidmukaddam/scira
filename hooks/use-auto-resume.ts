"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useEffect } from "react";
import { useDataStream } from "@/components/data-stream-provider";
import type { ChatMessage } from "@/lib/types";

export type UseAutoResumeParams = {
  autoResume: boolean;
  initialMessages: ChatMessage[];
  resumeStream: UseChatHelpers<ChatMessage>["resumeStream"];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
};

export function useAutoResume({
  autoResume,
  initialMessages,
  resumeStream,
  setMessages,
}: UseAutoResumeParams) {
  const { dataStream } = useDataStream();

  useEffect(() => {
    if (!autoResume) {
      return;
    }

    const mostRecentMessage = initialMessages.at(-1);

    if (mostRecentMessage?.role === "user") {
      resumeStream();
    }

    // we intentionally run this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoResume, initialMessages.at, resumeStream]);

  useEffect(() => {
    if (!dataStream || dataStream.length === 0) {
      return;
    }

    // Process ALL buffered data-appendMessage parts, not just the first one.
    // Multiple messages can arrive between render cycles (e.g. on stream resume
    // after a disconnect where several turns were buffered server-side).
    const appendParts = dataStream.filter((p) => p.type === "data-appendMessage");
    if (appendParts.length === 0) return;

    const newMessages = appendParts.map((p) => JSON.parse(p.data));
    setMessages([...initialMessages, ...newMessages]);
  }, [dataStream, initialMessages, setMessages]);
}