/* eslint-disable @next/next/no-img-element */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { sileo } from 'sileo';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';
import { checkImageModeration } from '@/app/actions';
import {
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
  CornerDownRight,
  Upload,
} from 'lucide-react';
import { UIMessagePart } from 'ai';
import { deleteTrailingMessages } from '@/app/actions';
import { getErrorActions, getErrorIcon, isSignInRequired, isProRequired, isRateLimited } from '@/lib/errors';
import { UserIcon } from '@phosphor-icons/react';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import {
  Copy01Icon,
  Crown02Icon,
  PencilEdit02Icon,
} from '@hugeicons/core-free-icons';
import { Attachment, ChatMessage, ChatTools, CustomUIDataTypes } from '@/lib/types';
import { UseChatHelpers } from '@ai-sdk/react';
import { ComprehensiveUserData } from '@/lib/user-data-server';
import { cn } from '@/lib/utils';
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
      <div className={`rounded-lg border ${colors.border} bg-background dark:bg-background overflow-hidden`}>
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
  attachmentsRenderer?: (attachments: Attachment[]) => React.ReactNode;
  onBeforeSubmit?: () => void;
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

const MAX_EDITOR_FILES = 4;
const MAX_EDITOR_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_EDITOR_DOCUMENT_SIZE = 50 * 1024 * 1024;
const EDITOR_ACCEPTED_FILE_TYPES = 'image/*,.pdf,.csv,.xlsx,.xls,.docx';
const EDITOR_DOCUMENT_MIME_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function getMaxSizeForFile(file: File): number {
  return isImageFile(file) ? MAX_EDITOR_IMAGE_SIZE : MAX_EDITOR_DOCUMENT_SIZE;
}

function insertFileParts(
  parts: ChatMessage['parts'][number][],
  newFileParts: ChatMessage['parts'][number][],
): ChatMessage['parts'][number][] {
  if (newFileParts.length === 0) return parts;

  const updatedParts: ChatMessage['parts'][number][] = [];
  let inserted = false;

  for (const part of parts) {
    if (!inserted && part.type === 'text') {
      updatedParts.push(...newFileParts);
      inserted = true;
    }
    updatedParts.push(part);
  }

  if (!inserted) {
    updatedParts.push(...newFileParts);
  }

  return updatedParts;
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [hasAttachmentEdits, setHasAttachmentEdits] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>(
    message.parts
      ?.map((part) => (part.type === 'text' ? part.text : ''))
      .join('')
      .trim() || '',
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProUser = Boolean(user?.isProUser);

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

  const uploadFile = useCallback(async (file: File): Promise<Attachment> => {
    try {
      const presignResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!presignResponse.ok) {
        const errorText = await presignResponse.text();
        throw new Error(`Failed to get upload URL: ${presignResponse.status} ${errorText}`);
      }

      const { presignedUrl, url } = await presignResponse.json();

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.status}`);
      }

      return {
        name: file.name,
        contentType: file.type,
        url,
      };
    } catch (error) {
      sileo.error({ title: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}` });
      throw error;
    }
  }, []);

  const handleFilesUpload = useCallback(
    async (files: File[], onFinish: () => void) => {
      if (files.length === 0) {
        onFinish();
        return;
      }

      const currentFileCount = message.parts?.filter((part) => part.type === 'file').length ?? 0;
      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const documentFiles: File[] = [];
      const unsupportedFiles: File[] = [];
      const oversizedFiles: File[] = [];
      const blockedPdfFiles: File[] = [];

      files.forEach((file) => {
        if (file.size > getMaxSizeForFile(file)) {
          oversizedFiles.push(file);
          return;
        }

        if (file.type.startsWith('image/')) {
          imageFiles.push(file);
        } else if (file.type === 'application/pdf') {
          if (!isProUser) {
            blockedPdfFiles.push(file);
          } else {
            pdfFiles.push(file);
          }
        } else if (EDITOR_DOCUMENT_MIME_TYPES.includes(file.type)) {
          documentFiles.push(file);
        } else {
          unsupportedFiles.push(file);
        }
      });

      if (unsupportedFiles.length > 0) {
        sileo.error({ title: `Some files are not supported: ${unsupportedFiles.map((f) => f.name).join(', ')}` });
      }

      if (oversizedFiles.length > 0) {
        sileo.error({ title: `Some files exceed the size limit: ${oversizedFiles.map((f) => f.name).join(', ')}` });
      }

      if (blockedPdfFiles.length > 0) {
        sileo.error({ title: `PDF uploads require Pro subscription. Upgrade to access PDF analysis.` });
      }

      const validFiles: File[] = [...imageFiles, ...documentFiles, ...pdfFiles];
      if (validFiles.length === 0) {
        onFinish();
        return;
      }

      const totalAttachments = currentFileCount + validFiles.length;
      if (totalAttachments > MAX_EDITOR_FILES) {
        sileo.error({ title: `You can only attach up to ${MAX_EDITOR_FILES} files.` });
        onFinish();
        return;
      }

      if (imageFiles.length > 0) {
        try {
          sileo.info({ title: 'Checking images for safety...' });
          const imageMap = await all(
            Object.fromEntries(imageFiles.map((file, index) => [`img:${index}`, async () => fileToDataURL(file)])),
            getBetterAllOptions(),
          );
          const imageDataURLs = imageFiles.map((_, index) => imageMap[`img:${index}`]);
          const moderationResult = await checkImageModeration(imageDataURLs);
          if (moderationResult !== 'safe') {
            const [status, category] = moderationResult.split('\n');
            if (status === 'unsafe') {
              sileo.error({ title: `Image content violates safety guidelines (${category}). Please choose different images.` });
              onFinish();
              return;
            }
          }
        } catch (error) {
          sileo.error({ title: 'Unable to verify image safety. Please try again.' });
          onFinish();
          return;
        }
      }

      setIsUploading(true);

      try {
        const uploadedAttachments: Attachment[] = [];
        for (const file of validFiles) {
          try {
            const attachment = await uploadFile(file);
            uploadedAttachments.push(attachment);
          } catch (error) {
            // Continue uploading remaining files
          }
        }

        if (uploadedAttachments.length > 0) {
          const newFileParts = uploadedAttachments.map((attachment) => ({
            type: 'file' as const,
            url: attachment.url,
            name: attachment.name,
            mediaType: attachment.contentType || attachment.mediaType || '',
          }));

          setMessages((currentMessages) => {
            const messageIndex = currentMessages.findIndex((m) => m.id === message.id);
            if (messageIndex === -1) return currentMessages;
            const currentMessage = currentMessages[messageIndex];
            const currentParts = Array.isArray(currentMessage.parts) ? currentMessage.parts : [];
            const updatedMessage = {
              ...currentMessage,
              parts: insertFileParts(currentParts, newFileParts),
            };
            const updatedMessages = [...currentMessages];
            updatedMessages[messageIndex] = updatedMessage;
            return updatedMessages;
          });

          setHasAttachmentEdits(true);
          sileo.success({ title: `${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''} uploaded successfully` });
        } else {
          sileo.error({ title: 'No files were successfully uploaded' });
        }
      } catch (error) {
        sileo.error({ title: 'Failed to upload one or more files. Please try again.' });
      } finally {
        setIsUploading(false);
        onFinish();
      }
    },
    [isProUser, message.id, message.parts, setMessages, uploadFile],
  );

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      await handleFilesUpload(files, () => {
        event.target.value = '';
      });
    },
    [handleFilesUpload],
  );

  const handleUploadClick = useCallback(() => {
    if (isUploading || isSubmitting) return;
    fileInputRef.current?.click();
  }, [isSubmitting, isUploading]);

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (isUploading || isSubmitting) return;
      if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
        const hasFile = Array.from(event.dataTransfer.items).some((item) => item.kind === 'file');
        if (hasFile) setIsDragActive(true);
      }
    },
    [isSubmitting, isUploading],
  );

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);
      if (isUploading || isSubmitting) return;
      const files = Array.from(event.dataTransfer.files || []);
      await handleFilesUpload(files, () => {});
    },
    [handleFilesUpload, isSubmitting, isUploading],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftContent.trim()) {
      sileo.error({ title: 'Please enter a valid message.' });
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
      sileo.error({ title: 'Failed to update message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUnchanged =
    draftContent.trim() ===
    message.parts
      ?.map((part) => (part.type === 'text' ? part.text : ''))
      .join('')
      .trim() &&
    !hasAttachmentEdits;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      {/* Editor area */}
      <div
        className={cn(
          'w-full rounded-2xl border border-border bg-accent/80 px-4 py-3 transition-colors',
          isDragActive && 'border-primary/70 bg-primary/5',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Textarea
          ref={textareaRef}
          value={draftContent}
          onChange={handleInput}
          autoFocus
          className="prose prose-sm sm:prose-base prose-neutral dark:prose-invert prose-p:my-0 prose-pre:my-1 prose-code:before:hidden prose-code:after:hidden
          font-sans font-normal max-w-none text-base! text-foreground dark:text-foreground overflow-hidden
          w-full resize-none border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0! outline-none min-h-0!
          transition-colors bg-transparent!"
          placeholder="Edit your message..."
          style={{
            lineHeight: '1.5',
          }}
        />

        {/* Show editable attachments inside editor */}
        {message.parts && message.parts.filter((part) => part.type === 'file').length > 0 && (
          <div className="mt-3">
            <EditableAttachmentsBadge
              attachments={message.parts.filter((part) => part.type === 'file') as unknown as Attachment[]}
              onRemoveAttachment={(index) => {
                const updatedAttachments = message.parts.filter(
                  (_: ChatMessage['parts'][number], i: number) => i !== index,
                );
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
                setHasAttachmentEdits(true);
              }}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={EDITOR_ACCEPTED_FILE_TYPES}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={isSubmitting || isUploading}
          className="rounded-lg px-3"
          title="Upload files"
        >
          {isUploading ? (
            <div className="size-4 border-2 border-foreground/60 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span className="ml-2">Upload</span>
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMode('view')}
          disabled={isSubmitting || isUploading}
          className="rounded-lg px-4"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || isUploading || isUnchanged}
          className="rounded-lg px-5 bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? (
            <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            'Done'
          )}
        </Button>
      </div>
    </form>
  );
};

// Max height for collapsed user messages (in pixels)
const USER_MESSAGE_MAX_HEIGHT = 125;

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
  attachmentsRenderer,
  onBeforeSubmit,
}) => {
  // State for expanding/collapsing long user messages
  const [isExpanded, setIsExpanded] = useState(false);
  // State to track if the message exceeds max height
  const [exceedsMaxHeight, setExceedsMaxHeight] = useState(false);
  // Ref to check content height
  const messageContentRef = React.useRef<HTMLDivElement>(null);
  // Mode state for editing
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const fileAttachments = React.useMemo(
    () => (message.parts?.filter((part) => part.type === 'file') as unknown as Attachment[]) ?? [],
    [message.parts],
  );

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
  }, [combinedUserText]);

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
      onBeforeSubmit?.();

      sendMessage({
        parts: [{ type: 'text', text: question.trim() } as UIMessagePart<CustomUIDataTypes, ChatTools>],
        role: 'user',
      });
    },
    [sendMessage, setSuggestedQuestions, user, selectedVisibilityType, onBeforeSubmit],
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
              <div className="group relative flex items-center gap-3 justify-end">
                {/* Actions on the left - vertically centered */}
                <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                  {((user && isOwner) || (!user && selectedVisibilityType === 'private')) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setMode('edit')}
                          className="p-1.5 rounded-full hover:bg-accent/80 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                          disabled={status === 'submitted' || status === 'streaming'}
                          aria-label="Edit message"
                        >
                          <HugeiconsIcon icon={PencilEdit02Icon} size={18} className="size-[18px]" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit message</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            message.parts
                              ?.map((part) => (part.type === 'text' ? part.text : ''))
                              .join('')
                              .trim() || '',
                          );
                          sileo.success({ title: 'Copied to clipboard' });
                        }}
                        className="p-1.5 rounded-full hover:bg-accent/80 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Copy message"
                      >
                        <HugeiconsIcon icon={Copy01Icon} size={18} className="size-[18px]" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy message</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Message content */}
                <div className="max-w-full">
                  <div
                    ref={messageContentRef}
                    className={`relative ${!isExpanded && exceedsMaxHeight ? 'max-h-[125px] overflow-hidden' : ''}`}
                  >
                    <div className="bg-accent/80 rounded-md px-4 py-2.5">
                      <div className={`font-sans font-normal max-w-none ${getDynamicFontSize(combinedUserText)} text-foreground dark:text-foreground whitespace-pre-wrap wrap-break-word`}>
                        {combinedUserText}
                      </div>
                      {fileAttachments.length > 0 && (
                          <div className="mt-2">
                            {attachmentsRenderer ? (
                              attachmentsRenderer(fileAttachments)
                            ) : (
                              <AttachmentsBadge attachments={fileAttachments} />
                            )}
                          </div>
                        )}
                    </div>

                    {!isExpanded && exceedsMaxHeight && (
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-background via-background/80 to-transparent pointer-events-none" />
                    )}
                  </div>

                  {exceedsMaxHeight && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/80 rounded px-1 py-0.5 mt-1 transition-colors inline-flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Show less' : 'Show more'}</span>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
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
                    <AlertCircle className="h-5 w-5 text-secondary-foreground dark:text-secondary-foreground mt-0.5 shrink-0" />
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
              <h2 className="font-medium texl-lg text-foreground dark:text-foreground">Follow-up</h2>
            </div>
            <div className="flex flex-col border-t border-border dark:border-border">
              {suggestedQuestions.map((question, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestionClick(question)}
                  className="w-full py-2.5 px-1 text-left flex justify-start items-center border-b last:border-none border-border dark:border-border"
                >
                  <CornerDownRight size={16} className="text-primary shrink-0 pr-1" />
                  <span className="text-foreground text-sm dark:text-foreground font-normal pr-3 hover:text-primary/80 dark:hover:text-primary/80">
                    {question}
                  </span>
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
  const editableDocumentMimeTypes = [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  const fileAttachments = attachments.filter((att) => {
    const contentType = att.contentType || att.mediaType || '';
    return (
      contentType.startsWith('image/') ||
      contentType === 'application/pdf' ||
      editableDocumentMimeTypes.includes(contentType)
    );
  });

  if (fileAttachments.length === 0) return null;

  const isPdf = (attachment: Attachment) =>
    attachment.contentType === 'application/pdf' || attachment.mediaType === 'application/pdf';

  const getEditableDocumentType = (attachment: Attachment): 'csv' | 'docx' | 'xlsx' | 'pdf' | 'image' | null => {
    const contentType = attachment.contentType || attachment.mediaType || '';
    if (contentType === 'application/pdf') return 'pdf';
    if (contentType === 'text/csv') return 'csv';
    if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
    if (
      contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      contentType === 'application/vnd.ms-excel'
    )
      return 'xlsx';
    if (contentType.startsWith('image/')) return 'image';
    return null;
  };

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
                <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-background">
                  {(() => {
                    const docType = getEditableDocumentType(attachment);
                    if (docType === 'image') {
                      return <img src={attachment.url} alt={fileName} className="h-full w-full object-cover" />;
                    }
                    return (
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
                        className="text-muted-foreground"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                    );
                  })()}
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
                    sileo.success({ title: 'File URL copied to clipboard' });
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
                ) : (() => {
                  const editDocType = getEditableDocumentType(fileAttachments[selectedIndex]);
                  if (editDocType === 'csv' || editDocType === 'xlsx' || editDocType === 'docx') {
                    const fileLabel =
                      editDocType === 'csv' ? 'CSV Spreadsheet' : editDocType === 'xlsx' ? 'Excel Spreadsheet' : 'Word Document';
                    return (
                      <div className="flex flex-col items-center justify-center h-[60vh] w-full">
                        <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-border bg-muted/30">
                          <div className="p-4 rounded-full bg-muted mb-4">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="48"
                              height="48"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-muted-foreground"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              {editDocType === 'csv' && (
                                <>
                                  <line x1="8" y1="13" x2="16" y2="13"></line>
                                  <line x1="8" y1="17" x2="16" y2="17"></line>
                                </>
                              )}
                              {editDocType === 'xlsx' && (
                                <>
                                  <rect x="8" y="12" width="8" height="6" rx="1"></rect>
                                  <line x1="12" y1="12" x2="12" y2="18"></line>
                                  <line x1="8" y1="15" x2="16" y2="15"></line>
                                </>
                              )}
                              {editDocType === 'docx' && (
                                <>
                                  <line x1="16" y1="13" x2="8" y2="13"></line>
                                  <line x1="16" y1="17" x2="8" y2="17"></line>
                                  <line x1="10" y1="9" x2="8" y2="9"></line>
                                </>
                              )}
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {fileAttachments[selectedIndex].name || `${fileLabel} ${selectedIndex + 1}`}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">{fileLabel}</p>
                          <a
                            href={fileAttachments[selectedIndex].url}
                            download={fileAttachments[selectedIndex].name}
                            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                          >
                            Download File
                          </a>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center justify-center h-[60vh]">
                      <img
                        src={fileAttachments[selectedIndex].url}
                        alt={fileAttachments[selectedIndex].name || `Image ${selectedIndex + 1}`}
                        className="max-w-full max-h-[60vh] object-contain rounded-md mx-auto"
                      />
                    </div>
                  );
                })()}

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
                  {fileAttachments.map((attachment, idx) => {
                    const thumbEditDocType = getEditableDocumentType(attachment);
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedIndex(idx)}
                        className={`relative h-10 w-10 rounded-md overflow-hidden shrink-0 transition-all ${selectedIndex === idx
                            ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                            : 'opacity-70 hover:opacity-100'
                          }`}
                      >
                        {thumbEditDocType === 'image' ? (
                          <img
                            src={attachment.url}
                            alt={attachment.name || `Thumbnail ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-muted">
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
                              className="text-muted-foreground"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
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

// Document type helper
const documentMimeTypes = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

const getDocumentType = (attachment: Attachment): 'csv' | 'docx' | 'xlsx' | 'pdf' | 'image' | null => {
  const contentType = attachment.contentType || attachment.mediaType || '';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType === 'text/csv') return 'csv';
  if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (
    contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    contentType === 'application/vnd.ms-excel'
  )
    return 'xlsx';
  if (contentType.startsWith('image/')) return 'image';
  return null;
};

// Export the attachments badge component for reuse
export const AttachmentsBadge = ({ attachments }: { attachments: Attachment[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fileAttachments = attachments.filter((att) => {
    const contentType = att.contentType || att.mediaType || '';
    return (
      contentType.startsWith('image/') ||
      contentType === 'application/pdf' ||
      documentMimeTypes.includes(contentType)
    );
  });

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

          return (
            <button
              key={i}
              onClick={() => {
                setSelectedIndex(i);
                setIsOpen(true);
              }}
              className="flex items-center gap-1.5 max-w-xs rounded-full pl-1 pr-3 py-1 bg-muted dark:bg-muted border border-border dark:border-border hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/10 transition-colors"
            >
              <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-background">
                {(() => {
                  const docType = getDocumentType(attachment);
                  if (docType === 'image') {
                    return <img src={attachment.url} alt={fileName} className="h-full w-full object-cover" />;
                  }
                  // All document types use the same muted color
                  return (
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
                      className="text-muted-foreground"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      {docType === 'pdf' && (
                        <>
                          <path d="M9 15v-2h6v2"></path>
                          <path d="M12 18v-5"></path>
                        </>
                      )}
                      {docType === 'csv' && (
                        <>
                          <line x1="8" y1="13" x2="16" y2="13"></line>
                          <line x1="8" y1="17" x2="16" y2="17"></line>
                        </>
                      )}
                      {docType === 'xlsx' && (
                        <>
                          <rect x="8" y="12" width="8" height="6" rx="1"></rect>
                          <line x1="12" y1="12" x2="12" y2="18"></line>
                          <line x1="8" y1="15" x2="16" y2="15"></line>
                        </>
                      )}
                      {docType === 'docx' && (
                        <>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <line x1="10" y1="9" x2="8" y2="9"></line>
                        </>
                      )}
                    </svg>
                  );
                })()}
              </div>
              <span className="text-xs font-medium text-foreground dark:text-foreground truncate">
                {truncatedName}
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
                    sileo.success({ title: 'File URL copied to clipboard' });
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
                {(() => {
                  const selectedFile = fileAttachments[selectedIndex];
                  const docType = getDocumentType(selectedFile);

                  if (docType === 'pdf') {
                    return (
                      <div className="w-full h-[60vh] flex flex-col rounded-md overflow-hidden border border-border dark:border-border mx-auto">
                        <div className="bg-muted dark:bg-muted py-1.5 px-2 flex items-center justify-between border-b border-border dark:border-border">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                            <span className="text-sm font-medium text-foreground dark:text-foreground truncate max-w-[200px]">
                              {selectedFile.name || `PDF ${selectedIndex + 1}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={selectedFile.url}
                              target="_blank"
                              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground dark:text-muted-foreground hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/10 transition-colors"
                              title="Open fullscreen"
                            >
                              <Maximize2 className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                        <div className="flex-1 w-full bg-white">
                          <object data={selectedFile.url} type="application/pdf" className="w-full h-full">
                            <div className="flex flex-col items-center justify-center w-full h-full bg-muted dark:bg-muted">
                              <FileText className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
                              <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-2">
                                PDF cannot be displayed directly
                              </p>
                              <div className="flex gap-2">
                                <a
                                  href={selectedFile.url}
                                  target="_blank"
                                  className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors"
                                >
                                  Open PDF
                                </a>
                                <a
                                  href={selectedFile.url}
                                  download={selectedFile.name}
                                  className="px-3 py-1.5 bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground text-xs font-medium rounded-md hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/10 transition-colors"
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                          </object>
                        </div>
                      </div>
                    );
                  }

                  if (docType === 'csv' || docType === 'xlsx' || docType === 'docx') {
                    const fileLabel =
                      docType === 'csv' ? 'CSV Spreadsheet' : docType === 'xlsx' ? 'Excel Spreadsheet' : 'Word Document';

                    return (
                      <div className="flex flex-col items-center justify-center h-[60vh] w-full">
                        <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-border bg-muted/30">
                          <div className="p-4 rounded-full bg-muted mb-4">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="48"
                              height="48"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-muted-foreground"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              {docType === 'csv' && (
                                <>
                                  <line x1="8" y1="13" x2="16" y2="13"></line>
                                  <line x1="8" y1="17" x2="16" y2="17"></line>
                                </>
                              )}
                              {docType === 'xlsx' && (
                                <>
                                  <rect x="8" y="12" width="8" height="6" rx="1"></rect>
                                  <line x1="12" y1="12" x2="12" y2="18"></line>
                                  <line x1="8" y1="15" x2="16" y2="15"></line>
                                </>
                              )}
                              {docType === 'docx' && (
                                <>
                                  <line x1="16" y1="13" x2="8" y2="13"></line>
                                  <line x1="16" y1="17" x2="8" y2="17"></line>
                                  <line x1="10" y1="9" x2="8" y2="9"></line>
                                </>
                              )}
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {selectedFile.name || `${fileLabel} ${selectedIndex + 1}`}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">{fileLabel}</p>
                          <a
                            href={selectedFile.url}
                            download={selectedFile.name}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </div>
                      </div>
                    );
                  }

                  // Default: image preview
                  return (
                    <div className="flex items-center justify-center h-[60vh]">
                      <img
                        src={selectedFile.url}
                        alt={selectedFile.name || `Image ${selectedIndex + 1}`}
                        className="max-w-full max-h-[60vh] object-contain rounded-md mx-auto"
                      />
                    </div>
                  );
                })()}

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
              <div className="border-t border-border p-2">
                <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-full">
                  {fileAttachments.map((attachment, idx) => {
                    const thumbDocType = getDocumentType(attachment);
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedIndex(idx)}
                        className={`relative h-10 w-10 rounded-md overflow-hidden shrink-0 transition-all ${selectedIndex === idx
                            ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                            : 'opacity-70 hover:opacity-100'
                          }`}
                      >
                        {thumbDocType === 'image' ? (
                          <img
                            src={attachment.url}
                            alt={attachment.name || `Thumbnail ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-muted">
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
                              className="text-muted-foreground"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
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
