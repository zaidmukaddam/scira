/* eslint-disable @next/next/no-img-element */
// /components/ui/form-component.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card"
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

interface ModelSwitcherProps {
    selectedModel: string;
    setSelectedModel: (value: string) => void;
    className?: string;
    showExperimentalModels: boolean;
    attachments: Array<Attachment>;
    messages: Array<Message>;
    status: 'submitted' | 'streaming' | 'ready' | 'error';
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
        <path d="M356.09 155.99L364.4 482.36H430.96L439.28 37.18L356.09 155.99Z" fill="currentColor"/>
        <path d="M439.28 0.910004H337.72L178.35 228.53L229.13 301.05L439.28 0.910004Z" fill="currentColor"/>
        <path d="M0.609985 482.36H102.17L152.96 409.84L102.17 337.31L0.609985 482.36Z" fill="currentColor"/>
        <path d="M0.609985 155.99L229.13 482.36H330.69L102.17 155.99H0.609985Z" fill="currentColor"/>
    </svg>
);

const AnthropicIcon = ({ className }: { className?: string }) => (
    <svg 
        role="img" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <title>Anthropic</title>
        <path fill="currentColor" d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z"/>
    </svg>
);

const models = [
    { value: "scira-default", label: "Grok 2.0 Vision", icon: XAIIcon, iconClass: "!text-neutral-300", description: "xAI's Grok 2.0 Vision model", color: "steel", vision: true, experimental: false, category: "Stable" },
    { value: "scira-sonnet", label: "Claude 3.7 Sonnet", icon: AnthropicIcon, iconClass: "!text-neutral-900 dark:!text-white", description: "Anthropic's G.O.A.T. model", color: "purple", vision: true, experimental: false, category: "Stable" },
    { value: "scira-llama", label: "Llama 3.3 70B", icon: "/cerebras.png", iconClass: "!text-neutral-900 dark:!text-white", description: "Meta's Llama model by Cerebras", color: "offgray", vision: false, experimental: true, category: "Experimental" },
    { value: "scira-r1", label: "DeepSeek R1 Distilled", icon: "/groq.svg", iconClass: "!text-neutral-900 dark:!text-white", description: "DeepSeek R1 model by Groq", color: "sapphire", vision: false, experimental: true, category: "Experimental" },
];

const getColorClasses = (color: string, isSelected: boolean = false) => {
    const baseClasses = "transition-colors duration-200";
    const selectedClasses = isSelected ? "!bg-opacity-100 dark:!bg-opacity-100" : "";

    switch (color) {
        case 'glossyblack':
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-[#4D4D4D] dark:!bg-[#3A3A3A] !text-white hover:!bg-[#3D3D3D] dark:hover:!bg-[#434343] !border-[#4D4D4D] dark:!border-[#3A3A3A] !ring-[#4D4D4D] dark:!ring-[#3A3A3A] focus:!ring-[#4D4D4D] dark:focus:!ring-[#3A3A3A]`
                : `${baseClasses} !text-[#4D4D4D] dark:!text-[#E5E5E5] hover:!bg-[#4D4D4D] hover:!text-white dark:hover:!bg-[#3A3A3A] dark:hover:!text-white`;
        case 'steel':
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-[#4B82B8] dark:!bg-[#4A7CAD] !text-white hover:!bg-[#3B6C9D] dark:hover:!bg-[#3A6C9D] !border-[#4B82B8] dark:!border-[#4A7CAD] !ring-[#4B82B8] dark:!ring-[#4A7CAD] focus:!ring-[#4B82B8] dark:focus:!ring-[#4A7CAD]`
                : `${baseClasses} !text-[#4B82B8] dark:!text-[#A7C5E2] hover:!bg-[#4B82B8] hover:!text-white dark:hover:!bg-[#4A7CAD] dark:hover:!text-white`;
        case 'offgray':
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-[#505050] dark:!bg-[#505050] !text-white hover:!bg-[#404040] dark:hover:!bg-[#404040] !border-[#505050] dark:!border-[#505050] !ring-[#505050] dark:!ring-[#505050] focus:!ring-[#505050] dark:focus:!ring-[#505050]`
                : `${baseClasses} !text-[#505050] dark:!text-[#D0D0D0] hover:!bg-[#505050] hover:!text-white dark:hover:!bg-[#505050] dark:hover:!text-white`;
        case 'purple':
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-[#6366F1] dark:!bg-[#5B54E5] !text-white hover:!bg-[#4F46E5] dark:hover:!bg-[#4B44D5] !border-[#6366F1] dark:!border-[#5B54E5] !ring-[#6366F1] dark:!ring-[#5B54E5] focus:!ring-[#6366F1] dark:focus:!ring-[#5B54E5]`
                : `${baseClasses} !text-[#6366F1] dark:!text-[#A5A0FF] hover:!bg-[#6366F1] hover:!text-white dark:hover:!bg-[#5B54E5] dark:hover:!text-white`;
        case 'sapphire':
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-[#2E4A5C] dark:!bg-[#2E4A5C] !text-white hover:!bg-[#1E3A4C] dark:hover:!bg-[#1E3A4C] !border-[#2E4A5C] dark:!border-[#2E4A5C] !ring-[#2E4A5C] dark:!ring-[#2E4A5C] focus:!ring-[#2E4A5C] dark:focus:!ring-[#2E4A5C]`
                : `${baseClasses} !text-[#2E4A5C] dark:!text-[#89B4D4] hover:!bg-[#2E4A5C] hover:!text-white dark:hover:!bg-[#2E4A5C] dark:hover:!text-white`;
        case 'bronze':
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-[#9B6E4C] dark:!bg-[#9B6E4C] !text-white hover:!bg-[#8B5E3C] dark:hover:!bg-[#8B5E3C] !border-[#9B6E4C] dark:!border-[#9B6E4C] !ring-[#9B6E4C] dark:!ring-[#9B6E4C] focus:!ring-[#9B6E4C] dark:focus:!ring-[#9B6E4C]`
                : `${baseClasses} !text-[#9B6E4C] dark:!text-[#D4B594] hover:!bg-[#9B6E4C] hover:!text-white dark:hover:!bg-[#9B6E4C] dark:hover:!text-white`;
        default:
            return isSelected
                ? `${baseClasses} ${selectedClasses} !bg-neutral-500 dark:!bg-neutral-700 !text-white hover:!bg-neutral-600 dark:hover:!bg-neutral-800 !border-neutral-500 dark:!border-neutral-700`
                : `${baseClasses} !text-neutral-600 dark:!text-neutral-300 hover:!bg-neutral-500 hover:!text-white dark:hover:!bg-neutral-700 dark:hover:!text-white`;
    }
}

const ModelSwitcher: React.FC<ModelSwitcherProps> = ({ selectedModel, setSelectedModel, className, showExperimentalModels, attachments, messages, status }) => {
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
                className="w-[220px] p-1 !font-sans rounded-lg bg-white dark:bg-neutral-900 sm:ml-4 !mt-1.5 sm:m-auto !z-[52] shadow-lg border border-neutral-200 dark:border-neutral-800"
                align="start"
                sideOffset={8}
            >
                {Object.entries(groupedModels).map(([category, categoryModels], categoryIndex) => (
                    <div key={category} className={cn(
                        categoryIndex > 0 && "mt-1"
                    )}>
                        <div className="px-2 py-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 select-none">
                            {category}
                        </div>
                        <div className="space-y-0.5">
                            {categoryModels.map((model) => (
                                <DropdownMenuItem
                                    key={model.value}
                                    onSelect={() => {
                                        console.log("Selected model:", model.value);
                                        setSelectedModel(model.value.trim());
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
                        {showDivider(category) && (
                            <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
                        )}
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
const MAX_INPUT_CHARS = 250;

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

const CharacterCounter = ({ current, max }: { current: number; max: number }) => {
    const percentage = Math.min(100, (current / max) * 100);
    const isNearLimit = percentage >= 80 && percentage < 100;
    const isOverLimit = percentage >= 100;
    
    // Twitter-like styling
    const strokeColor = isOverLimit 
        ? 'stroke-red-500' 
        : isNearLimit 
            ? 'stroke-amber-500' 
            : 'stroke-neutral-400';
    
    // Smaller size for more compact look
    const size = 16;
    const strokeWidth = 1.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dash = (percentage * circumference) / 100;
    const gap = circumference - dash;
    
    // Add border to ensure visibility on all backgrounds
    const bgColor = isOverLimit
        ? 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
        : isNearLimit
            ? 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
            : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700';
    
    return (
        <div className={`relative flex items-center justify-center ${bgColor} rounded-full shadow-sm transition-all duration-200`}>
            <svg height={size} width={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
                {/* Only show background circle when progress is visible */}
                {current > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        strokeWidth={strokeWidth}
                        className="stroke-neutral-200 dark:stroke-neutral-700"
                    />
                )}
                {/* Progress circle */}
                {current > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${dash} ${gap}`}
                        className={`transition-all ${strokeColor}`}
                        strokeLinecap="round"
                    />
                )}
            </svg>
        </div>
    );
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
            className="relative flex items-center bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 pr-8 gap-2 shadow-sm flex-shrink-0 z-0"
        >
            {isUploading ? (
                <div className="w-10 h-10 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-neutral-500 dark:text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : isUploadingAttachment(attachment) ? (
                <div className="w-10 h-10 flex items-center justify-center">
                    <div className="relative w-8 h-8">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle
                                className="text-neutral-300 dark:text-neutral-600 stroke-current"
                                strokeWidth="10"
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                            ></circle>
                            <circle
                                className="text-primary stroke-current"
                                strokeWidth="10"
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
                            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{Math.round(attachment.progress * 100)}%</span>
                        </div>
                    </div>
                </div>
            ) : (
                <img
                    src={(attachment as Attachment).url}
                    alt={`Preview of ${attachment.name}`}
                    width={40}
                    height={40}
                    className="rounded-lg h-10 w-10 object-cover"
                />
            )}
            <div className="flex-grow min-w-0">
                {!isUploadingAttachment(attachment) && (
                    <p className="text-sm font-medium truncate text-neutral-800 dark:text-neutral-200">
                        {truncateFilename(attachment.name)}
                    </p>
                )}
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {isUploadingAttachment(attachment)
                        ? 'Uploading...'
                        : formatFileSize((attachment as Attachment).size)}
                </p>
            </div>
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute -top-2 -right-2 p-0.5 m-0 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors z-20"
            >
                <X className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
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

    // Use motion.button for desktop
    const button = (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClick}
            className={commonClassNames}
        >
            <Icon className="size-4" />
        </motion.button>
    );

    return (
        <HoverCard openDelay={100} closeDelay={50}>
            <HoverCardTrigger asChild>
                {button}
            </HoverCardTrigger>
            <HoverCardContent
                side="bottom"
                align="center"
                sideOffset={6}
                className={cn(
                    "z-[100]",
                    "w-44 p-2 rounded-lg",
                    "border border-neutral-200 dark:border-neutral-700",
                    "bg-white dark:bg-neutral-800 shadow-md",
                    "transition-opacity duration-300"
                )}
            >
                <div className="space-y-0.5">
                    <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {group.name}
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-normal">
                        {group.description}
                    </p>
                </div>
            </HoverCardContent>
        </HoverCard>
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
                paddingRight: isExpanded && !isProcessing ? "0.5rem" : 0,
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
                                isLastItem && isExpanded && showItem ? "pr-0.5" : ""
                            )}
                            style={{ margin: 0 }}
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
    const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
    const isMounted = useRef(true);
    const { width } = useWindowSize();
    const postSubmitFileInputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isGroupSelectorExpanded, setIsGroupSelectorExpanded] = useState(false);
    const [isExceedingLimit, setIsExceedingLimit] = useState(false);

    // Add a ref to track the initial group selection
    const initialGroupRef = useRef(selectedGroup);

    const MIN_HEIGHT = 72;
    const MAX_HEIGHT = 400;

    const autoResizeInput = (target: HTMLTextAreaElement) => {
        if (!target) return;
        requestAnimationFrame(() => {
            target.style.height = 'auto';
            const newHeight = Math.min(Math.max(target.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
            target.style.height = `${newHeight}px`;
        });
    };

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
            toast.success(`Switched to ${models.find(m => m.value === visionModel)?.label} for image support`);
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
            toast.success(`Switched to ${models.find(m => m.value === visionModel)?.label} for image support`);
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
        if (event.key === "Enter" && !event.shiftKey) {
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
        <div 
            className={cn(
                "relative w-full flex flex-col gap-2 rounded-lg transition-all duration-300 !font-sans",
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
                <div className="flex flex-row gap-2 overflow-x-auto py-2 max-h-32 z-10 px-1">
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
                        "focus:!ring-1 focus:!ring-neutral-300 dark:focus:!ring-neutral-600",
                        "px-4 py-4 pb-16",
                        "overflow-y-auto",
                        "touch-manipulation",
                    )}
                    style={{
                        maxHeight: `${MAX_HEIGHT}px`,
                        WebkitUserSelect: 'text',
                        WebkitTouchCallout: 'none',
                    }}
                    rows={1}
                    autoFocus={width ? width > 768 : true}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                />

                {/* Character counter with responsive positioning */}
                {input.length > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10">
                        <CharacterCounter current={input.length} max={MAX_INPUT_CHARS} />
                    </div>
                )}

                <div className={cn(
                    "absolute bottom-0 inset-x-0 flex justify-between items-center p-2 rounded-b-lg",
                    "bg-neutral-100 dark:bg-neutral-900",
                    "!border !border-t-0 !border-neutral-200 dark:!border-neutral-700",
                    isFocused ? "!border-neutral-300 dark:!border-neutral-600" : "",
                    isProcessing ? "!opacity-20 !cursor-not-allowed" : ""
                )}>
                    <div className={cn(
                        "flex items-center gap-2",
                        isMobile && "overflow-hidden"
                    )}>
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
                            (isMobile && isGroupSelectorExpanded) ? "opacity-0 w-0 invisible" : "opacity-100 visible w-auto"
                        )}>
                            <ModelSwitcher
                                selectedModel={selectedModel}
                                setSelectedModel={setSelectedModel}
                                showExperimentalModels={showExperimentalModels}
                                attachments={attachments}
                                messages={messages}
                                status={status}
                            />
                        </div>
                        
                        <div className={cn(
                            "transition-all duration-300",
                            (isMobile && isGroupSelectorExpanded) 
                                ? "opacity-0 invisible w-0"
                                : "opacity-100 visible w-auto"
                        )}>
                            <button
                                onClick={() => {
                                    setSelectedGroup(selectedGroup === 'extreme' ? 'web' : 'extreme');
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

                    <div className="flex items-center gap-2">
                        {hasVisionSupport(selectedModel) && !(isMobile && isGroupSelectorExpanded) && (
                            <Button
                                className="rounded-full p-1.5 h-8 w-8 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600"
                                onClick={(event) => {
                                    event.preventDefault();
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
    );
};

export default FormComponent;
