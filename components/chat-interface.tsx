'use client';
 

// React and React-related imports
import React, { memo, useCallback, useEffect, useMemo, useRef, useReducer, useState } from 'react';
import Link from 'next/link';

// Third-party library imports
import { useChat } from '@ai-sdk/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import { Crown02Icon, UserCircleIcon } from '@hugeicons/core-free-icons';
import { PlusIcon } from '@phosphor-icons/react';
import { useRouter, usePathname } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { sileo } from 'sileo';
import { v7 as uuidv7 } from 'uuid';

// Internal app imports
import { suggestQuestions, updateChatVisibility, getChatMeta } from '@/app/actions';

// Component imports
import { ChatDialogs } from '@/components/chat-dialogs';
import Messages from '@/components/messages';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, useSidebar, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import FormComponent from '@/components/ui/form-component';
import { ShareDialog } from '@/components/share/share-dialog';
import { ExampleCategories } from '@/components/example-categories';
import {
  Pencil,
  Trash2,
  Share as ShareIcon,
  ChevronDown,
  X,
  Check,
  AlertCircle,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { deleteChat, updateChatTitle } from '@/app/actions';
import { ButtonGroup } from '@/components/ui/button-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

// Hook imports
import { useAutoResume } from '@/hooks/use-auto-resume';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useUsageData } from '@/hooks/use-usage-data';
import { useUser } from '@/contexts/user-context';
import { useOptimizedScroll } from '@/hooks/use-optimized-scroll';
import { useSyncedPreferences } from '@/hooks/use-synced-preferences';

// Utility and type imports
import { SEARCH_LIMITS } from '@/lib/constants';
import { ChatSDKError } from '@/lib/errors';
import { cn, SearchGroupId } from '@/lib/utils';
import { requiresProSubscription } from '@/ai/models';
import { ConnectorProvider } from '@/lib/connectors';

// State management imports
import { chatReducer, createInitialState } from '@/components/chat-state';
import { useDataStream } from './data-stream-provider';
import { DefaultChatTransport } from 'ai';
import { ChatMessage } from '@/lib/types';
import type { ElicitationData } from '@/components/mcp-elicitation-modal';

interface ChatInterfaceProps {
  initialChatId?: string;
  initialMessages?: any[];
  initialVisibility?: 'public' | 'private';
  isOwner?: boolean;
  chatTitle?: string;
}

interface AutoRouterConfig {
  routes: Array<{
    name: string;
    description: string;
    model: string;
  }>;
}

const INITIAL_QUERY_DEDUPE_WINDOW_MS = 5000;

const ChatInterface = memo(
  ({
    initialChatId,
    initialMessages,
    initialVisibility = 'private',
    isOwner = true,
    chatTitle,
  }: ChatInterfaceProps): React.JSX.Element => {
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const { state } = useSidebar();
    const [query] = useQueryState('query', parseAsString.withDefault(''));
    const [q] = useQueryState('q', parseAsString.withDefault(''));
    const [groupParam] = useQueryState('group', parseAsString.withDefault(''));
    const [input, setInput] = useLocalStorage<string>('scira-draft-input', '');
    const [localChatTitle, setLocalChatTitle] = useState<string>(chatTitle || (initialChatId ? 'Chat' : 'New Chat'));
    const [isEditingTitle, setIsEditingTitle] = useState(false); // legacy inline edit (to be removed)
    const [titleInput, setTitleInput] = useState(localChatTitle);
    const [isSavingTitle, setIsSavingTitle] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const headerGroupRef = useRef<HTMLDivElement>(null);
    const chevronBtnRef = useRef<HTMLButtonElement>(null);
    const [groupWidth, setGroupWidth] = useState<number>(0);
    const [alignOffset, setAlignOffset] = useState<number>(0);

    const measureHeaderMenuAlignment = React.useCallback(() => {
      const groupEl = headerGroupRef.current;
      if (!groupEl) return;
      const gW = groupEl.offsetWidth;
      setGroupWidth(gW);
      const cW = chevronBtnRef.current ? chevronBtnRef.current.offsetWidth : 0;
      // Align content to be centered within the full button group (not just the chevron)
      // With align="center", a negative offset of half the width difference moves the menu's center
      // from the chevron button to the center of the whole group.
      setAlignOffset(-((gW - cW) / 2));
    }, []);

    useEffect(() => {
      const groupEl = headerGroupRef.current;
      if (!groupEl) return;
      const ro = new ResizeObserver(measureHeaderMenuAlignment);
      ro.observe(groupEl);
      measureHeaderMenuAlignment();
      window.addEventListener('resize', measureHeaderMenuAlignment);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', measureHeaderMenuAlignment);
      };
    }, [measureHeaderMenuAlignment]);

    // Re-measure when path/title changes or when menu opens
    useEffect(() => {
      if (!headerMenuOpen) return;
      // microtask to allow layout to settle when replaceState changes DOM
      queueMicrotask(() => measureHeaderMenuAlignment());
    }, [pathname, localChatTitle, headerMenuOpen, measureHeaderMenuAlignment]);

    const [selectedModel, setSelectedModel] = useLocalStorage('scira-selected-model', 'scira-default');
    const initialGroupDefault = (
      groupParam ? (groupParam as unknown as SearchGroupId) : ('web' as SearchGroupId)
    ) as SearchGroupId;
    const [selectedGroup, setSelectedGroup] = useLocalStorage<SearchGroupId>(
      'scira-selected-group',
      initialGroupDefault,
    );
    const effectiveSelectedGroup = (
      groupParam ? (groupParam as unknown as SearchGroupId) : selectedGroup
    ) as SearchGroupId;
    const [selectedConnectors, setSelectedConnectors] = useState<ConnectorProvider[]>([]);
    const [isMultiAgentModeEnabled, setIsMultiAgentModeEnabled] = useLocalStorage('scira-multi-agent-enabled', false);
    const [isCustomInstructionsEnabled, setIsCustomInstructionsEnabled] = useLocalStorage(
      'scira-custom-instructions-enabled',
      true,
    );
    // Simple state for temp chat - no useEffect, just direct localStorage
    const [isTemporaryChatEnabled, _setIsTemporaryChatEnabled] = useState(() => {
      if (typeof window === 'undefined') return false;
      try {
        return localStorage.getItem('scira-temporary-chat-enabled') === 'true';
      } catch {
        return false;
      }
    });
    const setIsTemporaryChatEnabled = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
      _setIsTemporaryChatEnabled((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        if (typeof window !== 'undefined') {
          localStorage.setItem('scira-temporary-chat-enabled', String(next));
        }
        return next;
      });
    }, []);

    // Settings page navigation (replaces dialog/hash approach)
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsInitialTab, setSettingsInitialTab] = useState<string>('profile');

    const handleOpenSettings = useCallback(
      (tab: string = 'profile') => {
        setSettingsInitialTab(tab);
        router.push(tab ? `/settings?tab=${encodeURIComponent(tab)}` : '/settings');
      },
      [router],
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

    const [searchProvider, _] = useLocalStorage<'exa' | 'parallel' | 'firecrawl'>(
      'scira-search-provider',
      'firecrawl',
    );

    const [extremeSearchModel] = useLocalStorage<
      'scira-ext-1' | 'scira-ext-2' | 'scira-ext-4' | 'scira-ext-5' | 'scira-ext-6' | 'scira-ext-7' | 'scira-ext-8'
    >('scira-extreme-search-model', 'scira-ext-1');
    const [isAutoRouterEnabled] = useSyncedPreferences<boolean>('scira-auto-router-enabled', false);
    const [autoRouterConfig] = useSyncedPreferences<AutoRouterConfig>('scira-auto-router-config', { routes: [] });
    const [scrollToLatestOnOpen] = useSyncedPreferences<boolean>('scira-scroll-to-latest-on-open', false);

    // State for tracking the auto-routed model
    const [autoRoutedModel, setAutoRoutedModel] = useState<{ model: string; route: string } | null>(null);

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
    const isUserMax = user?.isMaxUser === true;

    const { dataStream, setDataStream } = useDataStream();

    const initialState = useMemo(
      () => ({
        query: query || q,
      }),
      [query, q],
    );

    useEffect(() => {
      // keep local title in sync if prop changes (e.g., server updated)
      if (chatTitle && chatTitle !== localChatTitle) {
        setLocalChatTitle(chatTitle);
        if (!isEditingTitle) setTitleInput(chatTitle);
      }
    }, [chatTitle, localChatTitle, isEditingTitle]);

    const handleStartEditTitle = useCallback(() => {
      const currentChatId = initialChatId || (pathname?.startsWith('/search/') ? pathname.split('/')[2] : null);
      if (!currentChatId) return;
      setTitleInput(localChatTitle || '');
      setIsEditDialogOpen(true);
    }, [initialChatId, localChatTitle, pathname]);

    const handleCancelEditTitle = useCallback(() => {
      setIsEditDialogOpen(false);
      setIsEditingTitle(false);
      setTitleInput(localChatTitle || '');
    }, [localChatTitle]);

    const handleSaveTitle = useCallback(async () => {
      const currentChatId = initialChatId || (pathname?.startsWith('/search/') ? pathname.split('/')[2] : null);
      if (!currentChatId) return;
      const next = titleInput.trim();
      if (!next) {
        sileo.error({
          title: 'Title cannot be empty',
          description: 'Please enter a valid title',
          icon: <AlertCircle className="h-4 w-4" />,
        });
        return;
      }
      if (next.length > 100) {
        sileo.error({
          title: 'Title is too long (max 100 characters)',
          description: 'Please shorten your title',
          icon: <AlertCircle className="h-4 w-4" />,
        });
        return;
      }
      try {
        setIsSavingTitle(true);
        const updated = await updateChatTitle(currentChatId, next);
        if (updated) {
          setLocalChatTitle(next);
          sileo.success({
            title: 'Title updated',
            description: 'The chat title has been updated',
            icon: <Pencil className="h-4 w-4" />,
          });
          setIsEditingTitle(false);
          setIsEditDialogOpen(false);
        } else {
          sileo.error({
            title: 'Failed to update title',
            description: 'Please try again',
            icon: <X className="h-4 w-4" />,
          });
        }
      } catch (e) {
        sileo.error({
          title: 'Failed to update title',
          description: 'Please try again',
          icon: <X className="h-4 w-4" />,
        });
      } finally {
        setIsSavingTitle(false);
      }
    }, [initialChatId, titleInput, pathname]);

    const handleOpenDelete = useCallback(() => {
      const currentChatId = initialChatId || (pathname?.startsWith('/search/') ? pathname.split('/')[2] : null);
      if (!currentChatId) return;
      setIsDeleteOpen(true);
    }, [initialChatId, pathname]);

    const handleConfirmDelete = useCallback(async () => {
      const currentChatId = initialChatId || (pathname?.startsWith('/search/') ? pathname.split('/')[2] : null);
      if (!currentChatId) return;
      try {
        setIsDeleting(true);
        await deleteChat(currentChatId);
        sileo.success({
          title: 'Chat deleted',
          description: 'The chat has been permanently removed',
          icon: <Trash2 className="h-4 w-4" />,
        });
        setIsDeleteOpen(false);
        router.push('/');
      } catch (e) {
        sileo.error({
          title: 'Failed to delete chat',
          description: 'Please try again',
          icon: <X className="h-4 w-4" />,
        });
      } finally {
        setIsDeleting(false);
      }
    }, [initialChatId, pathname, router]);

    const lastSubmittedQueryRef = useRef(initialState.query);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null!);
    const inputRef = useRef<HTMLTextAreaElement>(null!);
    const initializedRef = useRef(false);
    const openChatAutoScrolledRef = useRef<string | null>(null);

    // Touch active = don't run scrollToBottom so we never fight the user's finger
    const touchActiveRef = useRef(false);
    const nestedScrollActiveRef = useRef(false);
    const skipAutoScrollRef = useRef(false);
    const lastTouchYRef = useRef<number | null>(null);
    const touchEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nestedScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const syncSkipAutoScroll = useCallback(() => {
      skipAutoScrollRef.current = touchActiveRef.current || nestedScrollActiveRef.current;
    }, []);

    // Use optimized scroll hook (skip programmatic scroll while user interacts with nested MCP scrollers)
    const { scrollToBottom, markManualScroll, resetManualScroll } = useOptimizedScroll(bottomRef, {
      skipScrollWhen: skipAutoScrollRef,
    });

    // Detect intentional user scroll to stop auto-scrolling.
    // On touch: mark manual scroll on any touch + movement, and skip auto-scroll while finger is down.
    const TOUCH_MOVE_THRESHOLD = 5; // px movement in any direction = user is scrolling
    const TOUCH_END_SETTLE_MS = 150; // wait for momentum to settle before re-evaluating "at bottom"

    useEffect(() => {
      // Scroll: update manual state when not touching (mouse/keyboard or after touch ended)
      const handleScroll = () => {
        if (!touchActiveRef.current) markManualScroll();
      };
      // Wheel: upward wheel = intentional read-back
      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY < 0) markManualScroll({ userScrolledUp: true });
      };
      const handleTouchStart = (e: TouchEvent) => {
        touchActiveRef.current = true;
        syncSkipAutoScroll();
        lastTouchYRef.current = e.touches[0]?.clientY ?? null;
        // Sync manual state from current position so we don't jump on first frame
        markManualScroll();
      };
      const handleTouchMove = (e: TouchEvent) => {
        if (!touchActiveRef.current) return;
        const y = e.touches[0]?.clientY;
        if (y != null && lastTouchYRef.current != null) {
          const dy = y - lastTouchYRef.current;
          // Any intentional scroll (up or down) = user is in control, stop auto-scroll
          if (Math.abs(dy) >= TOUCH_MOVE_THRESHOLD) {
            if (dy < 0) markManualScroll({ userScrolledUp: true });
            else markManualScroll();
          }
        }
        lastTouchYRef.current = y ?? lastTouchYRef.current;
      };
      const handleTouchEnd = () => {
        touchActiveRef.current = false;
        syncSkipAutoScroll();
        lastTouchYRef.current = null;
        if (touchEndTimeoutRef.current) clearTimeout(touchEndTimeoutRef.current);
        // Re-evaluate after momentum settles so we don't wrongly think user is at bottom
        touchEndTimeoutRef.current = setTimeout(() => {
          touchEndTimeoutRef.current = null;
          markManualScroll();
        }, TOUCH_END_SETTLE_MS);
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('wheel', handleWheel, { passive: true });
      window.addEventListener('touchstart', handleTouchStart, { passive: true });
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd, { passive: true });
      window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
      const handleNestedScrollInteraction = (event: Event) => {
        const customEvent = event as CustomEvent<{ active?: boolean; userScrolledUp?: boolean }>;
        const isActive = customEvent.detail?.active ?? false;
        const userScrolledUp = customEvent.detail?.userScrolledUp ?? false;

        nestedScrollActiveRef.current = isActive;
        if (userScrolledUp) {
          markManualScroll({ userScrolledUp: true });
        }

        if (nestedScrollTimeoutRef.current) clearTimeout(nestedScrollTimeoutRef.current);
        if (isActive) {
          nestedScrollTimeoutRef.current = setTimeout(() => {
            nestedScrollActiveRef.current = false;
            syncSkipAutoScroll();
            nestedScrollTimeoutRef.current = null;
          }, 250);
        }

        syncSkipAutoScroll();
      };
      window.addEventListener('scira:nested-scroll-active', handleNestedScrollInteraction as EventListener);
      return () => {
        if (touchEndTimeoutRef.current) clearTimeout(touchEndTimeoutRef.current);
        if (nestedScrollTimeoutRef.current) clearTimeout(nestedScrollTimeoutRef.current);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('wheel', handleWheel);
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
        window.removeEventListener('scira:nested-scroll-active', handleNestedScrollInteraction as EventListener);
      };
    }, [markManualScroll, syncSkipAutoScroll]);

    const shouldFetchUsageData = Boolean(user && !isUserPro);
    const { data: usageData } = useUsageData(user || null, shouldFetchUsageData);

    // Sign-in prompt timer
    const signInTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Generate a consistent ID for new chats
    const chatId = useMemo(() => initialChatId ?? uuidv7(), [initialChatId]);

    // Reset transient elicitation UI state when chat context changes.
    useEffect(() => {
      setActiveElicitation(null);
      dismissedElicitationIdsRef.current.clear();
      openedElicitationIdsRef.current.clear();
    }, [chatId]);

    // Pro users bypass all limit checks - much cleaner!
    const effectiveSelectedModel = useMemo(() => {
      if (proStatusLoading) return selectedModel;
      if (requiresProSubscription(selectedModel) && !isUserPro) return 'scira-default';
      return selectedModel;
    }, [selectedModel, isUserPro, proStatusLoading]);
    const shouldBypassLimits = shouldBypassLimitsForModel(effectiveSelectedModel);

    // Check the appropriate limit based on selected group
    const isExtremeMode = effectiveSelectedGroup === 'extreme';
    const currentUsageCount = usageData ? (isExtremeMode ? usageData.extremeSearchCount : usageData.messageCount) : 0;
    const currentLimit = isExtremeMode ? SEARCH_LIMITS.EXTREME_SEARCH_LIMIT : SEARCH_LIMITS.DAILY_SEARCH_LIMIT;

    // Check if current mode has exceeded its limit
    const hasExceededCurrentModeLimit =
      shouldCheckUserLimits &&
      !proStatusLoading &&
      !shouldBypassLimits &&
      usageData &&
      currentUsageCount >= currentLimit;

    // Check if BOTH limits are exhausted
    const messageCountExhausted = usageData && usageData.messageCount >= SEARCH_LIMITS.DAILY_SEARCH_LIMIT;
    const extremeSearchCountExhausted = usageData && usageData.extremeSearchCount >= SEARCH_LIMITS.EXTREME_SEARCH_LIMIT;

    // Only block UI when BOTH limits are exhausted (so user can switch modes if one still has quota)
    const isLimitBlocked = Boolean(
      shouldCheckUserLimits &&
      !proStatusLoading &&
      !shouldBypassLimits &&
      messageCountExhausted &&
      extremeSearchCountExhausted,
    );

    // Timer ref cleanup only — sign-in prompt is now a passive inline CTA, not an auto-firing modal
    useEffect(() => {
      if (user) {
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
          signInTimerRef.current = null;
        }
        setPersitedHasShownSignInPrompt(false);
      }
      return () => {
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
        }
      };
    }, [user, setPersitedHasShownSignInPrompt]);

    type VisibilityType = 'public' | 'private';

    // Only consider it an existing chat if we have an actual chat ID (not empty string or undefined-like values)
    const routeChatId = pathname?.startsWith('/search/') ? pathname.split('/')[2] : null;
    const isExistingChat = Boolean(
      initialChatId || (routeChatId && routeChatId !== 'undefined' && routeChatId !== 'null'),
    );
    const isTemporaryChat = isTemporaryChatEnabled && !isExistingChat;
    const existingChatId = isExistingChat ? initialChatId || routeChatId : null;

    // Create refs to store current values to avoid closure issues
    const selectedModelRef = useRef(effectiveSelectedModel);
    const selectedGroupRef = useRef(effectiveSelectedGroup);
    const isCustomInstructionsEnabledRef = useRef(isCustomInstructionsEnabled);
    const searchProviderRef = useRef(searchProvider);
    const extremeSearchProviderRef = useRef<'exa'>('exa');
    const extremeSearchModelRef = useRef(extremeSearchModel);
    const selectedConnectorsRef = useRef(selectedConnectors);
    const isMultiAgentModeEnabledRef = useRef(isMultiAgentModeEnabled);
    const isTemporaryChatRef = useRef(isTemporaryChat);

    // Update refs whenever state changes - this ensures we always have current values
    selectedModelRef.current = effectiveSelectedModel;
    selectedGroupRef.current = effectiveSelectedGroup;
    isCustomInstructionsEnabledRef.current = isCustomInstructionsEnabled;
    searchProviderRef.current = searchProvider;
    extremeSearchProviderRef.current = 'exa';
    extremeSearchModelRef.current = extremeSearchModel;
    selectedConnectorsRef.current = selectedConnectors;
    isMultiAgentModeEnabledRef.current = isMultiAgentModeEnabled;
    isTemporaryChatRef.current = isTemporaryChat;

    const [activeElicitation, setActiveElicitation] = useState<ElicitationData | null>(null);
    const dismissedElicitationIdsRef = useRef<Set<string>>(new Set());
    const openedElicitationIdsRef = useRef<Set<string>>(new Set());
    const [isTransitioning, setIsTransitioning] = useState(false);
    const lastSuggestionKeyRef = useRef<string | null>(null);

    const {
      messages,
      sendMessage,
      setMessages,
      regenerate,
      stop: stopStream,
      status,
      error,
      resumeStream,
    } = useChat<ChatMessage>({
      id: chatId,
      // resume: true,
      transport: new DefaultChatTransport({
        api: '/api/search',
        prepareSendMessagesRequest({ messages, body }) {
          const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
          const shouldTrimRequestHistory = Boolean(user && !isTemporaryChatRef.current && latestUserMessage);

          return {
            body: {
              id: chatId,
              messages: shouldTrimRequestHistory && latestUserMessage ? [latestUserMessage] : messages,
              model: selectedModelRef.current,
              group:
                isUserPro && isMultiAgentModeEnabledRef.current
                  ? ('multi-agent' as SearchGroupId)
                  : selectedGroupRef.current,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              isCustomInstructionsEnabled: isCustomInstructionsEnabledRef.current,
              searchProvider: searchProviderRef.current,
              extremeSearchProvider: extremeSearchProviderRef.current,
              extremeSearchModel: extremeSearchModelRef.current,
              selectedConnectors: selectedConnectorsRef.current,
              isTemporaryChat: isTemporaryChatRef.current,
              ...(initialChatId ? { chat_id: initialChatId } : {}),
              ...body,
            },
          };
        },
      }),
      experimental_throttle: 100,
      onData: (dataPart) => {
        console.log('onData<Client>', dataPart);
        // Handle auto-routed model info from server
        if (dataPart.type === 'data-auto_routed_model') {
          const autoRouteData = dataPart.data;
          if (autoRouteData?.model) {
            setAutoRoutedModel({ model: autoRouteData.model, route: autoRouteData.route });
          }
        }
        // Handle MCP elicitation requests.
        if (dataPart.type === 'data-mcp_elicitation') {
          const nextElicitation = dataPart.data as ElicitationData;
          if (!nextElicitation?.elicitationId) return;
          if (dismissedElicitationIdsRef.current.has(nextElicitation.elicitationId)) return;
          if (openedElicitationIdsRef.current.has(nextElicitation.elicitationId)) return;

          openedElicitationIdsRef.current.add(nextElicitation.elicitationId);
          setActiveElicitation((current) =>
            current?.elicitationId === nextElicitation.elicitationId ? current : { ...nextElicitation },
          );
        }
        if (dataPart.type === 'data-mcp_elicitation_done') {
          const doneId = dataPart.data?.elicitationId;
          if (doneId) {
            dismissedElicitationIdsRef.current.add(doneId);
            openedElicitationIdsRef.current.delete(doneId);
            setActiveElicitation((current) => (current?.elicitationId === doneId ? null : current));
          }
        }
        // Handle chat title updates from server for new chats
        if (dataPart.type === 'data-chat_title') {
          const titleData = dataPart.data;
          if (titleData?.title) {
            setLocalChatTitle(titleData.title);
            setTitleInput(titleData.title);
          }
        }
        setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      },
      onFinish: async ({ message }) => {
        console.log('onFinish<Client>', message.parts);
        // Keep post-finish work minimal so the chat settles quickly after streaming.
        if (user) {
          // Refetch chats cache to refresh sidebar (use refetch to bypass staleTime)
          if (!isTemporaryChatRef.current) {
            queryClient.refetchQueries({ queryKey: ['recent-chats', user.id] });
          }
        }

        // Restore suggested question generation after the assistant finishes.
        if (message.parts && message.role === 'assistant' && (user || chatState.selectedVisibilityType === 'private')) {
          const assistantText = message.parts
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('')
            .trim();
          const userText = (lastSubmittedQueryRef.current ?? '').trim();
          if (!userText || !assistantText) return;
          const suggestionKey = `${userText}::${assistantText}`;
          if (lastSuggestionKeyRef.current === suggestionKey) return;
          lastSuggestionKeyRef.current = suggestionKey;

          const newHistory = [
            { role: 'user', content: userText },
            { role: 'assistant', content: assistantText },
          ];

          void suggestQuestions(newHistory)
            .then(({ questions }) => {
              dispatch({ type: 'SET_SUGGESTED_QUESTIONS', payload: questions });
            })
            .catch((error) => {
              console.error('Error generating suggested questions:', error);
            });
        }
      },
      onError: (error) => {
        // Don't show toast for ChatSDK errors as they will be handled by the enhanced error display
        if (error instanceof ChatSDKError) {
          console.log('ChatSDK Error:', error.type, error.surface, error.message);
          return;
        }

        console.error('Chat error:', error.cause, error.message);
      },
      messages: initialMessages || [],
    });

    const [isManuallyStopping, setIsManuallyStopping] = useState(false);
    const uiStatus = isManuallyStopping && status === 'streaming' ? 'ready' : status;

    const stop = useCallback(async () => {
      setIsManuallyStopping(true);
      await Promise.allSettled([stopStream(), fetch(`/api/search/${chatId}/stop`, { method: 'DELETE' })]);
    }, [stopStream, chatId]);

    useEffect(() => {
      if (status !== 'streaming') setIsManuallyStopping(false);
    }, [status]);

    useEffect(() => {
      if (!existingChatId) {
        openChatAutoScrolledRef.current = null;
        return;
      }

      if (openChatAutoScrolledRef.current === existingChatId) return;

      if (!scrollToLatestOnOpen) {
        openChatAutoScrolledRef.current = existingChatId;
        return;
      }

      if (messages.length === 0 || uiStatus === 'streaming') return;

      openChatAutoScrolledRef.current = existingChatId;
      resetManualScroll();
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom()));
    }, [existingChatId, messages.length, resetManualScroll, scrollToBottom, scrollToLatestOnOpen, uiStatus]);

    const sendMessageWithAutoRouting = useCallback(
      async (message: Parameters<typeof sendMessage>[0], options?: Parameters<typeof sendMessage>[1]) => {
        const isUsingAutoRouter = selectedModelRef.current === 'scira-auto';
        // Prevent stale/ghost elicitation UI from previous requests.
        setActiveElicitation(null);
        // Keep dismissed/opened id sets so historical stream parts can't resurrect.

        // Send message immediately to show in UI
        return sendMessage(message, {
          ...options,
          body: {
            ...(options?.body ?? {}),
            isAutoRouted: isUsingAutoRouter,
            autoRouterEnabled: isAutoRouterEnabled,
            autoRouterConfig: isUsingAutoRouter ? autoRouterConfig : undefined,
          },
        });
      },
      [autoRouterConfig, isAutoRouterEnabled, sendMessage],
    );

    // Fallback: derive active elicitation from streamed data in case onData batching
    // causes event handlers to miss/show late.
    useEffect(() => {
      if (activeElicitation) return;
      if (!dataStream?.length) return;

      for (let i = dataStream.length - 1; i >= 0; i -= 1) {
        const part = dataStream[i];
        if (!part) continue;
        if (part.type !== 'data-mcp_elicitation') continue;
        const candidate = part.data as ElicitationData;
        if (!candidate?.elicitationId) continue;
        if (dismissedElicitationIdsRef.current.has(candidate.elicitationId)) continue;
        if (openedElicitationIdsRef.current.has(candidate.elicitationId)) continue;
        openedElicitationIdsRef.current.add(candidate.elicitationId);
        setActiveElicitation((current) =>
          current?.elicitationId === candidate.elicitationId ? current : { ...candidate },
        );
        break;
      }
    }, [dataStream, activeElicitation]);

    const isTemporaryChatLocked = useMemo(() => {
      if (isExistingChat) return true;
      return messages.length > 0 || (initialMessages?.length ?? 0) > 0;
    }, [initialMessages?.length, isExistingChat, messages.length]);

    // Compute active chat id used in header and data fetching (after messages/chatId exist)
    const effectiveChatId = useMemo(() => {
      if (isTemporaryChat) return null;
      const routeChatId = pathname?.startsWith('/search/') ? pathname.split('/')[2] : null;
      return initialChatId || routeChatId || (messages.length > 0 ? chatId : null);
    }, [initialChatId, pathname, messages.length, chatId, isTemporaryChat]);

    const shouldShowHeader = Boolean(user && effectiveChatId);
    const canEditHeader = Boolean(isOwner && shouldShowHeader);
    const headerOffsetClass =
      state === 'expanded' ? 'md:left-[calc(var(--sidebar-width))]' : 'md:left-[calc(var(--sidebar-width-icon))]';

    const { data: chatMeta } = useQuery({
      queryKey: ['chat-meta', effectiveChatId, user?.id],
      enabled: Boolean(effectiveChatId),
      queryFn: async () => await getChatMeta(effectiveChatId as string, user?.id),
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    });

    // Keep local title in sync with server via React Query
    useEffect(() => {
      if (chatMeta?.title && chatMeta.title !== localChatTitle && !isEditingTitle) {
        setLocalChatTitle(chatMeta.title);
        setTitleInput(chatMeta.title);
      }
    }, [chatMeta?.title, isEditingTitle]);

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
      autoResume: !isManuallyStopping,
      initialMessages: initialMessages || [],
      resumeStream,
      setMessages,
    });

    useEffect(() => {
      if (status) {
        console.log('[status]:', status);
      }
    }, [status]);

    // Removed header/recents invalidation effects; chat meta now refetches based on messages.length via query key

    // Handle initial query from URL params
    useEffect(() => {
      if (!initializedRef.current && initialState.query && !messages.length && !initialChatId) {
        if (typeof window !== 'undefined') {
          const dedupeKey = `scira:initial-query:${initialState.query}`;
          const previousTimestamp = Number(sessionStorage.getItem(dedupeKey) ?? '0');
          const now = Date.now();
          if (previousTimestamp && now - previousTimestamp < INITIAL_QUERY_DEDUPE_WINDOW_MS) {
            initializedRef.current = true;
            return;
          }
          sessionStorage.setItem(dedupeKey, String(now));
        }

        initializedRef.current = true;
        console.log('[initial query]:', initialState.query);

        // Send the message first
        sendMessageWithAutoRouting({
          parts: [{ type: 'text', text: initialState.query }],
          role: 'user',
        });

        // For logged-in users (not in temporary mode), update URL to reflect the chat ID
        if (user && !isTemporaryChat) {
          window.history.replaceState({}, '', `/search/${chatId}`);
        }
      }
    }, [
      initialState.query,
      sendMessageWithAutoRouting,
      setInput,
      messages.length,
      initialChatId,
      user,
      isTemporaryChat,
      chatId,
    ]);

    // Generate suggested questions when opening a chat directly.
    useEffect(() => {
      let isCancelled = false;

      const generateSuggestionsForInitialMessages = () => {
        if (
          initialMessages &&
          initialMessages.length >= 2 &&
          !chatState.suggestedQuestions.length &&
          (user || chatState.selectedVisibilityType === 'private') &&
          uiStatus === 'ready'
        ) {
          const lastUserMessage = initialMessages.filter((m) => m.role === 'user').pop();
          const lastAssistantMessage = initialMessages.filter((m) => m.role === 'assistant').pop();

          if (lastUserMessage && lastAssistantMessage) {
            const getMessageText = (message: typeof lastUserMessage) => {
              if (message.parts && message.parts.length > 0) {
                return (message.parts as Array<{ type: string; text?: string }>)
                  .filter((p) => p.type === 'text' && p.text)
                  .map((p) => p.text!)
                  .join('')
                  .trim();
              }

              return message.content || '';
            };

            const newHistory = [
              { role: 'user', content: getMessageText(lastUserMessage) },
              { role: 'assistant', content: getMessageText(lastAssistantMessage) },
            ];
            const userText = newHistory[0].content.trim();
            const assistantText = newHistory[1].content.trim();
            if (!userText || !assistantText) return;
            const suggestionKey = `${userText}::${assistantText}`;
            if (lastSuggestionKeyRef.current === suggestionKey) return;
            lastSuggestionKeyRef.current = suggestionKey;

            void suggestQuestions(newHistory)
              .then(({ questions }) => {
                if (!isCancelled) {
                  dispatch({ type: 'SET_SUGGESTED_QUESTIONS', payload: questions });
                }
              })
              .catch((error) => {
                console.error('Error generating suggested questions:', error);
              });
          }
        }
      };

      generateSuggestionsForInitialMessages();

      return () => {
        isCancelled = true;
      };
    }, [initialMessages, chatState.suggestedQuestions.length, uiStatus, user, chatState.selectedVisibilityType]);

    // Reset suggested questions when status changes to streaming
    useEffect(() => {
      if (uiStatus === 'streaming') {
        // Clear suggested questions when a new message is being streamed
        dispatch({ type: 'RESET_SUGGESTED_QUESTIONS' });
      }
    }, [uiStatus]);

    const lastUserMessageIndex = useMemo(() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          return i;
        }
      }
      return -1;
    }, [messages]);

    // Reset isTransitioning as soon as the last message becomes an assistant message
    useEffect(() => {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant') {
        setIsTransitioning(false);
      }
    }, [messages]);

    // Scroll immediately when transitioning starts — don't wait for SDK status
    useEffect(() => {
      if (isTransitioning) {
        resetManualScroll();
        scrollToBottom();
      }
    }, [isTransitioning, resetManualScroll, scrollToBottom]);

    const prevStatusRef = useRef<string>('');
    useEffect(() => {
      const prev = prevStatusRef.current;
      prevStatusRef.current = uiStatus;
      // Only reset manual scroll when transitioning from idle → streaming (new user submission)
      // NOT during ongoing streaming status changes
      if (uiStatus === 'streaming' && prev !== 'streaming') {
        resetManualScroll();
        scrollToBottom();
      }
    }, [uiStatus, resetManualScroll, scrollToBottom]);

    // Auto-scroll during streaming when messages change; throttle so we don't fight touch/momentum
    const lastScrollToBottomAtRef = useRef<number>(0);
    const STREAM_SCROLL_THROTTLE_MS = 100;
    useEffect(() => {
      if (uiStatus !== 'streaming') return;
      const now = Date.now();
      if (now - lastScrollToBottomAtRef.current < STREAM_SCROLL_THROTTLE_MS) return;
      lastScrollToBottomAtRef.current = now;
      scrollToBottom();
    }, [messages, uiStatus, scrollToBottom]);

    // Disable browser scroll anchoring during streaming so images/layout don't pull the view up
    useEffect(() => {
      const el = document.documentElement;
      if (uiStatus === 'streaming' && messages.length > 0) {
        el.style.overflowAnchor = 'none';
        return () => {
          el.style.overflowAnchor = '';
        };
      }
    }, [uiStatus, messages.length]);

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
        // Clear auto-routed model when switching away from auto
        if (model !== 'scira-auto') {
          setAutoRoutedModel(null);
        }
      },
      [setSelectedModel],
    );

    const resetSuggestedQuestions = useCallback(() => {
      dispatch({ type: 'RESET_SUGGESTED_QUESTIONS' });
    }, []);

    // Handle example selection from ExampleCategories
    const handleExampleSelect = useCallback(
      (text: string, group?: string) => {
        if (group) {
          setSelectedGroup(group as SearchGroupId);
        }

        // Set the input value directly on the DOM element first
        if (inputRef.current) {
          inputRef.current.value = text;
          // Trigger the onChange event manually so React state stays in sync
          const event = new Event('input', { bubbles: true });
          inputRef.current.dispatchEvent(event);

          // Now set the cursor position
          inputRef.current.focus();
          const length = text.length;
          inputRef.current.setSelectionRange(length, length);
        }

        // Also update React state
        setInput(text);
      },
      [setInput, setSelectedGroup],
    );

    // Handle visibility change
    const handleVisibilityChange = useCallback(
      async (visibility: VisibilityType) => {
        console.log('🔄 handleVisibilityChange called with:', { chatId, visibility });

        if (!chatId) {
          console.warn('⚠️ handleVisibilityChange: No chatId provided, returning early');
          return;
        }

        try {
          console.log('📡 Calling updateChatVisibility with:', { chatId, visibility });
          const result = await updateChatVisibility(chatId, visibility);
          console.log('✅ updateChatVisibility response:', result);
          console.log('🔍 Result structure analysis:', {
            result,
            typeof_result: typeof result,
            has_result: !!result,
            has_success: result?.success,
            success_value: result?.success,
            has_rowCount: result?.rowCount !== undefined,
            rowCount_value: result?.rowCount,
            rowCount_type: typeof result?.rowCount,
            keys: result ? Object.keys(result) : 'no result',
          });

          // Check if the update was successful - be more forgiving with validation
          if (result && result.success) {
            dispatch({ type: 'SET_VISIBILITY_TYPE', payload: visibility });
            console.log('🔄 Dispatched SET_VISIBILITY_TYPE with:', visibility);

            const shareUrl = visibility === 'public' ? `https://scira.ai/share/${chatId}` : '';
            sileo.success({
              title: `Chat is now ${visibility}`,
              description:
                visibility === 'public' ? 'Your chat is now publicly accessible' : 'Your chat is now private',
              icon: <ShareIcon className="h-4 w-4" />,
              ...(visibility === 'public' && shareUrl
                ? {
                    button: {
                      title: 'Open link',
                      onClick: () => window.open(shareUrl, '_blank', 'noopener,noreferrer'),
                    },
                  }
                : {}),
            });
            console.log('🍞 Success toast shown:', `Chat is now ${visibility}`);

            // Refetch cache to refresh the list with updated visibility (bypass staleTime)
            if (user) {
              queryClient.refetchQueries({ queryKey: ['recent-chats', user.id] });
            }
            console.log('🗑️ Cache refetched');
          } else {
            console.error('❌ Update failed - unsuccessful result:', {
              result,
              success_check: result?.success,
            });
            sileo.error({
              title: 'Failed to update chat visibility',
              description: 'Please try again',
              icon: <X className="h-4 w-4" />,
            });
            console.log('🍞 Error toast shown: Failed to update chat visibility');
          }
        } catch (error) {
          console.error('❌ Error updating chat visibility:', {
            chatId,
            visibility,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
          });
          sileo.error({
            title: 'Failed to update chat visibility',
            description: 'Please try again',
            icon: <X className="h-4 w-4" />,
          });
          console.log('🍞 Error toast shown: Failed to update chat visibility');
        }
      },
      [chatId],
    );

    // Keyboard shortcut for temporary chat toggle (⌘⇧J)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'j') {
          e.preventDefault();
          if (!isTemporaryChatLocked) {
            setIsTemporaryChatEnabled((prev) => !prev);
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isTemporaryChatLocked, setIsTemporaryChatEnabled]);

    return (
      <>
        <AppSidebar
          chatId={isTemporaryChat ? null : initialChatId || (messages.length > 0 ? chatId : null)}
          selectedVisibilityType={chatState.selectedVisibilityType}
          onVisibilityChange={handleVisibilityChange}
          user={user || null}
          onHistoryClick={() => dispatch({ type: 'SET_COMMAND_DIALOG_OPEN', payload: true })}
          isOwner={isOwner}
          subscriptionData={subscriptionData}
          isProUser={isUserPro}
          isProStatusLoading={proStatusLoading}
          isCustomInstructionsEnabled={isCustomInstructionsEnabled}
          setIsCustomInstructionsEnabledAction={setIsCustomInstructionsEnabled}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          settingsInitialTab={settingsInitialTab}
        />
        <SidebarInset>
          {/* Temporary Chat Header - show when in temp mode with messages but no regular header */}
          {user && isTemporaryChat && messages.length > 0 && !shouldShowHeader && (
            <>
              <div
                className={cn(
                  'fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80',
                  headerOffsetClass,
                )}
              >
                <div className="flex items-center justify-between px-3 py-2 min-h-10">
                  <div className="flex items-center gap-3">
                    {/* Mobile sidebar trigger */}
                    <div className="md:hidden">
                      <SidebarTrigger className="h-8 w-8" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Temporary Chat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/new">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-lg bg-accent hover:bg-accent/80 group transition-all hover:scale-105 pointer-events-auto"
                      >
                        <PlusIcon size={16} className="group-hover:rotate-90 transition-all" />
                        <span className="text-sm ml-1.5 group-hover:block hidden animate-in fade-in duration-300">
                          New
                        </span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="h-6" aria-hidden="true" />
            </>
          )}
          {/* Header with Share Button - only for signed-in users and when we have a chat id */}
          {shouldShowHeader && (
            <>
              <div
                className={cn(
                  'fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80',
                  headerOffsetClass,
                )}
              >
                <div className="flex items-center justify-between px-3 py-2 min-h-10">
                  <div className="relative flex items-center gap-3 min-w-0 flex-1 justify-center md:justify-start">
                    {/* Mobile sidebar trigger */}
                    <div className="md:hidden absolute left-0 top-1/2 -translate-y-1/2">
                      <SidebarTrigger className="h-8 w-8" />
                    </div>

                    {user ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              'inline-flex items-center justify-center gap-0.5 h-8 w-8 rounded-md',
                              'hover:bg-accent data-[state=open]:bg-accent',
                              'focus:outline-none! focus:ring-0! focus:ring-offset-0!',
                              'transition-colors',
                            )}
                          >
                            <Avatar className="size-7 rounded-md p-0! m-0!">
                              <AvatarImage
                                src={chatMeta?.user?.image ?? user.image ?? ''}
                                alt={chatMeta?.user?.name ?? user.name ?? ''}
                                className="rounded-md p-0! m-0! size-7"
                              />
                              <AvatarFallback className="rounded-md text-xs p-0 m-0 size-7">
                                {(
                                  chatMeta?.user?.name ||
                                  chatMeta?.user?.email ||
                                  user.name ||
                                  user.email ||
                                  '?'
                                ).charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={6} className="rounded-md w-[260px]">
                          <div className="px-3 py-2">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-muted-foreground">Created by</span>
                                <span className="text-xs font-medium truncate">
                                  {(chatMeta?.isOwner ?? isOwner)
                                    ? `${chatMeta?.user?.name || user.name || 'You'} (You)`
                                    : chatMeta?.user?.name || 'Unknown'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-muted-foreground">Last Updated</span>
                                <span className="text-xs font-medium">
                                  {new Intl.DateTimeFormat('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                  }).format(chatMeta?.updatedAt ? new Date(chatMeta.updatedAt) : new Date())}
                                </span>
                              </div>
                            </div>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <HugeiconsIcon icon={UserCircleIcon} size={24} className="size-7 shrink-0 self-start" />
                    )}

                    <div className="flex items-center gap-2 min-w-0">
                      {canEditHeader ? (
                        <DropdownMenu
                          open={headerMenuOpen}
                          onOpenChange={(open) => {
                            setHeaderMenuOpen(open);
                          }}
                        >
                          <div ref={headerGroupRef} className="inline-flex">
                            <ButtonGroup className="group gap-0.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  'h-8 px-2 w-auto max-w-[250px] justify-start rounded-md hover:bg-accent group-hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed',
                                  headerMenuOpen && 'bg-accent',
                                )}
                                onClick={handleStartEditTitle}
                                disabled={uiStatus === 'submitted' || uiStatus === 'streaming'}
                              >
                                <span className="text-sm font-medium truncate whitespace-nowrap text-left focus:outline-none! focus:ring-0! focus:ring-offset-0!">
                                  {localChatTitle}
                                </span>
                              </Button>
                              <DropdownMenuTrigger
                                asChild
                                className="focus:outline-none! focus:ring-0! focus:ring-offset-0!"
                              >
                                <Button
                                  ref={chevronBtnRef}
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    'h-8 w-8 rounded-md hover:bg-accent group-hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed',
                                    headerMenuOpen && 'bg-accent',
                                  )}
                                  disabled={uiStatus === 'submitted' || uiStatus === 'streaming'}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                            </ButtonGroup>
                          </div>
                          <DropdownMenuContent
                            side="bottom"
                            align="start"
                            alignOffset={-95}
                            avoidCollisions={false}
                            className="rounded-md border border-border bg-popover shadow-lg p-1"
                          >
                            <DropdownMenuItem
                              className="rounded-md"
                              onClick={handleStartEditTitle}
                              disabled={uiStatus === 'submitted' || uiStatus === 'streaming'}
                            >
                              <Pencil className="h-4 w-4" /> Edit title
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="rounded-md"
                              onClick={() => setIsShareOpen(true)}
                              disabled={uiStatus === 'submitted' || uiStatus === 'streaming'}
                            >
                              <ShareIcon className="h-4 w-4" /> Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={handleOpenDelete}
                              className="text-destructive! hover:text-destructive! rounded-md"
                              disabled={uiStatus === 'submitted' || uiStatus === 'streaming'}
                            >
                              <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 w-auto max-w-[250px] justify-start rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleStartEditTitle}
                          disabled={uiStatus === 'submitted' || uiStatus === 'streaming'}
                        >
                          <span className="text-sm font-medium truncate whitespace-nowrap text-left">
                            {localChatTitle}
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2"></div>
                </div>
              </div>
              <div className="h-6" aria-hidden="true" />
            </>
          )}

          <div className="flex flex-col font-sans! items-center h-screen bg-background text-foreground transition-all duration-500 w-full overflow-x-hidden scrollbar-thin! scrollbar-thumb-muted-foreground! dark:scrollbar-thumb-muted-foreground! scrollbar-track-transparent! hover:scrollbar-thumb-foreground! dark:hover:scrollbar-thumb-foreground!">
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
              className={`w-full p-2 sm:p-4 relative ${
                uiStatus === 'ready' && messages.length === 0
                  ? 'flex-1 flex! flex-col! items-center! justify-center!' // Center everything when no messages
                  : 'flex flex-col! mt-4' // Add top margin when showing messages
              }`}
            >
              <div
                className={`w-full max-w-[95%] sm:max-w-2xl space-y-6 p-0 mx-auto transition-all duration-300`}
                style={{ overflowAnchor: 'none' }}
              >
                {uiStatus === 'ready' && messages.length === 0 && (
                  <div className="text-center m-0 mb-2">
                    {/* Mobile sidebar trigger for main page */}
                    <div className="md:hidden absolute top-4 left-4 z-10">
                      <SidebarTrigger />
                    </div>
                    {/* Mobile New Chat button for initial state */}
                    <div className="md:hidden absolute top-4 right-4 z-10">
                      <Link href="/new">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="rounded-lg bg-accent hover:bg-accent/80 group transition-all hover:scale-105 pointer-events-auto"
                        >
                          <PlusIcon size={16} className="group-hover:rotate-90 transition-all" />
                          <span className="text-sm ml-1.5 group-hover:block hidden animate-in fade-in duration-300">
                            New
                          </span>
                        </Button>
                      </Link>
                    </div>
                    <div className="inline-flex items-center gap-3">
                      <h1 className="text-4xl sm:text-5xl mb-0! text-foreground dark:text-foreground font-be-vietnam-pro! font-light tracking-tighter">
                        scira
                      </h1>
                      {isUserPro && (
                        <h1 className="text-2xl font-baumans! leading-4 inline-block px-3! pt-1! pb-2.5! rounded-xl shadow-sm m-0! mt-2! bg-linear-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground ring-1 ring-ring/35 ring-offset-1 ring-offset-background dark:bg-linear-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground">
                          {isUserMax ? 'max' : 'pro'}
                        </h1>
                      )}
                    </div>
                  </div>
                )}

                {/* Show initial limit exceeded message */}
                {uiStatus === 'ready' && messages.length === 0 && isLimitBlocked && (
                  <div className="mt-20 mx-auto max-w-md">
                    <div className="bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                      {/* Header Section */}
                      <div className="text-center px-8 pt-10 pb-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-muted rounded-lg mb-6">
                          <HugeiconsIcon
                            icon={Crown02Icon}
                            size={24}
                            className="text-muted-foreground"
                            strokeWidth={1.5}
                          />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground mb-2">All Search Limits Reached</h2>
                        <p className="text-sm text-muted-foreground">
                          You've used {SEARCH_LIMITS.DAILY_SEARCH_LIMIT} regular searches and{' '}
                          {SEARCH_LIMITS.EXTREME_SEARCH_LIMIT} extreme searches
                        </p>
                      </div>

                      {/* Content Section */}
                      <div className="px-8 pb-8">
                        <div className="space-y-4 mb-8">
                          <div className="bg-muted/50 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-foreground mb-2">
                              {isUserMax ? 'Max Benefits' : 'Pro Benefits'}
                            </h3>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Unlimited daily searches</li>
                              <li>• Faster response times</li>
                              <li>• Premium AI models</li>
                              <li>• Priority support</li>
                            </ul>
                          </div>
                        </div>

                        {/* Actions Section */}
                        <div className="space-y-3">
                          <Button
                            onClick={() => {
                              window.location.href = '/pricing';
                            }}
                            className="w-full h-10 font-medium"
                          >
                            <HugeiconsIcon icon={Crown02Icon} size={16} className="mr-2" strokeWidth={1.5} />
                            {isUserMax ? 'Manage Max' : 'Upgrade to Max'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (user) {
                                queryClient.invalidateQueries({ queryKey: ['user-usage', user.id] });
                              }
                            }}
                            className="w-full h-9 text-sm"
                          >
                            Check for updates
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
                    sendMessage={sendMessageWithAutoRouting}
                    regenerate={regenerate}
                    stop={stop}
                    suggestedQuestions={chatState.suggestedQuestions}
                    setSuggestedQuestions={(questions) =>
                      dispatch({ type: 'SET_SUGGESTED_QUESTIONS', payload: questions })
                    }
                    status={uiStatus}
                    error={error ?? null}
                    user={user}
                    selectedVisibilityType={chatState.selectedVisibilityType}
                    chatId={initialChatId || (messages.length > 0 ? chatId : undefined)}
                    onVisibilityChange={handleVisibilityChange}
                    initialMessages={initialMessages}
                    isOwner={isOwner}
                    onHighlight={handleHighlight}
                    hasSubmitted={chatState.hasSubmitted}
                    isTransitioning={isTransitioning}
                    onBeforeSubmit={() => setIsTransitioning(true)}
                  />
                )}

                <div ref={bottomRef} style={{ overflowAnchor: 'auto' }} />
              </div>

              {/* Single Form Component with dynamic positioning */}
              {((user && isOwner) || !initialChatId || (!user && chatState.selectedVisibilityType === 'private')) &&
                !isLimitBlocked && (
                  <div
                    className={cn(
                      'transition-all duration-100',
                      messages.length === 0 && !chatState.hasSubmitted
                        ? 'relative w-full max-w-2xl mx-auto'
                        : `fixed bottom-0 z-20 pb-6! sm:pb-2.5! mt-1 p-0 w-full max-w-[95%] sm:max-w-2xl mx-auto ${
                            state === 'expanded'
                              ? 'left-0 right-0 md:left-[calc(var(--sidebar-width))] md:right-0'
                              : 'left-0 right-0 md:left-[calc(var(--sidebar-width-icon))] md:right-0'
                          }`,
                    )}
                  >
                    {/* Passive sign-in nudge — floats above the form when messages exist */}
                    {!user && messages.length > 0 && (
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center w-full">
                        <Link
                          href="/sign-in"
                          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-accent hover:text-foreground shadow-sm transition-all"
                        >
                          This chat won&apos;t be saved · Sign in for history
                          <ArrowRight className="size-3 shrink-0" />
                        </Link>
                      </div>
                    )}

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
                      sendMessage={sendMessageWithAutoRouting}
                      selectedModel={selectedModel}
                      setSelectedModel={handleModelChange}
                      resetSuggestedQuestions={resetSuggestedQuestions}
                      lastSubmittedQueryRef={lastSubmittedQueryRef}
                      selectedGroup={effectiveSelectedGroup}
                      setSelectedGroup={setSelectedGroup}
                      showExperimentalModels={messages.length === 0}
                      status={uiStatus}
                      setHasSubmitted={(hasSubmitted) => {
                        const newValue =
                          typeof hasSubmitted === 'function' ? hasSubmitted(chatState.hasSubmitted) : hasSubmitted;
                        dispatch({ type: 'SET_HAS_SUBMITTED', payload: newValue });
                      }}
                      isLimitBlocked={isLimitBlocked}
                      onOpenSettings={handleOpenSettings}
                      selectedConnectors={selectedConnectors}
                      setSelectedConnectors={setSelectedConnectors}
                      isMultiAgentModeEnabled={Boolean(isMultiAgentModeEnabled)}
                      setIsMultiAgentModeEnabled={
                        user
                          ? (value: boolean | ((prev: boolean) => boolean)) => {
                              const next =
                                typeof value === 'function' ? value(Boolean(isMultiAgentModeEnabled)) : value;
                              setIsMultiAgentModeEnabled(Boolean(next));
                            }
                          : undefined
                      }
                      usageData={
                        usageData
                          ? {
                              messageCount: usageData.messageCount,
                              extremeSearchCount: usageData.extremeSearchCount,
                              error: usageData.error,
                            }
                          : undefined
                      }
                      isTemporaryChatEnabled={isTemporaryChat}
                      isTemporaryChat={isTemporaryChat}
                      isTemporaryChatLocked={isTemporaryChatLocked}
                      setIsTemporaryChatEnabled={setIsTemporaryChatEnabled}
                      autoRoutedModel={autoRoutedModel}
                      onBeforeSubmit={() => setIsTransitioning(true)}
                    />

                    {/* Example Categories - only for non-pro, non-temporary users */}
                    {messages.length === 0 && !chatState.hasSubmitted && !isTemporaryChat && !isUserPro && (
                      <div className="mt-5 space-y-2.5">
                        <ExampleCategories onSelectExample={handleExampleSelect} />
                      </div>
                    )}
                  </div>
                )}

              {/* Form backdrop overlay - hides content below form when in submitted mode */}
              {((user && isOwner) || !initialChatId || (!user && chatState.selectedVisibilityType === 'private')) &&
                !isLimitBlocked &&
                (messages.length > 0 || chatState.hasSubmitted) && (
                  <div
                    className={`fixed right-0 bottom-0! h-24 sm:h-20! z-10 bg-linear-to-t from-background via-background/95 to-background/80 backdrop-blur-sm pointer-events-none ${
                      state === 'expanded'
                        ? 'left-0 md:left-[calc(var(--sidebar-width))]'
                        : 'left-0 md:left-[calc(var(--sidebar-width-icon))]'
                    }`}
                  />
                )}

              {/* Show limit exceeded message */}
              {isLimitBlocked && messages.length > 0 && (
                <div
                  className={`fixed bottom-8 sm:bottom-4 right-0 w-full max-w-[95%] sm:max-w-2xl mx-auto z-20 ${
                    state === 'expanded'
                      ? 'left-0 md:left-[calc(var(--sidebar-width))]'
                      : 'left-0 md:left-[calc(var(--sidebar-width-icon))]'
                  }`}
                >
                  <div className="p-4 bg-background border border-border rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-md">
                          <HugeiconsIcon
                            icon={Crown02Icon}
                            size={16}
                            strokeWidth={1.5}
                            className="text-muted-foreground"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">All search limits reached</p>
                          <p className="text-xs text-muted-foreground">Resets daily at midnight UTC</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            window.location.href = '/pricing';
                          }}
                          className="h-8 px-3 text-xs"
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
        </SidebarInset>
        {!isTemporaryChat && (initialChatId || (pathname?.startsWith('/search/') ? pathname.split('/')[2] : null)) && (
          <ShareDialog
            isOpen={isShareOpen}
            onOpenChange={setIsShareOpen}
            chatId={initialChatId || (pathname?.startsWith('/search/') ? pathname.split('/')[2] : null)}
            selectedVisibilityType={chatState.selectedVisibilityType}
            onVisibilityChange={handleVisibilityChange}
            isOwner={isOwner}
            user={user}
          />
        )}
        {!isTemporaryChat && (initialChatId || (pathname?.startsWith('/search/') ? pathname.split('/')[2] : null)) && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Edit title</DialogTitle>
              </DialogHeader>
              <div className="pt-2">
                <Input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelEditTitle();
                  }}
                  placeholder="Enter title..."
                  maxLength={100}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCancelEditTitle}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTitle} disabled={isSavingTitle}>
                  {isSavingTitle ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {initialChatId && (
          <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the conversation and its content.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Elicitation UX is rendered inline with MCP tool cards in message parts. */}
      </>
    );
  },
);

// Add a display name for the memoized component for better debugging
ChatInterface.displayName = 'ChatInterface';

export { ChatInterface };
