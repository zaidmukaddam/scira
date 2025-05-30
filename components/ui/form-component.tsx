/* eslint-disable @next/next/no-img-element */
// /components/ui/form-component.tsx
import React, { useState, useRef, useCallback, useEffect, SVGProps } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import useWindowSize from '@/hooks/use-window-size';
import { TelescopeIcon, X } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, SearchGroup, SearchGroupId, searchGroups } from '@/lib/utils';
import { Upload } from 'lucide-react';
import { UIMessage } from '@ai-sdk/ui-utils';
import { Globe } from 'lucide-react';
import { BrainCircuit, EyeIcon } from 'lucide-react';
import { track } from '@vercel/analytics';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { User } from '@/lib/db/schema';
import { useSession } from '@/lib/auth-client';
import { checkImageModeration } from '@/app/actions';

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

const OpenAIIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="256"
        height="260"
        preserveAspectRatio="xMidYMid"
        viewBox="0 0 256 260"
        className={className}
    >
        <path fill="currentColor" d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z" />
    </svg>
)

const GeminiIcon = ({ className }: { className?: string }) => (
    <svg height="1em" style={{ flex: "none", lineHeight: "1" }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
        <title>Gemini</title>
        <defs>
            <linearGradient id="lobe-icons-gemini-fill" x1="0%" x2="68.73%" y1="100%" y2="30.395%">
                <stop offset="0%" stop-color="#1C7DFF"></stop>
                <stop offset="52.021%" stop-color="#1C69FF"></stop>
                <stop offset="100%" stop-color="#F0DCD6"></stop>
            </linearGradient>
        </defs>
        <path d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12" fill="url(#lobe-icons-gemini-fill)" fill-rule="nonzero"></path>
    </svg>
);

const QwenIcon = (props: SVGProps<SVGSVGElement>) => <svg fill="currentColor" fillRule="evenodd" height="1em" style={{
    flex: "none",
    lineHeight: 1
}} viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><title>{"Qwen"}</title><path d="M12.604 1.34c.393.69.784 1.382 1.174 2.075a.18.18 0 00.157.091h5.552c.174 0 .322.11.446.327l1.454 2.57c.19.337.24.478.024.837-.26.43-.513.864-.76 1.3l-.367.658c-.106.196-.223.28-.04.512l2.652 4.637c.172.301.111.494-.043.77-.437.785-.882 1.564-1.335 2.34-.159.272-.352.375-.68.37-.777-.016-1.552-.01-2.327.016a.099.099 0 00-.081.05 575.097 575.097 0 01-2.705 4.74c-.169.293-.38.363-.725.364-.997.003-2.002.004-3.017.002a.537.537 0 01-.465-.271l-1.335-2.323a.09.09 0 00-.083-.049H4.982c-.285.03-.553-.001-.805-.092l-1.603-2.77a.543.543 0 01-.002-.54l1.207-2.12a.198.198 0 000-.197 550.951 550.951 0 01-1.875-3.272l-.79-1.395c-.16-.31-.173-.496.095-.965.465-.813.927-1.625 1.387-2.436.132-.234.304-.334.584-.335a338.3 338.3 0 012.589-.001.124.124 0 00.107-.063l2.806-4.895a.488.488 0 01.422-.246c.524-.001 1.053 0 1.583-.006L11.704 1c.341-.003.724.032.9.34zm-3.432.403a.06.06 0 00-.052.03L6.254 6.788a.157.157 0 01-.135.078H3.253c-.056 0-.07.025-.041.074l5.81 10.156c.025.042.013.062-.034.063l-2.795.015a.218.218 0 00-.2.116l-1.32 2.31c-.044.078-.021.118.068.118l5.716.008c.046 0 .08.02.104.061l1.403 2.454c.046.081.092.082.139 0l5.006-8.76.783-1.382a.055.055 0 01.096 0l1.424 2.53a.122.122 0 00.107.062l2.763-.02a.04.04 0 00.035-.02.041.041 0 000-.04l-2.9-5.086a.108.108 0 010-.113l.293-.507 1.12-1.977c.024-.041.012-.062-.035-.062H9.2c-.059 0-.073-.026-.043-.077l1.434-2.505a.107.107 0 000-.114L9.225 1.774a.06.06 0 00-.053-.031zm6.29 8.02c.046 0 .058.02.034.06l-.832 1.465-2.613 4.585a.056.056 0 01-.05.029.058.058 0 01-.05-.029L8.498 9.841c-.02-.034-.01-.052.028-.054l.216-.012 6.722-.012z" /></svg>;


const AnthropicIcon = (props: SVGProps<SVGSVGElement>) => <svg fill="currentColor" fillRule="evenodd" style={{
    flex: "none",
    lineHeight: 1
}} viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg" height="1em" {...props}><title>{"Anthropic"}</title><path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" /></svg>;

const GroqIcon = (props: SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 201 201" width="1em" height="1em" {...props}><path fill="#F54F35" d="M0 0h201v201H0V0Z" /><path fill="#FEFBFB" d="m128 49 1.895 1.52C136.336 56.288 140.602 64.49 142 73c.097 1.823.148 3.648.161 5.474l.03 3.247.012 3.482.017 3.613c.01 2.522.016 5.044.02 7.565.01 3.84.041 7.68.072 11.521.007 2.455.012 4.91.016 7.364l.038 3.457c-.033 11.717-3.373 21.83-11.475 30.547-4.552 4.23-9.148 7.372-14.891 9.73l-2.387 1.055c-9.275 3.355-20.3 2.397-29.379-1.13-5.016-2.38-9.156-5.17-13.234-8.925 3.678-4.526 7.41-8.394 12-12l3.063 2.375c5.572 3.958 11.135 5.211 17.937 4.625 6.96-1.384 12.455-4.502 17-10 4.174-6.784 4.59-12.222 4.531-20.094l.012-3.473c.003-2.414-.005-4.827-.022-7.241-.02-3.68 0-7.36.026-11.04-.003-2.353-.008-4.705-.016-7.058l.025-3.312c-.098-7.996-1.732-13.21-6.681-19.47-6.786-5.458-13.105-8.211-21.914-7.792-7.327 1.188-13.278 4.7-17.777 10.601C75.472 72.012 73.86 78.07 75 85c2.191 7.547 5.019 13.948 12 18 5.848 3.061 10.892 3.523 17.438 3.688l2.794.103c2.256.082 4.512.147 6.768.209v16c-16.682.673-29.615.654-42.852-10.848-8.28-8.296-13.338-19.55-13.71-31.277.394-9.87 3.93-17.894 9.562-25.875l1.688-2.563C84.698 35.563 110.05 34.436 128 49Z" /></svg>;

const models = [
    { value: "scira-default", label: "Grok 3.0 Mini", icon: XAIIcon, iconClass: "text-current", description: "xAI's most efficient reasoning model", color: "black", vision: false, reasoning: true, experimental: false, category: "Stable", pdf: false },
    { value: "scira-grok-3", label: "Grok 3.0", icon: XAIIcon, iconClass: "text-current", description: "xAI's most intelligent model", color: "gray", vision: false, reasoning: false, experimental: false, category: "Stable", pdf: false },
    { value: "scira-vision", label: "Grok 2.0 Vision", icon: XAIIcon, iconClass: "text-current", description: "xAI's advanced vision model", color: "indigo", vision: true, reasoning: false, experimental: false, category: "Stable", pdf: false },
    { value: "scira-anthropic", label: "Claude 4 Sonnet", icon: AnthropicIcon, iconClass: "text-current", description: "Anthropic's most advanced model", color: "violet", vision: true, reasoning: false, experimental: false, category: "Stable", pdf: true },
    { value: "scira-anthropic-thinking", label: "Claude 4 Sonnet Thinking", icon: AnthropicIcon, iconClass: "text-current", description: "Anthropic's most advanced reasoning model", color: "violet", vision: true, reasoning: true, experimental: false, category: "Stable", pdf: true },
    { value: "scira-google", label: "Gemini 2.5 Flash (Thinking)", icon: GeminiIcon, iconClass: "text-current", description: "Google's advanced small reasoning model", color: "gemini", vision: true, reasoning: true, experimental: false, category: "Stable", pdf: true },
    { value: "scira-google-pro", label: "Gemini 2.5 Pro (Preview)", icon: GeminiIcon, iconClass: "text-current", description: "Google's advanced reasoning model", color: "gemini", vision: true, reasoning: true, experimental: false, category: "Stable", pdf: true },
    { value: "scira-4o", label: "GPT 4o", icon: OpenAIIcon, iconClass: "text-current", description: "OpenAI's flagship model", color: "blue", vision: true, reasoning: false, experimental: false, category: "Stable", pdf: true },
    { value: "scira-o4-mini", label: "o4 mini", icon: OpenAIIcon, iconClass: "text-current", description: "OpenAI's faster mini reasoning model", color: "blue", vision: true, reasoning: true, experimental: false, category: "Stable", pdf: false },
    { value: "scira-llama-4", label: "Llama 4 Maverick", icon: GroqIcon, iconClass: "text-current", description: "Meta's latest model", color: "blue", vision: true, reasoning: false, experimental: true, category: "Experimental", pdf: false },
    { value: "scira-qwq", label: "QWQ 32B", icon: QwenIcon, iconClass: "text-current", description: "Alibaba's advanced reasoning model", color: "purple", vision: false, reasoning: true, experimental: true, category: "Experimental", pdf: false },
];

const getColorClasses = (color: string, isSelected: boolean = false) => {
    const baseClasses = "transition-colors duration-200";
    const selectedClasses = isSelected ? "bg-opacity-100! dark:bg-opacity-100!" : "";

    switch (color) {
        case 'black':
            return isSelected
                ? `${baseClasses} ${selectedClasses} bg-[#0F0F0F]! dark:bg-[#0F0F0F]! text-white! hover:bg-[#0F0F0F]! dark:hover:bg-[#0F0F0F]! border-[#0F0F0F]! dark:border-[#0F0F0F]!`
                : `${baseClasses} text-[#0F0F0F]! dark:text-[#E5E5E5]! hover:bg-[#0F0F0F]! hover:text-white! dark:hover:bg-[#0F0F0F]! dark:hover:text-white!`;
        case 'gray':
            return isSelected
                ? `${baseClasses} ${selectedClasses} bg-[#4E4E4E]! dark:bg-[#4E4E4E]! text-white! hover:bg-[#3D3D3D]! dark:hover:bg-[#3D3D3D]! border-[#4E4E4E]! dark:border-[#4E4E4E]!`
                : `${baseClasses} text-[#4E4E4E]! dark:text-[#E5E5E5]! hover:bg-[#4E4E4E]! hover:text-white! dark:hover:bg-[#4E4E4E]! dark:hover:text-white!`;
        case 'indigo':
            return isSelected
                ? `${baseClasses} ${selectedClasses} bg-[#4F46E5]! dark:bg-[#4F46E5]! text-white! hover:bg-[#4338CA]! dark:hover:bg-[#4338CA]! border-[#4F46E5]! dark:border-[#4F46E5]!`
                : `${baseClasses} text-[#4F46E5]! dark:text-[#6366F1]! hover:bg-[#4F46E5]! hover:text-white! dark:hover:bg-[#4F46E5]! dark:hover:text-white!`;
        case 'violet':
            return isSelected
                ? `${baseClasses} ${selectedClasses} bg-[#8B5CF6]! dark:bg-[#8B5CF6]! text-white! hover:bg-[#7C3AED]! dark:hover:bg-[#7C3AED]! border-[#8B5CF6]! dark:border-[#8B5CF6]!`
                : `${baseClasses} text-[#8B5CF6]! dark:text-[#A78BFA]! hover:bg-[#8B5CF6]! hover:text-white! dark:hover:bg-[#8B5CF6]! dark:hover:text-white!`;
        case 'purple':
            return isSelected
                ? `${baseClasses} ${selectedClasses} bg-[#5E5ADB]! dark:bg-[#5E5ADB]! text-white! hover:bg-[#4D49C9]! dark:hover:bg-[#4D49C9]! border-[#5E5ADB]! dark:border-[#5E5ADB]!`
                : `${baseClasses} text-[#5E5ADB]! dark:text-[#5E5ADB]! hover:bg-[#5E5ADB]! hover:text-white! dark:hover:bg-[#5E5ADB]! dark:hover:text-white!`;
        case 'alpha':
            return isSelected
                ? `${baseClasses} ${selectedClasses} bg-linear-to-r! from-[#0b3d91]! to-[#d01012]! dark:bg-linear-to-r! dark:from-[#0b3d91]! dark:to-[#d01012]! text-white! hover:opacity-90! border-[#0b3d91]! dark:border-[#0b3d91]!`
                : `${baseClasses} text-[#d01012]! dark:text-[#3f83f8]! hover:bg-linear-to-r! hover:from-[#0b3d91]! hover:to-[#d01012]! hover:text-white! dark:hover:text-white!`;
        case 'blue':
            return isSelected
                ? `${baseClasses} ${selectedClasses} bg-[#1C7DFF]! dark:bg-[#1C7DFF]! text-white! hover:bg-[#0A6AE9]! dark:hover:bg-[#0A6AE9]! border-[#1C7DFF]! dark:border-[#1C7DFF]!`
                : `${baseClasses} text-[#1C7DFF]! dark:text-[#4C96FF]! hover:bg-[#1C7DFF]! hover:text-white! dark:hover:bg-[#1C7DFF]! dark:hover:text-white!`;
        case 'gemini':
            return isSelected
                ? `${baseClasses} ${selectedClasses} bg-[#1EA896]! dark:bg-[#1EA896]! text-white! hover:bg-[#19967F]! dark:hover:bg-[#19967F]! border-[#1EA896]! dark:border-[#1EA896]!`
                : `${baseClasses} text-[#1EA896]! dark:text-[#34C0AE]! hover:bg-[#1EA896]! hover:text-white! dark:hover:bg-[#1EA896]! dark:hover:text-white!`;
        case 'vercel-gray':
            return isSelected
                ? `${baseClasses} ${selectedClasses} bg-[#27272A]! dark:bg-[#27272A]! text-white! hover:bg-[#18181B]! dark:hover:bg-[#18181B]! border-[#27272A]! dark:border-[#27272A]!`
                : `${baseClasses} text-[#27272A]! dark:text-[#A1A1AA]! hover:bg-[#27272A]! hover:text-white! dark:hover:bg-[#27272A]! dark:hover:text-white!`;
        default:
            return isSelected
                ? `${baseClasses} ${selectedClasses} bg-neutral-500! dark:bg-neutral-700! text-white! hover:bg-neutral-600! dark:hover:bg-neutral-800! border-neutral-500! dark:border-neutral-700!`
                : `${baseClasses} text-neutral-600! dark:text-neutral-300! hover:bg-neutral-500! hover:text-white! dark:hover:bg-neutral-700! dark:hover:text-white!`;
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

    // Filter models based on attachments first
    // Always show experimental models by removing the experimental filter
    const filteredModels = hasAttachments
        ? models.filter(model => model.vision)
        : models;

    // Group filtered models by category
    const groupedModels = filteredModels.reduce((acc, model) => {
        const category = model.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(model);
        return acc;
    }, {} as Record<string, typeof models>);

    // Get hover color classes based on model color
    const getHoverColorClasses = (modelColor: string) => {
        switch (modelColor) {
            case 'black': return 'hover:bg-black/20! dark:hover:bg-black/20!';
            case 'gray': return 'hover:bg-gray-500/20! dark:hover:bg-gray-400/20!';
            case 'indigo': return 'hover:bg-indigo-500/20! dark:hover:bg-indigo-400/20!';
            case 'violet': return 'hover:bg-violet-500/20! dark:hover:bg-violet-400/20!';
            case 'purple': return 'hover:bg-purple-500/20! dark:hover:bg-purple-400/20!';
            case 'gemini': return 'hover:bg-teal-500/20! dark:hover:bg-teal-400/20!';
            case 'blue': return 'hover:bg-blue-500/20! dark:hover:bg-blue-400/20!';
            case 'vercel-gray': return 'hover:bg-zinc-500/20! dark:hover:bg-zinc-400/20!';
            default: return 'hover:bg-neutral-500/20! dark:hover:bg-neutral-400/20!';
        }
    };

    // Update getCapabilityColors to handle PDF capability
    const getCapabilityColors = (capability: string) => {
        if (capability === 'reasoning') {
            return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700";
        } else if (capability === 'vision') {
            return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700";
        } else if (capability === 'pdf') {
            return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800/50";
        }
        return "";
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
                    "rounded-full transition-all duration-200",
                    "border border-neutral-200 dark:border-neutral-800",
                    "hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700",
                    getColorClasses(selectedModelData?.color || "neutral", true),
                    isProcessing && "opacity-50 pointer-events-none",
                    "ring-0 outline-hidden",
                    "group",
                    className
                )}
                disabled={isProcessing}
            >
                <div className="relative flex items-center gap-2">
                    {selectedModelData && (
                        typeof selectedModelData.icon === 'string' ? (
                            <img
                                src={selectedModelData.icon}
                                alt={selectedModelData.label}
                                className={cn(
                                    "w-3.5 h-3.5 object-contain transition-all duration-300",
                                    "group-hover:scale-110 group-hover:rotate-6",
                                    selectedModelData.iconClass
                                )}
                            />
                        ) : (
                            <selectedModelData.icon
                                className={cn(
                                    "w-3.5 h-3.5 transition-all duration-300",
                                    "group-hover:scale-110 group-hover:rotate-6",
                                    selectedModelData.iconClass
                                )}
                            />
                        )
                    )}
                    <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium overflow-hidden">
                        <motion.div
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
                            className="whitespace-nowrap"
                        >
                            {selectedModelData?.label || ""}
                        </motion.div>
                        <motion.div
                            animate={{
                                rotate: isOpen ? 180 : 0
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30
                            }}
                            className="opacity-60"
                        >
                            <svg
                                width="8"
                                height="5"
                                viewBox="0 0 9 6"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M1 1L4.5 4.5L8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </motion.div>
                    </span>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-[260px]! p-1! font-sans! rounded-lg bg-white dark:bg-neutral-900 mt-2! z-52! shadow-lg border border-neutral-200 dark:border-neutral-800 max-h-[300px]! overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent"
                align="start"
                side="bottom"
                avoidCollisions={['submitted', 'streaming', 'ready', 'error'].includes(status)}
                sideOffset={6}
                forceMount
            >
                {Object.entries(groupedModels).map(([category, categoryModels], categoryIndex) => (
                    <div key={category} className={cn("pt-0.5 pb-0.5", categoryIndex > 0 ? "mt-0.5 border-t border-neutral-200 dark:border-neutral-800" : "")}>
                        <div className="px-1.5 py-0.5 text-xs! sm:text-[9px] font-medium text-neutral-500 dark:text-neutral-400">
                            {category} Models
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
                                        "flex items-center gap-2 px-1.5 py-1.5 rounded-md text-xs",
                                        "transition-all duration-200",
                                        "group/item",
                                        selectedModel === model.value
                                            ? getColorClasses(model.color, true)
                                            : getHoverColorClasses(model.color)
                                    )}
                                >
                                    <div className={cn(
                                        "flex items-center justify-center size-7 rounded-md",
                                        "transition-all duration-300",
                                        "group-hover/item:scale-110 group-hover/item:rotate-6",
                                        selectedModel === model.value
                                            ? "bg-white/20 dark:bg-white/10"
                                            : "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                                    )}>
                                        {typeof model.icon === 'string' ? (
                                            <img
                                                src={model.icon}
                                                alt={model.label}
                                                className={cn(
                                                    "w-4 h-4 object-contain",
                                                    "transition-all duration-300",
                                                    "group-hover/item:scale-110 group-hover/item:rotate-12",
                                                    model.iconClass,
                                                    model.value === "scira-optimus" && "invert"
                                                )}
                                            />
                                        ) : (
                                            <model.icon
                                                className={cn(
                                                    "size-4",
                                                    "transition-all duration-300",
                                                    "group-hover/item:scale-110 group-hover/item:rotate-12",
                                                    model.iconClass
                                                )}
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-0 min-w-0 flex-1">
                                        <div className="font-medium truncate text-[11px] flex items-center">
                                            {model.label}
                                        </div>
                                        <div className="text-[9px] opacity-70 truncate leading-tight">
                                            {model.description}
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            {(model.vision || model.reasoning || model.pdf) && (
                                                <div className="flex gap-1">
                                                    {model.vision && (
                                                        <div className={cn(
                                                            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium",
                                                            getCapabilityColors("vision")
                                                        )}>
                                                            <EyeIcon className="size-2.5" />
                                                            <span>Vision</span>
                                                        </div>
                                                    )}
                                                    {model.reasoning && (
                                                        <div className={cn(
                                                            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium",
                                                            getCapabilityColors("reasoning")
                                                        )}>
                                                            <BrainCircuit className="size-2.5" />
                                                            <span>Reasoning</span>
                                                        </div>
                                                    )}
                                                    {model.pdf && (
                                                        <div className={cn(
                                                            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium",
                                                            getCapabilityColors("pdf")
                                                        )}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="size-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                            </svg>
                                                            <span>PDF</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </div>
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

// Add this helper function near the top with other utility functions
const supportsPdfAttachments = (modelValue: string): boolean => {
    const selectedModel = models.find(model => model.value === modelValue);
    return selectedModel?.pdf === true;
};

// Update the hasVisionSupport function to check for PDF support
const hasVisionSupport = (modelValue: string): boolean => {
    const selectedModel = models.find(model => model.value === modelValue);
    return selectedModel?.vision === true;
};

// Update the getAcceptFileTypes function to use pdf property
const getAcceptFileTypes = (modelValue: string): string => {
    const selectedModel = models.find(model => model.value === modelValue);
    if (selectedModel?.pdf) {
        return "image/*,.pdf";
    }
    return "image/*";
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
        else return (bytes / 1048576).toFixed(1) + ' MB' +
            (bytes > MAX_FILE_SIZE ? ' (exceeds 5MB limit)' : '');
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
                "relative flex items-center",
                "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xs",
                "border border-neutral-200/80 dark:border-neutral-700/80",
                "rounded-2xl p-2 pr-8 gap-2.5",
                "shadow-xs hover:shadow-md",
                "shrink-0 z-0",
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
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 shrink-0 ring-1 ring-neutral-200/50 dark:ring-neutral-700/50 flex items-center justify-center">
                    {isPdf(attachment) ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 dark:text-red-400">
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
                    "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xs",
                    "border border-neutral-200/80 dark:border-neutral-700/80",
                    "shadow-xs hover:shadow-md",
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
    chatId: string;
    user: User | null;
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
            case 'gemini':
                return 'bg-[#1EA896] dark:bg-[#1EA896] border-[#1EA896] dark:border-[#1EA896]';
            case 'blue':
                return 'bg-[#1C7DFF] dark:bg-[#1C7DFF] border-[#1C7DFF] dark:border-[#1C7DFF]';
            case 'vercel-gray':
                return 'bg-[#27272A] dark:bg-[#27272A] border-[#27272A] dark:border-[#27272A]';
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
                        "w-[97%] max-w-2xl overflow-hidden mx-auto z-0",
                        "text-sm text-neutral-700 dark:text-neutral-300 -mb-[0.499px]"
                    )}
                >
                    <div className={cn(
                        "flex items-center gap-2 p-2 py-1 sm:p-2.5 sm:py-2 rounded-t-lg border border-b-0 shadow-xs backdrop-blur-xs",
                        bgColorClass,
                        useModelColor ? "text-white" : "text-neutral-900 dark:text-neutral-100"
                    )}>
                        {icon && (
                            <span className={cn(
                                "shrink-0 size-3.5 sm:size-4",
                                useModelColor ? getIconColorClass() : "text-primary",
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

    // Use regular button for mobile without tooltip
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

    // With tooltip for desktop
    return (
        <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClick}
                    className={commonClassNames}
                >
                    <Icon className="size-4" />
                </motion.button>
            </TooltipTrigger>
            <TooltipContent
                side="bottom"
                sideOffset={6}
                className=" border-0 shadow-lg backdrop-blur-xs py-2 px-3 max-w-[200px]"
            >
                <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-[11px]">{group.name}</span>
                    <span className="text-[10px] text-neutral-300 dark:text-neutral-600 leading-tight">{group.description}</span>
                </div>
            </TooltipContent>
        </Tooltip>
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
    const { data: session } = useSession();

    // Notify parent component when expansion state changes
    useEffect(() => {
        if (onExpandChange) {
            // Only notify about expansion on mobile devices
            onExpandChange(isMobile ? isExpanded : false);
        }
    }, [isExpanded, onExpandChange, isMobile]);

    // If user is not authenticated and selectedGroup is memory, switch to web
    useEffect(() => {
        if (!session && (selectedGroup === 'memory')) {
            // Find a group object with id 'web'
            const webGroup = searchGroups.find(group => group.id === 'web');
            if (webGroup) {
                onGroupSelect(webGroup);
            }
        }
    }, [session, selectedGroup, onGroupSelect]);

    // Filter groups based on authentication status
    const visibleGroups = searchGroups.filter(group => {
        // Only show groups that are marked as visible
        if (!group.show) return false;

        // If the group requires authentication and user is not authenticated, hide it
        if ('requireAuth' in group && group.requireAuth && !session) return false;

        return true;
    });

    return (
        <motion.div
            layout={false}
            initial={false}
            animate={{
                width: isExpanded && !isProcessing ? "auto" : "30px",
                gap: isExpanded && !isProcessing ? "0.5rem" : 0,
                paddingRight: isExpanded && !isProcessing ? "0.4rem" : 0,
            }}
            transition={{
                duration: 0.2,
                ease: "easeInOut",
            }}
            className={cn(
                "inline-flex items-center min-w-[38px] p-0.5",
                "rounded-full border border-neutral-200 dark:border-neutral-800",
                "bg-white dark:bg-neutral-900 shadow-xs overflow-visible",
                "relative z-10",
                isProcessing && "opacity-50 pointer-events-none"
            )}
            onMouseEnter={() => !isProcessing && setIsExpanded(true)}
            onMouseLeave={() => !isProcessing && setIsExpanded(false)}
        >
            <TooltipProvider>
                <AnimatePresence initial={false}>
                    {visibleGroups.map((group, index, filteredGroups) => {
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
                                    "m-0!",
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
            </TooltipProvider>
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
    chatId,
    user,
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
    const isCompositionActive = useRef(false)
    const { width } = useWindowSize();
    const postSubmitFileInputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [isGroupSelectorExpanded, setIsGroupSelectorExpanded] = useState(false);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setSelectedGroup, inputRef]);

    // Update uploadFile function to add more error details
    const uploadFile = async (file: File): Promise<Attachment> => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            console.log("Uploading file:", file.name, file.type, file.size);
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Upload successful:", data);
                return data;
            } else {
                const errorText = await response.text();
                console.error("Upload failed with status:", response.status, errorText);
                throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            toast.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    };

    // Fix handleFileChange to ensure it properly processes files
    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) {
            console.log("No files selected in file input");
            return;
        }

        console.log("Files selected:", files.map(f => `${f.name} (${f.type})`));

        // First, separate images and PDFs
        const imageFiles: File[] = [];
        const pdfFiles: File[] = [];
        const unsupportedFiles: File[] = [];
        const oversizedFiles: File[] = [];

        files.forEach(file => {
            // Check file size first
            if (file.size > MAX_FILE_SIZE) {
                oversizedFiles.push(file);
                return;
            }

            // Then check file type
            if (file.type.startsWith('image/')) {
                imageFiles.push(file);
            } else if (file.type === 'application/pdf') {
                pdfFiles.push(file);
            } else {
                unsupportedFiles.push(file);
            }
        });

        if (unsupportedFiles.length > 0) {
            console.log("Unsupported files:", unsupportedFiles.map(f => `${f.name} (${f.type})`));
            toast.error(`Some files are not supported: ${unsupportedFiles.map(f => f.name).join(', ')}`);
        }

        if (imageFiles.length === 0 && pdfFiles.length === 0) {
            console.log("No supported files found");
            event.target.value = '';
            return;
        }

        // Auto-switch to PDF-compatible model if PDFs are present
        const currentModelData = models.find(m => m.value === selectedModel);
        if (pdfFiles.length > 0 && (!currentModelData || !currentModelData.pdf)) {
            console.log("PDFs detected, switching to compatible model");

            // Find first compatible model that supports PDFs and vision
            const compatibleModel = models.find(m => m.pdf && m.vision);

            if (compatibleModel) {
                console.log("Switching to compatible model:", compatibleModel.value);
                setSelectedModel(compatibleModel.value);
                showSwitchNotification(
                    compatibleModel.label,
                    'Switched to a model that supports PDF documents',
                    typeof compatibleModel.icon === 'string' ?
                        <img src={compatibleModel.icon} alt={compatibleModel.label} className="size-4 object-contain" /> :
                        <compatibleModel.icon className="size-4" />,
                    compatibleModel.color,
                    'model'
                );
            } else {
                console.warn("No PDF-compatible model found");
                toast.error("PDFs are only supported by Gemini and Claude models");
                // Continue with only image files
                if (imageFiles.length === 0) {
                    event.target.value = '';
                    return;
                }
            }
        }

        // Combine valid files
        let validFiles: File[] = [...imageFiles];
        if (supportsPdfAttachments(selectedModel) || pdfFiles.length > 0) {
            validFiles = [...validFiles, ...pdfFiles];
        }

        console.log("Valid files for upload:", validFiles.map(f => f.name));

        const totalAttachments = attachments.length + validFiles.length;
        if (totalAttachments > MAX_FILES) {
            toast.error(`You can only attach up to ${MAX_FILES} files.`);
            event.target.value = '';
            return;
        }

        if (validFiles.length === 0) {
            console.error("No valid files to upload");
            event.target.value = '';
            return;
        }

        // Check image moderation before uploading
        if (imageFiles.length > 0) {
            try {
                console.log("Checking image moderation for", imageFiles.length, "images");
                toast.info("Checking images for safety...");

                // Convert images to data URLs for moderation
                const imageDataURLs = await Promise.all(
                    imageFiles.map(file => fileToDataURL(file))
                );

                // Check moderation
                const moderationResult = await checkImageModeration(imageDataURLs);
                console.log("Moderation result:", moderationResult);

                if (moderationResult !== 'safe') {
                    const [status, category] = moderationResult.split('\n');
                    if (status === 'unsafe') {
                        console.warn("Unsafe image detected, category:", category);
                        toast.error(`Image content violates safety guidelines (${category}). Please choose different images.`);
                        event.target.value = '';
                        return;
                    }
                }

                console.log("Images passed moderation check");
            } catch (error) {
                console.error("Error during image moderation:", error);
                toast.error("Unable to verify image safety. Please try again.");
                event.target.value = '';
                return;
            }
        }

        setUploadQueue(validFiles.map((file) => file.name));

        try {
            console.log("Starting upload of", validFiles.length, "files");

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

            console.log("Upload completed for", uploadedAttachments.length, "files");

            if (uploadedAttachments.length > 0) {
                setAttachments(currentAttachments => [
                    ...currentAttachments,
                    ...uploadedAttachments,
                ]);

                toast.success(`${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''} uploaded successfully`);
            } else {
                toast.error("No files were successfully uploaded");
            }
        } catch (error) {
            console.error("Error uploading files!", error);
            toast.error("Failed to upload one or more files. Please try again.");
        } finally {
            setUploadQueue([]);
            event.target.value = '';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attachments, setAttachments, selectedModel, setSelectedModel]);

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Only check if we've reached the attachment limit
        if (attachments.length >= MAX_FILES) return;

        // Always show drag UI when files are dragged over
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            // Check if at least one item is a file
            const hasFile = Array.from(e.dataTransfer.items).some(item => item.kind === "file");
            if (hasFile) {
                setIsDragging(true);
            }
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

    // Fix the handleDrop function specifically to ensure uploads happen
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        // Log raw files first
        const allFiles = Array.from(e.dataTransfer.files);
        console.log("Raw files dropped:", allFiles.map(f => `${f.name} (${f.type})`));

        if (allFiles.length === 0) {
            toast.error("No files detected in drop");
            return;
        }

        // Simple verification to ensure we're actually getting Files from the drop
        toast.info(`Detected ${allFiles.length} dropped files`);

        // First, separate images and PDFs
        const imageFiles: File[] = [];
        const pdfFiles: File[] = [];
        const unsupportedFiles: File[] = [];
        const oversizedFiles: File[] = [];

        allFiles.forEach(file => {
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
                pdfFiles.push(file);
            } else {
                unsupportedFiles.push(file);
            }
        });

        console.log(`Images: ${imageFiles.length}, PDFs: ${pdfFiles.length}, Unsupported: ${unsupportedFiles.length}, Oversized: ${oversizedFiles.length}`);

        if (unsupportedFiles.length > 0) {
            console.log("Unsupported files:", unsupportedFiles.map(f => `${f.name} (${f.type})`));
            toast.error(`Some files not supported: ${unsupportedFiles.map(f => f.name).join(', ')}`);
        }

        if (oversizedFiles.length > 0) {
            console.log("Oversized files:", oversizedFiles.map(f => `${f.name} (${f.size} bytes)`));
            toast.error(`Some files exceed the 5MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
        }

        // Check if we have any supported files
        if (imageFiles.length === 0 && pdfFiles.length === 0) {
            toast.error("Only image and PDF files are supported");
            return;
        }

        // Auto-switch to PDF-compatible model if PDFs are present
        const currentModelData = models.find(m => m.value === selectedModel);
        if (pdfFiles.length > 0 && (!currentModelData || !currentModelData.pdf)) {
            console.log("PDFs detected, switching to compatible model");

            // Find first compatible model that supports PDFs
            const compatibleModel = models.find(m => m.pdf && m.vision);

            if (compatibleModel) {
                console.log("Switching to compatible model:", compatibleModel.value);
                setSelectedModel(compatibleModel.value);
                toast.info(`Switching to ${compatibleModel.label} to support PDF files`);
                showSwitchNotification(
                    compatibleModel.label,
                    'Switched to a model that supports PDF documents',
                    typeof compatibleModel.icon === 'string' ?
                        <img src={compatibleModel.icon} alt={compatibleModel.label} className="size-4 object-contain" /> :
                        <compatibleModel.icon className="size-4" />,
                    compatibleModel.color,
                    'model'
                );
            } else {
                console.warn("No PDF-compatible model found");
                toast.error("PDFs are only supported by Gemini and Claude models");
                // Continue with only image files
                if (imageFiles.length === 0) return;
            }
        }

        // Combine valid files
        let validFiles: File[] = [...imageFiles];
        if (supportsPdfAttachments(selectedModel) || pdfFiles.length > 0) {
            validFiles = [...validFiles, ...pdfFiles];
        }

        console.log("Files to upload:", validFiles.map(f => `${f.name} (${f.type})`));

        // Check total attachment count
        const totalAttachments = attachments.length + validFiles.length;
        if (totalAttachments > MAX_FILES) {
            toast.error(`You can only attach up to ${MAX_FILES} files.`);
            return;
        }

        if (validFiles.length === 0) {
            console.error("No valid files to upload after filtering");
            toast.error("No valid files to upload");
            return;
        }

        // Check image moderation before proceeding
        if (imageFiles.length > 0) {
            try {
                console.log("Checking image moderation for", imageFiles.length, "images");
                toast.info("Checking images for safety...");

                // Convert images to data URLs for moderation
                const imageDataURLs = await Promise.all(
                    imageFiles.map(file => fileToDataURL(file))
                );

                // Check moderation
                const moderationResult = await checkImageModeration(imageDataURLs);
                console.log("Moderation result:", moderationResult);

                if (moderationResult !== 'safe') {
                    const [status, category] = moderationResult.split('\n');
                    if (status === 'unsafe') {
                        console.warn("Unsafe image detected, category:", category);
                        toast.error(`Image content violates safety guidelines (${category}). Please choose different images.`);
                        return;
                    }
                }

                console.log("Images passed moderation check");
            } catch (error) {
                console.error("Error during image moderation:", error);
                toast.error("Unable to verify image safety. Please try again.");
                return;
            }
        }

        // Switch to vision model if current model doesn't support vision
        if (!currentModelData?.vision) {
            // Find the appropriate vision model based on file types
            let visionModel: string;

            // If we have PDFs, prioritize a PDF-compatible model
            if (pdfFiles.length > 0) {
                const pdfCompatibleModel = models.find(m => m.vision && m.pdf);
                if (pdfCompatibleModel) {
                    visionModel = pdfCompatibleModel.value;
                } else {
                    visionModel = getFirstVisionModel();
                }
            } else {
                visionModel = getFirstVisionModel();
            }

            console.log("Switching to vision model:", visionModel);
            setSelectedModel(visionModel);

            const modelData = models.find(m => m.value === visionModel);
            if (modelData) {
                showSwitchNotification(
                    modelData.label,
                    `Vision model enabled - you can now attach images${modelData.pdf ? ' and PDFs' : ''}`,
                    typeof modelData.icon === 'string' ?
                        <img src={modelData.icon} alt={modelData.label} className="size-4 object-contain" /> :
                        <modelData.icon className="size-4" />,
                    modelData.color,
                    'model'  // Explicitly mark as model notification
                );
            }
        }

        // Set upload queue immediately
        setUploadQueue(validFiles.map((file) => file.name));
        toast.info(`Starting upload of ${validFiles.length} files...`);

        // Forced timeout to ensure state updates before upload starts
        setTimeout(async () => {
            try {
                console.log("Beginning upload of", validFiles.length, "files");

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

                console.log("Upload completed for", uploadedAttachments.length, "files");

                if (uploadedAttachments.length > 0) {
                    setAttachments(currentAttachments => [
                        ...currentAttachments,
                        ...uploadedAttachments,
                    ]);

                    toast.success(`${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''} uploaded successfully`);
                } else {
                    toast.error("No files were successfully uploaded");
                }
            } catch (error) {
                console.error("Error during file upload:", error);
                toast.error("Upload failed. Please check console for details.");
            } finally {
                setUploadQueue([]);
            }
        }, 100);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attachments.length, setAttachments, uploadFile, selectedModel, setSelectedModel, getFirstVisionModel]);

    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const items = Array.from(e.clipboardData.items);
        const imageItems = items.filter(item => item.type.startsWith('image/'));
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
        const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[];
        const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);

        if (oversizedFiles.length > 0) {
            console.log("Oversized files:", oversizedFiles.map(f => `${f.name} (${f.size} bytes)`));
            toast.error(`Some files exceed the 5MB limit: ${oversizedFiles.map(f => f.name || 'unnamed').join(', ')}`);

            // Filter out oversized files
            const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE);
            if (validFiles.length === 0) return;
        }

        // Switch to vision model if needed
        const currentModel = models.find(m => m.value === selectedModel);
        if (!currentModel?.vision) {
            const visionModel = getFirstVisionModel();
            setSelectedModel(visionModel);

            const modelData = models.find(m => m.value === visionModel);
            if (modelData) {
                const supportsPdfs = supportsPdfAttachments(visionModel);
                showSwitchNotification(
                    modelData.label,
                    `Vision model enabled - you can now attach images${supportsPdfs ? ' and PDFs' : ''}`,
                    typeof modelData.icon === 'string' ?
                        <img src={modelData.icon} alt={modelData.label} className="size-4 object-contain" /> :
                        <modelData.icon className="size-4" />,
                    modelData.color,
                    'model'  // Explicitly mark as model notification
                );
            }
        }

        // Use filtered files if we found oversized ones
        const filesToUpload = oversizedFiles.length > 0
            ? files.filter(file => file.size <= MAX_FILE_SIZE)
            : files;

        // Check image moderation before uploading
        if (filesToUpload.length > 0) {
            try {
                console.log("Checking image moderation for", filesToUpload.length, "pasted images");
                toast.info("Checking pasted images for safety...");

                // Convert images to data URLs for moderation
                const imageDataURLs = await Promise.all(
                    filesToUpload.map(file => fileToDataURL(file))
                );

                // Check moderation
                const moderationResult = await checkImageModeration(imageDataURLs);
                console.log("Moderation result:", moderationResult);

                if (moderationResult !== 'safe') {
                    const [status, category] = moderationResult.split('\n');
                    if (status === 'unsafe') {
                        console.warn("Unsafe pasted image detected, category:", category);
                        toast.error(`Pasted image content violates safety guidelines (${category}). Please choose different images.`);
                        return;
                    }
                }

                console.log("Pasted images passed moderation check");
            } catch (error) {
                console.error("Error during pasted image moderation:", error);
                toast.error("Unable to verify pasted image safety. Please try again.");
                return;
            }
        }

        setUploadQueue(filesToUpload.map((file, i) => file.name || `Pasted Image ${i + 1}`));

        try {
            const uploadPromises = filesToUpload.map(file => uploadFile(file));
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            toast.error("Please enter a search query or attach an image.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [input, attachments, handleSubmit, setAttachments, fileInputRef, lastSubmittedQueryRef, status, selectedModel, setHasSubmitted]);

    const submitForm = useCallback(() => {
        onSubmit({ preventDefault: () => { }, stopPropagation: () => { } } as React.FormEvent<HTMLFormElement>);
        resetSuggestedQuestions();

        if (width && width > 768) {
            inputRef.current?.focus();
        }
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

    // Auto-resize function for textarea
    const resizeTextarea = useCallback(() => {
        if (!inputRef.current) return;
        
        const target = inputRef.current;
        
        // Reset height to auto first to get the actual scroll height
        target.style.height = 'auto';
        
        const scrollHeight = target.scrollHeight;
        const maxHeight = width && width < 768 ? 200 : 300;
        
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
        <div className={cn(
            "flex flex-col w-full"
        )}>
            <TooltipProvider>
                <div
                    className={cn(
                        "relative w-full flex flex-col gap-1 rounded-lg transition-all duration-300 font-sans!",
                        hasInteracted ? "z-51" : "",
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
                        accept={getAcceptFileTypes(selectedModel)}
                        tabIndex={-1}
                    />
                    <input
                        type="file"
                        className="hidden"
                        ref={postSubmitFileInputRef}
                        multiple
                        onChange={handleFileChange}
                        accept={getAcceptFileTypes(selectedModel)}
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

                        <div className="rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200! dark:border-neutral-700! focus-within:border-neutral-300! dark:focus-within:border-neutral-500! transition-colors duration-200">
                            <Textarea
                                ref={inputRef}
                                placeholder={hasInteracted ? "Ask a new question..." : "Ask a question..."}
                                value={input}
                                onChange={handleInput}
                                disabled={isProcessing}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                onInput={(e) => {
                                    // Auto-resize textarea based on content
                                    const target = e.target as HTMLTextAreaElement;
                                    
                                    // Reset height to auto first to get the actual scroll height
                                    target.style.height = 'auto';
                                    
                                    const scrollHeight = target.scrollHeight;
                                    const maxHeight = width && width < 768 ? 200 : 300; // Increased max height for desktop
                                    
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
                                    "w-full rounded-lg rounded-b-none md:text-base!",
                                    "text-base leading-relaxed",
                                    "bg-neutral-100 dark:bg-neutral-900",
                                    "border-0!",
                                    "text-neutral-900 dark:text-neutral-100",
                                    "focus:ring-0! focus-visible:ring-0!",
                                    "px-4! py-4!",
                                    "touch-manipulation",
                                    "whatsize"
                                )}
                                style={{
                                    WebkitUserSelect: 'text',
                                    WebkitTouchCallout: 'none',
                                    minHeight: width && width < 768 ? '40px' : undefined,
                                    resize: 'none',
                                }}
                                rows={1}
                                autoFocus={width ? width > 768 : true}
                                onCompositionStart={() => isCompositionActive.current = true}
                                onCompositionEnd={() => isCompositionActive.current = false}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                            />

                            {/* Toolbar as a separate block - no absolute positioning */}
                            <div
                                className={cn(
                                    "flex justify-between items-center p-2 rounded-t-none rounded-b-lg",
                                    "bg-neutral-100 dark:bg-neutral-900",
                                    "border-t-0 border-neutral-200! dark:border-neutral-700!",
                                    isProcessing ? "opacity-20! cursor-not-allowed!" : ""
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex items-center gap-2",
                                        isMobile && "overflow-hidden"
                                    )}
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
                                                        ? 'Vision model enabled - you can now attach images and PDFs'
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
                                        {!isMobile ? (
                                            <Tooltip delayDuration={300}>
                                                <TooltipTrigger asChild>
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
                                                                selectedGroup === 'extreme' ? <Globe className="size-4" /> : <TelescopeIcon className="size-4" />,
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
                                                        <TelescopeIcon className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:block text-xs font-medium">Extreme</span>
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="bottom"
                                                    sideOffset={6}
                                                    className=" border-0 shadow-lg backdrop-blur-xs py-2 px-3 max-w-[200px]"
                                                >
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium text-[11px]">Extreme Mode</span>
                                                        <span className="text-[10px] text-neutral-300 dark:text-neutral-600 leading-tight">Deep research with multiple sources and analysis</span>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
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
                                                        selectedGroup === 'extreme' ? <Globe className="size-4" /> : <TelescopeIcon className="size-4" />,
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
                                                <TelescopeIcon className="h-3.5 w-3.5" />
                                                <span className="hidden sm:block text-xs font-medium">Extreme</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {hasVisionSupport(selectedModel) && !(isMobile && isGroupSelectorExpanded) && (
                                        !isMobile ? (
                                            <Tooltip delayDuration={300}>
                                                <TooltipTrigger asChild>
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
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="bottom"
                                                    sideOffset={6}
                                                    className=" border-0 shadow-lg backdrop-blur-xs py-2 px-3"
                                                >
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium text-[11px]">Attach File</span>
                                                        <span className="text-[10px] text-neutral-300 dark:text-neutral-600 leading-tight">
                                                            {supportsPdfAttachments(selectedModel)
                                                                ? "Upload an image or PDF document"
                                                                : "Upload an image"}
                                                        </span>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
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
                                        )
                                    )}

                                    {isProcessing ? (
                                        !isMobile ? (
                                            <Tooltip delayDuration={300}>
                                                <TooltipTrigger asChild>
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
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="bottom"
                                                    sideOffset={6}
                                                    className="border-0 shadow-lg backdrop-blur-xs py-2 px-3"
                                                >
                                                    <span className="font-medium text-[11px]">Stop Generation</span>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
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
                                        )
                                    ) : (
                                        !isMobile ? (
                                            <Tooltip delayDuration={300}>
                                                <TooltipTrigger asChild>
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
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="bottom"
                                                    sideOffset={6}
                                                    className="border-0 shadow-lg backdrop-blur-xs py-2 px-3"
                                                >
                                                    <span className="font-medium text-[11px]">Send Message</span>
                                                </TooltipContent>
                                            </Tooltip>
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
                                        )
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
