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
import { X, Check, ChevronsUpDown } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn, SearchGroup, SearchGroupId, searchGroups } from '@/lib/utils';
import { Upload } from 'lucide-react';
import { UIMessage } from '@ai-sdk/ui-utils';
import { track } from '@vercel/analytics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ComprehensiveUserData } from '@/hooks/use-user-data';
import { useSession } from '@/lib/auth-client';
import { checkImageModeration } from '@/app/actions';
import { LockIcon } from '@phosphor-icons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CpuIcon,
  GlobalSearchIcon,
  AiMicIcon,
  AtomicPowerIcon,
  Crown02Icon,
  DocumentAttachmentIcon,
} from '@hugeicons/core-free-icons';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileLibraryDialog, FileLibraryFile } from '@/components/file-library';
import { FolderOpen, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ModelSwitcherProps {
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  className?: string;
  attachments: Array<Attachment>;
  messages: Array<Message>;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  onModelSelect?: (model: (typeof models)[0]) => void;
  subscriptionData?: any;
  user?: ComprehensiveUserData | null;
}

const ModelSwitcher: React.FC<ModelSwitcherProps> = React.memo(
  ({
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
    const isProUser = useMemo(
      () =>
        user?.isProUser || (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active'),
      [user?.isProUser, subscriptionData?.hasSubscription, subscriptionData?.subscription?.status],
    );

    const isSubscriptionLoading = useMemo(() => user && !subscriptionData, [user, subscriptionData]);

    const availableModels = useMemo(() => models, []);

    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [showSignInDialog, setShowSignInDialog] = useState(false);
    const [selectedProModel, setSelectedProModel] = useState<(typeof models)[0] | null>(null);
    const [selectedAuthModel, setSelectedAuthModel] = useState<(typeof models)[0] | null>(null);
    const [open, setOpen] = useState(false);

    const hasAttachments = useMemo(
      () =>
        attachments.length > 0 ||
        messages.some((msg) => msg.experimental_attachments && msg.experimental_attachments.length > 0),
      [attachments.length, messages],
    );

    const filteredModels = useMemo(
      () => (hasAttachments ? availableModels.filter((model) => model.vision) : availableModels),
      [hasAttachments, availableModels],
    );

    const groupedModels = useMemo(
      () =>
        filteredModels.reduce(
          (acc, model) => {
            const category = model.category;
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(model);
            return acc;
          },
          {} as Record<string, typeof availableModels>,
        ),
      [filteredModels],
    );

    const currentModel = useMemo(
      () => availableModels.find((m) => m.value === selectedModel),
      [availableModels, selectedModel],
    );

    const handleModelChange = useCallback(
      (value: string) => {
        const model = availableModels.find((m) => m.value === value);
        if (!model) return;

        const requiresAuth = requiresAuthentication(model.value) && !user;
        const requiresPro = requiresProSubscription(model.value) && !isProUser;

        if (isSubscriptionLoading) {
          return;
        }

        if (requiresAuth) {
          setSelectedAuthModel(model);
          setShowSignInDialog(true);
          return;
        }

        if (requiresPro && !isProUser) {
          setSelectedProModel(model);
          setShowUpgradeDialog(true);
          return;
        }

        console.log('Selected model:', model.value);
        setSelectedModel(model.value.trim());

        if (onModelSelect) {
          onModelSelect(model);
        }
      },
      [availableModels, user, isProUser, isSubscriptionLoading, setSelectedModel, onModelSelect],
    );

    return (
      <>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              size="sm"
              className={cn(
                'flex items-center gap-2 px-3 h-7.5 rounded-lg',
                'border border-border',
                'bg-background text-foreground',
                'hover:bg-accent transition-colors',
                'focus:!outline-none focus:!ring-0',
                'shadow-none',
                className,
              )}
            >
              <HugeiconsIcon icon={CpuIcon} size={24} color="currentColor" strokeWidth={2} />
              <span className="text-xs font-medium sm:block hidden">{currentModel?.label || 'Select Model'}</span>
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[90vw] sm:w-[16em] max-w-[16em] p-0 font-sans rounded-lg bg-popover z-40 border !shadow-none"
            align="start"
            side="bottom"
            sideOffset={4}
            avoidCollisions={true}
            collisionPadding={8}
          >
            <Command
              className="rounded-lg"
              filter={(value, search) => {
                const model = availableModels.find((m) => m.value === value);
                if (!model || !search) return 1;

                const searchTerm = search.toLowerCase();
                const searchableFields = [
                  model.label,
                  model.description,
                  model.category,
                  model.vision ? 'vision' : '',
                  model.reasoning ? 'reasoning' : '',
                  model.pdf ? 'pdf' : '',
                  model.experimental ? 'experimental' : '',
                  model.pro ? 'pro' : '',
                  model.requiresAuth ? 'auth' : '',
                ]
                  .join(' ')
                  .toLowerCase();

                return searchableFields.includes(searchTerm) ? 1 : 0;
              }}
            >
              <CommandInput placeholder="Search models..." className="h-9" />
              <CommandEmpty>No model found.</CommandEmpty>
              <CommandList className="max-h-[15em]">
                {Object.entries(groupedModels).map(([category, categoryModels], categoryIndex) => (
                  <CommandGroup key={category}>
                    {categoryIndex > 0 && <div className="my-1 border-t border-border" />}
                    <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground">{category} Models</div>
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
                              'opacity-50 hover:opacity-70 hover:bg-accent',
                            )}
                            onClick={() => {
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
                                  <LockIcon className="size-3 text-muted-foreground" />
                                ) : (
                                  <HugeiconsIcon
                                    icon={Crown02Icon}
                                    size={12}
                                    color="currentColor"
                                    strokeWidth={1.5}
                                    className="text-muted-foreground"
                                  />
                                )}
                              </div>
                              <div className="text-[9px] text-muted-foreground truncate leading-tight">
                                {model.description}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <CommandItem
                          key={model.value}
                          value={model.value}
                          onSelect={(currentValue) => {
                            handleModelChange(currentValue);
                            setOpen(false);
                          }}
                          className={cn(
                            'flex items-center justify-between px-2 py-1.5 mb-0.5 rounded-lg text-xs',
                            'transition-all duration-200',
                            'hover:bg-accent',
                            'data-[selected=true]:bg-accent',
                          )}
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="font-medium truncate text-[11px] flex items-center gap-1">
                              {model.label}
                              {(() => {
                                const requiresAuth = requiresAuthentication(model.value) && !user;
                                const requiresPro = requiresProSubscription(model.value) && !isProUser;

                                if (requiresAuth) {
                                  return <LockIcon className="size-3 text-muted-foreground" />;
                                } else if (requiresPro) {
                                  return (
                                    <HugeiconsIcon
                                      icon={Crown02Icon}
                                      size={12}
                                      color="currentColor"
                                      strokeWidth={1.5}
                                      className="text-muted-foreground"
                                    />
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <div className="text-[9px] text-muted-foreground truncate leading-tight">
                              {model.description}
                            </div>
                          </div>
                          <Check
                            className={cn(
                              'ml-auto h-4 w-4',
                              selectedModel === model.value ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="sm:max-w-md p-0 gap-0 border !shadow-none">
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <HugeiconsIcon
                      icon={Crown02Icon}
                      size={16}
                      color="currentColor"
                      strokeWidth={1.5}
                      className="text-primary-foreground"
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-foreground">{selectedProModel?.label} requires Pro</h2>
                    <p className="text-sm text-muted-foreground">Upgrade to access premium AI models</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Unlimited searches</p>
                    <p className="text-xs text-muted-foreground">No daily limits or restrictions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Premium AI models</p>
                    <p className="text-xs text-muted-foreground">Claude 4 Sonnet, Grok 4, advanced reasoning</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">PDF analysis</p>
                    <p className="text-xs text-muted-foreground">Upload and analyze documents</p>
                  </div>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-medium text-foreground">$15</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-muted-foreground">Cancel anytime</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUpgradeDialog(false)}
                  className="flex-1 h-9 text-sm font-normal"
                >
                  Maybe later
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = '/pricing';
                  }}
                  className="flex-1 h-9 text-sm font-normal"
                >
                  Upgrade now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
          <DialogContent className="sm:max-w-[420px] p-0 gap-0">
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 text-muted-foreground"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-foreground">{selectedAuthModel?.label} requires sign in</h2>
                    <p className="text-sm text-muted-foreground">Create an account to access this AI model</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Access better models</p>
                    <p className="text-xs text-muted-foreground">Gemini 2.5 Flash Lite and GPT-4o Mini</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Save search history</p>
                    <p className="text-xs text-muted-foreground">Keep track of your conversations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Free to start</p>
                    <p className="text-xs text-muted-foreground">No payment required for basic features</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSignInDialog(false)}
                  className="flex-1 h-9 text-sm font-normal"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = '/sign-in';
                  }}
                  className="flex-1 h-9 text-sm font-normal"
                >
                  Sign in
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

ModelSwitcher.displayName = 'ModelSwitcher';

interface Attachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
  isFromLibrary?: boolean;
  libraryFileId?: string;
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

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_INPUT_CHARS = 10000;

const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
};

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
}> = React.memo(({ attachment, onRemove, isUploading }) => {
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB' + (bytes > MAX_FILE_SIZE ? ' (exceeds 5MB limit)' : '');
  }, []);

  const isUploadingAttachment = useCallback(
    (attachment: Attachment | UploadingAttachment): attachment is UploadingAttachment => {
      return 'progress' in attachment;
    },
    [],
  );

  const isPdf = useCallback(
    (attachment: Attachment | UploadingAttachment): boolean => {
      if (isUploadingAttachment(attachment)) {
        return attachment.file.type === 'application/pdf';
      }
      return (attachment as Attachment).contentType === 'application/pdf';
    },
    [isUploadingAttachment],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative flex items-center',
        'bg-background/90 backdrop-blur-xs',
        'border border-border/80',
        'rounded-lg p-2 pr-8 gap-2.5',
        'shrink-0 z-0',
        'hover:bg-background',
        'transition-all duration-200',
        'group',
        '!shadow-none',
      )}
    >
      {isUploading ? (
        <div className="w-8 h-8 flex items-center justify-center">
          <svg
            className="animate-spin h-4 w-4 text-muted-foreground"
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
                className="text-muted stroke-current"
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
              <span className="text-[10px] font-medium text-foreground">{Math.round(attachment.progress * 100)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted shrink-0 ring-1 ring-border flex items-center justify-center">
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
              className="text-red-500"
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
          <p className="text-xs font-medium truncate text-foreground">{truncateFilename(attachment.name)}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {isUploadingAttachment(attachment) ? 'Uploading...' : formatFileSize((attachment as Attachment).size)}
        </p>
      </div>
      {!isUploadingAttachment(attachment) && (attachment as Attachment).isFromLibrary && (
        <div className="absolute -top-1 -left-1 p-0.5 rounded-full bg-primary text-primary-foreground z-10">
          <FolderOpen className="h-2.5 w-2.5" />
        </div>
      )}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          'absolute -top-1.5 -right-1.5 p-0.5 m-0 rounded-full',
          'bg-background/90 backdrop-blur-xs',
          'border border-border/80',
          'transition-all duration-200 z-20',
          'opacity-0 group-hover:opacity-100',
          'scale-75 group-hover:scale-100',
          'hover:bg-muted/50',
          '!shadow-none',
        )}
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </motion.button>
    </motion.div>
  );
});

AttachmentPreview.displayName = 'AttachmentPreview';

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
  user: ComprehensiveUserData | null;
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

const GroupModeToggle: React.FC<GroupSelectorProps> = React.memo(({ selectedGroup, onGroupSelect, status }) => {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const isExtreme = selectedGroup === 'extreme';

  const visibleGroups = useMemo(
    () =>
      searchGroups.filter((group) => {
        if (!group.show) return false;
        if ('requireAuth' in group && group.requireAuth && !session) return false;
        if (group.id === 'extreme') return false; // Exclude extreme from dropdown
        return true;
      }),
    [session],
  );

  const selectedGroupData = useMemo(
    () => visibleGroups.find((group) => group.id === selectedGroup),
    [visibleGroups, selectedGroup],
  );

  const handleToggleExtreme = useCallback(() => {
    if (isExtreme) {
      const webGroup = searchGroups.find((group) => group.id === 'web');
      if (webGroup) {
        onGroupSelect(webGroup);
      }
    } else {
      const extremeGroup = searchGroups.find((group) => group.id === 'extreme');
      if (extremeGroup) {
        onGroupSelect(extremeGroup);
      }
    }
  }, [isExtreme, onGroupSelect]);

  const handleGroupChange = useCallback(
    (value: string) => {
      const group = visibleGroups.find((g) => g.id === value);
      if (group) {
        onGroupSelect(group);
      }
    },
    [visibleGroups, onGroupSelect],
  );

  return (
    <div className="flex items-center">
      <div className="flex items-center bg-background border border-border rounded-lg !gap-1 !py-1 !px-0.75 h-8">
        <Popover open={open && !isExtreme} onOpenChange={(newOpen) => !isExtreme && setOpen(newOpen)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  role="combobox"
                  aria-expanded={open && !isExtreme}
                  size="sm"
                  onClick={() => {
                    if (isExtreme) {
                      const webGroup = searchGroups.find((group) => group.id === 'web');
                      if (webGroup) {
                        onGroupSelect(webGroup);
                      }
                    } else {
                      setOpen(!open);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-1.5 !m-0 !px-1.5 h-6 !rounded-md transition-all cursor-pointer',
                    !isExtreme
                      ? 'bg-accent text-foreground hover:bg-accent/80'
                      : 'text-muted-foreground hover:bg-accent',
                  )}
                >
                  {selectedGroupData && !isExtreme && (
                    <>
                      <HugeiconsIcon icon={selectedGroupData.icon} size={30} color="currentColor" strokeWidth={2} />
                      <ChevronsUpDown className="size-4.5 opacity-50" />
                    </>
                  )}
                  {isExtreme && (
                    <>
                      <HugeiconsIcon icon={GlobalSearchIcon} size={30} color="currentColor" strokeWidth={2} />
                    </>
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isExtreme ? 'Switch back to search modes' : 'Choose search mode'}</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            className="w-[90vw] sm:w-[14em] max-w-[14em] p-0 font-sans rounded-lg bg-popover z-50 border !shadow-none"
            align="start"
            side="bottom"
            sideOffset={4}
            avoidCollisions={true}
            collisionPadding={8}
          >
            <Command
              className="rounded-lg"
              filter={(value, search) => {
                const group = visibleGroups.find((g) => g.id === value);
                if (!group || !search) return 1;

                const searchTerm = search.toLowerCase();
                const searchableFields = [group.name, group.description, group.id].join(' ').toLowerCase();

                return searchableFields.includes(searchTerm) ? 1 : 0;
              }}
            >
              <CommandInput placeholder="Search modes..." className="h-9" />
              <CommandEmpty>No search mode found.</CommandEmpty>
              <CommandList className="max-h-[240px]">
                <CommandGroup>
                  <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground">Search Mode</div>
                  {visibleGroups.map((group) => {
                    const Icon = group.icon;
                    return (
                      <CommandItem
                        key={group.id}
                        value={group.id}
                        onSelect={(currentValue) => {
                          const selectedGroup = visibleGroups.find((g) => g.id === currentValue);
                          if (selectedGroup) {
                            onGroupSelect(selectedGroup);
                            setOpen(false);
                          }
                        }}
                        className={cn(
                          'flex items-center justify-between px-2 py-2 mb-0.5 rounded-lg text-xs',
                          'transition-all duration-200',
                          'hover:bg-accent',
                          'data-[selected=true]:bg-accent',
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-4">
                          <HugeiconsIcon icon={group.icon} size={30} color="currentColor" strokeWidth={2} />
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="font-medium truncate text-[11px] text-foreground">{group.name}</div>
                            <div className="text-[9px] text-muted-foreground truncate leading-tight text-wrap!">
                              {group.description}
                            </div>
                          </div>
                        </div>
                        <Check
                          className={cn('ml-auto h-4 w-4', selectedGroup === group.id ? 'opacity-100' : 'opacity-0')}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExtreme}
              className={cn(
                'flex items-center gap-1.5 px-3 h-6 rounded-md transition-all',
                isExtreme ? 'bg-accent text-foreground hover:bg-accent/80' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <HugeiconsIcon icon={AtomicPowerIcon} size={30} color="currentColor" strokeWidth={2} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{isExtreme ? 'Extreme Search mode on' : 'Switch to Extreme Search mode'}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

GroupModeToggle.displayName = 'GroupModeToggle';

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
  const postSubmitFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [showLibraryDialog, setShowLibraryDialog] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const isProUser = useMemo(
    () => user?.isProUser || (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active'),
    [user?.isProUser, subscriptionData?.hasSubscription, subscriptionData?.subscription?.status],
  );

  const isProcessing = useMemo(() => status === 'submitted' || status === 'streaming', [status]);

  const hasInteracted = useMemo(() => messages.length > 0, [messages.length]);

  const cleanupMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      cleanupMediaRecorder();
    };
  }, [cleanupMediaRecorder]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.closest('[contenteditable="true"]')
      ) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (
        event.key.length > 1 && // Multi-character keys like 'Enter', 'Escape', etc.
        !['Backspace', 'Delete', 'Space'].includes(event.key)
      ) {
        return;
      }

      if (inputRef.current && document.activeElement === inputRef.current) {
        return;
      }

      if (isRecording) {
        return;
      }

      if (inputRef.current && event.key.length === 1) {
        inputRef.current.focus();
        if (event.key !== ' ' || input.length > 0) {
          setInput(input + event.key);
          event.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isRecording, input, setInput]);

  const handleRecord = useCallback(async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      cleanupMediaRecorder();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

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
              cleanupMediaRecorder();
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
  }, [isRecording, cleanupMediaRecorder, setInput]);

  const handleInput = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      const newValue = event.target.value;

      if (newValue.length > MAX_INPUT_CHARS) {
        setInput(newValue);
        toast.error(`Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters.`);
      } else {
        setInput(newValue);
      }
    },
    [setInput],
  );

  const handleGroupSelect = useCallback(
    (group: SearchGroup) => {
      setSelectedGroup(group.id);
      inputRef.current?.focus();
    },
    [setSelectedGroup, inputRef],
  );

  const uploadFile = useCallback(async (file: File): Promise<Attachment> => {
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
  }, []);

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

      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const unsupportedFiles: File[] = [];
      const oversizedFiles: File[] = [];
      const blockedPdfFiles: File[] = [];

      files.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
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

      const currentModelData = models.find((m) => m.value === selectedModel);
      if (pdfFiles.length > 0 && (!currentModelData || !currentModelData.pdf)) {
        console.log('PDFs detected, switching to compatible model');

        const compatibleModel = models.find((m) => m.pdf && m.vision);

        if (compatibleModel) {
          console.log('Switching to compatible model:', compatibleModel.value);
          setSelectedModel(compatibleModel.value);
        } else {
          console.warn('No PDF-compatible model found');
          toast.error('PDFs are only supported by Gemini and Claude models');

          if (imageFiles.length === 0) {
            event.target.value = '';
            return;
          }
        }
      }

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

      if (imageFiles.length > 0) {
        try {
          console.log('Checking image moderation for', imageFiles.length, 'images');
          toast.info('Checking images for safety...');

          const imageDataURLs = await Promise.all(imageFiles.map((file) => fileToDataURL(file)));

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
    },
    [attachments.length, setAttachments, selectedModel, setSelectedModel, isProUser, uploadFile],
  );

  const removeAttachment = useCallback(
    (index: number) => {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    },
    [setAttachments],
  );

  const handleLibraryFileSelect = useCallback(
    (files: FileLibraryFile[]) => {
      const libraryAttachments: Attachment[] = files.map((file) => ({
        name: file.originalName,
        contentType: file.contentType,
        url: file.url,
        size: file.size,
        isFromLibrary: true,
        libraryFileId: file.id,
      }));

      const totalAttachments = attachments.length + libraryAttachments.length;
      if (totalAttachments > MAX_FILES) {
        toast.error(`You can only attach up to ${MAX_FILES} files.`);
        return;
      }

      setAttachments((currentAttachments) => [...currentAttachments, ...libraryAttachments]);

      toast.success(
        `${libraryAttachments.length} file${libraryAttachments.length > 1 ? 's' : ''} selected from library`,
      );
    },
    [attachments.length, setAttachments],
  );

  const openLibraryDialog = useCallback(() => {
    setShowLibraryDialog(true);
    setShowAttachmentMenu(false);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (attachments.length >= MAX_FILES) return;

      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
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

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const allFiles = Array.from(e.dataTransfer.files);
      console.log(
        'Raw files dropped:',
        allFiles.map((f) => `${f.name} (${f.type})`),
      );

      if (allFiles.length === 0) {
        toast.error('No files detected in drop');
        return;
      }

      toast.info(`Detected ${allFiles.length} dropped files`);

      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const unsupportedFiles: File[] = [];
      const oversizedFiles: File[] = [];
      const blockedPdfFiles: File[] = [];

      allFiles.forEach((file) => {
        console.log(`Processing file: ${file.name} (${file.type})`);

        if (file.size > MAX_FILE_SIZE) {
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

      if (imageFiles.length === 0 && pdfFiles.length === 0) {
        toast.error('Only image and PDF files are supported');
        return;
      }

      const currentModelData = models.find((m) => m.value === selectedModel);
      if (pdfFiles.length > 0 && (!currentModelData || !currentModelData.pdf)) {
        console.log('PDFs detected, switching to compatible model');

        const compatibleModel = models.find((m) => m.pdf && m.vision);

        if (compatibleModel) {
          console.log('Switching to compatible model:', compatibleModel.value);
          setSelectedModel(compatibleModel.value);
          toast.info(`Switching to ${compatibleModel.label} to support PDF files`);
        } else {
          console.warn('No PDF-compatible model found');
          toast.error('PDFs are only supported by Gemini and Claude models');
          if (imageFiles.length === 0) return;
        }
      }

      let validFiles: File[] = [...imageFiles];
      if (hasPdfSupport(selectedModel) || pdfFiles.length > 0) {
        validFiles = [...validFiles, ...pdfFiles];
      }

      console.log(
        'Files to upload:',
        validFiles.map((f) => `${f.name} (${f.type})`),
      );

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

      if (imageFiles.length > 0) {
        try {
          console.log('Checking image moderation for', imageFiles.length, 'images');
          toast.info('Checking images for safety...');

          const imageDataURLs = await Promise.all(imageFiles.map((file) => fileToDataURL(file)));

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

      if (!currentModelData?.vision) {
        let visionModel: string;

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

      setUploadQueue(validFiles.map((file) => file.name));
      toast.info(`Starting upload of ${validFiles.length} files...`);

      setTimeout(async () => {
        try {
          console.log('Beginning upload of', validFiles.length, 'files');

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
    },
    [attachments.length, setAttachments, uploadFile, selectedModel, setSelectedModel, getFirstVisionModel, isProUser],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith('image/'));

      if (imageItems.length === 0) return;

      e.preventDefault();

      const totalAttachments = attachments.length + imageItems.length;
      if (totalAttachments > MAX_FILES) {
        toast.error(`You can only attach up to ${MAX_FILES} files.`);
        return;
      }

      const files = imageItems.map((item) => item.getAsFile()).filter(Boolean) as File[];
      const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE);

      if (oversizedFiles.length > 0) {
        console.log(
          'Oversized files:',
          oversizedFiles.map((f) => `${f.name} (${f.size} bytes)`),
        );
        toast.error(`Some files exceed the 5MB limit: ${oversizedFiles.map((f) => f.name || 'unnamed').join(', ')}`);

        const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE);
        if (validFiles.length === 0) return;
      }

      const currentModel = models.find((m) => m.value === selectedModel);
      if (!currentModel?.vision) {
        const visionModel = getFirstVisionModel();
        setSelectedModel(visionModel);
      }

      const filesToUpload = oversizedFiles.length > 0 ? files.filter((file) => file.size <= MAX_FILE_SIZE) : files;

      if (filesToUpload.length > 0) {
        try {
          console.log('Checking image moderation for', filesToUpload.length, 'pasted images');
          toast.info('Checking pasted images for safety...');

          const imageDataURLs = await Promise.all(filesToUpload.map((file) => fileToDataURL(file)));

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

      const shouldBypassLimitsForThisModel = shouldBypassRateLimits(selectedModel, user);

      if (isLimitBlocked && !shouldBypassLimitsForThisModel) {
        toast.error('Daily search limit reached. Please upgrade to Pro for unlimited searches.');
        return;
      }

      if (input.length > MAX_INPUT_CHARS) {
        toast.error(`Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters. Please shorten your message.`);
        return;
      }

      if (input.trim() || attachments.length > 0) {
        track('model_selected', {
          model: selectedModel,
        });

        const libraryFiles = attachments.filter((att) => att.isFromLibrary && att.libraryFileId);
        if (libraryFiles.length > 0) {
          libraryFiles.forEach((file) => {
            fetch('/api/files/track-usage', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileId: file.libraryFileId,
                usage: 'chat_message',
              }),
            }).catch((error) => {
              console.warn('Failed to track file usage:', error);
            });
          });
        }

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
      isRecording,
      chatId,
    ],
  );

  const submitForm = useCallback(() => {
    onSubmit({ preventDefault: () => {}, stopPropagation: () => {} } as React.FormEvent<HTMLFormElement>);
    resetSuggestedQuestions();

    inputRef.current?.focus();
  }, [onSubmit, resetSuggestedQuestions, inputRef]);

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
    setShowAttachmentMenu(false);
  }, [attachments.length, status, fileInputRef]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey && !isCompositionActive.current) {
        event.preventDefault();
        if (isProcessing) {
          toast.error('Please wait for the response to complete!');
        } else if (isRecording) {
          toast.error('Please stop recording before submitting!');
        } else {
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
    },
    [isProcessing, isRecording, selectedModel, user, isLimitBlocked, submitForm, inputRef],
  );

  const resizeTextarea = useCallback(() => {
    if (!inputRef.current) return;

    const target = inputRef.current;

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
  }, [inputRef]);

  const debouncedResize = useMemo(() => debounce(resizeTextarea, 100), [resizeTextarea]);

  useEffect(() => {
    debouncedResize();
  }, [input, debouncedResize]);

  return (
    <div className={cn('flex flex-col w-full bg-background max-w-2xl mx-auto')}>
      <TooltipProvider>
        <div
          className={cn(
            'relative w-full flex flex-col gap-1 rounded-lg transition-all duration-300 font-sans!',
            hasInteracted ? 'z-51' : '',
            isDragging && 'ring-1 ring-border',
            // attachments.length > 0 || uploadQueue.length > 0 ? 'bg-muted/70 p-1' : 'bg-transparent',
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
                className="absolute inset-0 backdrop-blur-[2px] bg-background/80 rounded-lg border border-dashed border-border flex items-center justify-center z-50 m-2"
              >
                <div className="flex items-center gap-4 px-6 py-8">
                  <div className="p-3 rounded-full bg-muted !shadow-none">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-medium text-foreground">Drop images or PDFs here</p>
                    <p className="text-xs text-muted-foreground">Max {MAX_FILES} files (5MB per file)</p>
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
              user?.isProUser ||
                (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active'),
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
              user?.isProUser ||
                (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active'),
            )}
            tabIndex={-1}
          />

          {(attachments.length > 0 || uploadQueue.length > 0) && (
            <div className="flex flex-row gap-2 overflow-x-auto py-2 max-h-28 z-10 px-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
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

          <div className="relative">
            <div className="rounded-xl bg-muted border border-border focus-within:border-ring transition-colors duration-200">
              {isRecording ? (
                <Textarea
                  ref={inputRef}
                  placeholder=""
                  value="◉ Recording..."
                  disabled={true}
                  className={cn(
                    'w-full rounded-xl rounded-b-none md:text-base!',
                    'text-base leading-relaxed',
                    'bg-muted',
                    'border-0!',
                    'text-muted-foreground',
                    'focus:ring-0! focus-visible:ring-0!',
                    'px-4! py-4!',
                    'touch-manipulation',
                    'whatsize',
                    'text-center',
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
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;

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

                    requestAnimationFrame(() => {
                      const cursorPosition = target.selectionStart;
                      if (cursorPosition === target.value.length) {
                        target.scrollTop = target.scrollHeight;
                      }
                    });
                  }}
                  className={cn(
                    'w-full rounded-xl rounded-b-none md:text-base!',
                    'text-base leading-relaxed',
                    '!bg-muted',
                    '!border-0',
                    'text-foreground',
                    'focus:!ring-0 focus-visible:!ring-0',
                    '!px-4 !py-4',
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

              <div
                className={cn(
                  'flex justify-between items-center rounded-t-none rounded-b-xl',
                  'bg-muted',
                  'border-t-0 border-border!',
                  'p-2 gap-2',
                )}
              >
                <div className={cn('flex items-center gap-2')}>
                  <GroupModeToggle selectedGroup={selectedGroup} onGroupSelect={handleGroupSelect} status={status} />

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

                <div className={cn('flex items-center flex-shrink-0 gap-2')}>
                  <DropdownMenu open={showAttachmentMenu} onOpenChange={setShowAttachmentMenu}>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        {hasVisionSupport(selectedModel) ? (
                          <DropdownMenuTrigger asChild>
                            <button
                              className="group rounded-lg p-1.75 h-8 w-8 border border-border bg-background text-foreground hover:bg-accent transition-colors duration-200 flex items-center justify-center"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setShowAttachmentMenu(!showAttachmentMenu);
                              }}
                            >
                              <HugeiconsIcon icon={DocumentAttachmentIcon} size={16} />
                            </button>
                          </DropdownMenuTrigger>
                        ) : (
                          <button
                            className="group rounded-lg p-1.75 h-8 w-8 border border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50 transition-colors duration-200 flex items-center justify-center"
                            disabled
                          >
                            <HugeiconsIcon icon={DocumentAttachmentIcon} size={16} />
                          </button>
                        )}
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 backdrop-blur-xs py-2 px-3 !shadow-none"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[11px]">
                            {hasVisionSupport(selectedModel) ? 'Attach File' : 'File Upload Unavailable'}
                          </span>
                          <span className="text-[10px] text-accent leading-tight">
                            {hasVisionSupport(selectedModel)
                              ? hasPdfSupport(selectedModel)
                                ? 'Upload an image or PDF document'
                                : 'Upload an image'
                              : 'Selected model does not support file uploads'}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    {hasVisionSupport(selectedModel) && (
                      <DropdownMenuContent align="end" sideOffset={4}>
                        <DropdownMenuItem onClick={triggerFileInput}>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Files
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={openLibraryDialog}>
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Browse Library
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    )}
                  </DropdownMenu>

                  {isProcessing ? (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          className="group rounded-lg p-1.75 h-8 w-8 border border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors duration-200"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            stop();
                          }}
                        >
                          <span className="block">
                            <StopIcon size={16} />
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 backdrop-blur-xs py-2 px-3 !shadow-none"
                      >
                        <span className="font-medium text-[11px]">Stop Generation</span>
                      </TooltipContent>
                    </Tooltip>
                  ) : input.length === 0 && attachments.length === 0 ? (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          className={cn(
                            'group rounded-lg p-1.5 size-7.5 transition-colors duration-200',
                            isRecording
                              ? 'border border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90'
                              : 'border border-primary bg-primary text-primary-foreground hover:bg-primary/90',
                          )}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleRecord();
                          }}
                        >
                          <span className="block">
                            <HugeiconsIcon icon={AiMicIcon} size={16} color="currentColor" strokeWidth={1.5} />
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 backdrop-blur-xs py-2 px-3 !shadow-none"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[11px]">
                            {isRecording ? 'Stop Recording' : 'Voice Input'}
                          </span>
                          <span className="text-[10px] text-accent leading-tight">
                            {isRecording ? 'Click to stop recording' : 'Record your voice message'}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          className="group rounded-lg flex p-1.75 m-auto h-8 w-8 border border-primary bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary transition-colors duration-200"
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
                          <span className="block">
                            <ArrowUpIcon size={16} />
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 backdrop-blur-xs py-2 px-3 !shadow-none"
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

      <FileLibraryDialog
        open={showLibraryDialog}
        onOpenChange={setShowLibraryDialog}
        onFileSelect={handleLibraryFileSelect}
        multiple={true}
        mode="select"
      />
    </div>
  );
};

export default FormComponent;
