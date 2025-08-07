import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '@/components/message';
import { DataUIPart } from 'ai';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { EnhancedErrorDisplay } from '@/components/message';
import { MessagePartRenderer } from '@/components/message-parts';
import { SciraLogoHeader } from '@/components/scira-logo-header';
import { deleteTrailingMessages } from '@/app/actions';
import { ChatMessage, CustomUIDataTypes } from '@/lib/types';
import { UseChatHelpers } from '@ai-sdk/react';

// Define interface for part, messageIndex and partIndex objects
interface PartInfo {
  part: any;
  messageIndex: number;
  partIndex: number;
}

interface MessagesProps {
  messages: ChatMessage[];
  lastUserMessageIndex: number;
  input: string;
  setInput: (value: string) => void;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  suggestedQuestions: string[];
  setSuggestedQuestions: (questions: string[]) => void;
  status: UseChatHelpers<ChatMessage>['status'];
  error: Error | null; // Add error from useChat
  user?: any; // Add user prop
  selectedVisibilityType?: 'public' | 'private'; // Add visibility type
  chatId?: string; // Add chatId prop
  onVisibilityChange?: (visibility: 'public' | 'private') => void; // Add visibility change handler
  initialMessages?: any[]; // Add initial messages prop to detect existing chat
  isOwner?: boolean; // Add ownership prop
  onHighlight?: (text: string) => void; // Add highlight handler
}



const Messages: React.FC<MessagesProps> = React.memo(
  ({
    messages,
    lastUserMessageIndex,
    setMessages,
    suggestedQuestions,
    setSuggestedQuestions,
    status,
    error,
    user,
    selectedVisibilityType = 'private',
    chatId,
    onVisibilityChange,
    initialMessages,
    isOwner,
    onHighlight,
    sendMessage,
    regenerate,
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
      console.log('=== FILTERING MESSAGES START ===');
      console.log('Raw messages array:', messages);
      console.log('Raw messages length:', messages.length);
      
      const filtered = messages.filter((message) => {
        console.log('Processing message:', {
          role: message.role,
          id: message.id,
          parts: message.parts?.map(p => ({ type: p.type, hasContent: !!(p as any).text || !!(p as any).input || !!(p as any).output })),
          partsLength: message.parts?.length
        });
        
        // Keep all user messages
        if (message.role === 'user') {
          console.log('✅ Keeping user message:', message.id);
          return true;
        }

        // For assistant messages, keep all of them for now (debugging)
        if (message.role === 'assistant') {
          console.log('✅ Keeping assistant message:', message.id);
          return true;
        }
        
        console.log('❌ Filtering out message:', message.role, message.id);
        return false;
      });
      
      console.log('Filtered messages length:', filtered.length);
      console.log('Filtered messages:', filtered);
      console.log('=== FILTERING MESSAGES END ===');
      return filtered;
    }, [messages]);

    // Check if there are any active tool invocations in the current messages
    const hasActiveToolInvocations = useMemo(() => {
      const lastMessage = memoizedMessages[memoizedMessages.length - 1];
      console.log('hasActiveToolInvocations - lastMessage:', lastMessage);
      
      // Only consider tools as "active" if we're currently streaming AND the last message is assistant with tools
      if (status === 'streaming' && lastMessage?.role === 'assistant') {
        const hasTools = lastMessage.parts?.some((part: ChatMessage['parts'][number]) => part.type.startsWith('tool-'));
        console.log('hasActiveToolInvocations - hasTools:', hasTools);
        return hasTools;
      }
      console.log('hasActiveToolInvocations - not streaming or no assistant message, returning false');
      return false;
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
        const hasVisibleText = parts.some(
          (part: ChatMessage['parts'][number]) => part.type === 'text' && part.text && part.text.trim() !== '',
        );
        const hasToolInvocations = parts.some((part: ChatMessage['parts'][number]) => part.type.startsWith('tool-'));

        // If there is NO visible content at all, we consider the response incomplete
        if (!hasVisibleText && !hasToolInvocations) {
          return true;
        }
      }

      return false;
    }, [memoizedMessages, status, error]);

    // Memoize the retry handler
    const handleRetry = useCallback(async () => {
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
        await regenerate({ messageId: newMessages[newMessages.length - 1].id });
      } catch (error) {
        console.error('Error in retry:', error);
      }
    }, [messages, user, setMessages, setSuggestedQuestions, regenerate]);

    // Handle rendering of message parts - using the new MessagePartRenderer component
    const renderPart = useCallback(
      (
        part: ChatMessage['parts'][number],
        messageIndex: number,
        partIndex: number,
        parts: ChatMessage['parts'][number][],
        message: ChatMessage,
      ): React.ReactNode => {
        // Extract annotations from all data parts in the message
        const annotations = message.parts
          .filter((p) => p.type.startsWith('data-'))
          .map((p) => p as DataUIPart<CustomUIDataTypes>);

        return (
          <MessagePartRenderer
            part={part}
            messageIndex={messageIndex}
            partIndex={partIndex}
            parts={parts}
            message={message}
            status={status}
            hasActiveToolInvocations={hasActiveToolInvocations}
            reasoningVisibilityMap={reasoningVisibilityMap}
            reasoningFullscreenMap={reasoningFullscreenMap}
            setReasoningVisibilityMap={setReasoningVisibilityMap}
            setReasoningFullscreenMap={setReasoningFullscreenMap}
            messages={messages}
            user={user}
            isOwner={isOwner}
            selectedVisibilityType={selectedVisibilityType}
            chatId={chatId}
            onVisibilityChange={onVisibilityChange}
            setMessages={setMessages}
            setSuggestedQuestions={setSuggestedQuestions}
            regenerate={regenerate}
            onHighlight={onHighlight}
            annotations={annotations}
          />
        );
      },
      [
        status,
        hasActiveToolInvocations,
        messages,
        user,
        isOwner,
        selectedVisibilityType,
        chatId,
        onVisibilityChange,
        setMessages,
        setSuggestedQuestions,
        regenerate,
        reasoningVisibilityMap,
        reasoningFullscreenMap,
        onHighlight,
      ],
    );

    // Check if we should show loading animation
    const shouldShowLoading = useMemo(() => {
      if (status === 'submitted') {
        return true;
      }
      
      if (status === 'streaming') {
        const lastMessage = memoizedMessages[memoizedMessages.length - 1];
        // Show loading if only user message exists (no assistant response yet)
        if (lastMessage?.role === 'user') {
          return true;
        }
        // Show loading if assistant message exists but has 0 or 1 parts (just starting)
        if (lastMessage?.role === 'assistant') {
          const partsCount = lastMessage.parts?.length || 0;
          return partsCount <= 1;
        }
      }
      
      return false;
    }, [status, memoizedMessages]);

    // Check if assistant message should have reduced height (when loading animation is also showing)
    const shouldReduceAssistantHeight = useMemo(() => {
      if (shouldShowLoading && status === 'streaming') {
        const lastMessage = memoizedMessages[memoizedMessages.length - 1];
        // Reduce height when assistant message exists but loading is also showing
        if (lastMessage?.role === 'assistant') {
          const partsCount = lastMessage.parts?.length || 0;
          return partsCount <= 1;
        }
      }
      return false;
    }, [shouldShowLoading, status, memoizedMessages]);

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

    console.log('=== RENDER CHECK ===');
    console.log('memoizedMessages.length:', memoizedMessages.length);
    console.log('memoizedMessages roles:', memoizedMessages.map(m => m.role));
    
    if (memoizedMessages.length === 0) {
      console.log('❌ No messages to render, returning null');
      return null;
    }
    
    console.log('✅ Proceeding to render', memoizedMessages.length, 'messages');

    return (
      <div className="space-y-0 mb-32 flex flex-col">
        <div className="flex-grow">
          {memoizedMessages.map((message, index) => {
            console.log(`=== RENDERING MESSAGE ${index} ===`);
            console.log('Message role:', message.role);
            console.log('Message id:', message.id);
            console.log('Message parts count:', message.parts?.length);
            
            const isNextMessageAssistant =
              index < memoizedMessages.length - 1 && memoizedMessages[index + 1].role === 'assistant';
            const isCurrentMessageUser = message.role === 'user';
            const isCurrentMessageAssistant = message.role === 'assistant';
            const isLastMessage = index === memoizedMessages.length - 1;

            // Determine proper spacing between messages
            let messageClasses = '';

            if (isCurrentMessageUser && isNextMessageAssistant) {
              // Reduce space between user message and its response
              messageClasses = 'mb-0';
            } else if (isCurrentMessageAssistant && index < memoizedMessages.length - 1) {
              // Add border and spacing only if this is not the last assistant message
              messageClasses = 'mb-6 pb-6 border-b border-border dark:border-border';
            } else if (isCurrentMessageAssistant && index === memoizedMessages.length - 1) {
              // Last assistant message should have no bottom margin (min-height is now handled in Message component)
              messageClasses = 'mb-0';
            } else {
              messageClasses = 'mb-0';
            }

            console.log(`📤 About to render Message component for ${message.role} message ${index}`);
            return (
              <div key={message.id || index} className={messageClasses}>
                <Message
                  message={message}
                  index={index}
                  lastUserMessageIndex={lastUserMessageIndex}
                  renderPart={renderPart}
                  status={status}
                  messages={messages}
                  setMessages={setMessages}
                  sendMessage={sendMessage}
                  regenerate={regenerate}
                  setSuggestedQuestions={setSuggestedQuestions}
                  suggestedQuestions={index === memoizedMessages.length - 1 ? suggestedQuestions : []}
                  user={user}
                  selectedVisibilityType={selectedVisibilityType}
                  isLastMessage={isLastMessage}
                  error={error}
                  isMissingAssistantResponse={isMissingAssistantResponse}
                  handleRetry={handleRetry}
                  isOwner={isOwner}
                  onHighlight={onHighlight}
                  shouldReduceHeight={isLastMessage && shouldReduceAssistantHeight}
                />
              </div>
            );
          })}
        </div>

        {/* Loading animation when status is submitted or streaming with minimal assistant content */}
        {shouldShowLoading && (
          <div className="flex items-start min-h-[calc(100vh-18rem)] !m-0 !p-0">
            <div className="w-full !m-0 !p-0">
              <SciraLogoHeader />
              <div className="flex space-x-2 ml-8 mt-2">
                <div
                  className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Missing assistant response error */}
        {isMissingAssistantResponse && (
          <div className="flex items-start min-h-[calc(100vh-18rem)]">
            <div className="w-full">
              <SciraLogoHeader />

              <div className="bg-secondary/30 dark:bg-secondary/20 border border-secondary dark:border-secondary rounded-lg p-4 mb-4 max-w-2xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-secondary-foreground dark:text-secondary-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-secondary-foreground dark:text-secondary-foreground mb-1">
                      No response generated
                    </h3>
                    <p className="text-sm text-secondary-foreground/80 dark:text-secondary-foreground/80">
                      It looks like the assistant didn&apos;t provide a response to your message.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 flex items-center justify-between">
                <p className="text-muted-foreground dark:text-muted-foreground text-xs">
                  {!user && selectedVisibilityType === 'public'
                    ? 'Please sign in to retry or try a different prompt'
                    : 'Try regenerating the response or rephrase your question'}
                </p>
                {(user || selectedVisibilityType === 'private') && (
                  <Button
                    onClick={handleRetry}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    size="sm"
                  >
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

        <div ref={messagesEndRef} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    return (
      prevProps.messages === nextProps.messages &&
      prevProps.status === nextProps.status &&
      prevProps.suggestedQuestions === nextProps.suggestedQuestions &&
      prevProps.error === nextProps.error &&
      prevProps.user?.id === nextProps.user?.id &&
      prevProps.selectedVisibilityType === nextProps.selectedVisibilityType
    );
  },
);

// Add a display name for better debugging
Messages.displayName = 'Messages';

export default Messages;

