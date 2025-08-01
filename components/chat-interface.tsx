'use client';

import 'katex/dist/katex.min.css';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useReducer } from 'react';

import { useChat, UseChatOptions } from '@ai-sdk/react';
import { Crown } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { suggestQuestions, updateChatVisibility } from '@/app/actions';

import { ChatDialogs } from '@/components/chat-dialogs';
import Messages from '@/components/messages';
import { Button } from '@/components/ui/button';
import FormComponent from '@/components/ui/form-component';

import { useAutoResume } from '@/hooks/use-auto-resume';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useUsageData } from '@/hooks/use-usage-data';
import { useProUserStatus } from '@/hooks/use-user-data';
import { useOptimizedScroll } from '@/hooks/use-optimized-scroll';

import { SEARCH_LIMITS } from '@/lib/constants';
import { ChatSDKError } from '@/lib/errors';
import { cn, SearchGroupId, invalidateChatsCache } from '@/lib/utils';

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
  onHistoryClick?: () => void;
  commandDialogOpen?: boolean;
  setCommandDialogOpen?: (open: boolean) => void;
}

const ChatInterface = memo(
  ({
    initialChatId,
    initialMessages,
    initialVisibility = 'private',
    isOwner = true,
    onHistoryClick,
    commandDialogOpen: externalCommandDialogOpen,
    setCommandDialogOpen: externalSetCommandDialogOpen,
  }: ChatInterfaceProps): React.JSX.Element => {
    const router = useRouter();
    const [query] = useQueryState('query', parseAsString.withDefault(''));
    const [q] = useQueryState('q', parseAsString.withDefault(''));

    const [selectedModel, setSelectedModel] = useLocalStorage('atlas-selected-model', 'atlas-default');
    const [selectedGroup, setSelectedGroup] = useLocalStorage<SearchGroupId>('atlas-selected-group', 'web');
    const [isCustomInstructionsEnabled, setIsCustomInstructionsEnabled] = useLocalStorage(
      'atlas-custom-instructions-enabled',
      true,
    );

    const [persistedHasShownUpgradeDialog, setPersitedHasShownUpgradeDialog] = useLocalStorage(
      'atlas-upgrade-prompt-shown',
      false,
    );
    const [persistedHasShownSignInPrompt, setPersitedHasShownSignInPrompt] = useLocalStorage(
      'atlas-signin-prompt-shown',
      false,
    );

    const [chatState, dispatch] = useReducer(
      chatReducer,
      createInitialState(
        initialVisibility,
        persistedHasShownUpgradeDialog,
        persistedHasShownSignInPrompt,
        externalCommandDialogOpen || false,
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

    const { isAtBottom, hasManuallyScrolled, scrollToElement, resetManualScroll } = useOptimizedScroll(bottomRef, {
      enabled: true,
      threshold: 100,
      behavior: 'smooth',
      debounceMs: 100,
    });

    const { data: usageData, refetch: refetchUsage } = useUsageData(user || null);

    const signInTimerRef = useRef<NodeJS.Timeout | null>(null);

    const chatId = useMemo(() => initialChatId ?? uuidv4(), [initialChatId]);

    const shouldBypassLimits = shouldBypassLimitsForModel(selectedModel);
    const hasExceededLimit =
      shouldCheckUserLimits &&
      !proStatusLoading &&
      !shouldBypassLimits &&
      usageData &&
      usageData.count >= SEARCH_LIMITS.DAILY_SEARCH_LIMIT;
    const isLimitBlocked = Boolean(hasExceededLimit);

    useEffect(() => {
      if (user) {
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
          signInTimerRef.current = null;
        }
        setPersitedHasShownSignInPrompt(false);
        return;
      }

      if (!user && !chatState.hasShownSignInPrompt) {
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
        }

        signInTimerRef.current = setTimeout(() => {
          dispatch({ type: 'SET_SHOW_SIGNIN_PROMPT', payload: true });
          dispatch({ type: 'SET_HAS_SHOWN_SIGNIN_PROMPT', payload: true });
          setPersitedHasShownSignInPrompt(true);
        }, 60000);
      }

      return () => {
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
        }
      };
    }, [user, chatState.hasShownSignInPrompt, setPersitedHasShownSignInPrompt]);

    type VisibilityType = 'public' | 'private';

    const chatOptions: UseChatOptions = useMemo(
      () => ({
        id: chatId,
        api: '/api/search',
        experimental_throttle: selectedModel === 'atlas-anthropic' ? 1000 : 100,
        sendExtraMessageFields: true,
        maxSteps: 3,
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

          if (user) {
            refetchUsage();
          }

          const isFirstMessage = messages.length <= 1;

          console.log('Upgrade dialog check:', {
            isFirstMessage,
            isProUser: isUserPro,
            hasShownUpgradeDialog: chatState.hasShownUpgradeDialog,
            user: !!user,
            messagesLength: messages.length,
          });

          if (isFirstMessage && !isUserPro && !proStatusLoading && !chatState.hasShownUpgradeDialog && user) {
            console.log('Showing upgrade dialog...');
            setTimeout(() => {
              dispatch({ type: 'SET_SHOW_UPGRADE_DIALOG', payload: true });
              dispatch({ type: 'SET_HAS_SHOWN_UPGRADE_DIALOG', payload: true });
              setPersitedHasShownUpgradeDialog(true);
            }, 1000);
          }

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
          if (error instanceof ChatSDKError) {
            console.log('ChatSDK Error:', error.type, error.surface, error.message);
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

    useEffect(() => {
      const generateSuggestionsForInitialMessages = async () => {
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

    useEffect(() => {
      if (status === 'streaming') {
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
      if (status === 'streaming') {
        resetManualScroll();
        scrollToElement();
      }
    }, [status, resetManualScroll, scrollToElement]);

    useEffect(() => {
      if (status === 'streaming' && (isAtBottom || !hasManuallyScrolled)) {
        scrollToElement();
      } else if (
        messages.length > 0 &&
        chatState.suggestedQuestions.length > 0 &&
        (isAtBottom || !hasManuallyScrolled)
      ) {
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

    useEffect(() => {
      dispatch({
        type: 'SET_ANY_DIALOG_OPEN',
        payload: chatState.commandDialogOpen || chatState.showSignInPrompt || chatState.showUpgradeDialog,
      });
    }, [chatState.commandDialogOpen, chatState.showSignInPrompt, chatState.showUpgradeDialog]);

    useEffect(() => {
      const down = (e: KeyboardEvent) => {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (externalSetCommandDialogOpen) {
            externalSetCommandDialogOpen(!externalCommandDialogOpen);
          } else {
            dispatch({ type: 'SET_COMMAND_DIALOG_OPEN', payload: !chatState.commandDialogOpen });
          }
        }
      };

      document.addEventListener('keydown', down);
      return () => document.removeEventListener('keydown', down);
    }, [chatState.commandDialogOpen, externalCommandDialogOpen, externalSetCommandDialogOpen]);

    const handleModelChange = useCallback(
      (model: string) => {
        setSelectedModel(model);
      },
      [setSelectedModel],
    );

    const resetSuggestedQuestions = useCallback(() => {
      dispatch({ type: 'RESET_SUGGESTED_QUESTIONS' });
    }, []);

    const handleVisibilityChange = useCallback(
      async (visibility: VisibilityType) => {
        if (!chatId) return;

        try {
          await updateChatVisibility(chatId, visibility);
          dispatch({ type: 'SET_VISIBILITY_TYPE', payload: visibility });
          toast.success(`Chat is now ${visibility}`);
          invalidateChatsCache();
        } catch (error) {
          console.error('Error updating chat visibility:', error);
          toast.error('Failed to update chat visibility');
        }
      },
      [chatId],
    );

    return (
      <div className="flex flex-col font-sans! items-center h-full bg-background text-foreground transition-all duration-500 w-full overflow-x-hidden !scrollbar-thin !scrollbar-thumb-muted-foreground dark:!scrollbar-thumb-muted-foreground !scrollbar-track-transparent hover:!scrollbar-thumb-foreground dark:!hover:scrollbar-thumb-foreground">
        <ChatDialogs
          commandDialogOpen={
            externalCommandDialogOpen !== undefined ? externalCommandDialogOpen : chatState.commandDialogOpen
          }
          setCommandDialogOpen={(open) => {
            if (externalSetCommandDialogOpen) {
              externalSetCommandDialogOpen(open);
            } else {
              dispatch({ type: 'SET_COMMAND_DIALOG_OPEN', payload: open });
            }
          }}
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
          user={user}
          setAnyDialogOpen={(open) => dispatch({ type: 'SET_ANY_DIALOG_OPEN', payload: open })}
        />

        <div
          className={`w-full p-2 sm:p-4 flex-1 flex flex-col ${
            status === 'ready' && messages.length === 0
              ? 'items-center justify-center' // Center everything when no messages
              : '' // Normal flow when messages exist
          }`}
        >
          <div className={`w-full max-w-[95%] sm:max-w-2xl space-y-6 p-0 mx-auto transition-all duration-300`}>
            {status === 'ready' && messages.length === 0 && (
              <div className="text-center m-0 mb-2">
                <h1 className="text-3xl sm:text-5xl !mb-0 text-foreground dark:text-foreground font-be-vietnam-pro! font-light tracking-tighter">
                  atlas
                </h1>
              </div>
            )}

            {status === 'ready' && messages.length === 0 && isLimitBlocked && (
              <div className="mt-8 p-6 bg-muted/30 dark:bg-muted/20 border border-border/60 dark:border-border/60 rounded-xl max-w-lg mx-auto">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground dark:text-muted-foreground">
                    <Crown className="h-4 w-4" />
                    <span className="text-sm font-medium">Daily limit reached</span>
                  </div>
                  <div>
                    <p className="text-foreground dark:text-foreground mb-2">
                      You&apos;ve used all {SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches for today.
                    </p>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
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
                      className="flex-1 bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-primary-foreground dark:text-primary-foreground"
                    >
                      <Crown className="h-3 w-3 mr-1.5" />
                      Upgrade
                    </Button>
                  </div>
                </div>
              </div>
            )}

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

          {((user && isOwner) || !initialChatId || (!user && chatState.selectedVisibilityType === 'private')) &&
            !isLimitBlocked && (
              <div
                className={cn(
                  'transition-all duration-500 w-full max-w-[95%] sm:max-w-2xl mx-auto',
                  messages.length === 0 && !chatState.hasSubmitted
                    ? 'mt-8' // Add some margin when centered
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

          {isLimitBlocked && messages.length > 0 && (
            <div className="fixed bottom-8 sm:bottom-4 left-0 right-0 w-full max-w-[95%] sm:max-w-2xl mx-auto z-20">
              <div className="p-3 bg-muted/30 dark:bg-muted/20 border border-border/60 dark:border-border/60 rounded-lg shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-3.5 w-3.5 text-muted-foreground dark:text-muted-foreground" />
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

ChatInterface.displayName = 'ChatInterface';

export { ChatInterface };
