/* eslint-disable @next/next/no-img-element */
'use client';

// CSS imports
import 'katex/dist/katex.min.css';

// React and React-related imports
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Third-party library imports
import { useChat, UseChatOptions } from '@ai-sdk/react';
import { Crown } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// Internal app imports
import { getCurrentUser, suggestQuestions, updateChatVisibility, getSubDetails } from '@/app/actions';

// Component imports
import { ChatHistoryDialog } from '@/components/chat-history-dialog';
import Messages from '@/components/messages';
import { Navbar } from '@/components/navbar';
import { SignInPromptDialog } from '@/components/sign-in-prompt-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import FormComponent from '@/components/ui/form-component';
import { TooltipProvider } from '@/components/ui/tooltip';

// Hook imports
import { useAutoResume } from '@/hooks/use-auto-resume';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useUsageData } from '@/hooks/use-usage-data';
import { useProUserStatus } from '@/hooks/use-user-data';

// Utility and type imports
import { SEARCH_LIMITS } from '@/lib/constants';
import { User } from '@/lib/db/schema';
import { ChatSDKError } from '@/lib/errors';
import { cn, SearchGroupId, invalidateChatsCache } from '@/lib/utils';

interface Attachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
}

// Add new component for post-message upgrade dialog
const PostMessageUpgradeDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 border border-neutral-200/60 dark:border-neutral-800/60 shadow-xl">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                <Crown className="w-4 h-4 text-white dark:text-black" weight="fill" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Upgrade to Scira Pro</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Get unlimited access to all features</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Unlimited searches</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">No daily limits or restrictions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Premium AI models</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Claude 4 Opus, Grok 3, GPT-4o and more</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">PDF analysis</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Upload and analyze documents</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-medium text-neutral-900 dark:text-neutral-100">$15</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">/month</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Cancel anytime</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-9 text-sm font-normal border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Maybe later
            </Button>
            <Button
              onClick={() => {
                window.location.href = '/pricing';
              }}
              className="flex-1 h-9 text-sm font-normal bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black"
            >
              Upgrade now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
  }: ChatInterfaceProps): JSX.Element => {
    const router = useRouter();
    const [query] = useQueryState('query', parseAsString.withDefault(''));
    const [q] = useQueryState('q', parseAsString.withDefault(''));

    // Use localStorage hook directly for model selection with a default
    const [selectedModel, setSelectedModel] = useLocalStorage('scira-selected-model', 'scira-default');
    const { user, subscriptionData, isProUser: isUserPro, isLoading: proStatusLoading, shouldCheckLimits: shouldCheckUserLimits } = useProUserStatus();

    const initialState = useMemo(
      () => ({
        query: query || q,
      }),
      [query, q],
    );

    const lastSubmittedQueryRef = useRef(initialState.query);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const initializedRef = useRef(false);
    const [selectedGroup, setSelectedGroup] = useLocalStorage<SearchGroupId>('scira-selected-group', 'web');
    const [hasSubmitted, setHasSubmitted] = React.useState(false);
    const [hasManuallyScrolled, setHasManuallyScrolled] = useState(false);
    const isAutoScrollingRef = useRef(false);
    
    // Use clean React Query hooks for all data fetching
    const { data: usageData, refetch: refetchUsage } = useUsageData(user || null);

    // Generate random UUID once for greeting selection
    const greetingUuidRef = useRef<string>(uuidv4());

    // Add upgrade dialog state
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [hasShownUpgradeDialog, setHasShownUpgradeDialog] = useLocalStorage('scira-upgrade-prompt-shown', false);

    // Memoized greeting to prevent flickering
    const personalizedGreeting = useMemo(() => {
      if (!user?.name) return 'What do you want to explore?';

      const firstName = user.name.trim().split(' ')[0];
      if (!firstName) return 'What do you want to explore?';

      // Show upgrade message when upgrade dialog is displayed
      if (showUpgradeDialog) {
        return `Hey ${firstName}, Time to go Pro!`;
      }

      const greetings = [
        `Hey ${firstName}! Let's dive in!`,
        `${firstName}, what's the question?`,
        `Ready ${firstName}? Ask me anything!`,
        `Go ahead ${firstName}, I'm listening!`,
        `${firstName}, fire away!`,
        `What's cooking, ${firstName}?`,
        `${firstName}, let's explore together!`,
        `Hit me ${firstName}!`,
        `${firstName}, what's the mystery?`,
        `Shoot ${firstName}, what's up?`,
      ];

      // Use user ID + random UUID for truly random but stable greeting
      const seed = user.id + greetingUuidRef.current;
      const seedHash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return greetings[seedHash % greetings.length];
    }, [user?.name, user?.id, showUpgradeDialog]);

    // Sign-in prompt dialog state
    const [showSignInPrompt, setShowSignInPrompt] = useState(false);
    const [hasShownSignInPrompt, setHasShownSignInPrompt] = useLocalStorage('scira-signin-prompt-shown', false);
    const signInTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Generate a consistent ID for new chats
    const chatId = useMemo(() => initialChatId ?? uuidv4(), [initialChatId]);

    // Pro users bypass all limit checks - much cleaner!
    // Only check limits when we're not loading Pro status (prevents flash of limit UI)
    const hasExceededLimit = shouldCheckUserLimits && !proStatusLoading && usageData && usageData.count >= SEARCH_LIMITS.DAILY_SEARCH_LIMIT;
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
        setHasShownSignInPrompt(false);
        return;
      }

      // Only start timer if user is not authenticated and hasn't been shown the prompt yet
      if (!user && !hasShownSignInPrompt) {
        // Clear any existing timer
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
        }

        // Set timer for 1 minute (60000 ms)
        // For testing, you can reduce this to a shorter time like 5000 ms (5 seconds)
        signInTimerRef.current = setTimeout(() => {
          setShowSignInPrompt(true);
          setHasShownSignInPrompt(true);
        }, 60000);
      }

      // Cleanup timer on unmount
      return () => {
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
        }
      };
    }, [user, hasShownSignInPrompt, setHasShownSignInPrompt]);

    type VisibilityType = 'public' | 'private';

    const [selectedVisibilityType, setSelectedVisibilityType] = useState<VisibilityType>(initialVisibility);

    const chatOptions: UseChatOptions = useMemo(
      () => ({
        id: chatId,
        api: '/api/search',
        experimental_throttle: 500,
        sendExtraMessageFields: true,
        maxSteps: 5,
        body: {
          id: chatId,
          model: selectedModel,
          group: selectedGroup,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...(initialChatId ? { chat_id: initialChatId } : {}),
          selectedVisibilityType,
        },
        onFinish: async (message, { finishReason }) => {
          console.log('[finish reason]:', finishReason);

          // Refresh usage data after message completion for authenticated users
          if (user) {
            refetchUsage();
          }

          // Check if this is the first message completion and user is not Pro
          // messages.length will be 1 (just the user message) when the first assistant response completes
          const isFirstMessage = messages.length <= 1;

          console.log('Upgrade dialog check:', {
            isFirstMessage,
            isProUser: isUserPro,
            hasShownUpgradeDialog,
            user: !!user,
            messagesLength: messages.length,
          });

          // Show upgrade dialog after first message if user is not Pro and hasn't seen it before
          if (isFirstMessage && !isUserPro && !hasShownUpgradeDialog && user) {
            console.log('Showing upgrade dialog...');
            setTimeout(() => {
              setShowUpgradeDialog(true);
              setHasShownUpgradeDialog(true);
            }, 1000); // Reduced delay for testing
          }

          // Only generate suggested questions if authenticated user or private chat
          if (
            message.content &&
            (finishReason === 'stop' || finishReason === 'length') &&
            (user || selectedVisibilityType === 'private')
          ) {
            const newHistory = [
              { role: 'user', content: lastSubmittedQueryRef.current },
              { role: 'assistant', content: message.content },
            ];
            const { questions } = await suggestQuestions(newHistory);
            setSuggestedQuestions(questions);
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
      [selectedModel, selectedGroup, chatId, initialChatId, initialMessages, selectedVisibilityType],
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
          !suggestedQuestions.length &&
          (user || selectedVisibilityType === 'private') &&
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
              setSuggestedQuestions(questions);
            } catch (error) {
              console.error('Error generating suggested questions:', error);
            }
          }
        }
      };

      generateSuggestionsForInitialMessages();
    }, [initialMessages, suggestedQuestions.length, status, user, selectedVisibilityType]);

    // Reset suggested questions when status changes to streaming
    useEffect(() => {
      if (status === 'streaming') {
        // Clear suggested questions when a new message is being streamed
        setSuggestedQuestions([]);
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
        setHasManuallyScrolled(false);
        // Initial scroll to bottom when streaming starts
        if (bottomRef.current) {
          isAutoScrollingRef.current = true;
          bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, [status]);

    useEffect(() => {
      let scrollTimeout: NodeJS.Timeout;

      const handleScroll = () => {
        // Clear any pending timeout
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }

        // If we're not auto-scrolling and we're streaming, it must be a user scroll
        if (!isAutoScrollingRef.current && status === 'streaming') {
          const isAtBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
          if (!isAtBottom) {
            setHasManuallyScrolled(true);
          }
        }
      };

      window.addEventListener('scroll', handleScroll);

      // Auto-scroll on new content if we haven't manually scrolled
      if (status === 'streaming' && !hasManuallyScrolled && bottomRef.current) {
        scrollTimeout = setTimeout(() => {
          isAutoScrollingRef.current = true;
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          // Reset auto-scroll flag after animation
          setTimeout(() => {
            isAutoScrollingRef.current = false;
          }, 100);
        }, 100);
      }

      return () => {
        window.removeEventListener('scroll', handleScroll);
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
      };
    }, [messages, suggestedQuestions, status, hasManuallyScrolled]);

    // Dialog management state
    const [commandDialogOpen, setCommandDialogOpen] = useState(false);
    const [anyDialogOpen, setAnyDialogOpen] = useState(false);

    useEffect(() => {
      // Track the command dialog state in our broader dialog tracking
      setAnyDialogOpen(commandDialogOpen);
    }, [commandDialogOpen]);

    // Keyboard shortcut for command dialog
    useEffect(() => {
      const down = (e: KeyboardEvent) => {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          setCommandDialogOpen((open) => !open);
        }
      };

      document.addEventListener('keydown', down);
      return () => document.removeEventListener('keydown', down);
    }, []);

    // Define the model change handler
    const handleModelChange = useCallback(
      (model: string) => {
        setSelectedModel(model);
      },
      [setSelectedModel],
    );

    const resetSuggestedQuestions = useCallback(() => {
      setSuggestedQuestions([]);
    }, []);

    // Handle visibility change
    const handleVisibilityChange = useCallback(
      async (visibility: VisibilityType) => {
        if (!chatId) return;

        try {
          await updateChatVisibility(chatId, visibility);
          setSelectedVisibilityType(visibility);
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
      <TooltipProvider>
        <div className="flex flex-col font-sans! items-center min-h-screen bg-background text-foreground transition-all duration-500">
          <Navbar
            isDialogOpen={anyDialogOpen}
            chatId={initialChatId || (messages.length > 0 ? chatId : null)}
            selectedVisibilityType={selectedVisibilityType}
            onVisibilityChange={handleVisibilityChange}
            status={status}
            user={user}
            onHistoryClick={() => setCommandDialogOpen(true)}
            isOwner={isOwner}
            subscriptionData={subscriptionData}
            isProUser={isUserPro}
            isProStatusLoading={proStatusLoading}
          />

          {/* Chat History Dialog */}
          <ChatHistoryDialog
            open={commandDialogOpen}
            onOpenChange={(open) => {
              setCommandDialogOpen(open);
              setAnyDialogOpen(open);
            }}
            user={user}
          />

          {/* Sign-in Prompt Dialog */}
          <SignInPromptDialog
            open={showSignInPrompt}
            onOpenChange={(open) => {
              setShowSignInPrompt(open);
              if (!open) {
                setHasShownSignInPrompt(true);
              }
            }}
          />

          {/* Post-Message Upgrade Dialog */}
          <PostMessageUpgradeDialog
            open={showUpgradeDialog}
            onOpenChange={(open) => {
              setShowUpgradeDialog(open);
              if (!open) {
                setHasShownUpgradeDialog(true);
              }
            }}
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
                <div className="text-center">
                  <h1 className="text-2xl sm:text-4xl mb-4 sm:mb-6 text-neutral-800 dark:text-neutral-100 font-syne!">
                    {user ? personalizedGreeting : 'What do you want to explore?'}
                  </h1>
                </div>
              )}

              {messages.length === 0 &&
                !hasSubmitted &&
                // Show initial form only if:
                // 1. User is authenticated AND owns the chat, OR
                // 2. It's a new chat (no initialChatId), OR
                // 3. User is not authenticated but it's a private chat (anonymous private session)
                ((user && isOwner) || !initialChatId || (!user && selectedVisibilityType === 'private')) &&
                !isLimitBlocked && (
                  <div className={cn('mt-4!')}>
                    <FormComponent
                      chatId={chatId}
                      user={user!}
                      subscriptionData={subscriptionData}
                      input={input}
                      setInput={setInput}
                      attachments={attachments}
                      setAttachments={setAttachments}
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
                      showExperimentalModels={true}
                      status={status}
                      setHasSubmitted={setHasSubmitted}
                      isLimitBlocked={isLimitBlocked}
                    />
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
                  suggestedQuestions={suggestedQuestions}
                  setSuggestedQuestions={setSuggestedQuestions}
                  status={status}
                  error={error ?? null}
                  user={user}
                  selectedVisibilityType={selectedVisibilityType}
                  chatId={initialChatId || (messages.length > 0 ? chatId : undefined)}
                  onVisibilityChange={handleVisibilityChange}
                  initialMessages={initialMessages}
                  isOwner={isOwner}
                />
              )}

              <div ref={bottomRef} />
            </div>

            {/* Only show form if user owns the chat OR it's a new private chat */}
            {(messages.length > 0 || hasSubmitted) &&
              // Show form only if:
              // 1. User is authenticated AND owns the chat, OR
              // 2. It's a private chat with no initial chat ID (new chat), OR
              // 3. User is not authenticated but it's a private chat (anonymous private session)
              ((user && isOwner) ||
                (selectedVisibilityType === 'private' && !initialChatId) ||
                (!user && selectedVisibilityType === 'private')) &&
              !isLimitBlocked && (
                <div className="fixed bottom-8 sm:bottom-4 left-0 right-0 w-full max-w-[95%] sm:max-w-2xl mx-auto z-20">
                  <FormComponent
                    chatId={chatId}
                    input={input}
                    user={user!}
                    subscriptionData={subscriptionData}
                    setInput={setInput}
                    attachments={attachments}
                    setAttachments={setAttachments}
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
                    showExperimentalModels={false}
                    status={status}
                    setHasSubmitted={setHasSubmitted}
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
      </TooltipProvider>
    );
  },
);

// Add a display name for the memoized component for better debugging
ChatInterface.displayName = 'ChatInterface';

export { ChatInterface };
