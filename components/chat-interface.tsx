/* eslint-disable @next/next/no-img-element */
'use client';

// CSS imports
import 'katex/dist/katex.min.css';

// React and React-related imports
import React, { memo, useCallback, useEffect, useMemo, useRef, useReducer, useState } from 'react';

// Third-party library imports
import { useChat, UseChatOptions } from '@ai-sdk/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Crown02Icon } from '@hugeicons/core-free-icons';
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
import { useUser } from '@/contexts/user-context';
import { useOptimizedScroll } from '@/hooks/use-optimized-scroll';

// Utility and type imports
import { SEARCH_LIMITS } from '@/lib/constants';
import { ChatSDKError } from '@/lib/errors';
import { cn, SearchGroupId, invalidateChatsCache } from '@/lib/utils';

// State management imports
import { chatReducer, createInitialState } from '@/components/chat-state';
import { useDataStream } from './data-stream-provider';
import { DefaultChatTransport, DataUIPart } from 'ai';
import { ChatMessage, CustomUIDataTypes } from '@/lib/types';

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
    const [input, setInput] = useState<string>('');

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
    const [persistedHasShownLookoutAnnouncement, setPersitedHasShownLookoutAnnouncement] = useLocalStorage(
      'scira-lookout-announcement-shown',
      false,
    );

    // Use reducer for complex state management
    const [chatState, dispatch] = useReducer(
      chatReducer,
      createInitialState(
        initialVisibility,
        persistedHasShownUpgradeDialog,
        persistedHasShownSignInPrompt,
        persistedHasShownLookoutAnnouncement,
      ),
    );

    const {
      user,
      subscriptionData,
      isProUser: isUserPro,
      isLoading: proStatusLoading,
      shouldCheckLimits: shouldCheckUserLimits,
      shouldBypassLimitsForModel,
    } = useUser();

    const { setDataStream } = useDataStream();

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

    // Generate a consistent ID for new chats
    const chatId = useMemo(() => initialChatId ?? uuidv4(), []);

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

    // Timer for lookout announcement - show after 30 seconds for authenticated users
    useEffect(() => {
      if (user && !chatState.hasShownAnnouncementDialog) {
        const timer = setTimeout(() => {
          dispatch({ type: 'SET_SHOW_ANNOUNCEMENT_DIALOG', payload: true });
          dispatch({ type: 'SET_HAS_SHOWN_ANNOUNCEMENT_DIALOG', payload: true });
          setPersitedHasShownLookoutAnnouncement(true);
        }, 3000);

        return () => clearTimeout(timer);
      }
    }, [user, chatState.hasShownAnnouncementDialog, setPersitedHasShownLookoutAnnouncement]);

    type VisibilityType = 'public' | 'private';

    // Create refs to store current values to avoid closure issues
    const selectedModelRef = useRef(selectedModel);
    const selectedGroupRef = useRef(selectedGroup);
    const isCustomInstructionsEnabledRef = useRef(isCustomInstructionsEnabled);

    // Update refs whenever state changes - this ensures we always have current values
    selectedModelRef.current = selectedModel;
    selectedGroupRef.current = selectedGroup;
    isCustomInstructionsEnabledRef.current = isCustomInstructionsEnabled;

    const { messages, sendMessage, setMessages, regenerate, stop, status, error, resumeStream } = useChat({
      id: chatId,
      transport: new DefaultChatTransport({
        api: '/api/search',
        prepareSendMessagesRequest({ messages, body }) {
          // Use ref values to get current state
          return {
            body: {
              id: chatId,
              messages,
              model: selectedModelRef.current,
              group: selectedGroupRef.current,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              isCustomInstructionsEnabled: isCustomInstructionsEnabledRef.current,
              ...(initialChatId ? { chat_id: initialChatId } : {}),
              ...body,
            },
          };
        },
      }),
      experimental_throttle: selectedModelRef.current === 'scira-anthropic' ? 1000 : 100,
      onData: (dataPart) => {
        console.log('onData<Client>', dataPart);
        setDataStream((ds) => (ds ? [...ds, dataPart as DataUIPart<CustomUIDataTypes>] : []));
      },
      onFinish: async ({ message }) => {
        console.log('onFinish<Client>', message.parts);
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
        if (message.parts && message.role === 'assistant' && (user || chatState.selectedVisibilityType === 'private')) {
          const lastPart = message.parts[message.parts.length - 1];
          const lastPartText = lastPart.type === 'text' ? lastPart.text : '';
          const newHistory = [
            { role: 'user', content: lastSubmittedQueryRef.current },
            { role: 'assistant', content: lastPartText },
          ];
          console.log('newHistory', newHistory);
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
      messages: initialMessages || [],
    });

    // Handle text highlighting and quoting
    const handleHighlight = useCallback(
      (text: string) => {
        const quotedText = `> ${text.replace(/\n/g, '\n> ')}\n\n`;
        setInput((prev: string) => prev + quotedText);

        // Focus the input after adding the quote
        setTimeout(() => {
          const inputElement = document.querySelector('textarea[placeholder*="Ask"]') as HTMLTextAreaElement;
          if (inputElement) {
            inputElement.focus();
            // Move cursor to end
            inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
          }
        }, 100);
      },
      [setInput],
    );

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
      resumeStream,
      setMessages: (messages) => {
        setMessages(messages as ChatMessage[]);
      },
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
        sendMessage({
          parts: [{ type: 'text', text: initialState.query }],
          role: 'user',
        });
      }
    }, [initialState.query, sendMessage, setInput, messages.length, initialChatId]);

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
            // Extract content from parts similar to onFinish callback
            const getUserContent = (message: typeof lastUserMessage) => {
              if (message.parts && message.parts.length > 0) {
                const lastPart = message.parts[message.parts.length - 1];
                return lastPart.type === 'text' ? lastPart.text : '';
              }
              return message.content || '';
            };

            const getAssistantContent = (message: typeof lastAssistantMessage) => {
              if (message.parts && message.parts.length > 0) {
                const lastPart = message.parts[message.parts.length - 1];
                return lastPart.type === 'text' ? lastPart.text : '';
              }
              return message.content || '';
            };

            const newHistory = [
              { role: 'user', content: getUserContent(lastUserMessage) },
              { role: 'assistant', content: getAssistantContent(lastAssistantMessage) },
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
      <div className="flex flex-col font-sans! items-center min-h-screen bg-background text-foreground transition-all duration-500 w-full overflow-x-hidden !scrollbar-thin !scrollbar-thumb-muted-foreground dark:!scrollbar-thumb-muted-foreground !scrollbar-track-transparent hover:!scrollbar-thumb-foreground dark:!hover:scrollbar-thumb-foreground">
        <Navbar
          isDialogOpen={chatState.anyDialogOpen}
          chatId={initialChatId || (messages.length > 0 ? chatId : null)}
          selectedVisibilityType={chatState.selectedVisibilityType}
          onVisibilityChange={handleVisibilityChange}
          status={status}
          user={user || null}
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
          showLookoutAnnouncement={chatState.showAnnouncementDialog}
          setShowLookoutAnnouncement={(open) => dispatch({ type: 'SET_SHOW_ANNOUNCEMENT_DIALOG', payload: open })}
          hasShownLookoutAnnouncement={chatState.hasShownAnnouncementDialog}
          setHasShownLookoutAnnouncement={(value) => {
            dispatch({ type: 'SET_HAS_SHOWN_ANNOUNCEMENT_DIALOG', payload: value });
            setPersitedHasShownLookoutAnnouncement(value);
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
                <div className="inline-flex items-center gap-3">
                  <h1 className="text-4xl sm:text-5xl !mb-0 text-foreground dark:text-foreground font-be-vietnam-pro! font-light tracking-tighter">
                    scira
                  </h1>
                  {isUserPro && (
                    <h1 className="text-2xl font-baumans! leading-4 inline-block !px-3 !pt-1 !pb-2.5 rounded-xl shadow-sm !m-0 !mt-2 bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground ring-1 ring-ring/35 ring-offset-1 ring-offset-background dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground">
                      pro
                    </h1>
                  )}
                </div>
              </div>
            )}

            {/* Show initial limit exceeded message */}
            {status === 'ready' && messages.length === 0 && isLimitBlocked && (
              <div className="mt-16 mx-auto max-w-sm">
                <div className="bg-card backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl overflow-hidden">
                  {/* Header Section */}
                  <div className="text-center px-8 pt-8 pb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-muted/30 rounded-full mb-6">
                      <HugeiconsIcon icon={Crown02Icon} size={28} className="text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground mb-3 tracking-tight">Daily limit reached</h2>
                  </div>

                  {/* Content Section */}
                  <div className="text-center px-8 pb-8">
                    <div className="space-y-4 mb-8">
                      <p className="text-base text-foreground leading-relaxed font-medium">
                        You&apos;ve used all{' '}
                        <span className="text-primary font-semibold">{SEARCH_LIMITS.DAILY_SEARCH_LIMIT}</span> searches
                        for today
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                        Upgrade to Pro for unlimited searches, faster responses, and premium features
                      </p>
                    </div>

                    {/* Actions Section */}
                    <div className="space-y-3">
                      <Button
                        onClick={() => {
                          window.location.href = '/pricing';
                        }}
                        className="w-full h-11 font-semibold text-base"
                      >
                        <HugeiconsIcon icon={Crown02Icon} size={18} className="mr-2.5" strokeWidth={1.5} />
                        Upgrade to Pro
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          refetchUsage();
                        }}
                        className="w-full h-10 text-muted-foreground hover:text-foreground font-medium"
                      >
                        Try refreshing
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Use the Messages component */}
            {messages.length > 0 && (
              <Messages
                messages={messages as ChatMessage[]}
                lastUserMessageIndex={lastUserMessageIndex}
                input={input}
                setInput={setInput}
                setMessages={(messages) => {
                  setMessages(messages as ChatMessage[]);
                }}
                sendMessage={sendMessage}
                regenerate={regenerate}
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
                onHighlight={handleHighlight}
              />
            )}

            <div ref={bottomRef} />
          </div>

          {/* Single Form Component with dynamic positioning */}
          {((user && isOwner) || !initialChatId || (!user && chatState.selectedVisibilityType === 'private')) &&
            !isLimitBlocked && (
              <div
                className={cn(
                  'transition-all duration-500 bg-bottom bg-background',
                  messages.length === 0 && !chatState.hasSubmitted
                    ? 'relative max-w-2xl mx-auto w-full rounded-xl'
                    : 'fixed bottom-0 left-0 right-0 z-20 !pb-6 mt-1 mx-4 sm:mx-2 p-0',
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
                  fileInputRef={fileInputRef}
                  inputRef={inputRef}
                  stop={stop}
                  messages={messages as ChatMessage[]}
                  sendMessage={sendMessage}
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
              <div className="p-3 bg-muted/30 dark:bg-muted/20 border border-border/60 dark:border-border/60 rounded-lg shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={Crown02Icon}
                      size={14}
                      color="currentColor"
                      strokeWidth={1.5}
                      className="text-muted-foreground dark:text-muted-foreground"
                    />
                    <span className="text-sm text-foreground dark:text-foreground">
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
                      className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-primary-foreground dark:text-primary-foreground"
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
