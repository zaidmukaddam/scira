import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Message } from '@/components/message';
import { TextUIPart, ReasoningUIPart, ToolInvocationUIPart, SourceUIPart } from '@ai-sdk/ui-utils';
import { ReasoningPartView, ReasoningPart } from '@/components/reasoning-part';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { CopyButton } from '@/components/markdown';
import { MarkdownRenderer, preprocessLaTeX } from '@/components/markdown';
import ToolInvocationListView from '@/components/tool-invocation-list-view';
import { motion } from "framer-motion";

// Define MessagePart type
type MessagePart = TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart;

// Define interface for part, messageIndex and partIndex objects
interface PartInfo {
  part: any;
  messageIndex: number;
  partIndex: number;
}

interface MessagesProps {
  messages: any[];
  lastUserMessageIndex: number;
  isEditingMessage: boolean;
  editingMessageIndex: number;
  input: string;
  setInput: (value: string) => void;
  setIsEditingMessage: (value: boolean) => void;
  setEditingMessageIndex: (value: number) => void;
  setMessages: (messages: any[]) => void;
  append: (message: any, options?: any) => Promise<string | null | undefined>;
  reload: () => Promise<string | null | undefined>;
  suggestedQuestions: string[];
  setSuggestedQuestions: (questions: string[]) => void;
  status: string;
  error: any; // Add error from useChat
}

// Interface for reasoning timing
interface ReasoningTiming {
  startTime: number;
  endTime?: number;
}

const Messages: React.FC<MessagesProps> = ({
  messages,
  lastUserMessageIndex,
  isEditingMessage,
  editingMessageIndex,
  input,
  setInput,
  setIsEditingMessage,
  setEditingMessageIndex,
  setMessages,
  append,
  reload,
  suggestedQuestions,
  setSuggestedQuestions,
  status,
  error
}) => {
  // Track visibility state for each reasoning section using messageIndex-partIndex as key
  const [reasoningVisibilityMap, setReasoningVisibilityMap] = useState<Record<string, boolean>>({});
  const [reasoningFullscreenMap, setReasoningFullscreenMap] = useState<Record<string, boolean>>({});
  const [reasoningTimings, setReasoningTimings] = useState<Record<string, ReasoningTiming>>({});
  const reasoningScrollRef = useRef<HTMLDivElement>(null);

  // Filter messages to only show the ones we want to display
  const memoizedMessages = useMemo(() => {
    return messages.filter((message) => {
      // Keep all user messages
      if (message.role === 'user') return true;

      // For assistant messages
      if (message.role === 'assistant') {
        // Keep messages that have tool invocations
        if (message.parts?.some((part: any) => part.type === 'tool-invocation')) {
          return true;
        }
        // Keep messages that have text parts but no tool invocations
        if (message.parts?.some((part: any) => part.type === 'text') ||
            !message.parts?.some((part: any) => part.type === 'tool-invocation')) {
          return true;
        }
        return false;
      }
      return false;
    });
  }, [messages]);

  // Handle rendering of message parts
  const renderPart = (
    part: MessagePart,
    messageIndex: number,
    partIndex: number,
    parts: MessagePart[],
    message: any,
  ): React.ReactNode => {
    // First, update timing data for reasoning parts directly in the render function
    if (part.type === "reasoning") {
      const sectionKey = `${messageIndex}-${partIndex}`;

      // Initialize timing data if it doesn't exist
      if (!reasoningTimings[sectionKey]) {
        // Use a functional state update to avoid stale state issues
        setReasoningTimings(prev => ({
          ...prev,
          [sectionKey]: { startTime: Date.now() }
        }));
      }

      // Check if reasoning is complete but we haven't recorded the end time
      const isComplete = parts.some((p: MessagePart, i: number) =>
        i > partIndex && (p.type === "text" || p.type === "tool-invocation")
      );

      if (isComplete && reasoningTimings[sectionKey] && !reasoningTimings[sectionKey].endTime) {
        // Set end time if reasoning is complete and it hasn't been set yet
        setReasoningTimings(prev => ({
          ...prev,
          [sectionKey]: {
            ...prev[sectionKey],
            endTime: Date.now()
          }
        }));
      }
    }

    // Case 1: Skip rendering text parts that should be superseded by tool invocations
    if (part.type === "text") {
      // Skip empty text parts entirely
      if (!part.text || part.text.trim() === "") return null;

      // Check if this text part should be hidden because a tool invocation will show the same info
      const hasRelatedToolInvocation = parts.some((p: MessagePart) =>
        p.type === 'tool-invocation'
        // Don't need direct comparison between different types
      );

      // If this is a summary text before/after a tool invocation, don't render it
      if (partIndex === 0 && hasRelatedToolInvocation) {
        return null;
      }
    }

    switch (part.type) {
      case "text":
        return (
          <div key={`${messageIndex}-${partIndex}-text`}>
            <div className="flex items-center justify-between mt-5 mb-2">
              <div className="flex items-center gap-2">
                <Image src="/scira.png" alt="Scira" className='size-6 invert dark:invert-0' width={100} height={100} unoptimized quality={100} />
                <h2 className="text-lg font-semibold font-syne text-neutral-800 dark:text-neutral-200">
                  Scira AI
                </h2>
              </div>
              {status === 'ready' && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const lastUserMessage = messages.findLast(m => m.role === 'user');
                      if (!lastUserMessage) return;
                
                      // Remove the last assistant message
                      const newMessages = messages.slice(0, -1);
                      setMessages(newMessages);
                      setSuggestedQuestions([]);
                
                      // Resubmit the last user message
                      reload();
                    }}
                    className="h-8 px-2 text-xs rounded-full"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <CopyButton text={part.text} />
                </div>
              )}
            </div>
            <MarkdownRenderer content={preprocessLaTeX(part.text)} />
          </div>
        );
      case "reasoning": {
        const sectionKey = `${messageIndex}-${partIndex}`;
        const hasParallelToolInvocation = parts.some((p: MessagePart) => p.type === 'tool-invocation');
        const isComplete = parts.some((p: MessagePart, i: number) => i > partIndex && (p.type === "text" || p.type === "tool-invocation"));
        const timing = reasoningTimings[sectionKey];
        let duration = null;
        if (timing) {
          if (timing.endTime) {
            duration = ((timing.endTime - timing.startTime) / 1000).toFixed(3);
          }
        }
        const parallelTool = hasParallelToolInvocation 
          ? (parts.find((p: MessagePart) => p.type === 'tool-invocation')?.toolInvocation?.toolName ?? null) 
          : null;

        // Separate expanded and fullscreen states
        const isExpanded = reasoningVisibilityMap[sectionKey] ?? !isComplete;
        const isFullscreen = reasoningFullscreenMap[sectionKey] ?? false;

        // Separate setters for each state
        const setIsExpanded = (v: boolean) => setReasoningVisibilityMap(prev => ({ ...prev, [sectionKey]: v }));
        const setIsFullscreen = (v: boolean) => setReasoningFullscreenMap(prev => ({ ...prev, [sectionKey]: v }));

        return (
          <ReasoningPartView
            key={sectionKey}
            part={part as ReasoningPart}
            sectionKey={sectionKey}
            isComplete={isComplete}
            duration={duration}
            parallelTool={parallelTool}
            isExpanded={isExpanded}
            isFullscreen={isFullscreen}
            setIsExpanded={setIsExpanded}
            setIsFullscreen={setIsFullscreen}
          />
        );
      }
      case "tool-invocation":
        return (
          <ToolInvocationListView
            key={`${messageIndex}-${partIndex}-tool`}
            toolInvocations={[part.toolInvocation]}
            message={message}
          />
        );
      default:
        return null;
    }
  };

  // Add effect for auto-scrolling reasoning content
  useEffect(() => {
    // Find active reasoning parts that are not complete
    const activeReasoning = messages.flatMap((message, messageIndex) =>
      (message.parts || [])
        .map((part: any, partIndex: number) => ({ part, messageIndex, partIndex }))
        .filter(({ part }: PartInfo) => part.type === "reasoning")
        .filter(({ messageIndex, partIndex }: PartInfo) => {
          const message = messages[messageIndex];
          // Check if reasoning is complete
          return !(message.parts || []).some((p: any, i: number) =>
            i > partIndex && (p.type === "text" || p.type === "tool-invocation")
          );
        })
    );

    // Auto-scroll when active reasoning
    if (activeReasoning.length > 0 && reasoningScrollRef.current) {
      reasoningScrollRef.current.scrollTop = reasoningScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // For active reasoning sections, update timers every 100ms
  useEffect(() => {
    // Only run this effect when reasoning is occurring
    const activeReasoningSections = Object.entries(reasoningTimings)
      .filter(([_, timing]) => !timing.endTime);

    if (activeReasoningSections.length === 0) return;

    // Update once immediately
    const updateTimes = () => {
      const now = Date.now();
      const updatedTimes: Record<string, number> = {};

      activeReasoningSections.forEach(([key, timing]) => {
        updatedTimes[key] = (now - timing.startTime) / 1000;
      });
    };

    updateTimes();

    // Then set up interval for updates
    const interval = setInterval(updateTimes, 100);
    return () => clearInterval(interval);
  }, [reasoningTimings]);

  useEffect(() => {
    messages.forEach((message, messageIndex) => {
      message.parts?.forEach((part: any, partIndex: number) => {
        if (part.type === "reasoning") {
          const sectionKey = `${messageIndex}-${partIndex}`;
          const isComplete = message.parts[partIndex + 1]?.type === "text";

          if (!reasoningTimings[sectionKey]) {
            setReasoningTimings(prev => ({
              ...prev,
              [sectionKey]: { startTime: Date.now() }
            }));
          } else if (isComplete && !reasoningTimings[sectionKey].endTime) {
            setReasoningTimings(prev => ({
              ...prev,
              [sectionKey]: {
                ...prev[sectionKey],
                endTime: Date.now()
              }
            }));
          }
        }
      });
    });
  }, [messages, reasoningTimings]);
  
  if (memoizedMessages.length === 0) {
    return null;
  }

  // Render error message if there is an error
  const handleRetry = async () => {
    await reload();
  };

  return (
    <div className="space-y-4 sm:space-y-6 mb-32">
      {memoizedMessages.map((message, index) => (
        <div key={index} className={`${
          // Add border only if this is an assistant message AND there's a next message
          message.role === 'assistant' && index < memoizedMessages.length - 1
            ? 'mb-8! pb-8 border-b border-neutral-200 dark:border-neutral-800'
            : 'mb-0'
          }`}>
          <Message
            message={message}
            index={index}
            lastUserMessageIndex={lastUserMessageIndex}
            isEditingMessage={isEditingMessage}
            editingMessageIndex={editingMessageIndex}
            input={input}
            setInput={setInput}
            setIsEditingMessage={setIsEditingMessage}
            setEditingMessageIndex={setEditingMessageIndex}
            renderPart={renderPart}
            status={status}
            messages={messages}
            setMessages={setMessages}
            append={append}
            reload={reload}
            setSuggestedQuestions={setSuggestedQuestions}
            suggestedQuestions={index === memoizedMessages.length - 1 ? suggestedQuestions : []}
          />
        </div>
      ))}

      {/* Display error message with retry button */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="mt-6"
        >
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
            <div className="bg-red-50 dark:bg-red-900/30 px-4 py-3 border-b border-red-200 dark:border-red-800 flex items-start gap-3">
              <div className="mt-0.5">
                <div className="bg-red-100 dark:bg-red-700/50 p-1.5 rounded-full">
                  <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-300" />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-red-700 dark:text-red-300">
                  An error occurred with your request
                </h3>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-0.5">
                  {error.message || "Something went wrong while processing your message"}
                </p>
              </div>
            </div>
            
            <div className="px-4 pb-2 text-sm">
              {error.cause && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700 font-mono text-xs text-neutral-700 dark:text-neutral-300 overflow-x-auto">
                  {error.cause.toString()}
                </div>
              )}
              
              <div className="mt-2 flex items-center justify-between">
                <p className="text-neutral-500 dark:text-neutral-400 text-xs">
                  You can retry your request or try a different prompt
                </p>
                <Button 
                  onClick={handleRetry} 
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div ref={reasoningScrollRef} />
    </div>
  );
};

export default Messages; 