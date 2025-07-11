/* eslint-disable @next/next/no-img-element */
// /components/ui/form-component.tsx
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  models,
  requiresAuthentication,
  requiresProSubscription,
  hasVisionSupport,
  hasPdfSupport,
  getAcceptedFileTypes,
  shouldBypassRateLimits,
} from '@/ai/providers';
import useWindowSize from '@/hooks/use-window-size';
import { TelescopeIcon, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn, SearchGroup, SearchGroupId, searchGroups } from '@/lib/utils';
import { Upload } from 'lucide-react';
import { UIMessage } from '@ai-sdk/ui-utils';
import { Globe } from 'lucide-react';
import { track } from '@vercel/analytics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserWithProStatus } from '@/hooks/use-user-data';
import { useSession } from '@/lib/auth-client';
import { checkImageModeration } from '@/app/actions';
import { Crown, LockIcon, MicrophoneIcon, Cpu } from '@phosphor-icons/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectValue,
  SelectTrigger,
} from '@/components/ui/select';

interface ModelSwitcherProps {
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  className?: string;
  attachments: Array<Attachment>;
  messages: Array<Message>;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  onModelSelect?: (model: (typeof models)[0]) => void;
  subscriptionData?: any;
  user?: UserWithProStatus | null;
}

const ModelSwitcher: React.FC<ModelSwitcherProps> = ({
  selectedModel,
  setSelectedModel,
  className,
  attachments,
  messages,
  status,
  onModelSelect,
  subscriptionData,
  user,
}) => {
  const isProUser = user?.isProUser || (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active');
  const isSubscriptionLoading = user && !subscriptionData;

  // Show all models to everyone, but control access via dialogs
  const availableModels = useMemo(() => {
    return models;
  }, []);

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [selectedProModel, setSelectedProModel] = useState<(typeof models)[0] | null>(null);
  const [selectedAuthModel, setSelectedAuthModel] = useState<(typeof models)[0] | null>(null);

  // Check for attachments in current and previous messages
  const hasAttachments =
    attachments.length > 0 ||
    messages.some((msg) => msg.experimental_attachments && msg.experimental_attachments.length > 0);

  // Filter models based on attachments first
  // Always show experimental models by removing the experimental filter
  const filteredModels = hasAttachments ? availableModels.filter((model) => model.vision) : availableModels;

  // Group filtered models by category
  const groupedModels = filteredModels.reduce((acc, model) => {
    const category = model.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(model);
    return acc;
  }, {} as Record<string, typeof availableModels>);

  const handleModelChange = (value: string) => {
    const model = availableModels.find((m) => m.value === value);
    if (!model) return;

    const requiresAuth = requiresAuthentication(model.value) && !user;
    const requiresPro = requiresProSubscription(model.value) && !isProUser;

    // Don't show dialogs if subscription is still loading
    if (isSubscriptionLoading) {
      return;
    }

    // Check for authentication requirement first
    if (requiresAuth) {
      setSelectedAuthModel(model);
      setShowSignInDialog(true);
      return;
    }

    // Then check for Pro requirement - only if user is NOT Pro
    if (requiresPro && !isProUser) {
      setSelectedProModel(model);
      setShowUpgradeDialog(true);
      return;
    }

    console.log('Selected model:', model.value);
    setSelectedModel(model.value.trim());

    // Call onModelSelect if provided
    if (onModelSelect) {
      onModelSelect(model);
    }
  };

  return (
    <>
      <Select value={selectedModel} onValueChange={handleModelChange}>
        <SelectTrigger
          size="sm"
          className={cn(
            'group flex items-center gap-2 w-fit',
            'px-3 h-8',
            'rounded-full transition-all duration-200',
            'border border-neutral-300 dark:border-neutral-700',
            'bg-gradient-to-b from-neutral-50 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-950',
            'text-neutral-900 dark:text-neutral-100',
            'shadow-[inset_0_1px_0px_0px_#ffffff] dark:shadow-[inset_0_1px_0px_0px_#525252]',
            'hover:from-neutral-100 hover:via-neutral-200 hover:to-neutral-300 dark:hover:from-neutral-700 dark:hover:via-neutral-800 dark:hover:to-neutral-900',
            'active:[box-shadow:none]',
            'ring-0! outline-none!',
            className,
          )}
        >
          <SelectValue asChild>
            <span className="flex items-center justify-center group-active:[transform:translate3d(0,1px,0)]">
              <Cpu className="size-4 text-neutral-600 dark:text-neutral-400" />
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          className="w-[240px] p-1 font-sans rounded-xl bg-white dark:bg-neutral-900 z-40 shadow-lg border border-neutral-200 dark:border-neutral-800 max-h-[280px] overflow-y-auto"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          {Object.entries(groupedModels).map(([category, categoryModels], categoryIndex) => (
            <SelectGroup key={category}>
              {categoryIndex > 0 && <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />}
              <SelectLabel className="px-2 py-1 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                {category} Models
              </SelectLabel>
              {categoryModels.map((model) => {
                const requiresAuth = requiresAuthentication(model.value) && !user;
                const requiresPro = requiresProSubscription(model.value) && !isProUser;
                const isLocked = requiresAuth || requiresPro;

                if (isLocked) {
                  return (
                    <div
                      key={model.value}
                      className={cn(
                        'flex items-center justify-between px-2 py-1.5 mb-0.5 rounded-lg text-xs cursor-pointer',
                        'transition-all duration-200',
                        'opacity-50 hover:opacity-70 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                      )}
                      onClick={() => {
                        // Don't show dialogs if subscription is still loading
                        if (isSubscriptionLoading) {
                          return;
                        }
                        
                        if (requiresAuth) {
                          setSelectedAuthModel(model);
                          setShowSignInDialog(true);
                        } else if (requiresPro && !isProUser) {
                          setSelectedProModel(model);
                          setShowUpgradeDialog(true);
                        }
                      }}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="font-medium truncate text-[11px] flex items-center gap-1">
                          {model.label}
                          {requiresAuth ? (
                            <LockIcon className="size-3 text-neutral-400" />
                          ) : (
                            <Crown className="size-3 text-neutral-400" />
                          )}
                        </div>
                        <div className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate leading-tight">
                          {model.description}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <SelectItem
                    key={model.value}
                    value={model.value}
                    className={cn(
                      'flex items-center justify-between px-2 py-1.5 mb-0.5 rounded-lg text-xs',
                      'transition-all duration-200',
                      'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                      'data-[state=checked]:bg-neutral-200 dark:data-[state=checked]:bg-neutral-700',
                    )}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="font-medium truncate text-[11px] flex items-center gap-1">
                        {model.label}
                        {(() => {
                          const requiresAuth = requiresAuthentication(model.value) && !user;
                          const requiresPro = requiresProSubscription(model.value) && !isProUser;

                          if (requiresAuth) {
                            return <LockIcon className="size-3 text-neutral-400" />;
                          } else if (requiresPro) {
                            return <Crown className="size-3 text-neutral-400" />;
                          }
                          return null;
                        })()}
                      </div>
                      <div className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate leading-tight">
                        {model.description}
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md p-0 gap-0 border border-neutral-200/60 dark:border-neutral-800/60 shadow-xl">
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                  <Crown className="w-4 h-4 text-white dark:text-black" weight="fill" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                    {selectedProModel?.label} requires Pro
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Upgrade to access premium AI models</p>
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
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Claude 4 Opus, Grok 3, advanced reasoning
                  </p>
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
                onClick={() => setShowUpgradeDialog(false)}
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

      {/* Sign In Dialog */}
      <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
        <DialogContent className="sm:max-w-[420px] p-0 gap-0 border border-neutral-200/60 dark:border-neutral-800/60 shadow-xl">
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-600 dark:bg-neutral-700 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 text-white"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                    {selectedAuthModel?.label} requires sign in
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Create an account to access this AI model
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Access better models</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Gemini 2.5 Flash Lite and GPT-4o Mini
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Save search history</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Keep track of your conversations</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Free to start</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    No payment required for basic features
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSignInDialog(false)}
                className="flex-1 h-9 text-sm font-normal border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  window.location.href = '/sign-in';
                }}
                className="flex-1 h-9 text-sm font-normal bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
              >
                Sign in
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface Attachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
}

const ArrowUpIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <svg height={size} strokeLinejoin="round" viewBox="0 0 16 16" width={size} style={{ color: 'currentcolor' }}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.70711 1.39644C8.31659 1.00592 7.68342 1.00592 7.2929 1.39644L2.21968 6.46966L1.68935 6.99999L2.75001 8.06065L3.28034 7.53032L7.25001 3.56065V14.25V15H8.75001V14.25V3.56065L12.7197 7.53032L13.25 8.06065L14.3107 6.99999L13.7803 6.46966L8.70711 1.39644Z"
        fill="currentColor"
      ></path>
    </svg>
  );
};

const StopIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <svg height={size} viewBox="0 0 16 16" width={size} style={{ color: 'currentcolor' }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M3 3H13V13H3V3Z" fill="currentColor"></path>
    </svg>
  );
};

const PaperclipIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <svg
      height={size}
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      width={size}
      style={{ color: 'currentcolor' }}
      className="-rotate-45"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.8591 1.70735C10.3257 1.70735 9.81417 1.91925 9.437 2.29643L3.19455 8.53886C2.56246 9.17095 2.20735 10.0282 2.20735 10.9222C2.20735 11.8161 2.56246 12.6734 3.19455 13.3055C3.82665 13.9376 4.68395 14.2927 5.57786 14.2927C6.47178 14.2927 7.32908 13.9376 7.96117 13.3055L14.2036 7.06304L14.7038 6.56287L15.7041 7.56321L15.204 8.06337L8.96151 14.3058C8.06411 15.2032 6.84698 15.7074 5.57786 15.7074C4.30875 15.7074 3.09162 15.2032 2.19422 14.3058C1.29682 13.4084 0.792664 12.1913 0.792664 10.9222C0.792664 9.65305 1.29682 8.43592 2.19422 7.53852L8.43666 1.29609C9.07914 0.653606 9.95054 0.292664 10.8591 0.292664C11.7678 0.292664 12.6392 0.653606 13.2816 1.29609C13.9241 1.93857 14.2851 2.80997 14.2851 3.71857C14.2851 4.62718 13.9241 5.49858 13.2816 6.14106L13.2814 6.14133L7.0324 12.3835C7.03231 12.3836 7.03222 12.3837 7.03213 12.3838C6.64459 12.7712 6.11905 12.9888 5.57107 12.9888C5.02297 12.9888 4.49731 12.7711 4.10974 12.3835C3.72217 11.9959 3.50444 11.4703 3.50444 10.9222C3.50444 10.3741 3.72217 9.8484 4.10974 9.46084L4.11004 9.46054L9.877 3.70039L10.3775 3.20051L11.3772 4.20144L10.8767 4.70131L5.11008 10.4612C5.11005 10.4612 5.11003 10.4612 5.11 10.4613C4.98779 10.5835 4.91913 10.7493 4.91913 10.9222C4.91913 11.0951 4.98782 11.2609 5.11008 11.3832C5.23234 11.5054 5.39817 11.5741 5.57107 11.5741C5.74398 11.5741 5.9098 11.5054 6.03206 11.3832L6.03233 11.3829L12.2813 5.14072C12.2814 5.14063 12.2815 5.14054 12.2816 5.14045C12.6586 4.7633 12.8704 4.25185 12.8704 3.71857C12.8704 3.18516 12.6585 2.6736 12.2813 2.29643C11.9041 1.91925 11.3926 1.70735 10.8591 1.70735Z"
        fill="currentColor"
      ></path>
    </svg>
  );
};

const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_INPUT_CHARS = 10000;

// Helper function to convert File to base64 data URL for moderation
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Removed local supportsPdfAttachments function - now use hasPdfSupport from providers

// Removed local hasVisionSupport function - now imported from providers

// Removed local getAcceptFileTypes function - now imported from providers

const truncateFilename = (filename: string, maxLength: number = 20) => {
  if (filename.length <= maxLength) return filename;
  const extension = filename.split('.').pop();
  const name = filename.substring(0, maxLength - 4);
  return `${name}...${extension}`;
};

const AttachmentPreview: React.FC<{
  attachment: Attachment | UploadingAttachment;
  onRemove: () => void;
  isUploading: boolean;
}> = ({ attachment, onRemove, isUploading }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB' + (bytes > MAX_FILE_SIZE ? ' (exceeds 5MB limit)' : '');
  };

  const isUploadingAttachment = (attachment: Attachment | UploadingAttachment): attachment is UploadingAttachment => {
    return 'progress' in attachment;
  };

  const isPdf = (attachment: Attachment | UploadingAttachment): boolean => {
    if (isUploadingAttachment(attachment)) {
      return attachment.file.type === 'application/pdf';
    }
    return (attachment as Attachment).contentType === 'application/pdf';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative flex items-center',
        'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xs',
        'border border-neutral-200/80 dark:border-neutral-700/80',
        'rounded-2xl p-2 pr-8 gap-2.5',
        'shadow-xs hover:shadow-md',
        'shrink-0 z-0',
        'hover:bg-white dark:hover:bg-neutral-800',
        'transition-all duration-200',
        'group',
      )}
    >
      {isUploading ? (
        <div className="w-8 h-8 flex items-center justify-center">
          <svg
            className="animate-spin h-4 w-4 text-neutral-500 dark:text-neutral-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : isUploadingAttachment(attachment) ? (
        <div className="w-8 h-8 flex items-center justify-center">
          <div className="relative w-6 h-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                className="text-neutral-200 dark:text-neutral-700 stroke-current"
                strokeWidth="8"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
              ></circle>
              <circle
                className="text-primary stroke-current"
                strokeWidth="8"
                strokeLinecap="round"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                strokeDasharray={`${attachment.progress * 251.2}, 251.2`}
                transform="rotate(-90 50 50)"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200">
                {Math.round(attachment.progress * 100)}%
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-8 h-8 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 shrink-0 ring-1 ring-neutral-200/50 dark:ring-neutral-700/50 flex items-center justify-center">
          {isPdf(attachment) ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
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
          ) : (
            <img
              src={(attachment as Attachment).url}
              alt={`Preview of ${attachment.name}`}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      )}
      <div className="grow min-w-0">
        {!isUploadingAttachment(attachment) && (
          <p className="text-xs font-medium truncate text-neutral-800 dark:text-neutral-200">
            {truncateFilename(attachment.name)}
          </p>
        )}
        <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
          {isUploadingAttachment(attachment) ? 'Uploading...' : formatFileSize((attachment as Attachment).size)}
        </p>
      </div>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          'absolute -top-1.5 -right-1.5 p-0.5 m-0 rounded-full',
          'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xs',
          'border border-neutral-200/80 dark:border-neutral-700/80',
          'shadow-xs hover:shadow-md',
          'transition-all duration-200 z-20',
          'opacity-0 group-hover:opacity-100',
          'scale-75 group-hover:scale-100',
          'hover:bg-neutral-100 dark:hover:bg-neutral-700',
        )}
      >
        <X className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
      </motion.button>
    </motion.div>
  );
};

interface UploadingAttachment {
  file: File;
  progress: number;
}

interface FormComponentProps {
  input: string;
  setInput: (input: string) => void;
  attachments: Array<Attachment>;
  setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>;
  chatId: string;
  user: UserWithProStatus | null;
  subscriptionData?: any;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  stop: () => void;
  messages: Array<UIMessage>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  resetSuggestedQuestions: () => void;
  lastSubmittedQueryRef: React.MutableRefObject<string>;
  selectedGroup: SearchGroupId;
  setSelectedGroup: React.Dispatch<React.SetStateAction<SearchGroupId>>;
  showExperimentalModels: boolean;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  setHasSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
  isLimitBlocked?: boolean;
}

interface GroupSelectorProps {
  selectedGroup: SearchGroupId;
  onGroupSelect: (group: SearchGroup) => void;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
}

const GroupSelector: React.FC<GroupSelectorProps> = ({ selectedGroup, onGroupSelect, status }) => {
  const { data: session } = useSession();

  // If user is not authenticated and selectedGroup is memory, switch to web
  useEffect(() => {
    if (!session && selectedGroup === 'memory') {
      const webGroup = searchGroups.find((group) => group.id === 'web');
      if (webGroup) {
        onGroupSelect(webGroup);
      }
    }
  }, [session, selectedGroup, onGroupSelect]);

  // Filter groups based on authentication status
  const visibleGroups = searchGroups.filter((group) => {
    if (!group.show) return false;
    if ('requireAuth' in group && group.requireAuth && !session) return false;
    return true;
  });

  const selectedGroupData = visibleGroups.find((group) => group.id === selectedGroup);

  const handleGroupChange = (value: string) => {
    const group = visibleGroups.find((g) => g.id === value);
    if (group) {
      onGroupSelect(group);
    }
  };

  return (
    <Select value={selectedGroup} onValueChange={handleGroupChange}>
      <SelectTrigger
        size="sm"
        className={cn(
          'group flex items-center gap-2 w-fit',
          'px-3 h-8',
          'rounded-full transition-all duration-200',
          'border border-neutral-300 dark:border-neutral-700',
          'bg-gradient-to-b from-neutral-50 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-950',
          'text-neutral-900 dark:text-neutral-100',
          'shadow-[inset_0_1px_0px_0px_#ffffff] dark:shadow-[inset_0_1px_0px_0px_#525252]',
          'hover:from-neutral-100 hover:via-neutral-200 hover:to-neutral-300 dark:hover:from-neutral-700 dark:hover:via-neutral-800 dark:hover:to-neutral-900',
          'active:[box-shadow:none]',
          'ring-0! outline-none!',
        )}
      >
        <SelectValue asChild>
          <span
            className={cn(
              'font-medium whitespace-nowrap flex items-center gap-1.5 group-active:[transform:translate3d(0,1px,0)]',
              'text-xs',
            )}
          >
            {selectedGroupData && (
              <>
                <selectedGroupData.icon className={cn('size-4')} />
                {selectedGroupData.name}
              </>
            )}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className="w-[12em] p-1 font-sans rounded-xl bg-white dark:bg-neutral-900 z-50 shadow-lg border border-neutral-200 dark:border-neutral-800 max-h-[240px] overflow-y-auto"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <SelectGroup>
          <SelectLabel className="px-2 py-1 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
            Search Mode
          </SelectLabel>
          {visibleGroups.map((group) => {
            const Icon = group.icon;
            return (
              <SelectItem
                key={group.id}
                value={group.id}
                className={cn(
                  'flex items-center justify-between px-2 py-2 mb-0.5 rounded-lg text-xs',
                  'transition-all duration-200',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'data-[state=checked]:bg-neutral-200 dark:data-[state=checked]:bg-neutral-700',
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-4">
                  <Icon className="size-4 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="font-medium truncate text-[11px] text-neutral-900 dark:text-neutral-100">
                      {group.name}
                    </div>
                    <div className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate leading-tight text-wrap!">
                      {group.description}
                    </div>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

const FormComponent: React.FC<FormComponentProps> = ({
  chatId,
  user,
  subscriptionData,
  input,
  setInput,
  attachments,
  setAttachments,
  handleSubmit,
  fileInputRef,
  inputRef,
  stop,
  selectedModel,
  setSelectedModel,
  resetSuggestedQuestions,
  lastSubmittedQueryRef,
  selectedGroup,
  setSelectedGroup,
  messages,
  status,
  setHasSubmitted,
  isLimitBlocked = false,
}) => {
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
  const isMounted = useRef(true);
  const isCompositionActive = useRef(false);
  const { width } = useWindowSize();
  const postSubmitFileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  async function handleRecord() {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);

        recorder.addEventListener('dataavailable', async (event) => {
          if (event.data.size > 0) {
            const audioBlob = event.data;

            try {
              const formData = new FormData();
              formData.append('audio', audioBlob, 'recording.webm');
              const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
              });

              if (!response.ok) {
                throw new Error(`Transcription failed: ${response.statusText}`);
              }

              const data = await response.json();

              if (data.text) {
                setInput(data.text);
              } else {
                console.error('Transcription response did not contain text:', data);
              }
            } catch (error) {
              console.error('Error during transcription request:', error);
            } finally {
              setIsRecording(false);
              setMediaRecorder(null);
              stream.getTracks().forEach((track) => track.stop());
            }
          }
        });

        recorder.addEventListener('stop', () => {
          stream.getTracks().forEach((track) => track.stop());
        });

        recorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setIsRecording(false);
      }
    }
  }

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const newValue = event.target.value;

    // Check if input exceeds character limit
    if (newValue.length > MAX_INPUT_CHARS) {
      setInput(newValue);
      toast.error(`Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters.`);
    } else {
      setInput(newValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleGroupSelect = useCallback(
    (group: SearchGroup) => {
      setSelectedGroup(group.id);
      inputRef.current?.focus();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [setSelectedGroup, inputRef],
  );

  // Update uploadFile function to add more error details
  const uploadFile = async (file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Uploading file:', file.name, file.type, file.size);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Upload successful:', data);
        return data;
      } else {
        const errorText = await response.text();
        console.error('Upload failed with status:', response.status, errorText);
        throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // Fix handleFileChange to ensure it properly processes files
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) {
        console.log('No files selected in file input');
        return;
      }

      console.log(
        'Files selected:',
        files.map((f) => `${f.name} (${f.type})`),
      );

      // Check if user is Pro
      const isProUser = user?.isProUser || (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active');

      // First, separate images and PDFs
      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const unsupportedFiles: File[] = [];
      const oversizedFiles: File[] = [];
      const blockedPdfFiles: File[] = [];

      files.forEach((file) => {
        // Check file size first
        if (file.size > MAX_FILE_SIZE) {
          oversizedFiles.push(file);
          return;
        }

        // Then check file type
        if (file.type.startsWith('image/')) {
          imageFiles.push(file);
        } else if (file.type === 'application/pdf') {
          if (!isProUser) {
            blockedPdfFiles.push(file);
          } else {
            pdfFiles.push(file);
          }
        } else {
          unsupportedFiles.push(file);
        }
      });

      if (unsupportedFiles.length > 0) {
        console.log(
          'Unsupported files:',
          unsupportedFiles.map((f) => `${f.name} (${f.type})`),
        );
        toast.error(`Some files are not supported: ${unsupportedFiles.map((f) => f.name).join(', ')}`);
      }

      if (blockedPdfFiles.length > 0) {
        console.log(
          'Blocked PDF files for non-Pro user:',
          blockedPdfFiles.map((f) => f.name),
        );
        toast.error(`PDF uploads require Pro subscription. Upgrade to access PDF analysis.`, {
          action: {
            label: 'Upgrade',
            onClick: () => (window.location.href = '/pricing'),
          },
        });
      }

      if (imageFiles.length === 0 && pdfFiles.length === 0) {
        console.log('No supported files found');
        event.target.value = '';
        return;
      }

      // Auto-switch to PDF-compatible model if PDFs are present
      const currentModelData = models.find((m) => m.value === selectedModel);
      if (pdfFiles.length > 0 && (!currentModelData || !currentModelData.pdf)) {
        console.log('PDFs detected, switching to compatible model');

        // Find first compatible model that supports PDFs and vision
        const compatibleModel = models.find((m) => m.pdf && m.vision);

        if (compatibleModel) {
          console.log('Switching to compatible model:', compatibleModel.value);
          setSelectedModel(compatibleModel.value);
        } else {
          console.warn('No PDF-compatible model found');
          toast.error('PDFs are only supported by Gemini and Claude models');
          // Continue with only image files
          if (imageFiles.length === 0) {
            event.target.value = '';
            return;
          }
        }
      }

      // Combine valid files
      let validFiles: File[] = [...imageFiles];
      if (hasPdfSupport(selectedModel) || pdfFiles.length > 0) {
        validFiles = [...validFiles, ...pdfFiles];
      }

      console.log(
        'Valid files for upload:',
        validFiles.map((f) => f.name),
      );

      const totalAttachments = attachments.length + validFiles.length;
      if (totalAttachments > MAX_FILES) {
        toast.error(`You can only attach up to ${MAX_FILES} files.`);
        event.target.value = '';
        return;
      }

      if (validFiles.length === 0) {
        console.error('No valid files to upload');
        event.target.value = '';
        return;
      }

      // Check image moderation before uploading
      if (imageFiles.length > 0) {
        try {
          console.log('Checking image moderation for', imageFiles.length, 'images');
          toast.info('Checking images for safety...');

          // Convert images to data URLs for moderation
          const imageDataURLs = await Promise.all(imageFiles.map((file) => fileToDataURL(file)));

          // Check moderation
          const moderationResult = await checkImageModeration(imageDataURLs);
          console.log('Moderation result:', moderationResult);

          if (moderationResult !== 'safe') {
            const [status, category] = moderationResult.split('\n');
            if (status === 'unsafe') {
              console.warn('Unsafe image detected, category:', category);
              toast.error(`Image content violates safety guidelines (${category}). Please choose different images.`);
              event.target.value = '';
              return;
            }
          }

          console.log('Images passed moderation check');
        } catch (error) {
          console.error('Error during image moderation:', error);
          toast.error('Unable to verify image safety. Please try again.');
          event.target.value = '';
          return;
        }
      }

      setUploadQueue(validFiles.map((file) => file.name));

      try {
        console.log('Starting upload of', validFiles.length, 'files');

        // Upload files one by one for better error handling
        const uploadedAttachments: Attachment[] = [];
        for (const file of validFiles) {
          try {
            console.log(`Uploading file: ${file.name} (${file.type})`);
            const attachment = await uploadFile(file);
            uploadedAttachments.push(attachment);
            console.log(`Successfully uploaded: ${file.name}`);
          } catch (err) {
            console.error(`Failed to upload ${file.name}:`, err);
          }
        }

        console.log('Upload completed for', uploadedAttachments.length, 'files');

        if (uploadedAttachments.length > 0) {
          setAttachments((currentAttachments) => [...currentAttachments, ...uploadedAttachments]);

          toast.success(
            `${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''} uploaded successfully`,
          );
        } else {
          toast.error('No files were successfully uploaded');
        }
      } catch (error) {
        console.error('Error uploading files!', error);
        toast.error('Failed to upload one or more files. Please try again.');
      } finally {
        setUploadQueue([]);
        event.target.value = '';
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [attachments, setAttachments, selectedModel, setSelectedModel],
  );

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Only check if we've reached the attachment limit
      if (attachments.length >= MAX_FILES) return;

      // Always show drag UI when files are dragged over
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        // Check if at least one item is a file
        const hasFile = Array.from(e.dataTransfer.items).some((item) => item.kind === 'file');
        if (hasFile) {
          setIsDragging(true);
        }
      }
    },
    [attachments.length],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const getFirstVisionModel = useCallback(() => {
    return models.find((model) => model.vision)?.value || selectedModel;
  }, [selectedModel]);

  // Fix the handleDrop function specifically to ensure uploads happen
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      // Log raw files first
      const allFiles = Array.from(e.dataTransfer.files);
      console.log(
        'Raw files dropped:',
        allFiles.map((f) => `${f.name} (${f.type})`),
      );

      if (allFiles.length === 0) {
        toast.error('No files detected in drop');
        return;
      }

      // Simple verification to ensure we're actually getting Files from the drop
      toast.info(`Detected ${allFiles.length} dropped files`);

      // Check if user is Pro
      const isProUser = user?.isProUser || (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active');

      // First, separate images and PDFs
      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const unsupportedFiles: File[] = [];
      const oversizedFiles: File[] = [];
      const blockedPdfFiles: File[] = [];

      allFiles.forEach((file) => {
        console.log(`Processing file: ${file.name} (${file.type})`);

        // Check file size first
        if (file.size > MAX_FILE_SIZE) {
          oversizedFiles.push(file);
          return;
        }

        // Then check file type
        if (file.type.startsWith('image/')) {
          imageFiles.push(file);
        } else if (file.type === 'application/pdf') {
          if (!isProUser) {
            blockedPdfFiles.push(file);
          } else {
            pdfFiles.push(file);
          }
        } else {
          unsupportedFiles.push(file);
        }
      });

      console.log(
        `Images: ${imageFiles.length}, PDFs: ${pdfFiles.length}, Unsupported: ${unsupportedFiles.length}, Oversized: ${oversizedFiles.length}`,
      );

      if (unsupportedFiles.length > 0) {
        console.log(
          'Unsupported files:',
          unsupportedFiles.map((f) => `${f.name} (${f.type})`),
        );
        toast.error(`Some files not supported: ${unsupportedFiles.map((f) => f.name).join(', ')}`);
      }

      if (oversizedFiles.length > 0) {
        console.log(
          'Oversized files:',
          oversizedFiles.map((f) => `${f.name} (${f.size} bytes)`),
        );
        toast.error(`Some files exceed the 5MB limit: ${oversizedFiles.map((f) => f.name).join(', ')}`);
      }

      if (blockedPdfFiles.length > 0) {
        console.log(
          'Blocked PDF files for non-Pro user:',
          blockedPdfFiles.map((f) => f.name),
        );
        toast.error(`PDF uploads require Pro subscription. Upgrade to access PDF analysis.`, {
          action: {
            label: 'Upgrade',
            onClick: () => (window.location.href = '/pricing'),
          },
        });
      }

      // Check if we have any supported files
      if (imageFiles.length === 0 && pdfFiles.length === 0) {
        toast.error('Only image and PDF files are supported');
        return;
      }

      // Auto-switch to PDF-compatible model if PDFs are present
      const currentModelData = models.find((m) => m.value === selectedModel);
      if (pdfFiles.length > 0 && (!currentModelData || !currentModelData.pdf)) {
        console.log('PDFs detected, switching to compatible model');

        // Find first compatible model that supports PDFs
        const compatibleModel = models.find((m) => m.pdf && m.vision);

        if (compatibleModel) {
          console.log('Switching to compatible model:', compatibleModel.value);
          setSelectedModel(compatibleModel.value);
          toast.info(`Switching to ${compatibleModel.label} to support PDF files`);
        } else {
          console.warn('No PDF-compatible model found');
          toast.error('PDFs are only supported by Gemini and Claude models');
          // Continue with only image files
          if (imageFiles.length === 0) return;
        }
      }

      // Combine valid files
      let validFiles: File[] = [...imageFiles];
      if (hasPdfSupport(selectedModel) || pdfFiles.length > 0) {
        validFiles = [...validFiles, ...pdfFiles];
      }

      console.log(
        'Files to upload:',
        validFiles.map((f) => `${f.name} (${f.type})`),
      );

      // Check total attachment count
      const totalAttachments = attachments.length + validFiles.length;
      if (totalAttachments > MAX_FILES) {
        toast.error(`You can only attach up to ${MAX_FILES} files.`);
        return;
      }

      if (validFiles.length === 0) {
        console.error('No valid files to upload after filtering');
        toast.error('No valid files to upload');
        return;
      }

      // Check image moderation before proceeding
      if (imageFiles.length > 0) {
        try {
          console.log('Checking image moderation for', imageFiles.length, 'images');
          toast.info('Checking images for safety...');

          // Convert images to data URLs for moderation
          const imageDataURLs = await Promise.all(imageFiles.map((file) => fileToDataURL(file)));

          // Check moderation
          const moderationResult = await checkImageModeration(imageDataURLs);
          console.log('Moderation result:', moderationResult);

          if (moderationResult !== 'safe') {
            const [status, category] = moderationResult.split('\n');
            if (status === 'unsafe') {
              console.warn('Unsafe image detected, category:', category);
              toast.error(`Image content violates safety guidelines (${category}). Please choose different images.`);
              return;
            }
          }

          console.log('Images passed moderation check');
        } catch (error) {
          console.error('Error during image moderation:', error);
          toast.error('Unable to verify image safety. Please try again.');
          return;
        }
      }

      // Switch to vision model if current model doesn't support vision
      if (!currentModelData?.vision) {
        // Find the appropriate vision model based on file types
        let visionModel: string;

        // If we have PDFs, prioritize a PDF-compatible model
        if (pdfFiles.length > 0) {
          const pdfCompatibleModel = models.find((m) => m.vision && m.pdf);
          if (pdfCompatibleModel) {
            visionModel = pdfCompatibleModel.value;
          } else {
            visionModel = getFirstVisionModel();
          }
        } else {
          visionModel = getFirstVisionModel();
        }

        console.log('Switching to vision model:', visionModel);
        setSelectedModel(visionModel);
      }

      // Set upload queue immediately
      setUploadQueue(validFiles.map((file) => file.name));
      toast.info(`Starting upload of ${validFiles.length} files...`);

      // Forced timeout to ensure state updates before upload starts
      setTimeout(async () => {
        try {
          console.log('Beginning upload of', validFiles.length, 'files');

          // Try uploading one by one instead of all at once
          const uploadedAttachments: Attachment[] = [];
          for (const file of validFiles) {
            try {
              console.log(`Uploading file: ${file.name} (${file.type})`);
              const attachment = await uploadFile(file);
              uploadedAttachments.push(attachment);
              console.log(`Successfully uploaded: ${file.name}`);
            } catch (err) {
              console.error(`Failed to upload ${file.name}:`, err);
            }
          }

          console.log('Upload completed for', uploadedAttachments.length, 'files');

          if (uploadedAttachments.length > 0) {
            setAttachments((currentAttachments) => [...currentAttachments, ...uploadedAttachments]);

            toast.success(
              `${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''} uploaded successfully`,
            );
          } else {
            toast.error('No files were successfully uploaded');
          }
        } catch (error) {
          console.error('Error during file upload:', error);
          toast.error('Upload failed. Please check console for details.');
        } finally {
          setUploadQueue([]);
        }
      }, 100);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [attachments.length, setAttachments, uploadFile, selectedModel, setSelectedModel, getFirstVisionModel],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith('image/'));
      // Note: Pasting PDFs directly is typically not possible, but we're updating the code for consistency

      if (imageItems.length === 0) return;

      // Prevent default paste behavior if there are images
      e.preventDefault();

      const totalAttachments = attachments.length + imageItems.length;
      if (totalAttachments > MAX_FILES) {
        toast.error(`You can only attach up to ${MAX_FILES} files.`);
        return;
      }

      // Get files and check sizes before proceeding
      const files = imageItems.map((item) => item.getAsFile()).filter(Boolean) as File[];
      const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE);

      if (oversizedFiles.length > 0) {
        console.log(
          'Oversized files:',
          oversizedFiles.map((f) => `${f.name} (${f.size} bytes)`),
        );
        toast.error(`Some files exceed the 5MB limit: ${oversizedFiles.map((f) => f.name || 'unnamed').join(', ')}`);

        // Filter out oversized files
        const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE);
        if (validFiles.length === 0) return;
      }

      // Switch to vision model if needed
      const currentModel = models.find((m) => m.value === selectedModel);
      if (!currentModel?.vision) {
        const visionModel = getFirstVisionModel();
        setSelectedModel(visionModel);
      }

      // Use filtered files if we found oversized ones
      const filesToUpload = oversizedFiles.length > 0 ? files.filter((file) => file.size <= MAX_FILE_SIZE) : files;

      // Check image moderation before uploading
      if (filesToUpload.length > 0) {
        try {
          console.log('Checking image moderation for', filesToUpload.length, 'pasted images');
          toast.info('Checking pasted images for safety...');

          // Convert images to data URLs for moderation
          const imageDataURLs = await Promise.all(filesToUpload.map((file) => fileToDataURL(file)));

          // Check moderation
          const moderationResult = await checkImageModeration(imageDataURLs);
          console.log('Moderation result:', moderationResult);

          if (moderationResult !== 'safe') {
            const [status, category] = moderationResult.split('\n');
            if (status === 'unsafe') {
              console.warn('Unsafe pasted image detected, category:', category);
              toast.error(
                `Pasted image content violates safety guidelines (${category}). Please choose different images.`,
              );
              return;
            }
          }

          console.log('Pasted images passed moderation check');
        } catch (error) {
          console.error('Error during pasted image moderation:', error);
          toast.error('Unable to verify pasted image safety. Please try again.');
          return;
        }
      }

      setUploadQueue(filesToUpload.map((file, i) => file.name || `Pasted Image ${i + 1}`));

      try {
        const uploadPromises = filesToUpload.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);

        setAttachments((currentAttachments) => [...currentAttachments, ...uploadedAttachments]);

        toast.success('Image pasted successfully');
      } catch (error) {
        console.error('Error uploading pasted files!', error);
        toast.error('Failed to upload pasted image. Please try again.');
      } finally {
        setUploadQueue([]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [attachments.length, setAttachments, uploadFile, selectedModel, setSelectedModel, getFirstVisionModel],
  );

  useEffect(() => {
    if (status !== 'ready' && inputRef.current) {
      const focusTimeout = setTimeout(() => {
        if (isMounted.current && inputRef.current) {
          inputRef.current.focus({
            preventScroll: true,
          });
        }
      }, 300);

      return () => clearTimeout(focusTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (status !== 'ready') {
        toast.error('Please wait for the current response to complete!');
        return;
      }

      if (isRecording) {
        toast.error('Please stop recording before submitting!');
        return;
      }

      // Check if user should bypass limits for this model
      const shouldBypassLimitsForThisModel = shouldBypassRateLimits(selectedModel, user);

      if (isLimitBlocked && !shouldBypassLimitsForThisModel) {
        toast.error('Daily search limit reached. Please upgrade to Pro for unlimited searches.');
        return;
      }

      // Check if input exceeds character limit
      if (input.length > MAX_INPUT_CHARS) {
        toast.error(`Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters. Please shorten your message.`);
        return;
      }

      if (input.trim() || attachments.length > 0) {
        track('model_selected', {
          model: selectedModel,
        });

        if (user) {
          window.history.replaceState({}, '', `/search/${chatId}`);
        }

        setHasSubmitted(true);
        lastSubmittedQueryRef.current = input.trim();

        handleSubmit(event, {
          experimental_attachments: attachments,
        });

        setAttachments([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error('Please enter a search query or attach an image.');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      input,
      attachments,
      handleSubmit,
      setAttachments,
      fileInputRef,
      lastSubmittedQueryRef,
      status,
      selectedModel,
      setHasSubmitted,
      isLimitBlocked,
      user,
    ],
  );

  const submitForm = useCallback(() => {
    onSubmit({ preventDefault: () => {}, stopPropagation: () => {} } as React.FormEvent<HTMLFormElement>);
    resetSuggestedQuestions();

    inputRef.current?.focus();
  }, [onSubmit, resetSuggestedQuestions, width, inputRef]);

  const triggerFileInput = useCallback(() => {
    if (attachments.length >= MAX_FILES) {
      toast.error(`You can only attach up to ${MAX_FILES} images.`);
      return;
    }

    if (status === 'ready') {
      postSubmitFileInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  }, [attachments.length, status, fileInputRef]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isCompositionActive.current) {
      event.preventDefault();
      if (status === 'submitted' || status === 'streaming') {
        toast.error('Please wait for the response to complete!');
      } else if (isRecording) {
        toast.error('Please stop recording before submitting!');
      } else {
        // Check if user should bypass limits for this model
        const shouldBypassLimitsForThisModel = shouldBypassRateLimits(selectedModel, user);

        if (isLimitBlocked && !shouldBypassLimitsForThisModel) {
          toast.error('Daily search limit reached. Please upgrade to Pro for unlimited searches.');
        } else {
          submitForm();
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
      }
    }
  };

  const isProcessing = status === 'submitted' || status === 'streaming';
  const hasInteracted = messages.length > 0;

  // Auto-resize function for textarea
  const resizeTextarea = useCallback(() => {
    if (!inputRef.current) return;

    const target = inputRef.current;

    // Reset height to auto first to get the actual scroll height
    target.style.height = 'auto';

    const scrollHeight = target.scrollHeight;
    const maxHeight = 300;

    if (scrollHeight > maxHeight) {
      target.style.height = `${maxHeight}px`;
      target.style.overflowY = 'auto';
    } else {
      target.style.height = `${scrollHeight}px`;
      target.style.overflowY = 'hidden';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  // Resize textarea when input value changes
  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  return (
    <div className={cn('flex flex-col w-full')}>
      <TooltipProvider>
        <div
          className={cn(
            'relative w-full flex flex-col gap-1 rounded-lg transition-all duration-300 font-sans!',
            hasInteracted ? 'z-51' : '',
            isDragging && 'ring-1 ring-neutral-300 dark:ring-neutral-700',
            attachments.length > 0 || uploadQueue.length > 0
              ? 'bg-gray-100/70 dark:bg-neutral-800 p-1'
              : 'bg-transparent',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 backdrop-blur-[2px] bg-background/80 dark:bg-neutral-900/80 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center z-50 m-2"
              >
                <div className="flex items-center gap-4 px-6 py-8">
                  <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 shadow-xs">
                    <Upload className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Drop images or PDFs here
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">
                      Max {MAX_FILES} files (5MB per file)
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            multiple
            onChange={handleFileChange}
            accept={getAcceptedFileTypes(
              selectedModel,
              user?.isProUser || (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active'),
            )}
            tabIndex={-1}
          />
          <input
            type="file"
            className="hidden"
            ref={postSubmitFileInputRef}
            multiple
            onChange={handleFileChange}
            accept={getAcceptedFileTypes(
              selectedModel,
              user?.isProUser || (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active'),
            )}
            tabIndex={-1}
          />

          {(attachments.length > 0 || uploadQueue.length > 0) && (
            <div className="flex flex-row gap-2 overflow-x-auto py-2 max-h-28 z-10 px-1 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
              {attachments.map((attachment, index) => (
                <AttachmentPreview
                  key={attachment.url}
                  attachment={attachment}
                  onRemove={() => removeAttachment(index)}
                  isUploading={false}
                />
              ))}
              {uploadQueue.map((filename) => (
                <AttachmentPreview
                  key={filename}
                  attachment={
                    {
                      url: '',
                      name: filename,
                      contentType: '',
                      size: 0,
                    } as Attachment
                  }
                  onRemove={() => {}}
                  isUploading={true}
                />
              ))}
            </div>
          )}

          {/* Form container */}
          <div className="relative">
            <div className="rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200! dark:border-neutral-700! focus-within:border-neutral-300! dark:focus-within:border-neutral-500! transition-colors duration-200">
              {isRecording ? (
                <Textarea
                  ref={inputRef}
                  placeholder=""
                  value="◉ Recording..."
                  disabled={true}
                  className={cn(
                    'w-full rounded-lg rounded-b-none md:text-base!',
                    'text-base leading-relaxed',
                    'bg-neutral-100 dark:bg-neutral-900',
                    'border-0!',
                    'text-neutral-600 dark:text-neutral-400', // Different text color for recording
                    'focus:ring-0! focus-visible:ring-0!',
                    'px-4! py-4!',
                    'touch-manipulation',
                    'whatsize',
                    'text-center', // Center the recording text
                    'cursor-not-allowed',
                  )}
                  style={{
                    WebkitUserSelect: 'text',
                    WebkitTouchCallout: 'none',
                    minHeight: undefined,
                    resize: 'none',
                  }}
                  rows={1}
                />
              ) : (
                <Textarea
                  ref={inputRef}
                  placeholder={hasInteracted ? 'Ask a new question...' : 'Ask a question...'}
                  value={input}
                  onChange={handleInput}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onInput={(e) => {
                    // Auto-resize textarea based on content
                    const target = e.target as HTMLTextAreaElement;

                    // Reset height to auto first to get the actual scroll height
                    target.style.height = 'auto';

                    const scrollHeight = target.scrollHeight;
                    const maxHeight = 300; // Increased max height for desktop

                    if (scrollHeight > maxHeight) {
                      target.style.height = `${maxHeight}px`;
                      target.style.overflowY = 'auto';
                    } else {
                      target.style.height = `${scrollHeight}px`;
                      target.style.overflowY = 'hidden';
                    }

                    // Ensure the cursor position is visible by scrolling to bottom if needed
                    requestAnimationFrame(() => {
                      const cursorPosition = target.selectionStart;
                      if (cursorPosition === target.value.length) {
                        target.scrollTop = target.scrollHeight;
                      }
                    });
                  }}
                  className={cn(
                    'w-full rounded-lg rounded-b-none md:text-base!',
                    'text-base leading-relaxed',
                    'bg-neutral-100 dark:bg-neutral-900',
                    'border-0!',
                    'text-neutral-900 dark:text-neutral-100',
                    'focus:ring-0! focus-visible:ring-0!',
                    'px-4! py-4!',
                    'touch-manipulation',
                    'whatsize',
                  )}
                  style={{
                    WebkitUserSelect: 'text',
                    WebkitTouchCallout: 'none',
                    minHeight: undefined,
                    resize: 'none',
                  }}
                  rows={1}
                  autoFocus={true}
                  onCompositionStart={() => (isCompositionActive.current = true)}
                  onCompositionEnd={() => (isCompositionActive.current = false)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                />
              )}

              {/* Toolbar as a separate block - no absolute positioning */}
              <div
                className={cn(
                  'flex justify-between items-center rounded-t-none rounded-b-lg',
                  'bg-neutral-100 dark:bg-neutral-900',
                  'border-t-0 border-neutral-200! dark:border-neutral-700!',
                  'p-2 gap-2',
                )}
              >
                <div className={cn('flex items-center gap-2')}>
                  <div
                    className={cn(
                      'transition-all duration-100 flex-shrink-0',
                      selectedGroup !== 'extreme' ? 'opacity-100 visible w-auto' : 'opacity-0 invisible w-0',
                    )}
                  >
                    <GroupSelector selectedGroup={selectedGroup} onGroupSelect={handleGroupSelect} status={status} />
                  </div>

                  <div className={cn('transition-all duration-300 flex-shrink-0', 'opacity-100 visible w-auto')}>
                    <ModelSwitcher
                      selectedModel={selectedModel}
                      setSelectedModel={setSelectedModel}
                      attachments={attachments}
                      messages={messages}
                      status={status}
                      onModelSelect={(model) => {
                        setSelectedModel(model.value);
                        const isVisionModel = hasVisionSupport(model.value);
                        toast.message(`Switched to ${model.label}`, {
                          description: isVisionModel ? 'You can now upload images to the model.' : undefined,
                        });
                      }}
                      subscriptionData={subscriptionData}
                      user={user}
                    />
                  </div>

                  <div className={cn('transition-all duration-300 flex-shrink-0', 'opacity-100 visible w-auto')}>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const newMode = selectedGroup === 'extreme' ? 'web' : 'extreme';
                            setSelectedGroup(newMode);
                          }}
                          className={cn(
                            'group flex items-center gap-2 p-2 sm:px-3 h-8',
                            'rounded-full transition-all duration-200',
                            'border',
                            selectedGroup === 'extreme'
                              ? 'border-zinc-600 bg-gradient-to-b from-zinc-400 via-zinc-500 to-zinc-600 text-neutral-50 shadow-[inset_0_1px_0px_0px_#a1a1aa] hover:from-zinc-600 hover:via-zinc-600 hover:to-zinc-600 active:[box-shadow:none]'
                              : 'border-neutral-300 dark:border-neutral-700 bg-gradient-to-b from-neutral-50 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-950 text-neutral-600 dark:text-neutral-400 shadow-[inset_0_1px_0px_0px_#ffffff] dark:shadow-[inset_0_1px_0px_0px_#525252] hover:from-neutral-100 hover:via-neutral-200 hover:to-neutral-300 dark:hover:from-neutral-700 dark:hover:via-neutral-800 dark:hover:to-neutral-900 active:[box-shadow:none]',
                          )}
                        >
                          <span className="group-active:[transform:translate3d(0,1px,0)] flex items-center gap-2">
                            <TelescopeIcon className="h-4 w-4" />
                            <span className="hidden sm:block text-xs font-medium">Extreme</span>
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className=" border-0 shadow-lg backdrop-blur-xs py-2 px-3 max-w-[200px]"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[11px]">Extreme Mode</span>
                          <span className="text-[10px] text-neutral-300 dark:text-neutral-600 leading-tight">
                            Deep research with multiple sources and analysis
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className={cn('flex items-center flex-shrink-0 gap-2')}>
                  {hasVisionSupport(selectedModel) && (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          className="group rounded-full p-1.75 h-8 w-8 border border-neutral-300 dark:border-neutral-700 bg-gradient-to-b from-neutral-50 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-950 text-neutral-700 dark:text-neutral-300 shadow-[inset_0_1px_0px_0px_#ffffff] dark:shadow-[inset_0_1px_0px_0px_#525252] hover:from-neutral-100 hover:via-neutral-200 hover:to-neutral-300 dark:hover:from-neutral-700 dark:hover:via-neutral-800 dark:hover:to-neutral-900 active:[box-shadow:none] transition-all duration-200"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            triggerFileInput();
                          }}
                        >
                          <span className="block group-active:[transform:translate3d(0,1px,0)]">
                            <PaperclipIcon size={16} />
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className=" border-0 shadow-lg backdrop-blur-xs py-2 px-3"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[11px]">Attach File</span>
                          <span className="text-[10px] text-neutral-300 dark:text-neutral-600 leading-tight">
                            {hasPdfSupport(selectedModel) ? 'Upload an image or PDF document' : 'Upload an image'}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {isProcessing ? (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          className="group rounded-full p-1.75 h-8 w-8 border border-red-600 bg-gradient-to-b from-red-400 via-red-500 to-red-600 text-neutral-50 shadow-[inset_0_1px_0px_0px_#fca5a5] hover:from-red-600 hover:via-red-600 hover:to-red-600 active:[box-shadow:none] transition-all duration-200"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            stop();
                          }}
                        >
                          <span className="block group-active:[transform:translate3d(0,1px,0)]">
                            <StopIcon size={16} />
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 shadow-lg backdrop-blur-xs py-2 px-3"
                      >
                        <span className="font-medium text-[11px]">Stop Generation</span>
                      </TooltipContent>
                    </Tooltip>
                  ) : input.length === 0 && attachments.length === 0 ? (
                    /* Show Voice Recording Button when no input */
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          className={cn(
                            'group rounded-full p-1.75 h-8 w-8 backdrop-blur-2xl transition-all duration-200',
                            isRecording
                              ? 'border border-red-600 bg-gradient-to-b from-red-400 via-red-500 to-red-600 text-white shadow-[inset_0_1px_0px_0px_#fca5a5] hover:from-red-600 hover:via-red-600 hover:to-red-600 active:[box-shadow:none]'
                              : 'border border-zinc-600 bg-gradient-to-b from-zinc-400 via-zinc-500 to-zinc-600 text-neutral-50 shadow-[inset_0_1px_0px_0px_#a1a1aa] hover:from-zinc-600 hover:via-zinc-600 hover:to-zinc-600 active:[box-shadow:none]',
                          )}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleRecord();
                          }}
                        >
                          <span className="block group-active:[transform:translate3d(0,1px,0)]">
                            <MicrophoneIcon size={16} />
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className=" border-0 shadow-lg backdrop-blur-xs py-2 px-3"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[11px]">
                            {isRecording ? 'Stop Recording' : 'Voice Input'}
                          </span>
                          <span className="text-[10px] text-neutral-300 dark:text-neutral-600 leading-tight">
                            {isRecording ? 'Click to stop recording' : 'Record your voice message'}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    /* Show Send Button when there is input */
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          className="group rounded-full flex p-1.75 m-auto h-8 w-8 border border-zinc-600 bg-gradient-to-b from-zinc-400 via-zinc-500 to-zinc-600 text-neutral-50 shadow-[inset_0_1px_0px_0px_#a1a1aa] hover:from-zinc-600 hover:via-zinc-600 hover:to-zinc-600 active:[box-shadow:none] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-zinc-400 disabled:hover:via-zinc-500 disabled:hover:to-zinc-600 transition-all duration-200"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            submitForm();
                          }}
                          disabled={
                            (input.length === 0 && attachments.length === 0) ||
                            uploadQueue.length > 0 ||
                            status !== 'ready' ||
                            isLimitBlocked ||
                            isRecording
                          }
                        >
                          <span className="block group-active:[transform:translate3d(0,1px,0)]">
                            <ArrowUpIcon size={16} />
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 shadow-lg backdrop-blur-xs py-2 px-3"
                      >
                        <span className="font-medium text-[11px]">Send Message</span>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default FormComponent;
