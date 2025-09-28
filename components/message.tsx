/* eslint-disable @next/next/no-img-element */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import isEqual from 'fast-deep-equal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  X,
  ExternalLink,
  Maximize2,
  FileText,
  AlignLeft,
  AlertCircle,
  RefreshCw,
  LogIn,
} from 'lucide-react';
import { TextUIPart, UIMessagePart } from 'ai';
import { MarkdownRenderer } from '@/components/markdown';
import { ChatTextHighlighter } from '@/components/chat-text-highlighter';
import { deleteTrailingMessages } from '@/app/actions';
import { getErrorActions, getErrorIcon, isSignInRequired, isProRequired, isRateLimited } from '@/lib/errors';
import { UserIcon } from '@phosphor-icons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Copy01Icon,
  Crown02Icon,
  PencilEdit02Icon,
  PlusSignCircleIcon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import { Attachment, ChatMessage, ChatTools, CustomUIDataTypes } from '@/lib/types';
import { UseChatHelpers } from '@ai-sdk/react';
import { SciraLogoHeader } from '@/components/scira-logo-header';
import { ComprehensiveUserData } from '@/lib/user-data-server';
import { cn } from '@/lib/utils';
import { useDataStream } from './data-stream-provider';

// Enhanced Error Display Component
interface EnhancedErrorDisplayProps {
  error: any;
  handleRetry?: () => Promise<void>;
  user?: any;
  selectedVisibilityType?: 'public' | 'private';
}

const EnhancedErrorDisplay: React.FC<EnhancedErrorDisplayProps> = ({
  error,
  handleRetry,
  user,
  selectedVisibilityType,
}) => {
  let parsedError: any = null;
  let isChatSDKError = false;

  if (error) {
    try {
      const errorData = JSON.parse(error.message);
      if (errorData.code && errorData.message) {
        parsedError = {
          type: errorData.code.split(':')[0],
          surface: errorData.code.split(':')[1],
          message: errorData.message,
          cause: errorData.cause,
        };
        isChatSDKError = true;
      }
    } catch (e) {
      // Not JSON, fallback
      parsedError = {
        type: 'unknown',
        surface: 'chat',
        message: error.message,
        cause: (error as any).cause,
      };
      isChatSDKError = false;
    }
  }

  // Get error details
  const errorIcon = getErrorIcon(parsedError as any);
  const errorMessage = isChatSDKError
    ? parsedError.message
    : typeof error === 'string'
      ? error
      : (error as any).message || 'Something went wrong while processing your message';
  const errorCause = isChatSDKError ? parsedError.cause : typeof error === 'string' ? undefined : (error as any).cause;
  const errorCode = isChatSDKError ? `${parsedError.type}:${parsedError.surface}` : null;
  const actions = isChatSDKError
    ? getErrorActions(parsedError as any)
    : { primary: { label: 'Try Again', action: 'retry' } };

  // Get icon component based on error type
  const getIconComponent = () => {
    switch (errorIcon) {
      case 'auth':
        return <UserIcon className="h-4 w-4 text-blue-500 dark:text-blue-300" weight="fill" />;
      case 'upgrade':
        return (
          <HugeiconsIcon
            icon={Crown02Icon}
            size={16}
            color="currentColor"
            strokeWidth={1.5}
            className="text-amber-500 dark:text-amber-300"
          />
        );
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-300" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-300" />;
    }
  };

  // Get color scheme based on error type
  const getColorScheme = () => {
    switch (errorIcon) {
      case 'auth':
        return {
          bg: 'bg-primary/5 dark:bg-primary/10',
          border: 'border-primary/20 dark:border-primary/30',
          iconBg: 'bg-primary/10 dark:bg-primary/20',
          title: 'text-primary dark:text-primary',
          text: 'text-primary/80 dark:text-primary/80',
          button: 'bg-primary hover:bg-primary/90 text-primary-foreground',
        };
      case 'upgrade':
        return {
          bg: 'bg-secondary/30 dark:bg-secondary/20',
          border: 'border-secondary dark:border-secondary',
          iconBg: 'bg-secondary/50 dark:bg-secondary/40',
          title: 'text-secondary-foreground dark:text-secondary-foreground',
          text: 'text-secondary-foreground/80 dark:text-secondary-foreground/80',
          button: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground',
        };
      case 'warning':
        return {
          bg: 'bg-muted dark:bg-muted',
          border: 'border-muted-foreground/20 dark:border-muted-foreground/30',
          iconBg: 'bg-muted-foreground/10 dark:bg-muted-foreground/20',
          title: 'text-muted-foreground dark:text-muted-foreground',
          text: 'text-muted-foreground/80 dark:text-muted-foreground/80',
          button: 'bg-muted-foreground hover:bg-muted-foreground/90 text-background',
        };
      default:
        return {
          bg: 'bg-destructive/5 dark:bg-destructive/10',
          border: 'border-destructive/20 dark:border-destructive/30',
          iconBg: 'bg-destructive/10 dark:bg-destructive/20',
          title: 'text-destructive dark:text-destructive',
          text: 'text-destructive/80 dark:text-destructive/80',
          button: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
        };
    }
  };

  const colors = getColorScheme();

  // Handle action clicks
  const handleAction = (action: string) => {
    switch (action) {
      case 'signin':
        window.location.href = '/sign-in';
        break;
      case 'upgrade':
        window.location.href = '/pricing';
        break;
      case 'retry':
        if (handleRetry) {
          handleRetry();
        }
        break;
      case 'refresh':
        window.location.href = '/new';
        break;
      default:
        if (handleRetry) {
          handleRetry();
        }
    }
  };

  // Determine if user can perform action
  const canPerformAction = (action: string) => {
    if (action === 'retry' || action === 'refresh') {
      return (user || selectedVisibilityType === 'private') && handleRetry;
    }
    return true;
  };

  return (
    <div className="mt-3">
      <div className={`rounded-lg border ${colors.border} bg-background dark:bg-background shadow-sm overflow-hidden`}>
        <div className={`${colors.bg} px-4 py-3 border-b ${colors.border} flex items-start gap-3`}>
          <div className="mt-0.5">
            <div className={`${colors.iconBg} p-1.5 rounded-full`}>{getIconComponent()}</div>
          </div>
          <div className="flex-1">
            <h3 className={`font-medium ${colors.title}`}>
              {isChatSDKError && isSignInRequired(parsedError as any) && 'Sign In Required'}
              {isChatSDKError &&
                (isProRequired(parsedError as any) || isRateLimited(parsedError as any)) &&
                'Upgrade Required'}
              {isChatSDKError &&
                !isSignInRequired(parsedError as any) &&
                !isProRequired(parsedError as any) &&
                !isRateLimited(parsedError as any) &&
                'Error'}
              {!isChatSDKError && 'Error'}
            </h3>
            <p className={`text-sm ${colors.text} mt-0.5`}>{errorMessage}</p>
            {errorCode && <p className={`text-xs ${colors.text} mt-1 font-mono`}>Error Code: {errorCode}</p>}
          </div>
        </div>

        <div className="px-4 py-3">
          {errorCause && (
            <div className="mb-3 p-3 bg-muted dark:bg-muted rounded-md border border-border dark:border-border font-mono text-xs text-muted-foreground dark:text-muted-foreground overflow-x-auto">
              {errorCause.toString()}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground dark:text-muted-foreground text-xs">
              {!user && selectedVisibilityType === 'public'
                ? 'Please sign in to retry or try a different prompt'
                : 'You can retry your request or try a different approach'}
            </p>
            <div className="flex gap-2">
              {actions.secondary && canPerformAction(actions.secondary.action) && (
                <Button
                  onClick={() => handleAction(actions.secondary!.action)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {actions.secondary.action === 'retry' && <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                  {actions.secondary.label}
                </Button>
              )}
              {actions.primary && canPerformAction(actions.primary.action) && (
                <Button onClick={() => handleAction(actions.primary!.action)} className={colors.button} size="sm">
                  {actions.primary.action === 'signin' && <LogIn className="mr-2 h-3.5 w-3.5" />}
                  {actions.primary.action === 'upgrade' && (
                    <HugeiconsIcon
                      icon={Crown02Icon}
                      size={14}
                      color="currentColor"
                      strokeWidth={1.5}
                      className="mr-2"
                    />
                  )}
                  {actions.primary.action === 'retry' && <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                  {actions.primary.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { EnhancedErrorDisplay };

interface MessageProps {
  message: ChatMessage;
  index: number;
  lastUserMessageIndex: number;
  renderPart: (
    part: ChatMessage['parts'][number],
    messageIndex: number,
    partIndex: number,
    parts: ChatMessage['parts'][number][],
    message: ChatMessage,
  ) => React.ReactNode;
  status: UseChatHelpers<ChatMessage>['status'];
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  setSuggestedQuestions: (questions: string[]) => void;
  suggestedQuestions: string[];
  user?: ComprehensiveUserData | null;
  selectedVisibilityType?: 'public' | 'private';
  isLastMessage?: boolean;
  error?: any;
  isMissingAssistantResponse?: boolean;
  handleRetry?: () => Promise<void>;
  isOwner?: boolean;
  onHighlight?: (text: string) => void;
  shouldReduceHeight?: boolean;
}

// Message Editor Component
interface MessageEditorProps {
  message: ChatMessage;
  setMode: (mode: 'view' | 'edit') => void;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  messages: ChatMessage[];
  setSuggestedQuestions: (questions: string[]) => void;
  user?: ComprehensiveUserData | null;
}

const MessageEditor: React.FC<MessageEditorProps> = ({
  message,
  setMode,
  setMessages,
  regenerate,
  messages,
  setSuggestedQuestions,
  user,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>(
    message.parts
      ?.map((part) => (part.type === 'text' ? part.text : ''))
      .join('')
      .trim() || '',
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    adjustHeight();
  };

  return (
    <div className="group relative mt-2">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draftContent.trim()) {
            toast.error('Please enter a valid message.');
            return;
          }

          try {
            setIsSubmitting(true);

            if (user && message.id) {
              await deleteTrailingMessages({
                id: message.id,
              });
            }

            setMessages((messages) => {
              const index = messages.findIndex((m) => m.id === message.id);

              if (index !== -1) {
                const originalParts = Array.isArray(message.parts) ? message.parts : [];

                // Replace existing text part(s) with a single updated text part, preserving non-text parts and order
                const updatedTextPart = { type: 'text', text: draftContent } as ChatMessage['parts'][number];
                const mergedParts: ChatMessage['parts'][number][] = [];
                let textInserted = false;

                for (const p of originalParts) {
                  if (p.type === 'text') {
                    if (!textInserted) {
                      mergedParts.push(updatedTextPart);
                      textInserted = true;
                    }
                  } else {
                    mergedParts.push(p);
                  }
                }

                if (!textInserted) {
                  mergedParts.unshift(updatedTextPart);
                }

                const updatedMessage: ChatMessage = {
                  ...message,
                  parts: mergedParts,
                };

                const before = messages.slice(0, index);
                return [...before, updatedMessage];
              }

              return messages;
            });

            setSuggestedQuestions([]);

            setMode('view');

            await regenerate();
          } catch (error) {
            console.error('Error updating message:', error);
            toast.error('Failed to update message. Please try again.');
          } finally {
            setIsSubmitting(false);
          }
        }}
        className="w-full"
      >
        <div className="flex items-start gap-2">
          {user ? (
            <Avatar className="size-7 rounded-md !p-0 !m-0 flex-shrink-0 self-start">
              <AvatarImage src={user.image ?? ''} alt={user.name ?? ''} className="rounded-md !p-0 !m-0 size-7" />
              <AvatarFallback className="rounded-md text-sm p-0 m-0 size-7">
                {(user.name || user.email || '?').charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <HugeiconsIcon icon={UserCircleIcon} size={24} className="size-7 flex-shrink-0 self-start" />
          )}
          <div className="flex-1 grow min-w-0 bg-accent/80 rounded-2xl p-2 relative">
            <Textarea
              ref={textareaRef}
              value={draftContent}
              onChange={handleInput}
              autoFocus
              className="prose prose-sm sm:prose-base prose-neutral dark:prose-invert prose-p:my-1 sm:prose-p:my-2 prose-pre:my-1 sm:prose-pre:my-2 prose-code:before:hidden prose-code:after:hidden
              font-sans font-normal max-w-none !text-base sm:!text-lg text-foreground dark:text-foreground pr-10 sm:pr-12 overflow-hidden
              relative w-full resize-none
              border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 outline-none leading-relaxed min-h-[auto]
              transition-colors bg-transparent"
              placeholder="Edit your message..."
              style={{
                lineHeight: '1.625',
              }}
            />

            {/* Show editable attachments inside bubble */}
            {message.parts && message.parts.filter((part) => part.type === 'file').length > 0 && (
              <div className="mt-2">
                <EditableAttachmentsBadge
                  attachments={message.parts.filter((part) => part.type === 'file') as unknown as Attachment[]}
                  onRemoveAttachment={(index) => {
                    // Handle attachment removal
                    const updatedAttachments = message.parts.filter(
                      (_: ChatMessage['parts'][number], i: number) => i !== index,
                    );
                    // Update the message with new attachments
                    setMessages((messages) => {
                      const messageIndex = messages.findIndex((m) => m.id === message.id);
                      if (messageIndex !== -1) {
                        const updatedMessage = {
                          ...message,
                          parts: updatedAttachments,
                        };
                        const updatedMessages = [...messages];
                        updatedMessages[messageIndex] = updatedMessage;
                        return updatedMessages;
                      }
                      return messages;
                    });
                  }}
                />
              </div>
            )}

            <div className="absolute -right-2 -bottom-4 bg-background/95 dark:bg-background/95 backdrop-blur-sm rounded-md border border-border dark:border-border flex items-center shadow-sm">
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-l-md rounded-r-none text-muted-foreground dark:text-muted-foreground hover:text-primary hover:bg-muted dark:hover:bg-muted transition-colors"
                disabled={
                  isSubmitting ||
                  draftContent.trim() ===
                    message.parts
                      ?.map((part) => (part.type === 'text' ? part.text : ''))
                      .join('')
                      .trim()
                }
              >
                {isSubmitting ? (
                  <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
              </Button>
              <Separator orientation="vertical" className="h-5 bg-border dark:bg-border" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMode('view')}
                className="h-7 w-7 rounded-r-md rounded-l-none text-muted-foreground dark:text-muted-foreground hover:text-primary hover:bg-muted dark:hover:bg-muted transition-colors"
                disabled={isSubmitting}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

// Max height for collapsed user messages (in pixels)
const USER_MESSAGE_MAX_HEIGHT = 120;

export const Message: React.FC<MessageProps> = ({
  message,
  index,
  lastUserMessageIndex,
  renderPart,
  status,
  messages,
  setMessages,
  sendMessage,
  setSuggestedQuestions,
  suggestedQuestions,
  user,
  selectedVisibilityType = 'private',
  regenerate,
  isLastMessage,
  error,
  isMissingAssistantResponse,
  handleRetry,
  isOwner = true,
  onHighlight,
  shouldReduceHeight = false,
}) => {
  // State for expanding/collapsing long user messages
  const [isExpanded, setIsExpanded] = useState(false);
  // State to track if the message exceeds max height
  const [exceedsMaxHeight, setExceedsMaxHeight] = useState(false);
  // Ref to check content height
  const messageContentRef = React.useRef<HTMLDivElement>(null);
  // Mode state for editing
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // Determine if user message should top-align avatar based on combined text length
  const combinedUserText: string = React.useMemo(() => {
    return (
      message.parts
        ?.map((part) => (part.type === 'text' ? part.text : ''))
        .join('')
        .trim() || ''
    );
  }, [message.parts]);

  const shouldTopAlignUser: boolean = React.useMemo(() => combinedUserText.length > 50, [combinedUserText]);

  // Check if message content exceeds max height
  React.useEffect(() => {
    if (messageContentRef.current) {
      const contentHeight = messageContentRef.current.scrollHeight;
      setExceedsMaxHeight(contentHeight > USER_MESSAGE_MAX_HEIGHT);
    }
  }, [message.parts?.map((part) => (part.type === 'text' ? part.text : '')).join('')]);

  // Dynamic font size based on content length with mobile responsiveness
  const getDynamicFontSize = useCallback((content: string) => {
    const length = content.trim().length;
    const lines = content.split('\n').length;

    // Very short messages (like single words or short phrases)
    if (length <= 20 && lines === 1) {
      return '[&>*]:!text-lg sm:[&>*]:text-xl font-normal'; // Smaller on mobile
    }
    // Short messages (one line, moderate length)
    else if (length <= 120 && lines === 1) {
      return '[&>*]:!text-base sm:[&>*]:!text-lg'; // Smaller on mobile
    }
    // Medium messages (2-3 lines or longer single line)
    else if (lines <= 3 || length <= 200) {
      return '[&>*]:!text-sm sm:[&>*]:!text-base'; // Smaller on mobile
    }
    // Longer messages
    else {
      return '[&>*]:!text-sm sm:[&>*]:!text-base'; // Even smaller on mobile
    }
  }, []);

  const handleSuggestedQuestionClick = useCallback(
    async (question: string) => {
      // Only proceed if user is authenticated for public chats
      if (selectedVisibilityType === 'public' && !user) return;

      setSuggestedQuestions([]);

      await sendMessage({
        parts: [{ type: 'text', text: question.trim() } as UIMessagePart<CustomUIDataTypes, ChatTools>],
        role: 'user',
      });
    },
    [sendMessage, setSuggestedQuestions, user, selectedVisibilityType],
  );

  if (message.role === 'user') {
    // Check if the message has parts that should be rendered
    if (message.parts && Array.isArray(message.parts) && message.parts.length > 0) {
      return (
        <div className="mb-0! px-0">
          <div className="grow min-w-0">
            {mode === 'edit' ? (
              <MessageEditor
                message={message}
                setMode={setMode}
                setMessages={setMessages}
                regenerate={regenerate}
                messages={messages}
                setSuggestedQuestions={setSuggestedQuestions}
                user={user}
              />
            ) : (
              <div className="group relative">
                <div className="relative">
                  {/* Render user message parts */}
                  {message.parts?.map((part: ChatMessage['parts'][number], partIndex: number) => {
                    if (part.type === 'text') {
                      return (
                        <div
                          key={`user-${index}-${partIndex}`}
                          ref={messageContentRef}
                          className={`mt-2 prose prose-sm sm:prose-base prose-neutral dark:prose-invert prose-p:my-1 sm:prose-p:my-2 prose-p:mt-0 sm:prose-p:mt-0 prose-pre:my-1 sm:prose-pre:my-2 prose-code:before:hidden prose-code:after:hidden [&>*]:!font-be-vietnam-pro font-be-vietnam-pro font-normal max-w-none ${getDynamicFontSize(part.text)} text-foreground dark:text-foreground overflow-hidden relative ${
                            !isExpanded && exceedsMaxHeight ? 'max-h-[120px]' : ''
                          }`}
                        >
                          <div
                            className={`flex ${shouldTopAlignUser ? 'items-start' : 'items-center'} justify-start gap-2`}
                          >
                            {user ? (
                              <Avatar className="size-7 rounded-md !p-0 !m-0 flex-shrink-0 self-start">
                                <AvatarImage
                                  src={user.image ?? ''}
                                  alt={user.name ?? ''}
                                  className="rounded-md !p-0 !m-0 size-7 "
                                />
                                <AvatarFallback className="rounded-md text-sm p-0 m-0 size-7">
                                  {(user.name || user.email || '?').charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <HugeiconsIcon
                                icon={UserCircleIcon}
                                size={24}
                                className="size-7 flex-shrink-0 self-start"
                              />
                            )}
                            <div className="flex-1 grow min-w-0 bg-accent/80 rounded-2xl p-2">
                              <ChatTextHighlighter
                                className={`${getDynamicFontSize(part.text)}`}
                                onHighlight={onHighlight}
                                removeHighlightOnClick={true}
                              >
                                <MarkdownRenderer content={part.text} isUserMessage={true} />
                              </ChatTextHighlighter>
                              {message.parts?.filter((part) => part.type === 'file') &&
                                message.parts?.filter((part) => part.type === 'file').length > 0 && (
                                  <div className="mt-2">
                                    <AttachmentsBadge
                                      attachments={
                                        message.parts?.filter((part) => part.type === 'file') as unknown as Attachment[]
                                      }
                                    />
                                  </div>
                                )}
                            </div>
                          </div>

                          {!isExpanded && exceedsMaxHeight && (
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                          )}
                        </div>
                      );
                    }
                    return null; // Skip non-text parts for user messages
                  })}

                  {/* If no parts have text, fall back to the content property */}
                  {(!message.parts || !message.parts.some((part) => part.type === 'text' && part.text)) && (
                    <div
                      ref={messageContentRef}
                      className={`mt-2 prose prose-sm sm:prose-base prose-neutral dark:prose-invert prose-p:my-1 sm:prose-p:my-2 prose-p:mt-0 sm:prose-p:mt-0 prose-pre:my-1 sm:prose-pre:my-2 prose-code:before:hidden prose-code:after:hidden [&>*]:!font-be-vietnam-pro font-normal max-w-none ${getDynamicFontSize(
                        message.parts
                          ?.map((part) => (part.type === 'text' ? part.text : ''))
                          .join('')
                          .trim() || '',
                      )} text-foreground dark:text-foreground overflow-hidden relative ${
                        !isExpanded && exceedsMaxHeight ? 'max-h-[120px]' : ''
                      }`}
                    >
                      <div
                        className={`flex ${shouldTopAlignUser ? 'items-start' : 'items-center'} justify-start gap-2`}
                      >
                        {user ? (
                          <Avatar className="size-7 rounded-md !p-0 !m-0 flex-shrink-0 self-start">
                            <AvatarImage
                              src={user.image ?? ''}
                              alt={user.name ?? ''}
                              className="rounded-md !p-0 !m-0 size-7"
                            />
                            <AvatarFallback className="rounded-md text-sm p-0 m-0 size-7">
                              {(user.name || user.email || '?').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <HugeiconsIcon icon={UserCircleIcon} size={24} className="size-7 flex-shrink-0 self-start" />
                        )}
                        <div className="flex-1 grow min-w-0 bg-accent/80 rounded-2xl p-2">
                          <ChatTextHighlighter
                            className={`${getDynamicFontSize(
                              message.parts
                                ?.map((part) => (part.type === 'text' ? part.text : ''))
                                .join('')
                                .trim() || '',
                            )}`}
                            onHighlight={onHighlight}
                            removeHighlightOnClick={true}
                          >
                            <MarkdownRenderer
                              content={
                                message.parts
                                  ?.map((part) => (part.type === 'text' ? part.text : ''))
                                  .join('')
                                  .trim() || ''
                              }
                              isUserMessage={true}
                            />
                          </ChatTextHighlighter>
                          {message.parts?.filter((part) => part.type === 'file') &&
                            message.parts?.filter((part) => part.type === 'file').length > 0 && (
                              <div className="mt-2">
                                <AttachmentsBadge
                                  attachments={
                                    message.parts?.filter((part) => part.type === 'file') as unknown as Attachment[]
                                  }
                                />
                              </div>
                            )}
                        </div>
                      </div>

                      {!isExpanded && exceedsMaxHeight && (
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                      )}
                    </div>
                  )}

                  {exceedsMaxHeight && (
                    <div className="flex justify-center mt-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground hover:bg-transparent"
                        aria-label={isExpanded ? 'Show less' : 'Show more'}
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}

                  <div className="absolute right-0 -bottom-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 transform sm:group-hover:translate-x-0 sm:translate-x-2 bg-background/95 dark:bg-background/95 backdrop-blur-sm rounded-md border border-border dark:border-border flex items-center shadow-sm hover:shadow-md">
                    {((user && isOwner) || (!user && selectedVisibilityType === 'private')) && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setMode('edit')}
                          className="h-7 w-7 rounded-l-md rounded-r-none text-muted-foreground dark:text-muted-foreground hover:text-primary hover:bg-muted dark:hover:bg-muted transition-colors"
                          disabled={status === 'submitted' || status === 'streaming'}
                          aria-label="Edit message"
                        >
                          <HugeiconsIcon icon={PencilEdit02Icon} size={24} className="flex-shrink-0 pl-1 size-6" />
                        </Button>
                      </>
                    )}
                    <Separator orientation="vertical" className="h-5 bg-black dark:bg-white" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          message.parts
                            ?.map((part) => (part.type === 'text' ? part.text : ''))
                            .join('')
                            .trim() || '',
                        );
                        toast.success('Copied to clipboard');
                      }}
                      className={`h-7 w-7 ${
                        (!user || !isOwner) && selectedVisibilityType === 'public'
                          ? 'rounded-md'
                          : 'rounded-r-md rounded-l-none'
                      } text-muted-foreground dark:text-muted-foreground hover:text-primary hover:bg-muted dark:hover:bg-muted transition-colors`}
                      aria-label="Copy message"
                    >
                      <HugeiconsIcon icon={Copy01Icon} size={24} className="flex-shrink-0 pr-1 size-6" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Fallback to the original rendering if no parts are present
    return (
      <div className="mb-0! px-0">
        <div className="grow min-w-0">
          {mode === 'edit' ? (
            <MessageEditor
              message={message}
              setMode={setMode}
              setMessages={setMessages}
              regenerate={regenerate}
              messages={messages}
              setSuggestedQuestions={setSuggestedQuestions}
              user={user}
            />
          ) : (
            <div className="group relative">
              <div className="relative">
                <div
                  ref={messageContentRef}
                  className={`mt-2 prose prose-sm sm:prose-base prose-neutral dark:prose-invert prose-p:my-1 sm:prose-p:my-2 prose-p:mt-0 sm:prose-p:mt-0 prose-pre:my-1 sm:prose-pre:my-2 prose-code:before:hidden prose-code:after:hidden [&>*]:font-be-vietnam-pro! font-normal max-w-none ${getDynamicFontSize(
                    message.parts
                      ?.map((part) => (part.type === 'text' ? part.text : ''))
                      .join('')
                      .trim() || '',
                  )} text-foreground dark:text-foreground overflow-hidden relative ${
                    !isExpanded && exceedsMaxHeight ? 'max-h-[120px]' : ''
                  }`}
                >
                  <div className={`flex ${shouldTopAlignUser ? 'items-start' : 'items-center'} justify-start gap-2`}>
                    {user ? (
                      <Avatar className="size-7 rounded-md !p-0 !m-0 flex-shrink-0 self-start">
                        <AvatarImage
                          src={user.image ?? ''}
                          alt={user.name ?? ''}
                          className="rounded-md !p-0 !m-0 size-7"
                        />
                        <AvatarFallback className="rounded-md text-sm p-0 m-0 size-7">
                          {(user.name || user.email || '?').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <HugeiconsIcon icon={UserCircleIcon} size={24} className="size-7 flex-shrink-0 self-start" />
                    )}
                    <div className="flex-1 grow min-w-0 bg-accent/80 rounded-2xl p-2">
                      <ChatTextHighlighter
                        className={`${getDynamicFontSize(
                          message.parts
                            ?.map((part) => (part.type === 'text' ? part.text : ''))
                            .join('')
                            .trim() || '',
                        )}`}
                        onHighlight={onHighlight}
                        removeHighlightOnClick={true}
                      >
                        <MarkdownRenderer
                          content={
                            message.parts
                              ?.map((part) => (part.type === 'text' ? part.text : ''))
                              .join('')
                              .trim() || ''
                          }
                          isUserMessage={true}
                        />
                      </ChatTextHighlighter>
                      {message.parts?.filter((part) => part.type === 'file') &&
                        message.parts?.filter((part) => part.type === 'file').length > 0 && (
                          <div className="mt-2">
                            <AttachmentsBadge
                              attachments={
                                message.parts?.filter((part) => part.type === 'file') as unknown as Attachment[]
                              }
                            />
                          </div>
                        )}
                    </div>
                  </div>

                  {!isExpanded && exceedsMaxHeight && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                  )}
                </div>

                {exceedsMaxHeight && (
                  <div className="flex justify-center mt-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground hover:bg-transparent"
                      aria-label={isExpanded ? 'Show less' : 'Show more'}
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                )}

                <div className="absolute right-0 -bottom-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 transform sm:group-hover:translate-x-0 sm:translate-x-2 bg-background/95 dark:bg-background/95 backdrop-blur-sm rounded-md border border-border dark:border-border flex items-center shadow-sm hover:shadow-md">
                  {/* Only show edit button for owners OR unauthenticated users on private chats */}
                  {((user && isOwner) || (!user && selectedVisibilityType === 'private')) && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMode('edit')}
                        className="h-7 w-7 rounded-l-md rounded-r-none text-muted-foreground dark:text-muted-foreground hover:text-primary hover:bg-muted dark:hover:bg-muted transition-colors"
                        disabled={status === 'submitted' || status === 'streaming'}
                        aria-label="Edit message"
                      >
                        <HugeiconsIcon
                          icon={PencilEdit02Icon}
                          size={24}
                          className="text-primary flex-shrink-0 pl-1 size-6"
                        />
                      </Button>
                    </>
                  )}
                  <Separator orientation="vertical" className="h-5 bg-black dark:bg-white" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        message.parts
                          ?.map((part) => (part.type === 'text' ? part.text : ''))
                          .join('')
                          .trim() || '',
                      );
                      toast.success('Copied to clipboard');
                    }}
                    className={`h-7 w-7 ${
                      (!user || !isOwner) && selectedVisibilityType === 'public'
                        ? 'rounded-md'
                        : 'rounded-r-md rounded-l-none'
                    } text-muted-foreground dark:text-muted-foreground hover:text-primary hover:bg-muted dark:hover:bg-muted transition-colors`}
                    aria-label="Copy message"
                  >
                    <HugeiconsIcon icon={Copy01Icon} size={24} className="flex-shrink-0 pr-1 size-6" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.role === 'assistant') {
    return (
      <div className={cn(shouldReduceHeight ? '' : 'min-h-[calc(100vh-18rem)]', '')}>
        {message.parts?.map((part: ChatMessage['parts'][number], partIndex: number) => {
          console.log(`🔧 Rendering part ${partIndex}:`, { type: part.type, hasText: part.type === 'text' });
          const key = `${message.id || index}-part-${partIndex}-${part.type}`;
          return (
            <div key={key}>
              {renderPart(part, index, partIndex, message.parts as ChatMessage['parts'][number][], message)}
            </div>
          );
        })}

        {/* Missing assistant response UI moved inside assistant message */}
        {isMissingAssistantResponse && (
          <div className="flex items-start mt-4">
            <div className="w-full">
              <div className="flex flex-col gap-4 bg-primary/10 border border-primary/20 dark:border-primary/20 rounded-lg p-4">
                <div className=" mb-4 max-w-2xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-secondary-foreground dark:text-secondary-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium text-secondary-foreground dark:text-secondary-foreground mb-1">
                        No response generated
                      </h3>
                      <p className="text-sm text-secondary-foreground/80 dark:text-secondary-foreground/80">
                        It looks like the assistant didn’t provide a response to your message.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 flex items-center justify-between bg-primary/10 border border-primary/20 dark:border-primary/20 rounded-lg mb-4 max-w-2xl">
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
          </div>
        )}

        {/* Display error message with retry button */}
        {error && (
          <EnhancedErrorDisplay
            error={error}
            handleRetry={handleRetry}
            user={user}
            selectedVisibilityType={selectedVisibilityType}
          />
        )}

        {suggestedQuestions.length > 0 && (user || selectedVisibilityType === 'private') && status !== 'streaming' && (
          <div className="w-full max-w-xl sm:max-w-2xl mt-4">
            <div className="flex items-center gap-1.5 mb-2 pr-3">
              <AlignLeft size={16} className="text-muted-foreground dark:text-muted-foreground" />
              <h2 className="font-medium texl-lg text-foreground dark:text-foreground">Suggested questions</h2>
            </div>
            <div className="flex flex-col border-t border-border dark:border-border">
              {suggestedQuestions.map((question, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestionClick(question)}
                  className="w-full py-2.5 px-1 text-left flex justify-between items-center border-b last:border-none border-border dark:border-border"
                >
                  <span className="text-foreground text-sm dark:text-foreground font-normal pr-3 hover:text-primary/80 dark:hover:text-primary/80">
                    {question}
                  </span>
                  <HugeiconsIcon icon={PlusSignCircleIcon} size={22} className="text-primary flex-shrink-0 pr-1" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

// Add display name for better debugging
Message.displayName = 'Message';

// Editable attachments badge component for edit mode
export const EditableAttachmentsBadge = ({
  attachments,
  onRemoveAttachment,
}: {
  attachments: Attachment[];
  onRemoveAttachment: (index: number) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fileAttachments = attachments.filter(
    (att) =>
      att.contentType?.startsWith('image/') ||
      att.mediaType?.startsWith('image/') ||
      att.contentType === 'application/pdf' ||
      att.mediaType === 'application/pdf',
  );

  if (fileAttachments.length === 0) return null;

  const isPdf = (attachment: Attachment) =>
    attachment.contentType === 'application/pdf' || attachment.mediaType === 'application/pdf';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {fileAttachments.map((attachment, i) => {
          // Truncate filename to 15 characters
          const fileName = attachment.name || `File ${i + 1}`;
          const truncatedName = fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName;

          const isImage = attachment.contentType?.startsWith('image/') || attachment.mediaType?.startsWith('image/');

          return (
            <div
              key={i}
              className="group flex items-center gap-1.5 max-w-xs rounded-full pl-1 pr-2 py-1 bg-muted dark:bg-muted border border-border dark:border-border"
            >
              <button
                onClick={() => {
                  setSelectedIndex(i);
                  setIsOpen(true);
                }}
                className="flex items-center gap-1.5 hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/10 rounded-full pl-0 pr-1 transition-colors"
              >
                <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-background dark:bg-background">
                  {isPdf(attachment) ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-red-500 dark:text-red-400"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <path d="M9 15v-2h6v2"></path>
                      <path d="M12 18v-5"></path>
                    </svg>
                  ) : isImage ? (
                    <img src={attachment.url} alt={fileName} className="h-full w-full object-cover" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-blue-500 dark:text-blue-400"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  )}
                </div>
                <span className="text-xs font-medium text-foreground dark:text-foreground truncate">
                  {truncatedName}
                </span>
              </button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveAttachment(i)}
                className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive dark:hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                title="Remove attachment"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 bg-background dark:bg-background sm:max-w-3xl w-[90vw] max-h-[85vh] overflow-hidden">
          <div className="flex flex-col h-full max-h-[85vh]">
            <header className="p-2 border-b border-border dark:border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(fileAttachments[selectedIndex].url);
                    toast.success('File URL copied to clipboard');
                  }}
                  className="h-8 w-8 rounded-md text-muted-foreground dark:text-muted-foreground"
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </Button>

                <a
                  href={fileAttachments[selectedIndex].url}
                  download={fileAttachments[selectedIndex].name}
                  target="_blank"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>

                {isPdf(fileAttachments[selectedIndex]) && (
                  <a
                    href={fileAttachments[selectedIndex].url}
                    target="_blank"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                <Badge
                  variant="secondary"
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-background dark:bg-background border border-border dark:border-border"
                >
                  {selectedIndex + 1} of {fileAttachments.length}
                </Badge>
              </div>

              <DialogClose className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </DialogClose>
            </header>

            <div className="flex-1 p-1 overflow-auto flex items-center justify-center">
              <div className="relative flex items-center justify-center w-full h-full">
                {isPdf(fileAttachments[selectedIndex]) ? (
                  <div className="w-full h-[60vh] flex flex-col rounded-md overflow-hidden border border-border dark:border-border mx-auto">
                    <div className="bg-muted dark:bg-muted py-1.5 px-2 flex items-center justify-between border-b border-border dark:border-border">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                        <span className="text-sm font-medium text-foreground dark:text-foreground truncate max-w-[200px]">
                          {fileAttachments[selectedIndex].name || `PDF ${selectedIndex + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={fileAttachments[selectedIndex].url}
                          target="_blank"
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground dark:text-muted-foreground hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/10 transition-colors"
                          title="Open fullscreen"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                    <div className="flex-1 w-full bg-white">
                      <object
                        data={fileAttachments[selectedIndex].url}
                        type="application/pdf"
                        className="w-full h-full"
                      >
                        <div className="flex flex-col items-center justify-center w-full h-full bg-muted dark:bg-muted">
                          <FileText className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
                          <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-2">
                            PDF cannot be displayed directly
                          </p>
                          <div className="flex gap-2">
                            <a
                              href={fileAttachments[selectedIndex].url}
                              target="_blank"
                              className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors"
                            >
                              Open PDF
                            </a>
                            <a
                              href={fileAttachments[selectedIndex].url}
                              download={fileAttachments[selectedIndex].name}
                              className="px-3 py-1.5 bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground text-xs font-medium rounded-md hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/10 transition-colors"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      </object>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[60vh]">
                    <img
                      src={fileAttachments[selectedIndex].url}
                      alt={fileAttachments[selectedIndex].name || `Image ${selectedIndex + 1}`}
                      className="max-w-full max-h-[60vh] object-contain rounded-md mx-auto"
                    />
                  </div>
                )}

                {fileAttachments.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedIndex((prev) => (prev === 0 ? fileAttachments.length - 1 : prev - 1))}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-background/90 dark:bg-background/90 border border-border dark:border-border shadow-xs"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedIndex((prev) => (prev === fileAttachments.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-background/90 dark:bg-background/90 border border-border dark:border-border shadow-xs"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {fileAttachments.length > 1 && (
              <div className="border-t border-neutral-200 dark:border-neutral-800 p-2">
                <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-full">
                  {fileAttachments.map((attachment, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedIndex(idx)}
                      className={`relative h-10 w-10 rounded-md overflow-hidden shrink-0 transition-all ${
                        selectedIndex === idx
                          ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {isPdf(attachment) ? (
                        <div className="h-full w-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-red-500 dark:text-red-400"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                        </div>
                      ) : (
                        <img
                          src={attachment.url}
                          alt={attachment.name || `Thumbnail ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <footer className="border-t border-neutral-200 dark:border-neutral-800 p-2">
              <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                <span className="truncate max-w-[70%]">
                  {fileAttachments[selectedIndex].name || `File ${selectedIndex + 1}`}
                </span>
              </div>
            </footer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Export the attachments badge component for reuse
export const AttachmentsBadge = ({ attachments }: { attachments: Attachment[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fileAttachments = attachments.filter(
    (att) =>
      att.contentType?.startsWith('image/') ||
      att.mediaType?.startsWith('image/') ||
      att.contentType === 'application/pdf' ||
      att.mediaType === 'application/pdf',
  );

  React.useEffect(() => {
    console.log('fileAttachments', fileAttachments);
  }, [fileAttachments]);

  if (fileAttachments.length === 0) return null;

  const isPdf = (attachment: Attachment) =>
    attachment.contentType === 'application/pdf' || attachment.mediaType === 'application/pdf';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {fileAttachments.map((attachment, i) => {
          // Truncate filename to 15 characters
          const fileName = attachment.name || `File ${i + 1}`;
          const truncatedName = fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName;

          const fileExtension = fileName.split('.').pop()?.toLowerCase();
          const isImage = attachment.contentType?.startsWith('image/') || attachment.mediaType?.startsWith('image/');

          return (
            <button
              key={i}
              onClick={() => {
                setSelectedIndex(i);
                setIsOpen(true);
              }}
              className="flex items-center gap-1.5 max-w-xs rounded-full pl-1 pr-3 py-1 bg-muted dark:bg-muted border border-border dark:border-border hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/10 transition-colors"
            >
              <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-background dark:bg-background">
                {isPdf(attachment) ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-red-500 dark:text-red-400"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M9 15v-2h6v2"></path>
                    <path d="M12 18v-5"></path>
                  </svg>
                ) : isImage ? (
                  <img src={attachment.url} alt={fileName} className="h-full w-full object-cover" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-500 dark:text-blue-400"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                )}
              </div>
              <span className="text-xs font-medium text-foreground dark:text-foreground truncate">
                {truncatedName}
                {fileExtension && !isPdf(attachment) && !isImage && (
                  <span className="text-muted-foreground dark:text-muted-foreground ml-0.5">.{fileExtension}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 bg-background dark:bg-background sm:max-w-3xl w-[90vw] max-h-[85vh] overflow-hidden">
          <div className="flex flex-col h-full max-h-[85vh]">
            <header className="p-2 border-b border-border dark:border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(fileAttachments[selectedIndex].url);
                    toast.success('File URL copied to clipboard');
                  }}
                  className="h-8 w-8 rounded-md text-muted-foreground dark:text-muted-foreground"
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </Button>

                <a
                  href={fileAttachments[selectedIndex].url}
                  download={fileAttachments[selectedIndex].name}
                  target="_blank"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>

                {isPdf(fileAttachments[selectedIndex]) && (
                  <a
                    href={fileAttachments[selectedIndex].url}
                    target="_blank"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                <Badge
                  variant="secondary"
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-background dark:bg-background border border-border dark:border-border"
                >
                  {selectedIndex + 1} of {fileAttachments.length}
                </Badge>
              </div>

              <DialogClose className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </DialogClose>
            </header>

            <div className="flex-1 p-1 overflow-auto flex items-center justify-center">
              <div className="relative flex items-center justify-center w-full h-full">
                {isPdf(fileAttachments[selectedIndex]) ? (
                  <div className="w-full h-[60vh] flex flex-col rounded-md overflow-hidden border border-border dark:border-border mx-auto">
                    <div className="bg-muted dark:bg-muted py-1.5 px-2 flex items-center justify-between border-b border-border dark:border-border">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                        <span className="text-sm font-medium text-foreground dark:text-foreground truncate max-w-[200px]">
                          {fileAttachments[selectedIndex].name || `PDF ${selectedIndex + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={fileAttachments[selectedIndex].url}
                          target="_blank"
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground dark:text-muted-foreground hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/10 transition-colors"
                          title="Open fullscreen"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                    <div className="flex-1 w-full bg-white">
                      <object
                        data={fileAttachments[selectedIndex].url}
                        type="application/pdf"
                        className="w-full h-full"
                      >
                        <div className="flex flex-col items-center justify-center w-full h-full bg-muted dark:bg-muted">
                          <FileText className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
                          <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-2">
                            PDF cannot be displayed directly
                          </p>
                          <div className="flex gap-2">
                            <a
                              href={fileAttachments[selectedIndex].url}
                              target="_blank"
                              className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors"
                            >
                              Open PDF
                            </a>
                            <a
                              href={fileAttachments[selectedIndex].url}
                              download={fileAttachments[selectedIndex].name}
                              className="px-3 py-1.5 bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground text-xs font-medium rounded-md hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/10 transition-colors"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      </object>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[60vh]">
                    <img
                      src={fileAttachments[selectedIndex].url}
                      alt={fileAttachments[selectedIndex].name || `Image ${selectedIndex + 1}`}
                      className="max-w-full max-h-[60vh] object-contain rounded-md mx-auto"
                    />
                  </div>
                )}

                {fileAttachments.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedIndex((prev) => (prev === 0 ? fileAttachments.length - 1 : prev - 1))}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-background/90 dark:bg-background/90 border border-border dark:border-border shadow-xs"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedIndex((prev) => (prev === fileAttachments.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-background/90 dark:bg-background/90 border border-border dark:border-border shadow-xs"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {fileAttachments.length > 1 && (
              <div className="border-t border-border dark:border-border p-2">
                <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-full">
                  {fileAttachments.map((attachment, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedIndex(idx)}
                      className={`relative h-10 w-10 rounded-md overflow-hidden shrink-0 transition-all ${
                        selectedIndex === idx
                          ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {isPdf(attachment) ? (
                        <div className="h-full w-full flex items-center justify-center bg-muted dark:bg-muted">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-red-500 dark:text-red-400"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                        </div>
                      ) : (
                        <img
                          src={attachment.url}
                          alt={attachment.name || `Thumbnail ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <footer className="border-t border-border dark:border-border p-2">
              <div className="text-xs text-muted-foreground dark:text-muted-foreground flex items-center justify-between">
                <span className="truncate max-w-[70%]">
                  {fileAttachments[selectedIndex].name || `File ${selectedIndex + 1}`}
                </span>
              </div>
            </footer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
