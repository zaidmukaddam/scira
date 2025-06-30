import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Message } from '@/components/message';
import { UIMessage } from '@ai-sdk/ui-utils';
import { ReasoningPartView, ReasoningPart } from '@/components/reasoning-part';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Copy } from 'lucide-react';
import { MarkdownRenderer } from '@/components/markdown';
import ToolInvocationListView from '@/components/tool-invocation-list-view';
import { deleteTrailingMessages } from '@/app/actions';
import { toast } from 'sonner';
import { updateChatVisibility } from '@/app/actions';
import { invalidateChatsCache } from '@/lib/utils';
import { Share } from '@phosphor-icons/react';
import { EnhancedErrorDisplay } from '@/components/message';

// Define interface for part, messageIndex and partIndex objects
interface PartInfo {
  part: any;
  messageIndex: number;
  partIndex: number;
}

interface MessagesProps {
  messages: any[];
  lastUserMessageIndex: number;
  input: string;
  setInput: (value: string) => void;
  setMessages: (messages: any[] | ((prevMessages: any[]) => any[])) => void;
  append: (message: any, options?: any) => Promise<string | null | undefined>;
  reload: () => Promise<string | null | undefined>;
  suggestedQuestions: string[];
  setSuggestedQuestions: (questions: string[]) => void;
  status: string;
  error: Error | null; // Add error from useChat
  user?: any; // Add user prop
  selectedVisibilityType?: 'public' | 'private'; // Add visibility type
  chatId?: string; // Add chatId prop
  onVisibilityChange?: (visibility: 'public' | 'private') => void; // Add visibility change handler
  initialMessages?: any[]; // Add initial messages prop to detect existing chat
  isOwner?: boolean; // Add ownership prop
}

// Create a consistent logo header component to reuse
const SciraLogoHeader = () => (
  <div className="flex items-center gap-2 mb-2">
    <Image
      src="/scira.png"
      alt="Scira"
      className="size-7 invert dark:invert-0"
      width={100}
      height={100}
      unoptimized
      quality={100}
    />
    <h2 className="text-xl font-normal font-be-vietnam-pro text-neutral-800 dark:text-neutral-200">Scira</h2>
  </div>
);

const Messages: React.FC<MessagesProps> = ({
  messages,
  lastUserMessageIndex,
  setMessages,
  append,
  suggestedQuestions,
  setSuggestedQuestions,
  reload,
  status,
  error,
  user,
  selectedVisibilityType = 'private',
  chatId,
  onVisibilityChange,
  initialMessages,
  isOwner,
}) => {
  // Track visibility state for each reasoning section using messageIndex-partIndex as key
  const [reasoningVisibilityMap, setReasoningVisibilityMap] = useState<Record<string, boolean>>({});
  const [reasoningFullscreenMap, setReasoningFullscreenMap] = useState<Record<string, boolean>>({});
  const reasoningScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);

  // Scroll to bottom immediately (without animation) when opening existing chat
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0 && !hasInitialScrolled && messagesEndRef.current) {
      // Use scrollTo with instant behavior for existing chats
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
      setHasInitialScrolled(true);
    }
  }, [initialMessages, hasInitialScrolled]);

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
        if (
          message.parts?.some((part: any) => part.type === 'text') ||
          !message.parts?.some((part: any) => part.type === 'tool-invocation')
        ) {
          return true;
        }
        return false;
      }
      return false;
    });
  }, [messages]);

  // Check if the last message is from a user and we're expecting an AI response
  const isWaitingForResponse = useMemo(() => {
    const lastMessage = memoizedMessages[memoizedMessages.length - 1];
    return lastMessage?.role === 'user' && (status === 'submitted' || status === 'streaming');
  }, [memoizedMessages, status]);

  // Check if we need to show retry due to missing assistant response (different from error status)
  const isMissingAssistantResponse = useMemo(() => {
    const lastMessage = memoizedMessages[memoizedMessages.length - 1];

    // Case 1: Last message is user and no assistant response yet
    if (lastMessage?.role === 'user' && status === 'ready' && !error) {
      return true;
    }

    // Case 2: Last message is assistant but lacks **visible** content
    if (lastMessage?.role === 'assistant' && status === 'ready' && !error) {
      const parts = lastMessage.parts || [];

      // Only count content that the user can actually see (text or tool invocation)
      const hasVisibleText = parts.some((part: any) => part.type === 'text' && part.text && part.text.trim() !== '');
      const hasToolInvocations = parts.some((part: any) => part.type === 'tool-invocation');

      // Legacy content field support
      const hasLegacyContent = lastMessage.content && lastMessage.content.trim() !== '';

      // If there is NO visible content at all, we consider the response incomplete
      if (!hasVisibleText && !hasToolInvocations && !hasLegacyContent) {
        return true;
      }
    }

    return false;
  }, [memoizedMessages, status, error]);

  // Handle rendering of message parts
  const renderPart = (
    part: UIMessage['parts'][number],
    messageIndex: number,
    partIndex: number,
    parts: UIMessage['parts'],
    message: UIMessage,
  ): React.ReactNode => {
    // Case 1: Skip rendering text parts that should be superseded by tool invocations
    if (part.type === 'text') {
      // For empty text parts in a streaming message, show loading animation
      if ((!part.text || part.text.trim() === '') && status === 'streaming') {
        return (
          <div key={`${messageIndex}-${partIndex}-loading`} className="flex flex-col min-h-[calc(100vh-18rem)]">
            <SciraLogoHeader />
            <div className="flex space-x-2 ml-8 mt-2">
              <div
                className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
          </div>
        );
      }

      // Skip empty text parts entirely for non-streaming states
      if (!part.text || part.text.trim() === '') return null;

      // Detect text sandwiched between step-start and tool-invocation
      const prevPart = parts[partIndex - 1];
      const nextPart = parts[partIndex + 1];
      if (prevPart?.type === 'step-start' && nextPart?.type === 'tool-invocation') {
        console.log(
          'Text between step-start and tool-invocation:',
          JSON.stringify({
            text: part.text,
            partIndex,
            messageIndex,
          }),
        );

        // Extract this text but don't render it in its original position
        return null;
      }
    }

    switch (part.type) {
      case 'text':
        return (
          <div key={`${messageIndex}-${partIndex}-text`}>
            <div>
              <MarkdownRenderer content={part.text} />
            </div>

            {/* Add buttons below the text with visible labels */}
            {status === 'ready' && (
              <div className="flex items-center gap-3 mt-3">
                {/* Only show reload for owners OR unauthenticated users on private chats */}
                {((user && isOwner) || (!user && selectedVisibilityType === 'private')) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        const lastUserMessage = messages.findLast((m) => m.role === 'user');
                        if (!lastUserMessage) return;

                        // Step 1: Delete trailing messages if user is authenticated
                        if (user && lastUserMessage.id) {
                          await deleteTrailingMessages({
                            id: lastUserMessage.id,
                          });
                        }

                        // Step 2: Update local state to remove assistant messages
                        const newMessages = [];
                        // Find the index of the last user message
                        for (let i = 0; i < messages.length; i++) {
                          newMessages.push(messages[i]);
                          if (messages[i].id === lastUserMessage.id) {
                            break;
                          }
                        }

                        // Step 3: Update UI state
                        setMessages(newMessages);
                        setSuggestedQuestions([]);

                        // Step 4: Reload
                        await reload();
                      } catch (error) {
                        console.error('Error in reload:', error);
                      }
                    }}
                    className="h-8 px-2 text-xs rounded-full"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Rewrite
                  </Button>
                )}
                {/* Only show share for authenticated owners */}
                {user && isOwner && chatId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!chatId) return;

                      const sharePromise = async () => {
                        // First, update visibility to public if needed
                        if (selectedVisibilityType === 'private') {
                          await updateChatVisibility(chatId, 'public');
                          invalidateChatsCache();
                          // If there's an onVisibilityChange handler, call it
                          if (typeof onVisibilityChange === 'function') {
                            onVisibilityChange('public');
                          }
                        }

                        // Then copy the share link
                        const shareUrl = `https://scira.ai/search/${chatId}`;
                        await navigator.clipboard.writeText(shareUrl);

                        return selectedVisibilityType === 'private'
                          ? 'Chat made public and link copied to clipboard'
                          : 'Share link copied to clipboard';
                      };

                      toast.promise(sharePromise(), {
                        loading:
                          selectedVisibilityType === 'private'
                            ? 'Making chat public and copying link...'
                            : 'Copying share link...',
                        success: (message) => message,
                        error: 'Failed to share chat',
                      });
                    }}
                    className="h-8 px-2 text-xs rounded-full shadow-none"
                  >
                    <Share className="size-4.5! mr-2 font-bold fill-neutral-900 dark:fill-neutral-100" />
                    Share
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(part.text);
                    toast.success('Copied to clipboard');
                  }}
                  className="h-8 px-2 text-xs rounded-full"
                >
                  <Copy className="h-3.5 w-3.5 mr-2" />
                  Copy
                </Button>
              </div>
            )}
          </div>
        );
      case 'reasoning': {
        const sectionKey = `${messageIndex}-${partIndex}`;
        const hasParallelToolInvocation = parts.some((p: UIMessage['parts'][number]) => p.type === 'tool-invocation');
        const isComplete = parts.some(
          (p: UIMessage['parts'][number], i: number) =>
            i > partIndex && (p.type === 'text' || p.type === 'tool-invocation'),
        );
        const parallelTool = hasParallelToolInvocation
          ? parts.find((p: UIMessage['parts'][number]) => p.type === 'tool-invocation')?.toolInvocation?.toolName ??
            null
          : null;

        // Separate expanded and fullscreen states
        const isExpanded = reasoningVisibilityMap[sectionKey] ?? !isComplete;
        const isFullscreen = reasoningFullscreenMap[sectionKey] ?? false;

        // Separate setters for each state
        const setIsExpanded = (v: boolean) => setReasoningVisibilityMap((prev) => ({ ...prev, [sectionKey]: v }));
        const setIsFullscreen = (v: boolean) => setReasoningFullscreenMap((prev) => ({ ...prev, [sectionKey]: v }));

        return (
          <ReasoningPartView
            key={sectionKey}
            part={part as ReasoningPart}
            sectionKey={sectionKey}
            isComplete={isComplete}
            duration={null}
            parallelTool={parallelTool}
            isExpanded={isExpanded}
            isFullscreen={isFullscreen}
            setIsExpanded={setIsExpanded}
            setIsFullscreen={setIsFullscreen}
          />
        );
      }
      case 'step-start': {
        const firstStepStartIndex = parts.findIndex((p) => p.type === 'step-start');
        if (partIndex === firstStepStartIndex) {
          // Render logo and title for the first step-start
          return (
            <div key={`${messageIndex}-${partIndex}-step-start-logo`}>
              <SciraLogoHeader />
            </div>
          );
        }
        // For subsequent step-start parts, render an empty div
        return <div key={`${messageIndex}-${partIndex}-step-start`}></div>;
      }
      case 'tool-invocation':
        return (
          <ToolInvocationListView
            key={`${messageIndex}-${partIndex}-tool`}
            toolInvocations={[part.toolInvocation]}
            annotations={message.annotations}
          />
        );
      default:
        return null;
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      // Scroll when status changes to submitted/streaming (new user input) or when new messages are added
      if (status === 'streaming' || status === 'submitted') {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      } else if (hasInitialScrolled && memoizedMessages.length > 0) {
        // Also scroll for message updates when not in initial load
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [memoizedMessages.length, status, hasInitialScrolled]);

  // Add effect for auto-scrolling reasoning content
  useEffect(() => {
    // Find active reasoning parts that are not complete
    const activeReasoning = messages.flatMap((message, messageIndex) =>
      (message.parts || [])
        .map((part: any, partIndex: number) => ({ part, messageIndex, partIndex }))
        .filter(({ part }: PartInfo) => part.type === 'reasoning')
        .filter(({ messageIndex, partIndex }: PartInfo) => {
          const message = messages[messageIndex];
          // Check if reasoning is complete
          return !(message.parts || []).some(
            (p: any, i: number) => i > partIndex && (p.type === 'text' || p.type === 'tool-invocation'),
          );
        }),
    );

    // Auto-scroll when active reasoning
    if (activeReasoning.length > 0 && reasoningScrollRef.current) {
      reasoningScrollRef.current.scrollTop = reasoningScrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (memoizedMessages.length === 0) {
    return null;
  }

  // Render error message if there is an error
  const handleRetry = async () => {
    try {
      const lastUserMessage = messages.findLast((m) => m.role === 'user');
      if (!lastUserMessage) return;

      // Step 1: Delete trailing messages if user is authenticated
      if (user && lastUserMessage.id) {
        await deleteTrailingMessages({
          id: lastUserMessage.id,
        });
      }

      // Step 2: Update local state to remove assistant messages
      const newMessages = [];
      // Find the index of the last user message
      for (let i = 0; i < messages.length; i++) {
        newMessages.push(messages[i]);
        if (messages[i].id === lastUserMessage.id) {
          break;
        }
      }

      // Step 3: Update UI state
      setMessages(newMessages);
      setSuggestedQuestions([]);

      // Step 4: Reload
      await reload();
    } catch (error) {
      console.error('Error in retry:', error);
    }
  };

  return (
    <div className="space-y-0 mb-32 flex flex-col">
      <div className="flex-grow">
        {memoizedMessages.map((message, index) => {
          const isNextMessageAssistant =
            index < memoizedMessages.length - 1 && memoizedMessages[index + 1].role === 'assistant';
          const isCurrentMessageUser = message.role === 'user';
          const isCurrentMessageAssistant = message.role === 'assistant';
          const isLastMessage = index === memoizedMessages.length - 1;

          // Determine proper spacing between messages
          let messageClasses = '';

          if (isCurrentMessageUser && isNextMessageAssistant) {
            // Reduce space between user message and its response
            messageClasses = 'mb-2';
          } else if (isCurrentMessageAssistant && index < memoizedMessages.length - 1) {
            // Add border and spacing only if this is not the last assistant message
            messageClasses = 'mb-6 pb-6 border-b border-neutral-200 dark:border-neutral-800';
          } else if (isCurrentMessageAssistant && index === memoizedMessages.length - 1) {
            // Last assistant message should have no bottom margin (min-height is now handled in Message component)
            messageClasses = 'mb-0';
          } else {
            messageClasses = 'mb-3';
          }

          return (
            <div key={index} className={messageClasses}>
              <Message
                message={message}
                index={index}
                lastUserMessageIndex={lastUserMessageIndex}
                renderPart={renderPart}
                status={status}
                messages={messages}
                setMessages={setMessages}
                append={append}
                setSuggestedQuestions={setSuggestedQuestions}
                suggestedQuestions={index === memoizedMessages.length - 1 ? suggestedQuestions : []}
                user={user}
                selectedVisibilityType={selectedVisibilityType}
                reload={reload}
                isLastMessage={isLastMessage}
                error={error}
                isMissingAssistantResponse={isMissingAssistantResponse}
                handleRetry={handleRetry}
                isOwner={isOwner}
              />
            </div>
          );
        })}
      </div>

      {/* Loading animation when status is submitted with min-height to reserve space */}
      {status === 'submitted' && (
        <div className="flex items-start min-h-[calc(100vh-18rem)]">
          <div className="w-full">
            <SciraLogoHeader />
            <div className="flex space-x-2 ml-8 mt-2">
              <div
                className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Reserve space for empty/streaming assistant message */}
      {status === 'streaming' && isWaitingForResponse && (
        <div className="min-h-[calc(100vh-18rem)] mt-2">
          <SciraLogoHeader />
        </div>
      )}

      <div ref={reasoningScrollRef} />
      <div ref={messagesEndRef} />

      {/* Show global incomplete-response banner when the last message is a user message and no assistant reply is present */}
      {isMissingAssistantResponse && memoizedMessages[memoizedMessages.length - 1]?.role !== 'assistant' && (
        <div className="mt-3">
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
            <div className="bg-amber-50 dark:bg-amber-900/30 px-4 py-3 border-b border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <div className="mt-0.5">
                <div className="bg-amber-100 dark:bg-amber-700/50 p-1.5 rounded-full">
                  <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-300" />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-amber-700 dark:text-amber-300">Incomplete Response</h3>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                  The assistant response appears to be missing.
                </p>
              </div>
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-neutral-500 dark:text-neutral-400 text-xs">
                {!user && selectedVisibilityType === 'public'
                  ? 'Please sign in to retry or try a different prompt'
                  : 'Try regenerating the response or rephrase your question'}
              </p>
              {(user || selectedVisibilityType === 'private') && (
                <Button onClick={handleRetry} className="bg-amber-600 hover:bg-amber-700 text-white" size="sm">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Generate Response
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Show global error when there is no assistant message to display it */}
      {error && memoizedMessages[memoizedMessages.length - 1]?.role !== 'assistant' && (
        <EnhancedErrorDisplay
          error={error}
          user={user}
          selectedVisibilityType={selectedVisibilityType}
          handleRetry={handleRetry}
        />
      )}
    </div>
  );
};

export default Messages;
