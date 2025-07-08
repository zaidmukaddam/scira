/* eslint-disable @next/next/no-img-element */
'use client';

// CSS imports
import 'katex/dist/katex.min.css';

// React and React-related imports
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Third-party library imports
import { useChat, UseChatOptions } from '@ai-sdk/react';
import { Crown, Sparkle } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// gt-next imports
import { T, useGT, Branch, Var, Currency } from 'gt-next';

// Internal app imports
import { suggestQuestions, updateChatVisibility } from '@/app/actions';

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
import { ChatSDKError } from '@/lib/errors';
import { cn, SearchGroupId, invalidateChatsCache } from '@/lib/utils';

interface Attachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
}

// Add new component for changelog dialog
const ChangelogDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="text-center space-y-4 mb-8">
            <div className="w-10 h-10 rounded-lg bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center mx-auto">
              <Sparkle className="w-5 h-5 text-neutral-100 dark:text-neutral-900" weight="fill" />
            </div>
            <div className="space-y-3">
              <T><h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Free Unlimited Models</h2></T>
              <T><p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed max-w-xs mx-auto">
                Grok 3 Mini and Grok 2 Vision are now unlimited for registered users.
              </p></T>
            </div>
          </div>

          {/* Action */}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-10 text-sm font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-neutral-100 dark:text-neutral-900 transition-colors"
          >
            <T>Got it</T>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Add new component for launch badge
const LaunchBadge = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  if (!open) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3 max-w-xs">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <img 
              src="/Launch_SVG_Dark.svg" 
              alt="Launch" 
              className="w-8 h-8 hidden dark:block"
            />
            <img 
              src="/Launch_SVG_Light.svg" 
              alt="Launch" 
              className="w-8 h-8 block dark:hidden"
            />
          </div>
          <div className="flex-1 min-w-0">
            <T><p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Launched on Peerlist!
            </p></T>
            <T><p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Check out our project showcase
            </p></T>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <a
            href="https://peerlist.io/zaidmukaddam/project/scira-ai-20"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-3 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-neutral-100 dark:text-neutral-900 rounded-md transition-colors"
            onClick={() => onOpenChange(false)}
          >
            <T>View Project</T>
          </a>
        </div>
      </div>
    </div>
  );
};

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
                <T><h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Upgrade to Scira Pro</h2></T>
                <T><p className="text-sm text-neutral-500 dark:text-neutral-400">Get unlimited access to all features</p></T>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 flex-shrink-0"></div>
              <div>
                <T><p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Unlimited searches</p></T>
                <T><p className="text-xs text-neutral-500 dark:text-neutral-400">No daily limits or restrictions</p></T>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 flex-shrink-0"></div>
              <div>
                <T><p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Premium AI models</p></T>
                <T><p className="text-xs text-neutral-500 dark:text-neutral-400">Claude 4 Opus, Grok 3, GPT-4o and more</p></T>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 flex-shrink-0"></div>
              <div>
                <T><p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">PDF analysis</p></T>
                <T><p className="text-xs text-neutral-500 dark:text-neutral-400">Upload and analyze documents</p></T>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-medium text-neutral-900 dark:text-neutral-100">
                <Currency options={{
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }}>
                  {15}
                </Currency>
              </span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">/month</span>
            </div>
            <T><p className="text-xs text-neutral-500 dark:text-neutral-400">Cancel anytime</p></T>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-9 text-sm font-normal border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <T>Maybe later</T>
            </Button>
            <Button
              onClick={() => {
                window.location.href = '/pricing';
              }}
              className="flex-1 h-9 text-sm font-normal bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black"
            >
              <T>Upgrade now</T>
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
  }: ChatInterfaceProps): React.JSX.Element => {
    const router = useRouter();
    const [query] = useQueryState('query', parseAsString.withDefault(''));
    const [q] = useQueryState('q', parseAsString.withDefault(''));
    const t = useGT();

    // Use localStorage hook directly for model selection with a default
    const [selectedModel, setSelectedModel] = useLocalStorage('scira-selected-model', 'scira-default');
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
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null!);
    const inputRef = useRef<HTMLTextAreaElement>(null!);
    const initializedRef = useRef(false);
    const [selectedGroup, setSelectedGroup] = useLocalStorage<SearchGroupId>('scira-selected-group', 'web');
    const [hasSubmitted, setHasSubmitted] = React.useState(false);
    const [hasManuallyScrolled, setHasManuallyScrolled] = useState(false);
    const isAutoScrollingRef = useRef(false);

    // Use clean React Query hooks for all data fetching
    const { data: usageData, refetch: refetchUsage } = useUsageData(user || null);

    // Add upgrade dialog state
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [hasShownUpgradeDialog, setHasShownUpgradeDialog] = useLocalStorage('scira-upgrade-prompt-shown', false);

    // Add changelog dialog state
    const [showChangelogDialog, setShowChangelogDialog] = useState(false);
    const [hasShownChangelogDialog, setHasShownChangelogDialog] = useLocalStorage('scira-changelog-shown', false);

    // Add launch badge state
    const [showLaunchBadge, setShowLaunchBadge] = useState(false);
    const [hasShownLaunchBadge, setHasShownLaunchBadge] = useLocalStorage('scira-launch-badge-shown', false);

    // Sign-in prompt dialog state
    const [showSignInPrompt, setShowSignInPrompt] = useState(false);
    const [hasShownSignInPrompt, setHasShownSignInPrompt] = useLocalStorage('scira-signin-prompt-shown', false);
    const signInTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Generate a consistent ID for new chats
    const chatId = useMemo(() => initialChatId ?? uuidv4(), [initialChatId]);

    // Pro users bypass all limit checks - much cleaner!
    // Only check limits when we're not loading Pro status (prevents flash of limit UI)
    // Also bypass limits for registered users using free unlimited models
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

    // Show changelog dialog to registered free users
    useEffect(() => {
      // Show changelog to registered free users who haven't seen it yet
      if (user && !isUserPro && !hasShownChangelogDialog && !proStatusLoading) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          setShowChangelogDialog(true);
        }, 500);
      }
    }, [user, isUserPro, hasShownChangelogDialog, proStatusLoading]);

    // Show launch badge to all users who haven't seen it yet
    useEffect(() => {
      if (!hasShownLaunchBadge) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          setShowLaunchBadge(true);
        }, 1000);
      }
    }, [hasShownLaunchBadge]);

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
              toast.error(t('Connection Error'), {
                description: error.message,
              });
            }
          } else {
            toast.error(t('An error occurred.'), {
              description: t('Oops! An error occurred while processing your request. {error}', {
                error: error.cause || error.message
              }),
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
          toast.success(t('Chat is now {visibility}', { visibility }));
          // Invalidate cache to refresh the list with updated visibility
          invalidateChatsCache();
        } catch (error) {
          console.error('Error updating chat visibility:', error);
          toast.error(t('Failed to update chat visibility'));
        }
      },
      [chatId],
    );

    return (
      <div className="flex flex-col font-sans! items-center min-h-screen bg-background text-foreground transition-all duration-500 w-full overflow-x-hidden !scrollbar-thin !scrollbar-thumb-neutral-300 dark:!scrollbar-thumb-neutral-700 !scrollbar-track-transparent hover:!scrollbar-thumb-neutral-400 dark:!hover:scrollbar-thumb-neutral-600">
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

        {/* Changelog Dialog */}
        <ChangelogDialog
          open={showChangelogDialog}
          onOpenChange={(open) => {
            setShowChangelogDialog(open);
            if (!open) {
              setHasShownChangelogDialog(true);
            }
          }}
        />

        {/* Launch Badge */}
        <LaunchBadge
          open={showLaunchBadge}
          onOpenChange={(open) => {
            setShowLaunchBadge(open);
            if (!open) {
              setHasShownLaunchBadge(true);
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
                    <T><span className="text-sm font-medium">Daily limit reached</span></T>
                  </div>
                  <div>
                    <T><p className="text-neutral-700 dark:text-neutral-300 mb-2">
                      You&apos;ve used all <Var>{SEARCH_LIMITS.DAILY_SEARCH_LIMIT}</Var> searches for today.
                    </p></T>
                    <T><p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Upgrade to continue with unlimited searches and premium features.
                    </p></T>
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
                      <T>Refresh</T>
                    </Button>
                    <Button
                      onClick={() => {
                        window.location.href = '/pricing';
                      }}
                      size="sm"
                      className="flex-1 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black"
                    >
                      <Crown className="h-3 w-3 mr-1.5" />
                      <T>Upgrade</T>
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

          {/* Single Form Component with dynamic positioning */}
          {((user && isOwner) || !initialChatId || (!user && selectedVisibilityType === 'private')) &&
            !isLimitBlocked && (
              <div
                className={cn(
                  'transition-all duration-500 w-full max-w-[95%] sm:max-w-2xl mx-auto',
                  messages.length === 0 && !hasSubmitted
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
                  showExperimentalModels={messages.length === 0}
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
                    <T><span className="text-sm text-neutral-700 dark:text-neutral-300">
                      Daily limit reached (<Var>{SEARCH_LIMITS.DAILY_SEARCH_LIMIT}</Var> searches used)
                    </span></T>
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
                      <T>Refresh</T>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        window.location.href = '/pricing';
                      }}
                      className="h-7 px-3 text-xs bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black"
                    >
                      <T>Upgrade</T>
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
