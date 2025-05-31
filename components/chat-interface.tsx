/* eslint-disable @next/next/no-img-element */
"use client";
import 'katex/dist/katex.min.css';


import { useChat, UseChatOptions } from '@ai-sdk/react';
import { CalendarBlank, Clock as PhosphorClock } from '@phosphor-icons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import React, {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import FormComponent from '@/components/ui/form-component';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { cn, SearchGroupId, invalidateChatsCache } from '@/lib/utils';
import { getCurrentUser, suggestQuestions, updateChatVisibility } from '@/app/actions';
import Messages from '@/components/messages';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/lib/db/schema';
import { ChatHistoryDialog } from '@/components/chat-history-dialog';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { useRouter } from 'next/navigation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Navbar } from '@/components/navbar';
import { SignInPromptDialog } from '@/components/sign-in-prompt-dialog';

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
}

const ChatInterface = memo(({ initialChatId, initialMessages, initialVisibility = 'private' }: ChatInterfaceProps): JSX.Element => {
    const router = useRouter();
    const [query] = useQueryState('query', parseAsString.withDefault(''))
    const [q] = useQueryState('q', parseAsString.withDefault(''))

    // Use localStorage hook directly for model selection with a default
    const [selectedModel, setSelectedModel] = useLocalStorage('scira-selected-model', 'scira-default');

    const initialState = useMemo(() => ({
        query: query || q,
    }), [query, q]);

    const lastSubmittedQueryRef = useRef(initialState.query);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [isEditingMessage, setIsEditingMessage] = useState(false);
    const [editingMessageIndex, setEditingMessageIndex] = useState(-1);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const initializedRef = useRef(false);
    const [selectedGroup, setSelectedGroup] = useLocalStorage<SearchGroupId>('scira-selected-group', 'web');
    const [hasSubmitted, setHasSubmitted] = React.useState(false);
    const [hasManuallyScrolled, setHasManuallyScrolled] = useState(false);
    const isAutoScrollingRef = useRef(false);
    const [user, setUser] = useState<User | null>(null);
    const [userLoading, setUserLoading] = useState(true);

    // Generate random UUID once for greeting selection
    const greetingUuidRef = useRef<string>(uuidv4());

    // Memoized greeting to prevent flickering
    const personalizedGreeting = useMemo(() => {
        if (!user?.name) return "What do you want to explore?";
        
        const firstName = user.name.trim().split(' ')[0];
        if (!firstName) return "What do you want to explore?";
        
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
            `Shoot ${firstName}, what's up?`
        ];
        
        // Use user ID + random UUID for truly random but stable greeting
        const seed = user.id + greetingUuidRef.current;
        const seedHash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return greetings[seedHash % greetings.length];
    }, [user?.name, user?.id]);

    // Sign-in prompt dialog state
    const [showSignInPrompt, setShowSignInPrompt] = useState(false);
    const [hasShownSignInPrompt, setHasShownSignInPrompt] = useLocalStorage('scira-signin-prompt-shown', false);
    const signInTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Generate a consistent ID for new chats
    const chatId = useMemo(() => initialChatId ?? uuidv4(), [initialChatId]);

    // Fetch user data after component mounts
    useEffect(() => {
        const fetchUser = async () => {
            try {
                setUserLoading(true);
                const userData = await getCurrentUser();
                if (userData) {
                    setUser(userData as User);
                }
            } catch (error) {
                console.error("Error fetching user:", error);
            } finally {
                setUserLoading(false);
            }
        };

        fetchUser();
    }, []);

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

    const chatOptions: UseChatOptions = useMemo(() => ({
        id: chatId,
        api: '/api/search',
        experimental_throttle: 500,
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
            console.log("[finish reason]:", finishReason);
            // Only generate suggested questions if authenticated user or private chat
            if (message.content && (finishReason === 'stop' || finishReason === 'length') &&
                (user || selectedVisibilityType === 'private')) {
                const newHistory = [
                    { role: "user", content: lastSubmittedQueryRef.current },
                    { role: "assistant", content: message.content },
                ];
                const { questions } = await suggestQuestions(newHistory);
                setSuggestedQuestions(questions);
            }
        },
        onError: (error) => {
            console.error("Chat error:", error.cause, error.message);
            toast.error("An error occurred.", {
                description: `Oops! An error occurred while processing your request. ${error.message}`,
            });
        },
        initialMessages: initialMessages,
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [selectedModel, selectedGroup, chatId, initialChatId, initialMessages, selectedVisibilityType]);

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
        experimental_resume
    } = useChat(chatOptions);

    useAutoResume({
        autoResume: true,
        initialMessages: initialMessages || [],
        experimental_resume,
        data,
        setMessages,
    });

    useEffect(() => {
        if (user && status === 'streaming' && messages.length > 0) {
            console.log("[chatId]:", chatId);
            // Invalidate chats cache to refresh the list
            invalidateChatsCache();
        }
    }, [user, status, router, chatId, initialChatId, messages.length]);

    useEffect(() => {
        if (!initializedRef.current && initialState.query && !messages.length && !initialChatId) {
            initializedRef.current = true;
            console.log("[initial query]:", initialState.query);
            append({
                content: initialState.query,
                role: 'user'
            });
        }
    }, [initialState.query, append, setInput, messages.length, initialChatId]);

    // Generate suggested questions when opening a chat directly
    useEffect(() => {
        const generateSuggestionsForInitialMessages = async () => {
            // Only generate if we have initial messages, no suggested questions yet, 
            // user is authenticated or chat is private, and status is not streaming
            if (initialMessages && initialMessages.length >= 2 &&
                !suggestedQuestions.length &&
                (user || selectedVisibilityType === 'private') &&
                status === 'ready'
            ) {
                const lastUserMessage = initialMessages.filter(m => m.role === 'user').pop();
                const lastAssistantMessage = initialMessages.filter(m => m.role === 'assistant').pop();

                if (lastUserMessage && lastAssistantMessage) {
                    const newHistory = [
                        { role: "user", content: lastUserMessage.content },
                        { role: "assistant", content: lastAssistantMessage.content },
                    ];
                    try {
                        const { questions } = await suggestQuestions(newHistory);
                        setSuggestedQuestions(questions);
                    } catch (error) {
                        console.error("Error generating suggested questions:", error);
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
                bottomRef.current.scrollIntoView({ behavior: "smooth" });
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
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setCommandDialogOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Define the model change handler
    const handleModelChange = useCallback((model: string) => {
        setSelectedModel(model);
    }, [setSelectedModel]);

    const resetSuggestedQuestions = useCallback(() => {
        setSuggestedQuestions([]);
    }, []);

    // Handle visibility change
    const handleVisibilityChange = useCallback(async (visibility: VisibilityType) => {
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
    }, [chatId]);

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

                <div className={`w-full p-2 sm:p-4 ${status === 'ready' && messages.length === 0
                    ? 'min-h-screen! flex! flex-col! items-center! justify-center!' // Center everything when no messages
                    : 'mt-20! sm:mt-16! flex flex-col!' // Add top margin when showing messages
                    }`}>
                    <div className={`w-full max-w-[95%] sm:max-w-2xl space-y-6 p-0 mx-auto transition-all duration-300`}>
                        {status === 'ready' && messages.length === 0 && (
                            <div className="text-center">
                                <h1 className="text-2xl sm:text-4xl mb-4 sm:mb-6 text-neutral-800 dark:text-neutral-100 font-syne!">
                                    {user ? personalizedGreeting : "What do you want to explore?"}
                                </h1>
                            </div>
                        )}

                        {messages.length === 0 && !hasSubmitted && (
                            <div
                                className={cn('mt-4!')}
                            >
                                <FormComponent
                                    chatId={chatId}
                                    user={user!}
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
                                />
                            </div>
                        )}

                        {/* Use the Messages component */}
                        {messages.length > 0 && (
                            <Messages
                                messages={messages}
                                lastUserMessageIndex={lastUserMessageIndex}
                                isEditingMessage={isEditingMessage}
                                editingMessageIndex={editingMessageIndex}
                                input={input}
                                setInput={setInput}
                                setIsEditingMessage={setIsEditingMessage}
                                setEditingMessageIndex={setEditingMessageIndex}
                                setMessages={setMessages}
                                append={append}
                                reload={reload}
                                suggestedQuestions={suggestedQuestions}
                                setSuggestedQuestions={setSuggestedQuestions}
                                status={status}
                                error={error}
                                user={user}
                                selectedVisibilityType={selectedVisibilityType}
                                chatId={initialChatId || (messages.length > 0 ? chatId : undefined)}
                                onVisibilityChange={handleVisibilityChange}
                                initialMessages={initialMessages}
                            />
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Only hide form for unauthenticated users on public chats */}
                    {(messages.length > 0 || hasSubmitted) && (user || selectedVisibilityType === 'private') && (
                        <div
                            className="fixed bottom-6 sm:bottom-4 left-0 right-0 w-full max-w-[26rem] sm:max-w-2xl mx-auto z-20"
                        >
                            <FormComponent
                                chatId={chatId}
                                input={input}
                                user={user!}
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
                            />
                        </div>
                    )}

                </div>
            </div>
        </TooltipProvider>
    );
});

// Add a display name for the memoized component for better debugging
ChatInterface.displayName = "ChatInterface";

export { ChatInterface }; 