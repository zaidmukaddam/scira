/* eslint-disable @next/next/no-img-element */
"use client";
import 'katex/dist/katex.min.css';

import { AnimatePresence, motion } from 'framer-motion';
import { GeistMono } from 'geist/font/mono';
import { useChat, UseChatOptions } from '@ai-sdk/react';
import { ReasoningUIPart, ToolInvocationUIPart, TextUIPart, SourceUIPart } from '@ai-sdk/ui-utils';
import { CalendarBlank, Clock as PhosphorClock, Info } from '@phosphor-icons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
    AlignLeft,
    ArrowLeftRight,
    ArrowRight,
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    Moon,
    Plus,
    RefreshCw,
    Sun,
    WrapText,
    X
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Latex from 'react-latex-next';
import Marked, { ReactRenderer } from 'marked-react';
import React, {
    memo,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import FormComponent from '@/components/ui/form-component';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from '@/components/ui/separator';
import { InstallPrompt } from '@/components/InstallPrompt';
import { ReasoningPartView, ReasoningPart } from '@/components/reasoning-part';
import ToolInvocationListView from '@/components/tool-invocation-list-view';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { cn, getUserId, SearchGroupId } from '@/lib/utils';
import {
    suggestQuestions
} from './actions';

export const maxDuration = 120;

interface Attachment {
    name: string;
    contentType: string;
    url: string;
    size: number;
}

const VercelIcon = ({ size = 16 }: { size: number }) => {
    return (
        <svg
            height={size}
            strokeLinejoin="round"
            viewBox="0 0 16 16"
            width={size}
            style={{ color: "currentcolor" }}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M8 1L16 15H0L8 1Z"
                fill="currentColor"
            ></path>
        </svg>
    );
};

const HomeContent = () => {
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
    const [selectedGroup, setSelectedGroup] = useState<SearchGroupId>('web');
    const [hasSubmitted, setHasSubmitted] = React.useState(false);
    const [hasManuallyScrolled, setHasManuallyScrolled] = useState(false);
    const isAutoScrollingRef = useRef(false);

    // Get stored user ID
    const userId = useMemo(() => getUserId(), []);

    const chatOptions: UseChatOptions = useMemo(() => ({
        api: '/api/search',
        experimental_throttle: 500,
        maxSteps: 5,
        body: {
            model: selectedModel,
            group: selectedGroup,
            user_id: userId,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        onFinish: async (message, { finishReason }) => {
            console.log("[finish reason]:", finishReason);
            if (message.content && (finishReason === 'stop' || finishReason === 'length')) {
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
    }), [selectedModel, selectedGroup, userId]);

    const {
        input,
        messages,
        setInput,
        append,
        handleSubmit,
        setMessages,
        reload,
        stop,
        status,
    } = useChat(chatOptions);

    useEffect(() => {
        if (!initializedRef.current && initialState.query && !messages.length) {
            initializedRef.current = true;
            console.log("[initial query]:", initialState.query);
            append({
                content: initialState.query,
                role: 'user'
            });
        }
    }, [initialState.query, append, setInput, messages.length]);

    const ThemeToggle: React.FC = () => {
        const { resolvedTheme, setTheme } = useTheme();

        return (
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        );
    };


    const CopyButton = ({ text }: { text: string }) => {
        const [isCopied, setIsCopied] = useState(false);

        return (
            <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                    if (!navigator.clipboard) {
                        return;
                    }
                    await navigator.clipboard.writeText(text);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                    toast.success("Copied to clipboard");
                }}
                className="h-8 px-2 text-xs rounded-full"
            >
                {isCopied ? (
                    <Check className="h-4 w-4" />
                ) : (
                    <Copy className="h-4 w-4" />
                )}
            </Button>
        );
    };

    interface MarkdownRendererProps {
        content: string;
    }

    interface CitationLink {
        text: string;
        link: string;
    }
    const isValidUrl = (str: string) => {
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    };

    const preprocessLaTeX = (content: string) => {
        // First, handle escaped delimiters to prevent double processing
        let processedContent = content
            .replace(/\\\[/g, '___BLOCK_OPEN___')
            .replace(/\\\]/g, '___BLOCK_CLOSE___')
            .replace(/\\\(/g, '___INLINE_OPEN___')
            .replace(/\\\)/g, '___INLINE_CLOSE___');

        // Process block equations
        processedContent = processedContent.replace(
            /___BLOCK_OPEN___([\s\S]*?)___BLOCK_CLOSE___/g,
            (_, equation) => `$$${equation.trim()}$$`
        );

        // Process inline equations
        processedContent = processedContent.replace(
            /___INLINE_OPEN___([\s\S]*?)___INLINE_CLOSE___/g,
            (_, equation) => `$${equation.trim()}$`
        );

        // Handle common LaTeX expressions not wrapped in delimiters
        processedContent = processedContent.replace(
            /(\b[A-Z](?:_\{[^{}]+\}|\^[^{}]+|_[a-zA-Z\d]|\^[a-zA-Z\d])+)/g,
            (match) => `$${match}$`
        );

        // Handle any remaining escaped delimiters that weren't part of a complete pair
        processedContent = processedContent
            .replace(/___BLOCK_OPEN___/g, '\\[')
            .replace(/___BLOCK_CLOSE___/g, '\\]')
            .replace(/___INLINE_OPEN___/g, '\\(')
            .replace(/___INLINE_CLOSE___/g, '\\)');

        return processedContent;
    };

    const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
        const citationLinks = useMemo<CitationLink[]>(() => {
            // Improved regex to better handle various markdown link formats
            return Array.from(content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)).map(match => {
                const text = match[1]?.trim() || '';
                const link = match[2]?.trim() || '';
                return { text, link };
            });
        }, [content]);

        interface CodeBlockProps {
            language: string | undefined;
            children: string;
        }

        const CodeBlock: React.FC<CodeBlockProps> = ({ language, children }) => {
            const [isCopied, setIsCopied] = useState(false);
            const [isWrapped, setIsWrapped] = useState(false);
            const { theme } = useTheme();

            const handleCopy = useCallback(async () => {
                await navigator.clipboard.writeText(children);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }, [children]);

            const toggleWrap = useCallback(() => {
                setIsWrapped(prev => !prev);
            }, []);

            return (
                <div className="group my-5 relative">
                    <div className="rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-xs">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                            <div className="px-2 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                {language || 'text'}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={toggleWrap}
                                    className={`
                                      px-2 py-1
                                      rounded text-xs font-medium
                                      transition-all duration-200
                                      ${isWrapped ? 'text-primary' : 'text-neutral-500 dark:text-neutral-400'}
                                      hover:bg-neutral-200 dark:hover:bg-neutral-700
                                      flex items-center gap-1.5
                                    `}
                                    aria-label="Toggle line wrapping"
                                >
                                    {isWrapped ? (
                                        <>
                                            <ArrowLeftRight className="h-3 w-3" />
                                            <span className="hidden sm:inline">Unwrap</span>
                                        </>
                                    ) : (
                                        <>
                                            <WrapText className="h-3 w-3" />
                                            <span className="hidden sm:inline">Wrap</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className={`
                                      px-2 py-1
                                      rounded text-xs font-medium
                                      transition-all duration-200
                                      ${isCopied ? 'text-primary dark:text-primary' : 'text-neutral-500 dark:text-neutral-400'}
                                      hover:bg-neutral-200 dark:hover:bg-neutral-700
                                      flex items-center gap-1.5
                                    `}
                                    aria-label="Copy code"
                                >
                                    {isCopied ? (
                                        <>
                                            <Check className="h-3 w-3" />
                                            <span className="hidden sm:inline">Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" />
                                            <span className="hidden sm:inline">Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <SyntaxHighlighter
                            language={language || 'text'}
                            style={theme === 'dark' ? oneDark : oneLight}
                            customStyle={{
                                margin: 0,
                                padding: '0.75rem 0.25rem 0.75rem',
                                backgroundColor: theme === 'dark' ? '#171717' : 'transparent',
                                borderRadius: 0,
                                borderBottomLeftRadius: '0.375rem',
                                borderBottomRightRadius: '0.375rem',
                                fontFamily: GeistMono.style.fontFamily,
                            }}
                            showLineNumbers={true}
                            lineNumberStyle={{
                                textAlign: 'right',
                                color: theme === 'dark' ? '#6b7280' : '#808080',
                                backgroundColor: 'transparent',
                                fontStyle: 'normal',
                                marginRight: '1em',
                                paddingRight: '0.5em',
                                fontFamily: GeistMono.style.fontFamily,
                                minWidth: '2em'
                            }}
                            lineNumberContainerStyle={{
                                backgroundColor: theme === 'dark' ? '#171717' : '#f5f5f5',
                                float: 'left'
                            }}
                            wrapLongLines={isWrapped}
                            codeTagProps={{
                                style: {
                                    fontFamily: GeistMono.style.fontFamily,
                                    fontSize: '0.85em',
                                    whiteSpace: isWrapped ? 'pre-wrap' : 'pre',
                                    overflowWrap: isWrapped ? 'break-word' : 'normal',
                                    wordBreak: isWrapped ? 'break-word' : 'keep-all'
                                }
                            }}
                        >
                            {children}
                        </SyntaxHighlighter>
                    </div>
                </div>
            );
        };

        CodeBlock.displayName = 'CodeBlock';

        const LinkPreview = ({ href, title }: { href: string, title?: string }) => {
            const domain = new URL(href).hostname;

            return (
                <div className="flex flex-col bg-white dark:bg-neutral-800 text-xs m-0">
                    <div className="flex items-center h-6 space-x-1.5 px-2 pt-2 text-xs text-neutral-600 dark:text-neutral-300">
                        <Image
                            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
                            alt=""
                            width={12}
                            height={12}
                            className="rounded-sm"
                        />
                        <span className="truncate font-medium">{domain}</span>
                    </div>
                    {title && (
                        <div className="px-2 pb-2 pt-1">
                            <h3 className="font-normal text-sm m-0 text-neutral-700 dark:text-neutral-200 line-clamp-3">
                                {title}
                            </h3>
                        </div>
                    )}
                </div>
            );
        };

        const renderHoverCard = (href: string, text: React.ReactNode, isCitation: boolean = false, citationText?: string) => {
            const title = citationText || (typeof text === 'string' ? text : '');

            return (
                <HoverCard openDelay={10}>
                    <HoverCardTrigger asChild>
                        <Link
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={isCitation
                                ? "cursor-pointer text-xs text-primary py-0.5 px-1.5 m-0 bg-primary/10 dark:bg-primary/20 rounded-full no-underline font-medium"
                                : "text-primary dark:text-primary-light no-underline hover:underline font-medium"}
                        >
                            {text}
                        </Link>
                    </HoverCardTrigger>
                    <HoverCardContent
                        side="top"
                        align="start"
                        sideOffset={5}
                        className="w-56 p-0 shadow-xs border border-neutral-200 dark:border-neutral-700 rounded-md overflow-hidden"
                    >
                        <LinkPreview href={href} title={title} />
                    </HoverCardContent>
                </HoverCard>
            );
        };

        const generateKey = () => {
            return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }

        const renderer: Partial<ReactRenderer> = {
            text(text: string) {
                if (!text.includes('$')) return text;
                return (
                    <Latex
                        delimiters={[
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false }
                        ]}
                        key={generateKey()}
                    >
                        {text}
                    </Latex>
                );
            },
            paragraph(children) {
                if (typeof children === 'string' && children.includes('$')) {
                    return (
                        <p className="my-5 leading-relaxed text-neutral-700 dark:text-neutral-300">
                            <Latex
                                delimiters={[
                                    { left: '$$', right: '$$', display: true },
                                    { left: '$', right: '$', display: false }
                                ]}
                                key={generateKey()}
                            >
                                {children}
                            </Latex>
                        </p>
                    );
                }
                return <p className="my-5 leading-relaxed text-neutral-700 dark:text-neutral-300">{children}</p>;
            },
            code(children, language) {
                return <CodeBlock language={language} key={generateKey()}>{String(children)}</CodeBlock>;
            },
            link(href, text) {
                const citationIndex = citationLinks.findIndex(link => link.link === href);
                if (citationIndex !== -1) {
                    // For citations, show the citation text in the hover card
                    const citationText = citationLinks[citationIndex].text;
                    return (
                        <sup key={generateKey()}>
                            {renderHoverCard(href, citationIndex + 1, true, citationText)}
                        </sup>
                    );
                }
                return isValidUrl(href)
                    ? renderHoverCard(href, text)
                    : <a href={href} className="text-primary dark:text-primary-light hover:underline font-medium">{text}</a>;
            },
            heading(children, level) {
                const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
                const sizeClasses = {
                    1: "text-2xl md:text-3xl font-extrabold mt-8 mb-4",
                    2: "text-xl md:text-2xl font-bold mt-7 mb-3",
                    3: "text-lg md:text-xl font-semibold mt-6 mb-3",
                    4: "text-base md:text-lg font-medium mt-5 mb-2",
                    5: "text-sm md:text-base font-medium mt-4 mb-2",
                    6: "text-xs md:text-sm font-medium mt-4 mb-2",
                }[level] || "";

                return (
                    <HeadingTag className={`${sizeClasses} text-neutral-900 dark:text-neutral-50 tracking-tight`}>
                        {children}
                    </HeadingTag>
                );
            },
            list(children, ordered) {
                const ListTag = ordered ? 'ol' : 'ul';
                return (
                    <ListTag className={`my-5 pl-6 space-y-2 text-neutral-700 dark:text-neutral-300 ${ordered ? 'list-decimal' : 'list-disc'}`}>
                        {children}
                    </ListTag>
                );
            },
            listItem(children) {
                return <li className="pl-1 leading-relaxed">{children}</li>;
            },
            blockquote(children) {
                return (
                    <blockquote className="my-6 border-l-4 border-primary/30 dark:border-primary/20 pl-4 py-1 text-neutral-700 dark:text-neutral-300 italic bg-neutral-50 dark:bg-neutral-900/50 rounded-r-md">
                        {children}
                    </blockquote>
                );
            },
            table(children) {
                return (
                    <div className="w-full my-6 overflow-hidden rounded-md">
                        <div className="w-full overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800 shadow-xs">
                            <table className="w-full border-collapse min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 m-0!">
                                {children}
                            </table>
                        </div>
                    </div>
                );
            },
            tableRow(children) {
                return (
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 last:border-0">
                        {children}
                    </tr>
                );
            },
            tableCell(children, flags) {
                const align = flags.align ? `text-${flags.align}` : 'text-left';
                const isHeader = flags.header;

                return isHeader ? (
                    <th className={cn(
                        "px-4 py-2.5 text-sm font-semibold text-neutral-900 dark:text-neutral-50",
                        "bg-neutral-100 dark:bg-neutral-800/90",
                        "whitespace-nowrap",
                        align
                    )}>
                        {children}
                    </th>
                ) : (
                    <td className={cn(
                        "px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300",
                        "bg-white dark:bg-neutral-900",
                        align
                    )}>
                        {children}
                    </td>
                );
            },
            tableHeader(children) {
                return (
                    <thead className="bg-neutral-100 dark:bg-neutral-800/90">
                        {children}
                    </thead>
                );
            },
            tableBody(children) {
                return (
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                        {children}
                    </tbody>
                );
            },
        };

        return (
            <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none dark:text-neutral-200 font-sans">
                <Marked renderer={renderer}>
                    {content}
                </Marked>
            </div>
        );
    };


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

    const handleSuggestedQuestionClick = useCallback(async (question: string) => {
        setSuggestedQuestions([]);

        await append({
            content: question.trim(),
            role: 'user'
        });
    }, [append]);

    const handleMessageEdit = useCallback((index: number) => {
        setIsEditingMessage(true);
        setEditingMessageIndex(index);
        setInput(messages[index].content);
    }, [messages, setInput]);

    const handleMessageUpdate = useCallback((e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (input.trim()) {
            // Get the history *before* the message being edited
            const historyBeforeEdit = messages.slice(0, editingMessageIndex);

            // Get the original message to preserve attachments if any
            const originalMessage = messages[editingMessageIndex];

            // Update the hook's message state to remove messages after the edited one
            setMessages(historyBeforeEdit);

            // Store the edited message content for the next step
            const editedContent = input.trim();
            lastSubmittedQueryRef.current = editedContent; // Update ref here

            // Clear the input field immediately
            setInput('');

            // Reset suggested questions
            setSuggestedQuestions([]);

            // Extract attachments from the original message
            const attachments = originalMessage?.experimental_attachments || [];

            // Append the edited message with proper attachments using chatRequestOptions format
            append(
                {
                    role: 'user', // Role is always 'user' for edited messages
                    content: editedContent,
                },
                {
                    experimental_attachments: attachments
                }
            );

            // Reset editing state
            setIsEditingMessage(false);
            setEditingMessageIndex(-1);

        } else {
            toast.error("Please enter a valid message.");
        }
    }, [input, messages, editingMessageIndex, setMessages, setInput, append, setSuggestedQuestions]);

    const AboutButton = () => {
        return (
            <Link href="/about">
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full w-8 h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                >
                    <Info className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                </Button>
            </Link>
        );
    };

    interface NavbarProps { }

    const Navbar: React.FC<NavbarProps> = () => {
        return (
            <div className={cn(
                "fixed top-0 left-0 right-0 z-60 flex justify-between items-center p-4",
                // Add opaque background only after submit
                status === "streaming" || status === 'ready' ? "bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60" : "bg-background",
            )}>
                <div className="flex items-center gap-4">
                    <Link href="/new">
                        <Button
                            type="button"
                            variant={'secondary'}
                            className="rounded-full bg-accent hover:bg-accent/80 backdrop-blur-xs group transition-all hover:scale-105 pointer-events-auto"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-all" />
                            <span className="text-sm ml-2 group-hover:block hidden animate-in fade-in duration-300">
                                New
                            </span>
                        </Button>
                    </Link>
                </div>
                <div className='flex items-center space-x-4'>
                    <Link
                        target="_blank"
                        href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzaidmukaddam%2Fscira&env=XAI_API_KEY,OPENAI_API_KEY,GROQ_API_KEY,E2B_API_KEY,ELEVENLABS_API_KEY,TAVILY_API_KEY,EXA_API_KEY,TMDB_API_KEY,YT_ENDPOINT,FIRECRAWL_API_KEY,OPENWEATHER_API_KEY,SANDBOX_TEMPLATE_ID,GOOGLE_MAPS_API_KEY,MAPBOX_ACCESS_TOKEN,TRIPADVISOR_API_KEY,AVIATION_STACK_API_KEY,CRON_SECRET,BLOB_READ_WRITE_TOKEN,NEXT_PUBLIC_MAPBOX_TOKEN,NEXT_PUBLIC_POSTHOG_KEY,NEXT_PUBLIC_POSTHOG_HOST,NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,MEM0_API_KEY,MEM0_ORG_ID,MEM0_PROJECT_ID,SMITHERY_API_KEY&envDescription=API%20keys%20and%20configuration%20required%20for%20Scira%20to%20function%20(including%20SMITHERY_API_KEY)"
                        className="flex flex-row gap-2 items-center py-1.5 px-2 rounded-md 
                            bg-accent hover:bg-accent/80
                            backdrop-blur-xs text-foreground shadow-sm text-sm
                            transition-all duration-200"
                    >
                        <VercelIcon size={14} />
                        <span className='hidden sm:block'>Deploy with Vercel</span>
                        <span className='sm:hidden block'>Deploy</span>
                    </Link>
                    <AboutButton />
                    <ThemeToggle />
                </div>
            </div>
        );
    };

    // Define the model change handler
    const handleModelChange = useCallback((model: string) => {
        setSelectedModel(model);
    }, [setSelectedModel]);

    const resetSuggestedQuestions = useCallback(() => {
        setSuggestedQuestions([]);
    }, []);


    const memoizedMessages = useMemo(() => {
        // Create a shallow copy
        const msgs = [...messages];

        return msgs.filter((message) => {
            // Keep all user messages
            if (message.role === 'user') return true;

            // For assistant messages
            if (message.role === 'assistant') {
                // Keep messages that have tool invocations
                if (message.parts?.some(part => part.type === 'tool-invocation')) {
                    return true;
                }
                // Keep messages that have text parts but no tool invocations
                if (message.parts?.some(part => part.type === 'text') ||
                    !message.parts?.some(part => part.type === 'tool-invocation')) {
                    return true;
                }
                return false;
            }
            return false;
        });
    }, [messages]);

    // Track visibility state for each reasoning section using messageIndex-partIndex as key
    const [reasoningVisibilityMap, setReasoningVisibilityMap] = useState<Record<string, boolean>>({});
    const [reasoningFullscreenMap, setReasoningFullscreenMap] = useState<Record<string, boolean>>({});

    const handleRegenerate = useCallback(async () => {
        if (status !== 'ready') {
            toast.error("Please wait for the current response to complete!");
            return;
        }

        const lastUserMessage = messages.findLast(m => m.role === 'user');
        if (!lastUserMessage) return;

        // Remove the last assistant message
        const newMessages = messages.slice(0, -1);
        setMessages(newMessages);
        setSuggestedQuestions([]);

        // Resubmit the last user message
        await reload();
    }, [status, messages, setMessages, reload]);

    // Add this type at the top with other interfaces
    type MessagePart = TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart;

    // Update the renderPart function signature
    const renderPart = (
        part: MessagePart,
        messageIndex: number,
        partIndex: number,
        parts: MessagePart[],
        message: any,
    ) => {
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
            const isComplete = parts.some((p, i) =>
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
            const hasRelatedToolInvocation = parts.some(p =>
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
                                        onClick={() => handleRegenerate()}
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
                const hasParallelToolInvocation = parts.some(p => p.type === 'tool-invocation');
                const isComplete = parts.some((p, i) => i > partIndex && (p.type === "text" || p.type === "tool-invocation"));
                const timing = reasoningTimings[sectionKey];
                let duration = null;
                if (timing) {
                    if (timing.endTime) {
                        duration = ((timing.endTime - timing.startTime) / 1000).toFixed(3);
                    }
                }
                const parallelTool = hasParallelToolInvocation ? (parts.find(p => p.type === 'tool-invocation')?.toolInvocation?.toolName ?? null) : null;

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

    // Add near other state declarations in HomeContent
    interface ReasoningTiming {
        startTime: number;
        endTime?: number;
    }

    const [reasoningTimings, setReasoningTimings] = useState<Record<string, ReasoningTiming>>({});

    // Move the hooks from renderPart to component level
    const reasoningScrollRef = useRef<HTMLDivElement>(null);

    // Add effect for auto-scrolling reasoning content
    useEffect(() => {
        // Find active reasoning parts that are not complete
        const activeReasoning = messages.flatMap((message, messageIndex) =>
            (message.parts || [])
                .map((part, partIndex) => ({ part, messageIndex, partIndex }))
                .filter(({ part }) => part.type === "reasoning")
                .filter(({ messageIndex, partIndex }) => {
                    const message = messages[messageIndex];
                    // Check if reasoning is complete
                    return !(message.parts || []).some((p, i) =>
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
            message.parts?.forEach((part, partIndex) => {
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

    const WidgetSection = memo(() => {
        const [currentTime, setCurrentTime] = useState(new Date());
        const timerRef = useRef<NodeJS.Timeout>();

        useEffect(() => {
            // Sync with the nearest second
            const now = new Date();
            const delay = 1000 - now.getMilliseconds();

            // Initial sync
            const timeout = setTimeout(() => {
                setCurrentTime(new Date());

                // Then start the interval
                timerRef.current = setInterval(() => {
                    setCurrentTime(new Date());
                }, 1000);
            }, delay);

            return () => {
                clearTimeout(timeout);
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            };
        }, []);

        // Get user's timezone
        const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Format date and time with timezone
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: timezone
        });

        const timeFormatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: timezone
        });

        const formattedDate = dateFormatter.format(currentTime);
        const formattedTime = timeFormatter.format(currentTime);

        const handleDateTimeClick = useCallback(() => {
            if (status !== 'ready') return;

            append({
                content: `What's the current date and time?`,
                role: 'user'
            });

            lastSubmittedQueryRef.current = `What's the current date and time?`;
            setHasSubmitted(true);
        }, []);

        return (
            <div className="mt-8 w-full">
                <div className="flex flex-wrap gap-3 justify-center">
                    {/* Time Widget */}
                    <Button
                        variant="outline"
                        className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:shadow-xs transition-all h-auto"
                        onClick={handleDateTimeClick}
                    >
                        <PhosphorClock weight="duotone" className="h-5 w-5 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                            {formattedTime}
                        </span>
                    </Button>

                    {/* Date Widget */}
                    <Button
                        variant="outline"
                        className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:shadow-xs transition-all h-auto"
                        onClick={handleDateTimeClick}
                    >
                        <CalendarBlank weight="duotone" className="h-5 w-5 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                            {formattedDate}
                        </span>
                    </Button>
                </div>
            </div>
        );
    });

    WidgetSection.displayName = 'WidgetSection';

    return (
        <div className="flex flex-col font-sans! items-center min-h-screen bg-background text-foreground transition-all duration-500">
            <Navbar />

            <div className={`w-full p-2 sm:p-4 ${status === 'ready' && messages.length === 0
                ? 'min-h-screen! flex! flex-col! items-center! justify-center!' // Center everything when no messages
                : 'mt-20! sm:mt-16!' // Add top margin when showing messages
                }`}>
                <div className={`w-full max-w-[90%] sm:max-w-2xl space-y-6 p-0 mx-auto transition-all duration-300`}>
                    {status === 'ready' && messages.length === 0 && (
                        <div className="text-center">
                            <h1 className="text-2xl sm:text-4xl mb-6 text-neutral-800 dark:text-neutral-100 font-syne!">
                                What do you want to explore?
                            </h1>
                        </div>
                    )}
                    <AnimatePresence>
                        {messages.length === 0 && !hasSubmitted && (
                            <motion.div
                                initial={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ duration: 0.5 }}
                                className={cn('mt-4!')}
                            >
                                <FormComponent
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
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Add the widget section below form when no messages */}
                    {messages.length === 0 && (
                        <div>
                            <WidgetSection />
                        </div>
                    )}

                    {/* hide this if messages are empty */}
                    {messages.length > 0 && (
                        <div className="space-y-4 sm:space-y-6 mb-32">
                            {memoizedMessages.map((message, index) => (
                                <div key={index} className={`${
                                    // Add border only if this is an assistant message AND there's a next message
                                    message.role === 'assistant' && index < memoizedMessages.length - 1
                                        ? 'mb-8! pb-8 border-b border-neutral-200 dark:border-neutral-800'
                                        : ''
                                    }`}>
                                    {message.role === 'user' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5 }}
                                            className="mb-4 px-0"
                                        >
                                            <div className="grow min-w-0">
                                                {isEditingMessage && editingMessageIndex === index ? (
                                                    <form onSubmit={handleMessageUpdate} className="w-full">
                                                        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                                                            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                                                                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                                                    Edit Query
                                                                </span>
                                                                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-[9px] border border-neutral-200 dark:border-neutral-700 flex items-center">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => {
                                                                            setIsEditingMessage(false);
                                                                            setEditingMessageIndex(-1);
                                                                            setInput('');
                                                                        }}
                                                                        className="h-7 w-7 rounded-l-lg! rounded-r-none! text-neutral-500 dark:text-neutral-400 hover:text-primary"
                                                                        disabled={status === 'submitted' || status === 'streaming'}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                    <Separator orientation="vertical" className="h-7 bg-neutral-200 dark:bg-neutral-700" />
                                                                    <Button
                                                                        type="submit"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 rounded-r-lg! rounded-l-none! text-neutral-500 dark:text-neutral-400 hover:text-primary"
                                                                        disabled={status === 'submitted' || status === 'streaming'}
                                                                    >
                                                                        <ArrowRight className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <div className="p-4">
                                                                <textarea
                                                                    value={input}
                                                                    onChange={(e) => setInput(e.target.value)}
                                                                    rows={3}
                                                                    className="w-full resize-none rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 text-base text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-primary/50"
                                                                    placeholder="Edit your message..."
                                                                />
                                                            </div>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <div className="group relative">
                                                        <div className="relative">
                                                            <p className="text-xl font-medium font-sans break-words text-neutral-900 dark:text-neutral-100 pr-10 sm:pr-12">
                                                                {message.content}
                                                            </p>
                                                            {!isEditingMessage && index === lastUserMessageIndex && (
                                                                <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent rounded-[9px] border border-neutral-200 dark:border-neutral-700 flex items-center">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleMessageEdit(index)}
                                                                        className="h-7 w-7 rounded-l-lg! rounded-r-none! text-neutral-500 dark:text-neutral-400 hover:text-primary"
                                                                        disabled={status === 'submitted' || status === 'streaming'}
                                                                    >
                                                                        <svg
                                                                            width="15"
                                                                            height="15"
                                                                            viewBox="0 0 15 15"
                                                                            fill="none"
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            className="h-4 w-4"
                                                                        >
                                                                            <path
                                                                                d="M12.1464 1.14645C12.3417 0.951184 12.6583 0.951184 12.8535 1.14645L14.8535 3.14645C15.0488 3.34171 15.0488 3.65829 14.8535 3.85355L10.9109 7.79618C10.8349 7.87218 10.7471 7.93543 10.651 7.9835L6.72359 9.94721C6.53109 10.0435 6.29861 10.0057 6.14643 9.85355C5.99425 9.70137 5.95652 9.46889 6.05277 9.27639L8.01648 5.34897C8.06455 5.25283 8.1278 5.16507 8.2038 5.08907L12.1464 1.14645ZM12.5 2.20711L8.91091 5.79618L7.87266 7.87267L9.94915 6.83442L13.5382 3.24535L12.5 2.20711ZM8.99997 1.49997C9.27611 1.49997 9.49997 1.72383 9.49997 1.99997C9.49997 2.27611 9.27611 2.49997 8.99997 2.49997H4.49997C3.67154 2.49997 2.99997 3.17154 2.99997 3.99997V11C2.99997 11.8284 3.67154 12.5 4.49997 12.5H11.5C12.3284 12.5 13 11.8284 13 11V6.49997C13 6.22383 13.2238 5.99997 13.5 5.99997C13.7761 5.99997 14 6.22383 14 6.49997V11C14 12.3807 12.8807 13.5 11.5 13.5H4.49997C3.11926 13.5 1.99997 12.3807 1.99997 11V3.99997C1.99997 2.61926 3.11926 1.49997 4.49997 1.49997H8.99997Z"
                                                                                fill="currentColor"
                                                                                fillRule="evenodd"
                                                                                clipRule="evenodd"
                                                                            />
                                                                        </svg>
                                                                    </Button>
                                                                    <Separator orientation="vertical" className="h-7" />
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(message.content);
                                                                            toast.success("Copied to clipboard");
                                                                        }}
                                                                        className="h-7 w-7 rounded-r-lg! rounded-l-none! text-neutral-500 dark:text-neutral-400 hover:text-primary"
                                                                    >
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {message.experimental_attachments && message.experimental_attachments.length > 0 && (
                                                            <AttachmentsBadge attachments={message.experimental_attachments} />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {message.role === 'assistant' && (
                                        <>
                                            {message.parts?.map((part, partIndex) =>
                                                renderPart(
                                                    part as MessagePart,
                                                    index,
                                                    partIndex,
                                                    message.parts as MessagePart[],
                                                    message,
                                                )
                                            )}

                                            {/* Add suggested questions if this is the last message and it's from the assistant */}
                                            {index === memoizedMessages.length - 1 && suggestedQuestions.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 20 }}
                                                    transition={{ duration: 0.5 }}
                                                    className="w-full max-w-xl sm:max-w-2xl mt-6"
                                                >
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <AlignLeft className="w-5 h-5 text-primary" />
                                                        <h2 className="font-semibold text-base text-neutral-800 dark:text-neutral-200">Suggested questions</h2>
                                                    </div>
                                                    <div className="space-y-2 flex flex-col">
                                                        {suggestedQuestions.map((question, index) => (
                                                            <Button
                                                                key={index}
                                                                variant="ghost"
                                                                className="w-fit font-medium rounded-2xl p-1 justify-start text-left h-auto py-2 px-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 whitespace-normal"
                                                                onClick={() => handleSuggestedQuestionClick(question)}
                                                            >
                                                                {question}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                <AnimatePresence>
                    {(messages.length > 0 || hasSubmitted) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.5 }}
                            className="fixed bottom-4 left-0 right-0 w-full max-w-[90%] sm:max-w-2xl mx-auto z-20"
                        >
                            <FormComponent
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
                                showExperimentalModels={false}
                                status={status}
                                setHasSubmitted={setHasSubmitted}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

const AttachmentsBadge = ({ attachments }: { attachments: any[] }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const imageAttachments = attachments.filter(att => att.contentType?.startsWith('image/'));

    if (imageAttachments.length === 0) return null;

    return (
        <>
            <div className="mt-2 flex flex-wrap gap-2">
                {imageAttachments.map((attachment, i) => {
                    // Truncate filename to 15 characters
                    const fileName = attachment.name || `Image ${i + 1}`;
                    const truncatedName = fileName.length > 15
                        ? fileName.substring(0, 12) + '...'
                        : fileName;

                    return (
                        <button
                            key={i}
                            onClick={() => {
                                setSelectedIndex(i);
                                setIsOpen(true);
                            }}
                            className="flex items-center gap-1.5 max-w-xs rounded-full pl-1 pr-3 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                            <div className="h-6 w-6 rounded-full overflow-hidden shrink-0">
                                <img
                                    src={attachment.url}
                                    alt={fileName}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                                {truncatedName}
                            </span>
                        </button>
                    );
                })}
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="p-0 bg-white dark:bg-neutral-900 sm:max-w-4xl">
                    <div className="flex flex-col h-full">
                        <header className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        navigator.clipboard.writeText(imageAttachments[selectedIndex].url);
                                        toast.success("Image URL copied to clipboard");
                                    }}
                                    className="h-8 w-8 rounded-md text-neutral-600 dark:text-neutral-400"
                                    title="Copy link"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>

                                <a
                                    href={imageAttachments[selectedIndex].url}
                                    download={imageAttachments[selectedIndex].name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                                    title="Download"
                                >
                                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                                        <path d="M7.50005 1.04999C7.74858 1.04999 7.95005 1.25146 7.95005 1.49999V8.41359L10.1819 6.18179C10.3576 6.00605 10.6425 6.00605 10.8182 6.18179C10.994 6.35753 10.994 6.64245 10.8182 6.81819L10.9109 7.79618C10.8349 7.87218 10.7471 7.93543 10.651 7.9835L6.72359 9.94721C6.53109 10.0435 6.29861 10.0057 6.14643 9.85355C5.99425 9.70137 5.95652 9.46889 6.05277 9.27639L8.01648 5.34897C8.06455 5.25283 8.1278 5.16507 8.2038 5.08907L12.1464 1.14645ZM12.5 2.20711L8.91091 5.79618L7.87266 7.87267L9.94915 6.83442L13.5382 3.24535L12.5 2.20711ZM8.99997 1.49997C9.27611 1.49997 9.49997 1.72383 9.49997 1.99997C9.49997 2.27611 9.27611 2.49997 8.99997 2.49997H4.49997C3.67154 2.49997 2.99997 3.17154 2.99997 3.99997V11C2.99997 11.8284 3.67154 12.5 4.49997 12.5H11.5C12.3284 12.5 13 11.8284 13 11V6.49997C13 6.22383 13.2238 5.99997 13.5 5.99997C13.7761 5.99997 14 6.22383 14 6.49997V11C14 12.3807 12.8807 13.5 11.5 13.5H4.49997C3.11926 13.5 1.99997 12.3807 1.99997 11V3.99997C1.99997 2.61926 3.11926 1.49997 4.49997 1.49997H8.99997Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                    </svg>
                                </a>

                                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 mr-8">
                                    {selectedIndex + 1} of {imageAttachments.length}
                                </Badge>
                            </div>

                            <div className="w-8"></div> {/* Spacer to balance the header and avoid overlap with close button */}
                        </header>

                        <div className="flex-1 p-4 overflow-auto flex items-center justify-center">
                            <div className="relative max-w-full max-h-[60vh]">
                                <img
                                    src={imageAttachments[selectedIndex].url}
                                    alt={imageAttachments[selectedIndex].name || `Image ${selectedIndex + 1}`}
                                    className="max-w-full max-h-[60vh] object-contain rounded-md"
                                />

                                {imageAttachments.length > 1 && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setSelectedIndex(prev => (prev === 0 ? imageAttachments.length - 1 : prev - 1))}
                                            className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 shadow-xs"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setSelectedIndex(prev => (prev === imageAttachments.length - 1 ? 0 : prev + 1))}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 shadow-xs"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {imageAttachments.length > 1 && (
                            <div className="border-t border-neutral-200 dark:border-neutral-800 p-3">
                                <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                                    {imageAttachments.map((attachment, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedIndex(idx)}
                                            className={`relative h-12 w-12 rounded-md overflow-hidden shrink-0 transition-all ${selectedIndex === idx
                                                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                                                    : 'opacity-70 hover:opacity-100'
                                                }`}
                                        >
                                            <img
                                                src={attachment.url}
                                                alt={attachment.name || `Thumbnail ${idx + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <footer className="border-t border-neutral-200 dark:border-neutral-800 p-3">
                            <div className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                                <span className="truncate max-w-[80%]">
                                    {imageAttachments[selectedIndex].name || `Image ${selectedIndex + 1}`}
                                </span>
                                {imageAttachments[selectedIndex].size && (
                                    <span>
                                        {Math.round(imageAttachments[selectedIndex].size / 1024)} KB
                                    </span>
                                )}
                            </div>
                        </footer>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

const Home = () => {
    return (
        <Suspense>
            <HomeContent />
            <InstallPrompt />
        </Suspense>
    );
};

export default Home;