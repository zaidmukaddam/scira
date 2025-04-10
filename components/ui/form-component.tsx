/* eslint-disable @next/next/no-img-element */
// /components/ui/form-component.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import useWindowSize from '@/hooks/use-window-size';
import { X } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, SearchGroup, SearchGroupId, searchGroups } from '@/lib/utils';
import { TextMorph } from '@/components/core/text-morph';
import { Upload } from 'lucide-react';
import { Mountain } from "lucide-react"
import { UIMessage } from '@ai-sdk/ui-utils';
import { Image, Globe } from 'lucide-react';

interface ModelSwitcherProps {
    selectedModel: string;
    setSelectedModel: (value: string) => void;
    className?: string;
    showExperimentalModels: boolean;
    attachments: Array<Attachment>;
    messages: Array<Message>;
    status: 'submitted' | 'streaming' | 'ready' | 'error';
    onModelSelect?: (model: typeof models[0]) => void;
}

const XAIIcon = ({ className }: { className?: string }) => (
    <svg
        width="440"
        height="483"
        viewBox="0 0 440 483"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M356.09 155.99L364.4 482.36H430.96L439.28 37.18L356.09 155.99Z" fill="currentColor" />
        <path d="M439.28 0.910004H337.72L178.35 228.53L229.13 301.05L439.28 0.910004Z" fill="currentColor" />
        <path d="M0.609985 482.36H102.17L152.96 409.84L102.17 337.31L0.609985 482.36Z" fill="currentColor" />
        <path d="M0.609985 155.99L229.13 482.36H330.69L102.17 155.99H0.609985Z" fill="currentColor" />
    </svg>
);

const MistralIcon = ({ className }: { className?: string }) => (
    <svg width="16" height="14.727272727272728" viewBox="0 0 176 162" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="15" y="1" width="32" height="32" fill="#FFCD00" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="143" y="1" width="32" height="32" fill="#FFCD00" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="15" y="33" width="32" height="32" fill="#FFA400" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="47" y="33" width="32" height="32" fill="#FFA400" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="111" y="33" width="32" height="32" fill="#FFA400" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="143" y="33" width="32" height="32" fill="#FFA400" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="15" y="65" width="32" height="32" fill="#FF7100" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="47" y="65" width="32" height="32" fill="#FF7100" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="79" y="65" width="32" height="32" fill="#FF7100" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="111" y="65" width="32" height="32" fill="#FF7100" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="143" y="65" width="32" height="32" fill="#FF7100" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="15" y="97" width="32" height="32" fill="#FF4902" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="79" y="97" width="32" height="32" fill="#FF4902" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="143" y="97" width="32" height="32" fill="#FF4902" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="15" y="129" width="32" height="32" fill="#FF0006" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect x="143" y="129" width="32" height="32" fill="#FF0006" stroke="#636363" strokeOpacity="0.2" strokeWidth="0.5"></rect>
        <rect y="1" width="16" height="160" fill="black"></rect>
        <rect x="63" y="97" width="16" height="32" fill="black"></rect>
        <rect x="95" y="33" width="16" height="32" fill="black"></rect>
        <rect x="127" y="1" width="16" height="32" fill="black"></rect>
        <rect x="127" y="97" width="16" height="64" fill="black"></rect>
    </svg>
);

const models = [
    { value: "scira-default", label: "Grok 3.0", icon: XAIIcon, iconClass: "!text-neutral-300", description: "xAI's most intelligent model", color: "black", vision: false, experimental: false, category: "Stable" },
    { value: "scira-grok-3-mini", label: "Grok 3.0 Mini", icon: XAIIcon, iconClass: "!text-neutral-300", description: "xAI's most efficient model", color: "gray", vision: false, experimental: false, category: "Stable" },
    { value: "scira-vision", label: "Grok 2.0 Vision", icon: XAIIcon, iconClass: "!text-neutral-300", description: "xAI's most advanced vision model", color: "indigo", vision: true, experimental: false, category: "Stable" },
    // { value: "scira-cmd-a", label: "Command A", icon: "/cohere.svg", iconClass: "!text-neutral-900 dark:!text-white", description: "Cohere's most powerful model", color: "purple", vision: false, experimental: true, category: "Experimental" },
    { value: "scira-claude", label: "Claude 3.7 Sonnet", icon: "/anthropic.svg", iconClass: "!text-neutral-300", description: "Anthropic's most advanced model", color: "violet", vision: false, experimental: false, category: "Stable" },
];

const getColorClasses = (color: string, isSelected: boolean = false) => {
    const baseClasses = "transition-colors duration-200";
    const selectedClasses = isSelected ? "!bg-opacity-100 dark:!bg-opacity-100" : "";

    switch (color) {
        case 'black':
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-[#0F0F0F] dark:!bg-[#0F0F0F] !text-white hover:!bg-[#0F0F0F] dark:hover:!bg-[#0F0F0F] !border-[#0F0F0F] dark:!border-[#0F0F0F]`
                : `${baseClasses} !text-[#0F0F0F] dark:!text-[#E5E5E5] hover:!bg-[#0F0F0F] hover:!text-white dark:hover:!bg-[#0F0F0F] dark:hover:!text-white`;
        case 'gray':
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-[#4E4E4E] dark:!bg-[#4E4E4E] !text-white hover:!bg-[#3D3D3D] dark:hover:!bg-[#3D3D3D] !border-[#4E4E4E] dark:!border-[#4E4E4E]`
                : `${baseClasses} !text-[#4E4E4E] dark:!text-[#E5E5E5] hover:!bg-[#4E4E4E] hover:!text-white dark:hover:!bg-[#4E4E4E] dark:hover:!text-white`;
        case 'indigo':
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-[#4F46E5] dark:!bg-[#4F46E5] !text-white hover:!bg-[#4338CA] dark:hover:!bg-[#4338CA] !border-[#4F46E5] dark:!border-[#4F46E5]`
                : `${baseClasses} !text-[#4F46E5] dark:!text-[#6366F1] hover:!bg-[#4F46E5] hover:!text-white dark:hover:!bg-[#4F46E5] dark:hover:!text-white`;
        case 'violet':
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-[#8B5CF6] dark:!bg-[#8B5CF6] !text-white hover:!bg-[#7C3AED] dark:hover:!bg-[#7C3AED] !border-[#8B5CF6] dark:!border-[#8B5CF6]`
                : `${baseClasses} !text-[#8B5CF6] dark:!text-[#A78BFA] hover:!bg-[#8B5CF6] hover:!text-white dark:hover:!bg-[#8B5CF6] dark:hover:!text-white`;
        case 'purple':
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-[#5E5ADB] dark:!bg-[#5E5ADB] !text-white hover:!bg-[#4D49C9] dark:hover:!bg-[#4D49C9] !border-[#5E5ADB] dark:!border-[#5E5ADB]`
                : `${baseClasses} !text-[#5E5ADB] dark:!text-[#5E5ADB] hover:!bg-[#5E5ADB] hover:!text-white dark:hover:!bg-[#5E5ADB] dark:hover:!text-white`;
        default:
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-neutral-500 dark:!bg-neutral-700 !text-white hover:!bg-neutral-600 dark:hover:!bg-neutral-800 !border-neutral-500 dark:!border-neutral-700`
                : `${baseClasses} !text-neutral-600 dark:!text-neutral-300 hover:!bg-neutral-500 hover:!text-white dark:hover:!bg-neutral-700 dark:hover:!text-white`;
    }
}

const ModelSwitcher: React.FC<ModelSwitcherProps> = ({ selectedModel, setSelectedModel, className, showExperimentalModels, attachments, messages, status, onModelSelect }) => {
    const selectedModelData = models.find(model => model.value === selectedModel);
    const [isOpen, setIsOpen] = useState(false);
    const isProcessing = status === 'submitted' || status === 'streaming';

    // Check for attachments in current and previous messages
    const hasAttachments = attachments.length > 0 || messages.some(msg =>
        msg.experimental_attachments && msg.experimental_attachments.length > 0
    );

    // Filter models based on attachments first, then experimental status
    const filteredModels = hasAttachments
        ? models.filter(model => model.vision)
        : models.filter(model => showExperimentalModels ? true : !model.experimental);

    // Group filtered models by category
    const groupedModels = filteredModels.reduce((acc, model) => {
        const category = model.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(model);
        return acc;
    }, {} as Record<string, typeof models>);

    // Only show divider if we have multiple categories and no attachments
    const showDivider = (category: string) => {
        return !hasAttachments && showExperimentalModels && category === "Stable";
    };

    return (
        <DropdownMenu
            onOpenChange={setIsOpen}
            modal={false}
            open={isOpen && !isProcessing}
        >
            <DropdownMenuTrigger
                className={cn(
                    "flex items-center gap-2 p-2 sm:px-3 h-8",
                    "rounded-full transition-all duration-300",
                    "border border-neutral-200 dark:border-neutral-800",
                    "hover:shadow-md",
                    getColorClasses(selectedModelData?.color || "neutral", true),
                    isProcessing && "opacity-50 pointer-events-none",
                    "ring-0 outline-none",
                    className
                )}
                disabled={isProcessing}
            >
                {selectedModelData && (
                    typeof selectedModelData.icon === 'string' ? (
                        <img
                            src={selectedModelData.icon}
                            alt={selectedModelData.label}
                            className={cn(
                                "w-3.5 h-3.5 object-contain",
                                selectedModelData.iconClass
                            )}
                        />
                    ) : (
                        <selectedModelData.icon
                            className={cn(
                                "w-3.5 h-3.5",
                                selectedModelData.iconClass
                            )}
                        />
                    )
                )}
                <span className="hidden sm:block text-xs font-medium overflow-hidden">
                    <TextMorph
                        variants={{
                            initial: { opacity: 0, y: 10 },
                            animate: { opacity: 1, y: 0 },
                            exit: { opacity: 0, y: -10 }
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                            mass: 0.5
                        }}
                    >
                        {selectedModelData?.label || ""}
                    </TextMorph>
                </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-[220px] p-1 !font-sans rounded-lg bg-white dark:bg-neutral-900 !mt-1.5 !z-[52] shadow-lg border border-neutral-200 dark:border-neutral-800 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent"
                align="start"
                side="bottom"
                sideOffset={8}
            >
                {Object.entries(groupedModels).map(([category, categoryModels], categoryIndex) => (
                    <div key={category} className={cn(
                        categoryIndex > 0 && "mt-1"
                    )}>
                        <div className="px-2 py-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 select-none sticky top-0 bg-white dark:bg-neutral-900 z-10">
                            {/* {category} */}
                            Models
                        </div>
                        <div className="space-y-0.5">
                            {categoryModels.map((model) => (
                                <DropdownMenuItem
                                    key={model.value}
                                    onSelect={() => {
                                        console.log("Selected model:", model.value);
                                        setSelectedModel(model.value.trim());

                                        // Call onModelSelect if provided
                                        if (onModelSelect) {
                                            // Show additional info about image attachments for vision models
                                            onModelSelect(model);
                                        }
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs",
                                        "transition-all duration-200",
                                        "hover:shadow-sm",
                                        getColorClasses(model.color, selectedModel === model.value)
                                    )}
                                >
                                    <div className={cn(
                                        "p-1.5 rounded-md",
                                        selectedModel === model.value
                                            ? "bg-black/10 dark:bg-white/10"
                                            : "bg-black/5 dark:bg-white/5",
                                        "group-hover:bg-black/10 dark:group-hover:bg-white/10"
                                    )}>
                                        {typeof model.icon === 'string' ? (
                                            <img
                                                src={model.icon}
                                                alt={model.label}
                                                className={cn(
                                                    "w-3 h-3 object-contain",
                                                    model.iconClass
                                                )}
                                            />
                                        ) : (
                                            <model.icon
                                                className={cn(
                                                    "w-3 h-3",
                                                    model.iconClass
                                                )}
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-px min-w-0">
                                        <div className="font-medium truncate">{model.label}</div>
                                        <div className="text-[10px] opacity-80 truncate leading-tight">{model.description}</div>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </div>
                        {/* {showDivider(category) && (
                            <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
                        )} */}
                    </div>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
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
                d="M8.70711 1.39644C8.31659 1.00592 7.68342 1.00592 7.2929 1.39644L2.21968 6.46966L1.68935 6.99999L2.75001 8.06065L3.28034 7.53032L7.25001 3.56065V14.25V15H8.75001V14.25V3.56065L12.7197 7.53032L13.25 8.06065L14.3107 6.99999L13.7803 6.46966L8.70711 1.39644Z"
                fill="currentColor"
            ></path>
        </svg>
    );
};

const StopIcon = ({ size = 16 }: { size?: number }) => {
    return (
        <svg
            height={size}
            viewBox="0 0 16 16"
            width={size}
            style={{ color: "currentcolor" }}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3 3H13V13H3V3Z"
                fill="currentColor"
            ></path>
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
            style={{ color: "currentcolor" }}
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


const MAX_IMAGES = 4;
const MAX_INPUT_CHARS = 10000;

const hasVisionSupport = (modelValue: string): boolean => {
    const selectedModel = models.find(model => model.value === modelValue);
    return selectedModel?.vision === true
};

const truncateFilename = (filename: string, maxLength: number = 20) => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split('.').pop();
    const name = filename.substring(0, maxLength - 4);
    return `${name}...${extension}`;
};

const AttachmentPreview: React.FC<{ attachment: Attachment | UploadingAttachment, onRemove: () => void, isUploading: boolean }> = ({ attachment, onRemove, isUploading }) => {
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    };

    const isUploadingAttachment = (attachment: Attachment | UploadingAttachment): attachment is UploadingAttachment => {
        return 'progress' in attachment;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "relative flex items-center",
                "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm",
                "border border-neutral-200/80 dark:border-neutral-700/80",
                "rounded-2xl p-2 pr-8 gap-2.5",
                "shadow-sm hover:shadow-md",
                "flex-shrink-0 z-0",
                "hover:bg-white dark:hover:bg-neutral-800",
                "transition-all duration-200",
                "group"
            )}
        >
            {isUploading ? (
                <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 text-neutral-500 dark:text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                            <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200">{Math.round(attachment.progress * 100)}%</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex-shrink-0 ring-1 ring-neutral-200/50 dark:ring-neutral-700/50">
                    <img
                        src={(attachment as Attachment).url}
                        alt={`Preview of ${attachment.name}`}
                        className="h-full w-full object-cover"
                    />
                </div>
            )}
            <div className="flex-grow min-w-0">
                {!isUploadingAttachment(attachment) && (
                    <p className="text-xs font-medium truncate text-neutral-800 dark:text-neutral-200">
                        {truncateFilename(attachment.name)}
                    </p>
                )}
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {isUploadingAttachment(attachment)
                        ? 'Uploading...'
                        : formatFileSize((attachment as Attachment).size)}
                </p>
            </div>
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className={cn(
                    "absolute -top-1.5 -right-1.5 p-0.5 m-0 rounded-full",
                    "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm",
                    "border border-neutral-200/80 dark:border-neutral-700/80",
                    "shadow-sm hover:shadow-md",
                    "transition-all duration-200 z-20",
                    "opacity-0 group-hover:opacity-100",
                    "scale-75 group-hover:scale-100",
                    "hover:bg-neutral-100 dark:hover:bg-neutral-700"
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
}

interface GroupSelectorProps {
    selectedGroup: SearchGroupId;
    onGroupSelect: (group: SearchGroup) => void;
    status: 'submitted' | 'streaming' | 'ready' | 'error';
    onExpandChange?: React.Dispatch<React.SetStateAction<boolean>>;
}

interface ToolbarButtonProps {
    group: SearchGroup;
    isSelected: boolean;
    onClick: () => void;
}

interface SwitchNotificationProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    isVisible: boolean;
    modelColor?: string;
    notificationType?: 'model' | 'group';
}

const SwitchNotification: React.FC<SwitchNotificationProps> = ({
    icon,
    title,
    description,
    isVisible,
    modelColor = 'default',
    notificationType = 'model'
}) => {
    // Icon color is always white for better contrast on colored backgrounds
    const getIconColorClass = () => "text-white";

    // Get background color for model notifications only
    const getModelBgClass = (color: string) => {
        switch (color) {
            case 'black':
                return 'bg-[#0F0F0F] dark:bg-[#0F0F0F] border-[#0F0F0F] dark:border-[#0F0F0F]';
            case 'gray':
                return 'bg-[#4E4E4E] dark:bg-[#4E4E4E] border-[#4E4E4E] dark:border-[#4E4E4E]';
            case 'indigo':
                return 'bg-[#4F46E5] dark:bg-[#4F46E5] border-[#4F46E5] dark:border-[#4F46E5]';
            case 'violet':
                return 'bg-[#8B5CF6] dark:bg-[#8B5CF6] border-[#8B5CF6] dark:border-[#8B5CF6]';
            case 'purple':
                return 'bg-[#5E5ADB] dark:bg-[#5E5ADB] border-[#5E5ADB] dark:border-[#5E5ADB]';
            default:
                return 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700';
        }
    };

    // For model notifications, use model colors. For group notifications, use default background.
    const useModelColor = notificationType === 'model' && modelColor !== 'default';
    const bgColorClass = useModelColor
        ? getModelBgClass(modelColor)
        : "bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700";

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{
                        opacity: { duration: 0.2 },
                        height: { duration: 0.2 }
                    }}
                    className={cn(
                        "w-[98%] max-w-2xl overflow-hidden mx-auto",
                        "text-sm text-neutral-700 dark:text-neutral-300 -mb-1"
                    )}
                >
                    <div className={cn(
                        "flex items-center gap-2 py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-t-lg border shadow-sm backdrop-blur-sm",
                        bgColorClass,
                        useModelColor ? "text-white" : "text-neutral-900 dark:text-neutral-100"
                    )}>
                        {icon && (
                            <span className={cn(
                                "flex-shrink-0 size-3.5 sm:size-4",
                                useModelColor ? getIconColorClass() : "text-primary dark:text-white"
                            )}>
                                {icon}
                            </span>
                        )}
                        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:flex-wrap gap-x-1.5 gap-y-0.5">
                            <span className={cn(
                                "font-semibold text-xs sm:text-sm",
                                useModelColor ? "text-white" : "text-neutral-900 dark:text-neutral-100"
                            )}>
                                {title}
                            </span>
                            <span className={cn(
                                "text-[10px] sm:text-xs leading-tight",
                                useModelColor ? "text-white/80" : "text-neutral-600 dark:text-neutral-400"
                            )}>
                                {description}
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ToolbarButton = ({ group, isSelected, onClick }: ToolbarButtonProps) => {
    const Icon = group.icon;
    const { width } = useWindowSize();
    const isMobile = width ? width < 768 : false;

    const commonClassNames = cn(
        "relative flex items-center justify-center",
        "size-8",
        "rounded-full",
        "transition-colors duration-300",
        isSelected
            ? "bg-neutral-500 dark:bg-neutral-600 text-white dark:text-neutral-300"
            : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80"
    );

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    };

    // Use regular button for mobile
    if (isMobile) {
        return (
            <button
                onClick={handleClick}
                className={commonClassNames}
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                <Icon className="size-4" />
            </button>
        );
    }

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClick}
            className={commonClassNames}
        >
            <Icon className="size-4" />
        </motion.button>
    );
};

interface SelectionContentProps {
    selectedGroup: SearchGroupId;
    onGroupSelect: (group: SearchGroup) => void;
    status: 'submitted' | 'streaming' | 'ready' | 'error';
    onExpandChange?: React.Dispatch<React.SetStateAction<boolean>>;
}

const SelectionContent = ({ selectedGroup, onGroupSelect, status, onExpandChange }: SelectionContentProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isProcessing = status === 'submitted' || status === 'streaming';
    const { width } = useWindowSize();
    const isMobile = width ? width < 768 : false;

    // Notify parent component when expansion state changes
    useEffect(() => {
        if (onExpandChange) {
            // Only notify about expansion on mobile devices
            onExpandChange(isMobile ? isExpanded : false);
        }
    }, [isExpanded, onExpandChange, isMobile]);

    return (
        <motion.div
            layout={false}
            initial={false}
            animate={{
                width: isExpanded && !isProcessing ? "auto" : "30px",
                gap: isExpanded && !isProcessing ? "0.5rem" : 0,
                paddingRight: isExpanded && !isProcessing ? "0.25rem" : 0,
            }}
            transition={{
                duration: 0.2,
                ease: "easeInOut",
            }}
            className={cn(
                "inline-flex items-center min-w-[38px] p-0.5",
                "rounded-full border border-neutral-200 dark:border-neutral-800",
                "bg-white dark:bg-neutral-900 shadow-sm overflow-visible",
                "relative z-10",
                isProcessing && "opacity-50 pointer-events-none"
            )}
            onMouseEnter={() => !isProcessing && setIsExpanded(true)}
            onMouseLeave={() => !isProcessing && setIsExpanded(false)}
        >
            <AnimatePresence initial={false}>
                {searchGroups.filter(group => group.show).map((group, index, filteredGroups) => {
                    const showItem = (isExpanded && !isProcessing) || selectedGroup === group.id;
                    const isLastItem = index === filteredGroups.length - 1;
                    return (
                        <motion.div
                            key={group.id}
                            layout={false}
                            animate={{
                                width: showItem ? "28px" : 0,
                                opacity: showItem ? 1 : 0,
                                marginRight: (showItem && isLastItem && isExpanded) ? "2px" : 0
                            }}
                            transition={{
                                duration: 0.15,
                                ease: "easeInOut"
                            }}
                            className={cn(
                                "!m-0",
                                isLastItem && isExpanded && showItem ? "pr-0.5" : ""
                            )}
                        >
                            <ToolbarButton
                                group={group}
                                isSelected={selectedGroup === group.id}
                                onClick={() => !isProcessing && onGroupSelect(group)}
                            />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </motion.div>
    );
};

const GroupSelector = ({ selectedGroup, onGroupSelect, status, onExpandChange }: GroupSelectorProps) => {
    return (
        <SelectionContent
            selectedGroup={selectedGroup}
            onGroupSelect={onGroupSelect}
            status={status}
            onExpandChange={onExpandChange}
        />
    );
};

const FormComponent: React.FC<FormComponentProps> = ({
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
    showExperimentalModels,
    messages,
    status,
    setHasSubmitted,
}) => {
    const MIN_HEIGHT = 72;
    const MAX_HEIGHT = 400;
    
    const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
    const isMounted = useRef(true);
    const isCompositionActive = useRef(false)
    const { width } = useWindowSize();
    const postSubmitFileInputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [isGroupSelectorExpanded, setIsGroupSelectorExpanded] = useState(false);
    const [isExceedingLimit, setIsExceedingLimit] = useState(false);
    const [switchNotification, setSwitchNotification] = useState<{
        show: boolean;
        icon: React.ReactNode;
        title: string;
        description: string;
        notificationType?: 'model' | 'group';
        visibilityTimeout?: NodeJS.Timeout;
    }>({
        show: false,
        icon: null,
        title: '',
        description: '',
        notificationType: 'model',
        visibilityTimeout: undefined
    });

    const showSwitchNotification = (title: string, description: string, icon?: React.ReactNode, color?: string, type: 'model' | 'group' = 'model') => {
        // Clear any existing timeout to prevent conflicts
        if (switchNotification.visibilityTimeout) {
            clearTimeout(switchNotification.visibilityTimeout);
        }

        setSwitchNotification({
            show: true,
            icon: icon || null,
            title,
            description,
            notificationType: type,
            visibilityTimeout: undefined
        });

        // Auto hide after 3 seconds
        const timeout = setTimeout(() => {
            setSwitchNotification(prev => ({ ...prev, show: false }));
        }, 3000);

        // Update the timeout reference
        setSwitchNotification(prev => ({ ...prev, visibilityTimeout: timeout }));
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (switchNotification.visibilityTimeout) {
                clearTimeout(switchNotification.visibilityTimeout);
            }
        };
    }, [switchNotification.visibilityTimeout]);

    const autoResizeInput = (target: HTMLTextAreaElement) => {
        if (!target) return;
        // Set height to min-height first to prevent jumping
        target.style.height = `${MIN_HEIGHT}px`;
        // Then calculate the actual height needed
        const scrollHeight = target.scrollHeight;
        if (scrollHeight > MIN_HEIGHT) {
            requestAnimationFrame(() => {
                target.style.height = `${Math.min(scrollHeight, MAX_HEIGHT)}px`;
            });
        }
    };

    // Auto-resize specifically on component mount (once)
    useEffect(() => {
        if (inputRef.current) {
            // Handle the initial height on mount
            inputRef.current.style.height = `${MIN_HEIGHT}px`;
            // Delay resize calculation slightly to ensure proper rendering
            const mountTimeout = setTimeout(() => {
                if (inputRef.current) {
                    const scrollHeight = inputRef.current.scrollHeight;
                    if (scrollHeight > MIN_HEIGHT) {
                        inputRef.current.style.height = `${Math.min(scrollHeight, MAX_HEIGHT)}px`;
                    }
                }
            }, 50);
            return () => clearTimeout(mountTimeout);
        }
    }, []);

    // Auto-resize on input changes
    useEffect(() => {
        if (inputRef.current) {
            // Small delay to ensure the component is fully rendered
            const timeoutId = setTimeout(() => {
                autoResizeInput(inputRef.current!);
            }, 10);
            return () => clearTimeout(timeoutId);
        }
    }, [input]);

    const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        event.preventDefault();
        const newValue = event.target.value;

        // Check if input exceeds character limit
        if (newValue.length > MAX_INPUT_CHARS) {
            setIsExceedingLimit(true);
            // Optional: You can truncate the input here or just warn the user
            // setInput(newValue.substring(0, MAX_INPUT_CHARS));
            setInput(newValue);
            toast.error(`Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters.`);
        } else {
            setIsExceedingLimit(false);
            setInput(newValue);
        }

        autoResizeInput(event.target);
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleGroupSelect = useCallback((group: SearchGroup) => {
        setSelectedGroup(group.id);
        inputRef.current?.focus();

        showSwitchNotification(
            group.name,
            group.description,
            <group.icon className="size-4" />,
            group.id, // Use the group ID directly as the color code
            'group'   // Specify this is a group notification
        );
    }, [setSelectedGroup, inputRef]);

    const uploadFile = async (file: File): Promise<Attachment> => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                throw new Error('Failed to upload file');
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            toast.error("Failed to upload file, please try again!");
            throw error;
        }
    };

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const totalAttachments = attachments.length + files.length;

        if (totalAttachments > MAX_IMAGES) {
            toast.error(`You can only attach up to ${MAX_IMAGES} images.`);
            return;
        }

        setUploadQueue(files.map((file) => file.name));

        try {
            const uploadPromises = files.map((file) => uploadFile(file));
            const uploadedAttachments = await Promise.all(uploadPromises);
            setAttachments((currentAttachments) => [
                ...currentAttachments,
                ...uploadedAttachments,
            ]);
        } catch (error) {
            console.error("Error uploading files!", error);
            toast.error("Failed to upload one or more files. Please try again.");
        } finally {
            setUploadQueue([]);
            event.target.value = '';
        }
    }, [attachments, setAttachments]);

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (attachments.length >= MAX_IMAGES) return;

        if (e.dataTransfer.items && e.dataTransfer.items[0].kind === "file") {
            setIsDragging(true);
        }
    }, [attachments.length]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const getFirstVisionModel = useCallback(() => {
        return models.find(model => model.vision)?.value || selectedModel;
    }, [selectedModel]);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith('image/')
        );

        if (files.length === 0) {
            toast.error("Only image files are supported");
            return;
        }

        const totalAttachments = attachments.length + files.length;
        if (totalAttachments > MAX_IMAGES) {
            toast.error(`You can only attach up to ${MAX_IMAGES} images.`);
            return;
        }

        // Switch to vision model if current model doesn't support vision
        const currentModel = models.find(m => m.value === selectedModel);
        if (!currentModel?.vision) {
            const visionModel = getFirstVisionModel();
            setSelectedModel(visionModel);

            const modelData = models.find(m => m.value === visionModel);
            if (modelData) {
                showSwitchNotification(
                    modelData.label,
                    'Vision model enabled - you can now attach images',
                    typeof modelData.icon === 'string' ?
                        <img src={modelData.icon} alt={modelData.label} className="size-4 object-contain" /> :
                        <modelData.icon className="size-4" />,
                    modelData.color,
                    'model'  // Explicitly mark as model notification
                );
            }
        }

        setUploadQueue(files.map((file) => file.name));

        try {
            const uploadPromises = files.map((file) => uploadFile(file));
            const uploadedAttachments = await Promise.all(uploadPromises);
            setAttachments((currentAttachments) => [
                ...currentAttachments,
                ...uploadedAttachments,
            ]);
        } catch (error) {
            console.error("Error uploading files!", error);
            toast.error("Failed to upload one or more files. Please try again.");
        } finally {
            setUploadQueue([]);
        }
    }, [attachments.length, setAttachments, uploadFile, selectedModel, setSelectedModel, getFirstVisionModel]);

    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const items = Array.from(e.clipboardData.items);
        const imageItems = items.filter(item => item.type.startsWith('image/'));

        if (imageItems.length === 0) return;

        // Prevent default paste behavior if there are images
        e.preventDefault();

        const totalAttachments = attachments.length + imageItems.length;
        if (totalAttachments > MAX_IMAGES) {
            toast.error(`You can only attach up to ${MAX_IMAGES} images.`);
            return;
        }

        // Switch to vision model if needed
        const currentModel = models.find(m => m.value === selectedModel);
        if (!currentModel?.vision) {
            const visionModel = getFirstVisionModel();
            setSelectedModel(visionModel);

            const modelData = models.find(m => m.value === visionModel);
            if (modelData) {
                showSwitchNotification(
                    modelData.label,
                    'Vision model enabled - you can now attach images',
                    typeof modelData.icon === 'string' ?
                        <img src={modelData.icon} alt={modelData.label} className="size-4 object-contain" /> :
                        <modelData.icon className="size-4" />,
                    modelData.color,
                    'model'  // Explicitly mark as model notification
                );
            }
        }

        setUploadQueue(imageItems.map((_, i) => `Pasted Image ${i + 1}`));

        try {
            const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[];
            const uploadPromises = files.map(file => uploadFile(file));
            const uploadedAttachments = await Promise.all(uploadPromises);

            setAttachments(currentAttachments => [
                ...currentAttachments,
                ...uploadedAttachments,
            ]);

            toast.success('Image pasted successfully');
        } catch (error) {
            console.error("Error uploading pasted files!", error);
            toast.error("Failed to upload pasted image. Please try again.");
        } finally {
            setUploadQueue([]);
        }
    }, [attachments.length, setAttachments, uploadFile, selectedModel, setSelectedModel, getFirstVisionModel]);

    useEffect(() => {
        if (status !== 'ready' && inputRef.current) {
            const focusTimeout = setTimeout(() => {
                if (isMounted.current && inputRef.current) {
                    inputRef.current.focus({
                        preventScroll: true
                    });
                }
            }, 300);

            return () => clearTimeout(focusTimeout);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (status !== 'ready') {
            toast.error("Please wait for the current response to complete!");
            return;
        }

        // Check if input exceeds character limit
        if (input.length > MAX_INPUT_CHARS) {
            toast.error(`Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters. Please shorten your message.`);
            return;
        }

        if (input.trim() || attachments.length > 0) {
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
            toast.error("Please enter a search query or attach an image.");
        }
    }, [input, attachments, handleSubmit, setAttachments, fileInputRef, lastSubmittedQueryRef, status]);

    const submitForm = useCallback(() => {
        onSubmit({ preventDefault: () => { }, stopPropagation: () => { } } as React.FormEvent<HTMLFormElement>);
        resetSuggestedQuestions();

        if (width && width > 768) {
            inputRef.current?.focus();
        }
    }, [onSubmit, resetSuggestedQuestions, width, inputRef]);

    const triggerFileInput = useCallback(() => {
        if (attachments.length >= MAX_IMAGES) {
            toast.error(`You can only attach up to ${MAX_IMAGES} images.`);
            return;
        }

        if (status === 'ready') {
            postSubmitFileInputRef.current?.click();
        } else {
            fileInputRef.current?.click();
        }
    }, [attachments.length, status, fileInputRef]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey && !isCompositionActive.current) {
            event.preventDefault();
            if (status === 'submitted' || status === 'streaming') {
                toast.error("Please wait for the response to complete!");
            } else {
                submitForm();
                if (width && width > 768) {
                    setTimeout(() => {
                        inputRef.current?.focus();
                    }, 100);
                }
            }
        }
    };

    const isProcessing = status === 'submitted' || status === 'streaming';
    const hasInteracted = messages.length > 0;
    const isMobile = width ? width < 768 : false;

    return (
        <div className="flex flex-col w-full">
            <div
                className={cn(
                    "relative w-full flex flex-col gap-1 rounded-lg transition-all duration-300 !font-sans",
                    hasInteracted ? "z-[51]" : "",
                    isDragging && "ring-1 ring-neutral-300 dark:ring-neutral-700",
                    attachments.length > 0 || uploadQueue.length > 0
                        ? "bg-gray-100/70 dark:bg-neutral-800 p-1"
                        : "bg-transparent"
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
                                <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 shadow-sm">
                                    <Upload className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
                                </div>
                                <div className="space-y-1 text-center">
                                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                        Drop images here
                                    </p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-500">
                                        Max {MAX_IMAGES} images
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <input type="file" className="hidden" ref={fileInputRef} multiple onChange={handleFileChange} accept="image/*" tabIndex={-1} />
                <input type="file" className="hidden" ref={postSubmitFileInputRef} multiple onChange={handleFileChange} accept="image/*" tabIndex={-1} />

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
                                attachment={{
                                    url: "",
                                    name: filename,
                                    contentType: "",
                                    size: 0,
                                } as Attachment}
                                onRemove={() => { }}
                                isUploading={true}
                            />
                        ))}
                    </div>
                )}

                {/* Form container with switch notification */}
                <div className="relative">
                    <SwitchNotification
                        icon={switchNotification.icon}
                        title={switchNotification.title}
                        description={switchNotification.description}
                        isVisible={switchNotification.show}
                        modelColor={switchNotification.notificationType === 'model' ?
                            models.find(m => m.value === selectedModel)?.color :
                            selectedGroup}
                        notificationType={switchNotification.notificationType}
                    />

                    <div className="relative rounded-lg bg-neutral-100 dark:bg-neutral-900">
                        <Textarea
                            ref={inputRef}
                            placeholder={hasInteracted ? "Ask a new question..." : "Ask a question..."}
                            value={input}
                            onChange={handleInput}
                            disabled={isProcessing}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            className={cn(
                                "min-h-[72px] w-full resize-none rounded-lg",
                                "text-base leading-relaxed",
                                "bg-neutral-100 dark:bg-neutral-900",
                                "border !border-neutral-200 dark:!border-neutral-700",
                                "focus:!border-neutral-300 dark:focus:!border-neutral-600",
                                isFocused ? "!border-neutral-300 dark:!border-neutral-600" : "",
                                "text-neutral-900 dark:text-neutral-100",
                                "focus:!ring-0",
                                "px-4 py-4 pb-16",
                                "overflow-y-auto",
                                "touch-manipulation",
                            )}
                            style={{
                                minHeight: `${MIN_HEIGHT}px`,
                                maxHeight: `${MAX_HEIGHT}px`,
                                WebkitUserSelect: 'text',
                                WebkitTouchCallout: 'none',
                            }}
                            rows={1}
                            autoFocus={width ? width > 768 : true}
                            onCompositionStart={() => isCompositionActive.current = true}
                            onCompositionEnd={() => isCompositionActive.current = false}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                        />

                        {/* Separate div for toolbar controls that won't trigger the textarea */}
                        <div
                            className={cn(
                                "absolute bottom-0 inset-x-0 flex justify-between items-center p-2 rounded-b-lg",
                                "bg-neutral-100 dark:bg-neutral-900",
                                "!border !border-t-0 !border-neutral-200 dark:!border-neutral-700",
                                isFocused ? "!border-neutral-300 dark:!border-neutral-600" : "",
                                isProcessing ? "!opacity-20 !cursor-not-allowed" : ""
                            )}
                        >
                            {/* Toolbar controls in a touchable div that prevents keyboard */}
                            <div
                                className={cn(
                                    "flex items-center gap-2",
                                    isMobile && "overflow-hidden"
                                )}
                                // Use pointer-events-auto to enable interactions without affecting the textarea
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Blur the textarea on toolbar click to hide keyboard
                                    if (isMobile && document.activeElement === inputRef.current) {
                                        inputRef.current?.blur();
                                    }
                                }}
                            >
                                <div className={cn(
                                    "transition-all duration-100",
                                    (selectedGroup !== 'extreme')
                                        ? "opacity-100 visible w-auto"
                                        : "opacity-0 invisible w-0"
                                )}>
                                    <GroupSelector
                                        selectedGroup={selectedGroup}
                                        onGroupSelect={handleGroupSelect}
                                        status={status}
                                        onExpandChange={setIsGroupSelectorExpanded}
                                    />
                                </div>

                                <div className={cn(
                                    "transition-all duration-300",
                                    (isMobile && isGroupSelectorExpanded)
                                        ? "opacity-0 invisible w-0"
                                        : "opacity-100 visible w-auto"
                                )}>
                                    <ModelSwitcher
                                        selectedModel={selectedModel}
                                        setSelectedModel={setSelectedModel}
                                        showExperimentalModels={showExperimentalModels}
                                        attachments={attachments}
                                        messages={messages}
                                        status={status}
                                        onModelSelect={(model) => {
                                            // Show additional info about image attachments for vision models
                                            const isVisionModel = model.vision === true;
                                            showSwitchNotification(
                                                model.label,
                                                isVisionModel
                                                    ? 'Vision model enabled - you can now attach images'
                                                    : model.description,
                                                typeof model.icon === 'string' ?
                                                    <img src={model.icon} alt={model.label} className="size-4 object-contain" /> :
                                                    <model.icon className="size-4" />,
                                                model.color,
                                                'model'  // Explicitly mark as model notification
                                            );
                                        }}
                                    />
                                </div>

                                <div className={cn(
                                    "transition-all duration-300",
                                    (isMobile && isGroupSelectorExpanded)
                                        ? "opacity-0 invisible w-0"
                                        : "opacity-100 visible w-auto"
                                )}>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const newMode = selectedGroup === 'extreme' ? 'web' : 'extreme';
                                            setSelectedGroup(newMode);

                                            // Enhanced notification messages
                                            const newModeText = selectedGroup === 'extreme' ? 'Switched to Web Search' : 'Switched to Extreme Mode';
                                            const description = selectedGroup === 'extreme'
                                                ? 'Standard web search mode is now active'
                                                : 'Enhanced deep research mode is now active';

                                            // Use appropriate colors for groups that don't conflict with model colors
                                            showSwitchNotification(
                                                newModeText,
                                                description,
                                                selectedGroup === 'extreme' ? <Globe className="size-4" /> : <Mountain className="size-4" />,
                                                newMode, // Use the new mode as the color identifier
                                                'group'  // Specify this is a group notification
                                            );
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 p-2 sm:px-3 h-8",
                                            "rounded-full transition-all duration-300",
                                            "border border-neutral-200 dark:border-neutral-800",
                                            "hover:shadow-md",
                                            selectedGroup === 'extreme'
                                                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                                : "bg-white dark:bg-neutral-900 text-neutral-500",
                                        )}
                                    >
                                        <Mountain className="h-3.5 w-3.5" />
                                        <span className="hidden sm:block text-xs font-medium">Extreme</span>
                                    </button>
                                </div>
                            </div>

                            <div
                                className="flex items-center gap-2"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Blur the textarea on button container click
                                    if (isMobile && document.activeElement === inputRef.current) {
                                        inputRef.current?.blur();
                                    }
                                }}
                            >
                                {hasVisionSupport(selectedModel) && !(isMobile && isGroupSelectorExpanded) && (
                                    <Button
                                        className="rounded-full p-1.5 h-8 w-8 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            triggerFileInput();
                                        }}
                                        variant="outline"
                                        disabled={isProcessing}
                                    >
                                        <PaperclipIcon size={14} />
                                    </Button>
                                )}

                                {isProcessing ? (
                                    <Button
                                        className="rounded-full p-1.5 h-8 w-8"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            stop();
                                        }}
                                        variant="destructive"
                                    >
                                        <StopIcon size={14} />
                                    </Button>
                                ) : (
                                    <Button
                                        className="rounded-full p-1.5 h-8 w-8"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            submitForm();
                                        }}
                                        disabled={input.length === 0 && attachments.length === 0 || uploadQueue.length > 0 || status !== 'ready'}
                                    >
                                        <ArrowUpIcon size={14} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormComponent;
