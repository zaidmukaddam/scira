/* eslint-disable @next/next/no-img-element */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Plus,
  AlignLeft,
  AlertCircle,
  RefreshCw,
  LogIn,
} from 'lucide-react';
import { TextUIPart, ReasoningUIPart, ToolInvocationUIPart, SourceUIPart, StepStartUIPart } from '@ai-sdk/ui-utils';
import { MarkdownRenderer, preprocessLaTeX } from '@/components/markdown';
import { deleteTrailingMessages } from '@/app/actions';
import { getErrorActions, getErrorIcon, isSignInRequired, isProRequired, isRateLimited } from '@/lib/errors';
import { Crown, User } from '@phosphor-icons/react';

// Define MessagePart type
type MessagePart = TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart | StepStartUIPart;

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
        return <User className="h-4 w-4 text-blue-500 dark:text-blue-300" weight="fill" />;
      case 'upgrade':
        return <Crown className="h-4 w-4 text-amber-500 dark:text-amber-300" weight="fill" />;
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
          bg: 'bg-blue-50 dark:bg-blue-900/30',
          border: 'border-blue-200 dark:border-blue-800',
          iconBg: 'bg-blue-100 dark:bg-blue-700/50',
          title: 'text-blue-700 dark:text-blue-300',
          text: 'text-blue-600/80 dark:text-blue-400/80',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
      case 'upgrade':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/30',
          border: 'border-amber-200 dark:border-amber-800',
          iconBg: 'bg-amber-100 dark:bg-amber-700/50',
          title: 'text-amber-700 dark:text-amber-300',
          text: 'text-amber-600/80 dark:text-amber-400/80',
          button: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      case 'warning':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/30',
          border: 'border-orange-200 dark:border-orange-800',
          iconBg: 'bg-orange-100 dark:bg-orange-700/50',
          title: 'text-orange-700 dark:text-orange-300',
          text: 'text-orange-600/80 dark:text-orange-400/80',
          button: 'bg-orange-600 hover:bg-orange-700 text-white',
        };
      default:
        return {
          bg: 'bg-red-50 dark:bg-red-900/30',
          border: 'border-red-200 dark:border-red-800',
          iconBg: 'bg-red-100 dark:bg-red-700/50',
          title: 'text-red-700 dark:text-red-300',
          text: 'text-red-600/80 dark:text-red-400/80',
          button: 'bg-red-600 hover:bg-red-700 text-white',
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
      <div className={`rounded-lg border ${colors.border} bg-white dark:bg-neutral-900 shadow-sm overflow-hidden`}>
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
            <div className="mb-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700 font-mono text-xs text-neutral-700 dark:text-neutral-300 overflow-x-auto">
              {errorCause.toString()}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-neutral-500 dark:text-neutral-400 text-xs">
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
                  {actions.primary.action === 'upgrade' && <Crown className="mr-2 h-3.5 w-3.5" />}
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
  message: any;
  index: number;
  lastUserMessageIndex: number;
  renderPart: (
    part: MessagePart,
    messageIndex: number,
    partIndex: number,
    parts: MessagePart[],
    message: any,
  ) => React.ReactNode;
  status: string;
  messages: any[];
  setMessages: (messages: any[] | ((prevMessages: any[]) => any[])) => void;
  append: (message: any, options?: any) => Promise<string | null | undefined>;
  setSuggestedQuestions: (questions: string[]) => void;
  suggestedQuestions: string[];
  user?: any;
  selectedVisibilityType?: 'public' | 'private';
  reload: () => Promise<string | null | undefined>;
  isLastMessage?: boolean;
  error?: any;
  isMissingAssistantResponse?: boolean;
  handleRetry?: () => Promise<void>;
  isOwner?: boolean;
}

// Message Editor Component
interface MessageEditorProps {
  message: any;
  setMode: (mode: 'view' | 'edit') => void;
  setMessages: (messages: any[] | ((prevMessages: any[]) => any[])) => void;
  reload: () => Promise<string | null | undefined>;
  messages: any[];
  setSuggestedQuestions: (questions: string[]) => void;
}

const MessageEditor: React.FC<MessageEditorProps> = ({
  message,
  setMode,
  setMessages,
  reload,
  messages,
  setSuggestedQuestions,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>(message.content);
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
    <div className="group relative">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draftContent.trim()) {
            toast.error('Please enter a valid message.');
            return;
          }

          try {
            setIsSubmitting(true);

            // Step 1: Delete trailing messages if message has an ID (same as rewrite logic)
            if (message.id) {
              await deleteTrailingMessages({
                id: message.id,
              });
            }

            // Step 2: Update local state to include only messages up to and including the edited message (same as rewrite logic)
            const newMessages = [];
            // Find the index of the message being edited
            for (let i = 0; i < messages.length; i++) {
              if (messages[i].id === message.id) {
                // Add the updated message
                const updatedMessage = {
                  ...message,
                  content: draftContent.trim(),
                  parts: [{ type: 'text', text: draftContent.trim() }],
                };
                newMessages.push(updatedMessage);
                break;
              } else {
                newMessages.push(messages[i]);
              }
            }

            // Step 3: Update UI state (same as rewrite logic)
            setMessages(newMessages);
            setSuggestedQuestions([]);

            setMode('view');

            // Step 4: Reload to generate new response (same as rewrite logic)
            await reload();
          } catch (error) {
            console.error('Error updating message:', error);
            toast.error('Failed to update message. Please try again.');
          } finally {
            setIsSubmitting(false);
          }
        }}
        className="w-full"
      >
        <div className="relative border rounded-md p-1.5! pb-1.5! pt-2! mb-3! bg-neutral-50/30 dark:bg-neutral-800/30">
          <Textarea
            ref={textareaRef}
            value={draftContent}
            onChange={handleInput}
            autoFocus
            className="prose prose-neutral dark:prose-invert prose-p:my-2 prose-pre:my-2 prose-code:before:hidden prose-code:after:hidden [&>*]:font-syne! font-normal max-w-none [&>*]:text-lg text-neutral-900 dark:text-neutral-100 pr-10 sm:pr-12 overflow-hidden relative w-full resize-none bg-transparent hover:bg-neutral-50/10 focus:bg-neutral-50/20 dark:hover:bg-neutral-800/10 dark:focus:bg-neutral-800/20 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 outline-none leading-relaxed font-[syne] min-h-[auto] transition-colors rounded-sm"
            placeholder="Edit your message..."
            style={{
              lineHeight: '1.625',
              fontSize: '1.125rem',
            }}
          />

          <div className="absolute -right-2 top-1 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm rounded-md border border-neutral-200 dark:border-neutral-700 flex items-center shadow-sm">
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-l-md rounded-r-none text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              disabled={isSubmitting || draftContent.trim() === message.content.trim()}
            >
              {isSubmitting ? (
                <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
            </Button>
            <Separator orientation="vertical" className="h-5 bg-neutral-200 dark:bg-neutral-700" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMode('view')}
              className="h-7 w-7 rounded-r-md rounded-l-none text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              disabled={isSubmitting}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </form>

      {/* Show editable attachments */}
      {message.experimental_attachments && message.experimental_attachments.length > 0 && (
        <div className="mt-3">
          <EditableAttachmentsBadge
            attachments={message.experimental_attachments}
            onRemoveAttachment={(index) => {
              // Handle attachment removal
              const updatedAttachments = message.experimental_attachments.filter((_: any, i: number) => i !== index);
              // Update the message with new attachments
              setMessages((messages) => {
                const messageIndex = messages.findIndex((m) => m.id === message.id);
                if (messageIndex !== -1) {
                  const updatedMessage = {
                    ...message,
                    experimental_attachments: updatedAttachments,
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
    </div>
  );
};

// Max height for collapsed user messages (in pixels)
const USER_MESSAGE_MAX_HEIGHT = 100;

export const Message: React.FC<MessageProps> = ({
  message,
  index,
  lastUserMessageIndex,
  renderPart,
  status,
  messages,
  setMessages,
  append,
  setSuggestedQuestions,
  suggestedQuestions,
  user,
  selectedVisibilityType = 'private',
  reload,
  isLastMessage,
  error,
  isMissingAssistantResponse,
  handleRetry,
  isOwner = true,
}) => {
  // State for expanding/collapsing long user messages
  const [isExpanded, setIsExpanded] = useState(false);
  // State to track if the message exceeds max height
  const [exceedsMaxHeight, setExceedsMaxHeight] = useState(false);
  // Ref to check content height
  const messageContentRef = React.useRef<HTMLDivElement>(null);
  // Mode state for editing
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // Check if message content exceeds max height
  React.useEffect(() => {
    if (messageContentRef.current) {
      const contentHeight = messageContentRef.current.scrollHeight;
      setExceedsMaxHeight(contentHeight > USER_MESSAGE_MAX_HEIGHT);
    }
  }, [message.content]);

  const handleSuggestedQuestionClick = useCallback(
    async (question: string) => {
      // Only proceed if user is authenticated for public chats
      if (selectedVisibilityType === 'public' && !user) return;

      setSuggestedQuestions([]);

      await append({
        content: question.trim(),
        role: 'user',
      });
    },
    [append, setSuggestedQuestions, user, selectedVisibilityType],
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
                reload={reload}
                messages={messages}
                setSuggestedQuestions={setSuggestedQuestions}
              />
            ) : (
              <div className="group relative">
                <div className="relative">
                  {/* Render user message parts */}
                  {message.parts?.map((part: MessagePart, partIndex: number) => {
                    if (part.type === 'text') {
                      return (
                        <div
                          key={`user-${index}-${partIndex}`}
                          ref={messageContentRef}
                          className={`prose prose-neutral dark:prose-invert prose-p:my-2 prose-pre:my-2 prose-code:before:hidden prose-code:after:hidden [&>*]:font-syne! font-normal max-w-none [&>*]:text-lg text-neutral-900 dark:text-neutral-100 pr-10 sm:pr-12 overflow-hidden relative ${
                            !isExpanded && exceedsMaxHeight ? 'max-h-[100px]' : ''
                          }`}
                        >
                          <MarkdownRenderer content={preprocessLaTeX(part.text)} />

                          {!isExpanded && exceedsMaxHeight && (
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                          )}
                        </div>
                      );
                    }
                    return null; // Skip non-text parts for user messages
                  })}

                  {/* If no parts have text, fall back to the content property */}
                  {(!message.parts || !message.parts.some((part: any) => part.type === 'text' && part.text)) && (
                    <div
                      ref={messageContentRef}
                      className={`prose prose-neutral dark:prose-invert prose-p:my-2 prose-pre:my-2 prose-code:before:hidden prose-code:after:hidden [&>*]:font-[syne]! font-normal max-w-none [&>*]:text-lg text-neutral-900 dark:text-neutral-100 pr-10 sm:pr-12 overflow-hidden relative ${
                        !isExpanded && exceedsMaxHeight ? 'max-h-[100px]' : ''
                      }`}
                    >
                      <MarkdownRenderer content={preprocessLaTeX(message.content)} />

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
                        className="h-6 w-6 p-0 rounded-full text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 hover:bg-transparent"
                        aria-label={isExpanded ? 'Show less' : 'Show more'}
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}

                  <div className="absolute -right-2 top-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-0 translate-x-2 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm rounded-md border border-neutral-200 dark:border-neutral-700 flex items-center shadow-sm hover:shadow-md">
                    {/* Only show edit button for owners OR unauthenticated users on private chats */}
                    {((user && isOwner) || (!user && selectedVisibilityType === 'private')) && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setMode('edit')}
                          className="h-7 w-7 rounded-l-md rounded-r-none text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                          disabled={status === 'submitted' || status === 'streaming'}
                          aria-label="Edit message"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 15 15"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                          >
                            <path
                              d="M12.1464 1.14645C12.3417 0.951184 12.6583 0.951184 12.8535 1.14645L14.8535 3.14645C15.0488 3.34171 15.0488 3.65829 14.8535 3.85355L10.9109 7.79618C10.8349 7.87218 10.7471 7.93543 10.651 7.9835L6.72359 9.94721C6.53109 10.0435 6.29861 10.0057 6.14643 9.85355C5.99425 9.70137 5.95652 9.46889 6.05277 9.27639L8.01648 5.34897C8.06455 5.25283 8.1278 5.16507 8.2038 5.08907L12.1464 1.14645ZM12.5 2.20711L8.91091 5.79618L7.87266 7.87267L9.94915 6.83442L13.5382 3.24535L12.5 2.20711ZM8.99997 1.49997C9.27611 1.49997 9.49997 1.72383 9.49997 1.99997C9.49997 2.27611 9.27611 2.49997 8.99997 2.49997H4.49997C3.67154 2.49997 2.99997 3.17154 2.99997 3.99997V11C2.99997 11.8284 3.67154 12.5 4.49997 12.5H11.5C12.3284 12.5 13 11.8284 13 11V6.49997C13 6.22383 13.2238 5.99997 13.5 5.99997C13.7761 5.99997 14 6.22383 14 6.49997V11C14 12.3807 12.8807 13.5 11.5 13.5H4.49997C3.11926 13.5 1.99997 12.3807 1.99997 11V3.99997C1.99997 2.61926 3.11926 1.49997 4.49997 1.49997H8.99997Z"
                              fill="currentColor"
                              fillRule="evenodd"
                              clipRule="evenodd"
                            />
                          </svg>
                        </Button>
                        <Separator orientation="vertical" className="h-5 bg-neutral-200 dark:bg-neutral-700" />
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(message.content);
                        toast.success('Copied to clipboard');
                      }}
                      className={`h-7 w-7 ${
                        (!user || !isOwner) && selectedVisibilityType === 'public'
                          ? 'rounded-md'
                          : 'rounded-r-md rounded-l-none'
                      } text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors`}
                      aria-label="Copy message"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {message.experimental_attachments && message.experimental_attachments.length > 0 && (
                  <AttachmentsBadge attachments={message.experimental_attachments} />
                )}
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
              reload={reload}
              messages={messages}
              setSuggestedQuestions={setSuggestedQuestions}
            />
          ) : (
            <div className="group relative">
              <div className="relative">
                <div
                  ref={messageContentRef}
                  className={`prose prose-neutral dark:prose-invert prose-p:my-2 prose-pre:my-2 prose-code:before:hidden prose-code:after:hidden [&>*]:font-[syne]! font-normal max-w-none [&>*]:text-lg text-neutral-900 dark:text-neutral-100 pr-10 sm:pr-12 overflow-hidden relative ${
                    !isExpanded && exceedsMaxHeight ? 'max-h-[100px]' : ''
                  }`}
                >
                  <MarkdownRenderer content={preprocessLaTeX(message.content)} />

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
                      className="h-6 w-6 p-0 rounded-full text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 hover:bg-transparent"
                      aria-label={isExpanded ? 'Show less' : 'Show more'}
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                )}

                <div className="absolute -right-2 top-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-0 translate-x-2 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm rounded-md border border-neutral-200 dark:border-neutral-700 flex items-center shadow-sm hover:shadow-md">
                  {/* Only show edit button for owners OR unauthenticated users on private chats */}
                  {((user && isOwner) || (!user && selectedVisibilityType === 'private')) && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMode('edit')}
                        className="h-7 w-7 rounded-l-md rounded-r-none text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        disabled={status === 'submitted' || status === 'streaming'}
                        aria-label="Edit message"
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 15 15"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5"
                        >
                          <path
                            d="M12.1464 1.14645C12.3417 0.951184 12.6583 0.951184 12.8535 1.14645L14.8535 3.14645C15.0488 3.34171 15.0488 3.65829 14.8535 3.85355L10.9109 7.79618C10.8349 7.87218 10.7471 7.93543 10.651 7.9835L6.72359 9.94721C6.53109 10.0435 6.29861 10.0057 6.14643 9.85355C5.99425 9.70137 5.95652 9.46889 6.05277 9.27639L8.01648 5.34897C8.06455 5.25283 8.1278 5.16507 8.2038 5.08907L12.1464 1.14645ZM12.5 2.20711L8.91091 5.79618L7.87266 7.87267L9.94915 6.83442L13.5382 3.24535L12.5 2.20711ZM8.99997 1.49997C9.27611 1.49997 9.49997 1.72383 9.49997 1.99997C9.49997 2.27611 9.27611 2.49997 8.99997 2.49997H4.49997C3.67154 2.49997 2.99997 3.17154 2.99997 3.99997V11C2.99997 11.8284 3.67154 12.5 4.49997 12.5H11.5C12.3284 12.5 13 11.8284 13 11V6.49997C13 6.22383 13.2238 5.99997 13.5 5.99997C13.7761 5.99997 14 6.22383 14 6.49997V11C14 12.3807 12.8807 13.5 11.5 13.5H4.49997C3.11926 13.5 1.99997 12.3807 1.99997 11V3.99997C1.99997 2.61926 3.11926 1.49997 4.49997 1.49997H8.99997Z"
                            fill="currentColor"
                            fillRule="evenodd"
                            clipRule="evenodd"
                          />
                        </svg>
                      </Button>
                      <Separator orientation="vertical" className="h-5 bg-neutral-200 dark:bg-neutral-700" />
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                      toast.success('Copied to clipboard');
                    }}
                    className={`h-7 w-7 ${
                      (!user || !isOwner) && selectedVisibilityType === 'public'
                        ? 'rounded-md'
                        : 'rounded-r-md rounded-l-none'
                    } text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors`}
                    aria-label="Copy message"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {message.experimental_attachments && message.experimental_attachments.length > 0 && (
                <AttachmentsBadge attachments={message.experimental_attachments} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.role === 'assistant') {
    const isLastAssistantMessage = isLastMessage && message.role === 'assistant';

    return (
      <div className={isLastAssistantMessage ? 'min-h-[calc(100vh-18rem)]' : ''}>
        {message.parts?.map((part: MessagePart, partIndex: number) =>
          renderPart(part, index, partIndex, message.parts as MessagePart[], message),
        )}

        {/* Show retry option when assistant response is missing (not an error status) */}
        {isMissingAssistantResponse && (
          <div className="mt-3">
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
              <div className="bg-amber-50 dark:bg-amber-900/30 px-4 py-3 border-b border-amber-200 dark:border-amber-800 flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="bg-amber-100 dark:bg-amber-700/50 p-1.5 rounded-full">
                    <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-300" />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-amber-700 dark:text-amber-300">Incomplete Response</h3>
                  <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                    The assistant response appears to be incomplete or empty.
                  </p>
                </div>
              </div>

              <div className="px-4 py-3 flex items-center justify-between">
                <p className="text-neutral-500 dark:text-neutral-400 text-xs">
                  {!user && selectedVisibilityType === 'public'
                    ? 'Please sign in to retry or try a different prompt'
                    : 'Try regenerating the response or rephrase your question'}
                </p>
                {(user || selectedVisibilityType === 'private') && (
                  <Button onClick={handleRetry} className="bg-amber-600 hover:bg-amber-700 text-white" size="sm">
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Generate Response
                  </Button>
                )}
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
          <div className="w-full max-w-xl sm:max-w-2xl mt-3">
            <div className="flex items-center gap-1.5 mb-2 px-3">
              <AlignLeft size={16} className="text-neutral-600 dark:text-neutral-400" />
              <h2 className="font-medium text-sm text-neutral-700 dark:text-neutral-300">Suggested questions</h2>
            </div>
            <div className="flex flex-col border-t border-neutral-200 dark:border-neutral-800">
              {suggestedQuestions.map((question, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestionClick(question)}
                  className="w-full py-2.5 px-3 text-left flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors"
                >
                  <span className="text-neutral-700 dark:text-neutral-300 text-sm font-normal pr-3">{question}</span>
                  <Plus size={14} className="text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
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

// Editable attachments badge component for edit mode
export const EditableAttachmentsBadge = ({
  attachments,
  onRemoveAttachment,
}: {
  attachments: any[];
  onRemoveAttachment: (index: number) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fileAttachments = attachments.filter(
    (att) => att.contentType?.startsWith('image/') || att.contentType === 'application/pdf',
  );

  if (fileAttachments.length === 0) return null;

  const isPdf = (attachment: any) => attachment.contentType === 'application/pdf';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {fileAttachments.map((attachment, i) => {
          // Truncate filename to 15 characters
          const fileName = attachment.name || `File ${i + 1}`;
          const truncatedName = fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName;

          const isImage = attachment.contentType?.startsWith('image/');

          return (
            <div
              key={i}
              className="group flex items-center gap-1.5 max-w-xs rounded-full pl-1 pr-2 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
            >
              <button
                onClick={() => {
                  setSelectedIndex(i);
                  setIsOpen(true);
                }}
                className="flex items-center gap-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full pl-0 pr-1 transition-colors"
              >
                <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white dark:bg-neutral-900">
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
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                  {truncatedName}
                </span>
              </button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveAttachment(i)}
                className="h-4 w-4 p-0 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                title="Remove attachment"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 bg-white dark:bg-neutral-900 sm:max-w-3xl w-[90vw] max-h-[85vh] overflow-hidden">
          <div className="flex flex-col h-full max-h-[85vh]">
            <header className="p-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(fileAttachments[selectedIndex].url);
                    toast.success('File URL copied to clipboard');
                  }}
                  className="h-8 w-8 rounded-md text-neutral-600 dark:text-neutral-400"
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </Button>

                <a
                  href={fileAttachments[selectedIndex].url}
                  download={fileAttachments[selectedIndex].name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>

                {isPdf(fileAttachments[selectedIndex]) && (
                  <a
                    href={fileAttachments[selectedIndex].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                <Badge
                  variant="secondary"
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                >
                  {selectedIndex + 1} of {fileAttachments.length}
                </Badge>
              </div>

              <DialogClose className="h-8 w-8 rounded-md flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                <X className="h-4 w-4" />
              </DialogClose>
            </header>

            <div className="flex-1 p-1 overflow-auto flex items-center justify-center">
              <div className="relative flex items-center justify-center w-full h-full">
                {isPdf(fileAttachments[selectedIndex]) ? (
                  <div className="w-full h-[60vh] flex flex-col rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700 mx-auto">
                    <div className="bg-neutral-100 dark:bg-neutral-800 py-1.5 px-2 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]">
                          {fileAttachments[selectedIndex].name || `PDF ${selectedIndex + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={fileAttachments[selectedIndex].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
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
                        <div className="flex flex-col items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800">
                          <FileText className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
                          <p className="text-neutral-600 dark:text-neutral-300 text-sm mb-2">
                            PDF cannot be displayed directly
                          </p>
                          <div className="flex gap-2">
                            <a
                              href={fileAttachments[selectedIndex].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors"
                            >
                              Open PDF
                            </a>
                            <a
                              href={fileAttachments[selectedIndex].url}
                              download={fileAttachments[selectedIndex].name}
                              className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-medium rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
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
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 shadow-xs"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedIndex((prev) => (prev === fileAttachments.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 shadow-xs"
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
                {fileAttachments[selectedIndex].size && (
                  <span>{Math.round(fileAttachments[selectedIndex].size / 1024)} KB</span>
                )}
              </div>
            </footer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Export the attachments badge component for reuse
export const AttachmentsBadge = ({ attachments }: { attachments: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fileAttachments = attachments.filter(
    (att) => att.contentType?.startsWith('image/') || att.contentType === 'application/pdf',
  );

  if (fileAttachments.length === 0) return null;

  const isPdf = (attachment: any) => attachment.contentType === 'application/pdf';

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {fileAttachments.map((attachment, i) => {
          // Truncate filename to 15 characters
          const fileName = attachment.name || `File ${i + 1}`;
          const truncatedName = fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName;

          const fileExtension = fileName.split('.').pop()?.toLowerCase();
          const isImage = attachment.contentType?.startsWith('image/');

          return (
            <button
              key={i}
              onClick={() => {
                setSelectedIndex(i);
                setIsOpen(true);
              }}
              className="flex items-center gap-1.5 max-w-xs rounded-full pl-1 pr-3 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white dark:bg-neutral-900">
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
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                {truncatedName}
                {fileExtension && !isPdf(attachment) && !isImage && (
                  <span className="text-neutral-500 dark:text-neutral-400 ml-0.5">.{fileExtension}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 bg-white dark:bg-neutral-900 sm:max-w-3xl w-[90vw] max-h-[85vh] overflow-hidden">
          <div className="flex flex-col h-full max-h-[85vh]">
            <header className="p-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(fileAttachments[selectedIndex].url);
                    toast.success('File URL copied to clipboard');
                  }}
                  className="h-8 w-8 rounded-md text-neutral-600 dark:text-neutral-400"
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </Button>

                <a
                  href={fileAttachments[selectedIndex].url}
                  download={fileAttachments[selectedIndex].name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>

                {isPdf(fileAttachments[selectedIndex]) && (
                  <a
                    href={fileAttachments[selectedIndex].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                <Badge
                  variant="secondary"
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                >
                  {selectedIndex + 1} of {fileAttachments.length}
                </Badge>
              </div>

              <DialogClose className="h-8 w-8 rounded-md flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                <X className="h-4 w-4" />
              </DialogClose>
            </header>

            <div className="flex-1 p-1 overflow-auto flex items-center justify-center">
              <div className="relative flex items-center justify-center w-full h-full">
                {isPdf(fileAttachments[selectedIndex]) ? (
                  <div className="w-full h-[60vh] flex flex-col rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700 mx-auto">
                    <div className="bg-neutral-100 dark:bg-neutral-800 py-1.5 px-2 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]">
                          {fileAttachments[selectedIndex].name || `PDF ${selectedIndex + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={fileAttachments[selectedIndex].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
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
                        <div className="flex flex-col items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800">
                          <FileText className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
                          <p className="text-neutral-600 dark:text-neutral-300 text-sm mb-2">
                            PDF cannot be displayed directly
                          </p>
                          <div className="flex gap-2">
                            <a
                              href={fileAttachments[selectedIndex].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors"
                            >
                              Open PDF
                            </a>
                            <a
                              href={fileAttachments[selectedIndex].url}
                              download={fileAttachments[selectedIndex].name}
                              className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-medium rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
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
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 shadow-xs"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedIndex((prev) => (prev === fileAttachments.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 shadow-xs"
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
                {fileAttachments[selectedIndex].size && (
                  <span>{Math.round(fileAttachments[selectedIndex].size / 1024)} KB</span>
                )}
              </div>
            </footer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
