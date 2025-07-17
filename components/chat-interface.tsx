/* eslint-disable @next/next/no-img-element */
'use client';

// CSS imports
import 'katex/dist/katex.min.css';

// React and React-related imports
import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useReducer } from 'react';

// Third-party library imports
import { useChat, UseChatOptions } from '@ai-sdk/react';
import { Crown } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// Internal app imports
import { suggestQuestions, updateChatVisibility } from '@/app/actions';

// Component imports
import { ChatDialogs } from '@/components/chat-dialogs';
import Messages from '@/components/messages';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import FormComponent from '@/components/ui/form-component';

// Hook imports
import { useAutoResume } from '@/hooks/use-auto-resume';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useUsageData } from '@/hooks/use-usage-data';
import { useProUserStatus } from '@/hooks/use-user-data';
import { useOptimizedScroll } from '@/hooks/use-optimized-scroll';

// Utility and type imports
import { SEARCH_LIMITS } from '@/lib/constants';
import { ChatSDKError } from '@/lib/errors';
import { cn, SearchGroupId, invalidateChatsCache } from '@/lib/utils';

// State management imports
import { chatReducer, createInitialState } from '@/components/chat-state';

interface Attachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
}

interface ChatInterfaceProps {
  initialChatId?: string;
  initialMessages?: any[];
  initialVisibility?: 'public' | 'private';
  isOwner?: boolean;
}

const ChatInterface = memo(
  ({
    initialChatId,
    initialMessages,
    initialVisibility = 'private',
    isOwner = true,
  }: ChatInterfaceProps): React.JSX.Element => {
    const router = useRouter();
    const [query] = useQueryState('query', parseAsString.withDefault(''));
    const [q] = useQueryState('q', parseAsString.withDefault(''));

    // Use localStorage hook directly for model selection with a default
    const [selectedModel, setSelectedModel] = useLocalStorage('scira-selected-model', 'scira-default');
    const [selectedGroup, setSelectedGroup] = useLocalStorage<SearchGroupId>('scira-selected-group', 'web');
    const [isCustomInstructionsEnabled, setIsCustomInstructionsEnabled] = useLocalStorage(
      'scira-custom-instructions-enabled',
      true,
    );

    // Get persisted values for dialog states
    const [persistedHasShownUpgradeDialog, setPersitedHasShownUpgradeDialog] = useLocalStorage(
      'scira-upgrade-prompt-shown',
      false,
    );
    const [persistedHasShownSignInPrompt, setPersitedHasShownSignInPrompt] = useLocalStorage(
      'scira-signin-prompt-shown',
      false,
    );
    const [persistedHasShownAnnouncementDialog, setPersitedHasShownAnnouncementDialog] = useLocalStorage(
      'scira-announcement-prompt-shown',
      false,
    );

    // Use reducer for complex state management
    const [chatState, dispatch] = useReducer(
      chatReducer,
      createInitialState(
        initialVisibility,
        persistedHasShownUpgradeDialog,
        persistedHasShownSignInPrompt,
        persistedHasShownAnnouncementDialog,
      ),
    );

    const {
      user,
      subscriptionData,
      isProUser: isUserPro,
      isLoading: proStatusLoading,
      shouldCheckLimits: shouldCheckUserLimits,
      shouldBypassLimitsForModel,
    } = useProUserStatus();

    const initialState = useMemo(
      () => ({
        query: query || q,
      }),
      [query, q],
    );

    const lastSubmittedQueryRef = useRef(initialState.query);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null!);
    const inputRef = useRef<HTMLTextAreaElement>(null!);
    const initializedRef = useRef(false);

    // Use optimized scroll hook
    const { isAtBottom, hasManuallyScrolled, scrollToElement, resetManualScroll } = useOptimizedScroll(bottomRef, {
      enabled: true,
      threshold: 100,
      behavior: 'smooth',
      debounceMs: 100,
    });

    // Use clean React Query hooks for all data fetching
    const { data: usageData, refetch: refetchUsage } = useUsageData(user || null);

    // Sign-in prompt timer
    const signInTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Announcement dialog timer
    const announcementTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Generate a consistent ID for new chats
    const chatId = useMemo(() => initialChatId ?? uuidv4(), [initialChatId]);

    // Pro users bypass all limit checks - much cleaner!
    const shouldBypassLimits = shouldBypassLimitsForModel(selectedModel);
    const hasExceededLimit =
      shouldCheckUserLimits &&
      !proStatusLoading &&
      !shouldBypassLimits &&
      usageData &&
      usageData.count >= SEARCH_LIMITS.DAILY_SEARCH_LIMIT;
    const isLimitBlocked = Boolean(hasExceededLimit);

    // Timer for sign-in prompt for unauthenticated users
    useEffect(() => {
      // If user becomes authenticated, reset the prompt flag and clear timer
      if (user) {
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
          signInTimerRef.current = null;
        }
        // Reset the flag so it can show again in future sessions if they log out
        setPersitedHasShownSignInPrompt(false);
        return;
      }

      // Only start timer if user is not authenticated and hasn't been shown the prompt yet
      if (!user && !chatState.hasShownSignInPrompt) {
        // Clear any existing timer
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
        }

        // Set timer for 1 minute (60000 ms)
        signInTimerRef.current = setTimeout(() => {
          dispatch({ type: 'SET_SHOW_SIGNIN_PROMPT', payload: true });
          dispatch({ type: 'SET_HAS_SHOWN_SIGNIN_PROMPT', payload: true });
          setPersitedHasShownSignInPrompt(true);
        }, 60000);
      }

      // Cleanup timer on unmount
      return () => {
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
        }
      };
    }, [user, chatState.hasShownSignInPrompt, setPersitedHasShownSignInPrompt]);

    // Timer for announcement dialog
    useEffect(() => {
      // Only start timer if announcement hasn't been shown yet
      if (!chatState.hasShownAnnouncementDialog) {
        // Clear any existing timer
        if (announcementTimerRef.current) {
          clearTimeout(announcementTimerRef.current);
        }

        // Set timer for 30 seconds (30000 ms)
        announcementTimerRef.current = setTimeout(() => {
          dispatch({ type: 'SET_SHOW_ANNOUNCEMENT_DIALOG', payload: true });
          dispatch({ type: 'SET_HAS_SHOWN_ANNOUNCEMENT_DIALOG', payload: true });
          setPersitedHasShownAnnouncementDialog(true);
        }, 30000);
      }

      // Cleanup timer on unmount
      return () => {
        if (announcementTimerRef.current) {
          clearTimeout(announcementTimerRef.current);
        }
      };
    }, [chatState.hasShownAnnouncementDialog, setPersitedHasShownAnnouncementDialog]);

    type VisibilityType = 'public' | 'private';

    const chatOptions: UseChatOptions = useMemo(
      () => ({
        id: chatId,
        api: '/api/search',
        experimental_throttle: selectedModel === 'scira-opus' || selectedModel === 'scira-opus-pro' ? 1000 : 100,
        sendExtraMessageFields: true,
        maxSteps: 5,
        body: {
          id: chatId,
          model: selectedModel,
          group: selectedGroup,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...(initialChatId ? { chat_id: initialChatId } : {}),
          selectedVisibilityType: chatState.selectedVisibilityType,
          isCustomInstructionsEnabled: isCustomInstructionsEnabled,
        },
        onFinish: async (message, { finishReason }) => {
          console.log('[finish reason]:', finishReason);

          // Refresh usage data after message completion for authenticated users
          if (user) {
            refetchUsage();
          }

          // Check if this is the first message completion and user is not Pro
          const isFirstMessage = messages.length <= 1;

          console.log('Upgrade dialog check:', {
            isFirstMessage,
            isProUser: isUserPro,
            hasShownUpgradeDialog: chatState.hasShownUpgradeDialog,
            user: !!user,
            messagesLength: messages.length,
          });

          // Show upgrade dialog after first message if user is not Pro and hasn't seen it before
          if (isFirstMessage && !isUserPro && !proStatusLoading && !chatState.hasShownUpgradeDialog && user) {
            console.log('Showing upgrade dialog...');
            setTimeout(() => {
              dispatch({ type: 'SET_SHOW_UPGRADE_DIALOG', payload: true });
              dispatch({ type: 'SET_HAS_SHOWN_UPGRADE_DIALOG', payload: true });
              setPersitedHasShownUpgradeDialog(true);
            }, 1000);
          }

          // Only generate suggested questions if authenticated user or private chat
          if (
            message.content &&
            (finishReason === 'stop' || finishReason === 'length') &&
            (user || chatState.selectedVisibilityType === 'private')
          ) {
            const newHistory = [
              { role: 'user', content: lastSubmittedQueryRef.current },
              { role: 'assistant', content: message.content },
            ];
            const { questions } = await suggestQuestions(newHistory);
            dispatch({ type: 'SET_SUGGESTED_QUESTIONS', payload: questions });
          }
        },
        onError: (error) => {
          // Don't show toast for ChatSDK errors as they will be handled by the enhanced error display
          if (error instanceof ChatSDKError) {
            console.log('ChatSDK Error:', error.type, error.surface, error.message);
            // Only show toast for certain error types that need immediate attention
            if (error.type === 'offline' || error.surface === 'stream') {
              toast.error('Connection Error', {
                description: error.message,
              });
            }
          } else {
            console.error('Chat error:', error.cause, error.message);
            toast.error('An error occurred.', {
              description: `Oops! An error occurred while processing your request. ${error.cause || error.message}`,
            });
          }
        },
        initialMessages: initialMessages,
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }),
      [
        selectedModel,
        selectedGroup,
        chatId,
        initialChatId,
        initialMessages,
        chatState.selectedVisibilityType,
        isCustomInstructionsEnabled,
      ],
    );

    const {
      input,
      messages,
      setInput,
      append,
      handleSubmit,
      setMessages,
      reload,
      stop,
      data,
      status,
      error,
      experimental_resume,
    } = useChat(chatOptions);

    // Debug error structure
    if (error) {
      console.log('[useChat error]:', error);
      console.log('[error type]:', typeof error);
      console.log('[error message]:', error.message);
      console.log('[error instance]:', error instanceof Error, error instanceof ChatSDKError);
    }

    useAutoResume({
      autoResume: true,
      initialMessages: initialMessages || [],
      experimental_resume,
      data,
      setMessages,
    });

    useEffect(() => {
      if (status) {
        console.log('[status]:', status);
      }
    }, [status]);

    useEffect(() => {
      if (user && status === 'streaming' && messages.length > 0) {
        console.log('[chatId]:', chatId);
        // Invalidate chats cache to refresh the list
        invalidateChatsCache();
      }
    }, [user, status, router, chatId, initialChatId, messages.length]);

    useEffect(() => {
      if (!initializedRef.current && initialState.query && !messages.length && !initialChatId) {
        initializedRef.current = true;
        console.log('[initial query]:', initialState.query);
        append({
          content: initialState.query,
          role: 'user',
        });
      }
    }, [initialState.query, append, setInput, messages.length, initialChatId]);

    // Generate suggested questions when opening a chat directly
    useEffect(() => {
      const generateSuggestionsForInitialMessages = async () => {
        // Only generate if we have initial messages, no suggested questions yet,
        // user is authenticated or chat is private, and status is not streaming
        if (
          initialMessages &&
          initialMessages.length >= 2 &&
          !chatState.suggestedQuestions.length &&
          (user || chatState.selectedVisibilityType === 'private') &&
          status === 'ready'
        ) {
          const lastUserMessage = initialMessages.filter((m) => m.role === 'user').pop();
          const lastAssistantMessage = initialMessages.filter((m) => m.role === 'assistant').pop();

          if (lastUserMessage && lastAssistantMessage) {
            const newHistory = [
              { role: 'user', content: lastUserMessage.content },
              { role: 'assistant', content: lastAssistantMessage.content },
            ];
            try {
              const { questions } = await suggestQuestions(newHistory);
              dispatch({ type: 'SET_SUGGESTED_QUESTIONS', payload: questions });
            } catch (error) {
              console.error('Error generating suggested questions:', error);
            }
          }
        }
      };

      generateSuggestionsForInitialMessages();
    }, [initialMessages, chatState.suggestedQuestions.length, status, user, chatState.selectedVisibilityType]);

    // Reset suggested questions when status changes to streaming
    useEffect(() => {
      if (status === 'streaming') {
        // Clear suggested questions when a new message is being streamed
        dispatch({ type: 'RESET_SUGGESTED_QUESTIONS' });
      }
    }, [status]);

    const lastUserMessageIndex = useMemo(() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          return i;
        }
      }
      return -1;
    }, [messages]);

    useEffect(() => {
      // Reset manual scroll when streaming starts
      if (status === 'streaming') {
        resetManualScroll();
        // Initial scroll to bottom when streaming starts
        scrollToElement();
      }
    }, [status, resetManualScroll, scrollToElement]);

    // Auto-scroll on new content if user is at bottom or hasn't manually scrolled away
    useEffect(() => {
      if (status === 'streaming' && (isAtBottom || !hasManuallyScrolled)) {
        scrollToElement();
      } else if (
        messages.length > 0 &&
        chatState.suggestedQuestions.length > 0 &&
        (isAtBottom || !hasManuallyScrolled)
      ) {
        // Scroll when suggested questions appear
        scrollToElement();
      }
    }, [
      messages.length,
      chatState.suggestedQuestions.length,
      status,
      isAtBottom,
      hasManuallyScrolled,
      scrollToElement,
    ]);

    // Dialog management state - track command dialog state in chat state
    useEffect(() => {
      dispatch({
        type: 'SET_ANY_DIALOG_OPEN',
        payload:
          chatState.commandDialogOpen ||
          chatState.showSignInPrompt ||
          chatState.showUpgradeDialog ||
          chatState.showAnnouncementDialog,
      });
    }, [
      chatState.commandDialogOpen,
      chatState.showSignInPrompt,
      chatState.showUpgradeDialog,
      chatState.showAnnouncementDialog,
    ]);

    // Keyboard shortcut for command dialog
    useEffect(() => {
      const down = (e: KeyboardEvent) => {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          dispatch({ type: 'SET_COMMAND_DIALOG_OPEN', payload: !chatState.commandDialogOpen });
        }
      };

      document.addEventListener('keydown', down);
      return () => document.removeEventListener('keydown', down);
    }, [chatState.commandDialogOpen]);

    // Define the model change handler
    const handleModelChange = useCallback(
      (model: string) => {
        setSelectedModel(model);
      },
      [setSelectedModel],
    );

    const resetSuggestedQuestions = useCallback(() => {
      dispatch({ type: 'RESET_SUGGESTED_QUESTIONS' });
    }, []);

    // Handle visibility change
    const handleVisibilityChange = useCallback(
      async (visibility: VisibilityType) => {
        if (!chatId) return;

        try {
          await updateChatVisibility(chatId, visibility);
          dispatch({ type: 'SET_VISIBILITY_TYPE', payload: visibility });
          toast.success(`Chat is now ${visibility}`);
          // Invalidate cache to refresh the list with updated visibility
          invalidateChatsCache();
        } catch (error) {
          console.error('Error updating chat visibility:', error);
          toast.error('Failed to update chat visibility');
        }
      },
      [chatId],
    );

    return (
      <div className="flex flex-col font-sans! items-center min-h-screen bg-background text-foreground transition-all duration-500 w-full overflow-x-hidden !scrollbar-thin !scrollbar-thumb-neutral-300 dark:!scrollbar-thumb-neutral-700 !scrollbar-track-transparent hover:!scrollbar-thumb-neutral-400 dark:!hover:scrollbar-thumb-neutral-600">
        <Navbar
          isDialogOpen={chatState.anyDialogOpen}
          chatId={initialChatId || (messages.length > 0 ? chatId : null)}
          selectedVisibilityType={chatState.selectedVisibilityType}
          onVisibilityChange={handleVisibilityChange}
          status={status}
          user={user}
          onHistoryClick={() => dispatch({ type: 'SET_COMMAND_DIALOG_OPEN', payload: true })}
          isOwner={isOwner}
          subscriptionData={subscriptionData}
          isProUser={isUserPro}
          isProStatusLoading={proStatusLoading}
          isCustomInstructionsEnabled={isCustomInstructionsEnabled}
          setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
        />

        {/* Chat Dialogs Component */}
        <ChatDialogs
          commandDialogOpen={chatState.commandDialogOpen}
          setCommandDialogOpen={(open) => dispatch({ type: 'SET_COMMAND_DIALOG_OPEN', payload: open })}
          showSignInPrompt={chatState.showSignInPrompt}
          setShowSignInPrompt={(open) => dispatch({ type: 'SET_SHOW_SIGNIN_PROMPT', payload: open })}
          hasShownSignInPrompt={chatState.hasShownSignInPrompt}
          setHasShownSignInPrompt={(value) => {
            dispatch({ type: 'SET_HAS_SHOWN_SIGNIN_PROMPT', payload: value });
            setPersitedHasShownSignInPrompt(value);
          }}
          showUpgradeDialog={chatState.showUpgradeDialog}
          setShowUpgradeDialog={(open) => dispatch({ type: 'SET_SHOW_UPGRADE_DIALOG', payload: open })}
          hasShownUpgradeDialog={chatState.hasShownUpgradeDialog}
          setHasShownUpgradeDialog={(value) => {
            dispatch({ type: 'SET_HAS_SHOWN_UPGRADE_DIALOG', payload: value });
            setPersitedHasShownUpgradeDialog(value);
          }}
          showAnnouncementDialog={chatState.showAnnouncementDialog}
          setShowAnnouncementDialog={(open) => dispatch({ type: 'SET_SHOW_ANNOUNCEMENT_DIALOG', payload: open })}
          hasShownAnnouncementDialog={chatState.hasShownAnnouncementDialog}
          setHasShownAnnouncementDialog={(value) => {
            dispatch({ type: 'SET_HAS_SHOWN_ANNOUNCEMENT_DIALOG', payload: value });
            setPersitedHasShownAnnouncementDialog(value);
          }}
          user={user}
          setAnyDialogOpen={(open) => dispatch({ type: 'SET_ANY_DIALOG_OPEN', payload: open })}
        />

        <div
          className={`w-full p-2 sm:p-4 ${
            status === 'ready' && messages.length === 0
              ? 'min-h-screen! flex! flex-col! items-center! justify-center!' // Center everything when no messages
              : 'mt-20! sm:mt-16! flex flex-col!' // Add top margin when showing messages
          }`}
        >
          <div className={`w-full max-w-[95%] sm:max-w-2xl space-y-6 p-0 mx-auto transition-all duration-300`}>
            {status === 'ready' && messages.length === 0 && (
              <div className="text-center m-0 mb-2">
                <h1 className="text-3xl sm:text-5xl !mb-0 text-neutral-800 dark:text-neutral-100 font-be-vietnam-pro! font-light tracking-tighter">
                  scira
                </h1>
              </div>
            )}

            {/* Show initial limit exceeded message */}
            {status === 'ready' && messages.length === 0 && isLimitBlocked && (
              <div className="mt-8 p-6 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800/60 rounded-xl max-w-lg mx-auto">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <Crown className="h-4 w-4" />
                    <span className="text-sm font-medium">Daily limit reached</span>
                  </div>
                  <div>
                    <p className="text-neutral-700 dark:text-neutral-300 mb-2">
                      You&apos;ve used all {SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches for today.
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Upgrade to continue with unlimited searches and premium features.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        refetchUsage();
                      }}
                      size="sm"
                      className="flex-1"
                    >
                      Refresh
                    </Button>
                    <Button
                      onClick={() => {
                        window.location.href = '/pricing';
                      }}
                      size="sm"
                      className="flex-1 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black"
                    >
                      <Crown className="h-3 w-3 mr-1.5" />
                      Upgrade
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Use the Messages component */}
            {messages.length > 0 && (
              <Messages
                messages={messages}
                lastUserMessageIndex={lastUserMessageIndex}
                input={input}
                setInput={setInput}
                setMessages={setMessages}
                append={append}
                reload={reload}
                suggestedQuestions={chatState.suggestedQuestions}
                setSuggestedQuestions={(questions) => dispatch({ type: 'SET_SUGGESTED_QUESTIONS', payload: questions })}
                status={status}
                error={error ?? null}
                user={user}
                selectedVisibilityType={chatState.selectedVisibilityType}
                chatId={initialChatId || (messages.length > 0 ? chatId : undefined)}
                onVisibilityChange={handleVisibilityChange}
                initialMessages={initialMessages}
                isOwner={isOwner}
              />
            )}

            <div ref={bottomRef} />
          </div>

          {/* Single Form Component with dynamic positioning */}
          {((user && isOwner) || !initialChatId || (!user && chatState.selectedVisibilityType === 'private')) &&
            !isLimitBlocked && (
              <div
                className={cn(
                  'transition-all duration-500 w-full max-w-[95%] sm:max-w-2xl mx-auto',
                  messages.length === 0 && !chatState.hasSubmitted
                    ? 'relative' // Centered position when no messages
                    : 'fixed bottom-6 sm:bottom-4 left-0 right-0 z-20', // Fixed bottom when messages exist
                )}
              >
                <FormComponent
                  chatId={chatId}
                  user={user!}
                  subscriptionData={subscriptionData}
                  input={input}
                  setInput={setInput}
                  attachments={chatState.attachments}
                  setAttachments={(attachments) => {
                    const newAttachments =
                      typeof attachments === 'function' ? attachments(chatState.attachments) : attachments;
                    dispatch({ type: 'SET_ATTACHMENTS', payload: newAttachments });
                  }}
                  handleSubmit={handleSubmit}
                  fileInputRef={fileInputRef}
                  inputRef={inputRef}
                  stop={stop}
                  messages={messages as any}
                  append={append}
                  selectedModel={selectedModel}
                  setSelectedModel={handleModelChange}
                  resetSuggestedQuestions={resetSuggestedQuestions}
                  lastSubmittedQueryRef={lastSubmittedQueryRef}
                  selectedGroup={selectedGroup}
                  setSelectedGroup={setSelectedGroup}
                  showExperimentalModels={messages.length === 0}
                  status={status}
                  setHasSubmitted={(hasSubmitted) => {
                    const newValue =
                      typeof hasSubmitted === 'function' ? hasSubmitted(chatState.hasSubmitted) : hasSubmitted;
                    dispatch({ type: 'SET_HAS_SUBMITTED', payload: newValue });
                  }}
                  isLimitBlocked={isLimitBlocked}
                />
              </div>
            )}

          {/* Show limit exceeded message */}
          {isLimitBlocked && messages.length > 0 && (
            <div className="fixed bottom-8 sm:bottom-4 left-0 right-0 w-full max-w-[95%] sm:max-w-2xl mx-auto z-20">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900/95 border border-neutral-200/60 dark:border-neutral-800/60 rounded-lg shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      Daily limit reached ({SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches used)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        refetchUsage();
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        window.location.href = '/pricing';
                      }}
                      className="h-7 px-3 text-xs bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black"
                    >
                      Upgrade
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

// Add a display name for the memoized component for better debugging
ChatInterface.displayName = 'ChatInterface';

export { ChatInterface };
