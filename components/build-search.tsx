'use client';

import { memo, useState, useRef, useEffect, useMemo, type SVGProps } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal,
  FileCode2,
  FolderOpen,
  File,
  Download,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Loader2,
  Globe,
  Code2,
  Folder,
  Wrench,
  Search,
  ExternalLink,
  Maximize2,
  CircleDashed,
  CircleCheck,
  ListChecks,
} from 'lucide-react';

const ClaudeAI = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} preserveAspectRatio="xMidYMid" viewBox="0 0 256 257">
    <path
      fill="#D97757"
      d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z"
    />
  </svg>
);

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MarkdownRenderer } from '@/components/markdown';
import type { DataBuildSearchPart, AgentStreamEvent } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

function inferLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rs: 'rust',
    go: 'go',
    rb: 'ruby',
    java: 'java',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    md: 'markdown',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    sql: 'sql',
    graphql: 'graphql',
    dockerfile: 'dockerfile',
    xml: 'xml',
    svg: 'xml',
  };
  return langMap[ext] || 'text';
}

export function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Check className="size-2.5" strokeWidth={2.5} /> Done
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive">
        <X className="size-2.5" strokeWidth={2.5} /> Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/8 text-primary">
      <Loader2 className="size-2.5 animate-spin" /> Running
    </span>
  );
}

export function CollapsibleCard({
  icon,
  title,
  badge,
  header,
  defaultOpen = true,
  children,
}: {
  icon?: React.ReactNode;
  title?: string;
  badge?: React.ReactNode;
  header?: (isOpen: boolean) => React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border/70 overflow-hidden my-1.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="size-3 text-muted-foreground/50 shrink-0" />
        ) : (
          <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />
        )}
        {header ? (
          header(isOpen)
        ) : (
          <>
            <span className="text-muted-foreground/70 shrink-0">{icon}</span>
            <span className="text-xs font-medium truncate flex-1 text-foreground/90">{title}</span>
            {badge}
          </>
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/60">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const NodejsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 256 292" xmlnsXlink="http://www.w3.org/1999/xlink">
    <defs>
      <linearGradient id="nodejs__a" x1="68.188%" x2="27.823%" y1="17.487%" y2="89.755%">
        <stop offset="0%" stopColor="#41873F" />
        <stop offset="32.88%" stopColor="#418B3D" />
        <stop offset="63.52%" stopColor="#419637" />
        <stop offset="93.19%" stopColor="#3FA92D" />
        <stop offset="100%" stopColor="#3FAE2A" />
      </linearGradient>
      <linearGradient id="nodejs__c" x1="43.277%" x2="159.245%" y1="55.169%" y2="-18.306%">
        <stop offset="13.76%" stopColor="#41873F" />
        <stop offset="40.32%" stopColor="#54A044" />
        <stop offset="71.36%" stopColor="#66B848" />
        <stop offset="90.81%" stopColor="#6CC04A" />
      </linearGradient>
      <linearGradient id="nodejs__f" x1="-4.389%" x2="101.499%" y1="49.997%" y2="49.997%">
        <stop offset="9.192%" stopColor="#6CC04A" />
        <stop offset="28.64%" stopColor="#66B848" />
        <stop offset="59.68%" stopColor="#54A044" />
        <stop offset="86.24%" stopColor="#41873F" />
      </linearGradient>
      <path
        id="nodejs__b"
        d="M134.923 1.832c-4.344-2.443-9.502-2.443-13.846 0L6.787 67.801C2.443 70.244 0 74.859 0 79.745v132.208c0 4.887 2.715 9.502 6.787 11.945l114.29 65.968c4.344 2.444 9.502 2.444 13.846 0l114.29-65.968c4.344-2.443 6.787-7.058 6.787-11.945V79.745c0-4.886-2.715-9.501-6.787-11.944L134.923 1.832Z"
      />
      <path
        id="nodejs__e"
        d="M134.923 1.832c-4.344-2.443-9.502-2.443-13.846 0L6.787 67.801C2.443 70.244 0 74.859 0 79.745v132.208c0 4.887 2.715 9.502 6.787 11.945l114.29 65.968c4.344 2.444 9.502 2.444 13.846 0l114.29-65.968c4.344-2.443 6.787-7.058 6.787-11.945V79.745c0-4.886-2.715-9.501-6.787-11.944L134.923 1.832Z"
      />
    </defs>
    <path
      fill="url(#nodejs__a)"
      d="M134.923 1.832c-4.344-2.443-9.502-2.443-13.846 0L6.787 67.801C2.443 70.244 0 74.859 0 79.745v132.208c0 4.887 2.715 9.502 6.787 11.945l114.29 65.968c4.344 2.444 9.502 2.444 13.846 0l114.29-65.968c4.344-2.443 6.787-7.058 6.787-11.945V79.745c0-4.886-2.715-9.501-6.787-11.944L134.923 1.832Z"
    />
    <mask id="nodejs__d" fill="#fff">
      <use xlinkHref="#nodejs__b" />
    </mask>
    <path
      fill="url(#nodejs__c)"
      d="M249.485 67.8 134.65 1.833c-1.086-.542-2.443-1.085-3.529-1.357L2.443 220.912c1.086 1.357 2.444 2.443 3.8 3.258l114.834 65.968c3.258 1.9 7.059 2.443 10.588 1.357L252.47 70.515c-.815-1.086-1.9-1.9-2.986-2.714Z"
      mask="url(#nodejs__d)"
    />
    <mask id="nodejs__g" fill="#fff">
      <use xlinkHref="#nodejs__e" />
    </mask>
    <path
      fill="url(#nodejs__f)"
      d="M249.756 223.898c3.258-1.9 5.701-5.158 6.787-8.687L130.579.204c-3.258-.543-6.787-.272-9.773 1.628L6.786 67.53l122.979 224.238c1.628-.272 3.529-.815 5.158-1.63l114.833-66.239Z"
      mask="url(#nodejs__g)"
    />
  </svg>
);

const PythonIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="16 16 32 32">
    <path
      fill="url(#python__a)"
      d="M31.885 16c-8.124 0-7.617 3.523-7.617 3.523l.01 3.65h7.752v1.095H21.197S16 23.678 16 31.876c0 8.196 4.537 7.906 4.537 7.906h2.708v-3.804s-.146-4.537 4.465-4.537h7.688s4.32.07 4.32-4.175v-7.019S40.374 16 31.885 16zm-4.275 2.454a1.394 1.394 0 1 1 0 2.79 1.393 1.393 0 0 1-1.395-1.395c0-.771.624-1.395 1.395-1.395z"
    />
    <path
      fill="url(#python__b)"
      d="M32.115 47.833c8.124 0 7.617-3.523 7.617-3.523l-.01-3.65H31.97v-1.095h10.832S48 40.155 48 31.958c0-8.197-4.537-7.906-4.537-7.906h-2.708v3.803s.146 4.537-4.465 4.537h-7.688s-4.32-.07-4.32 4.175v7.019s-.656 4.247 7.833 4.247zm4.275-2.454a1.393 1.393 0 0 1-1.395-1.395 1.394 1.394 0 1 1 1.395 1.395z"
    />
    <defs>
      <linearGradient id="python__a" x1="19.075" x2="34.898" y1="18.782" y2="34.658" gradientUnits="userSpaceOnUse">
        <stop stopColor="#387EB8" />
        <stop offset="1" stopColor="#366994" />
      </linearGradient>
      <linearGradient id="python__b" x1="28.809" x2="45.803" y1="28.882" y2="45.163" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFE052" />
        <stop offset="1" stopColor="#FFC331" />
      </linearGradient>
    </defs>
  </svg>
);

const RustIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 224 224">
    <path
      fill="currentColor"
      d="M218.46 109.358l-9.062-5.614c-.076-.882-.162-1.762-.258-2.642l7.803-7.265a3.107 3.107 0 00.933-2.89 3.093 3.093 0 00-1.967-2.312l-9.97-3.715c-.25-.863-.512-1.72-.781-2.58l6.214-8.628a3.114 3.114 0 00-.592-4.263 3.134 3.134 0 00-1.431-.637l-10.507-1.709a80.869 80.869 0 00-1.263-2.353l4.417-9.7a3.12 3.12 0 00-.243-3.035 3.106 3.106 0 00-2.705-1.385l-10.671.372a85.152 85.152 0 00-1.685-2.044l2.456-10.381a3.125 3.125 0 00-3.762-3.763l-10.384 2.456a88.996 88.996 0 00-2.047-1.684l.373-10.671a3.11 3.11 0 00-1.385-2.704 3.127 3.127 0 00-3.034-.246l-9.681 4.417c-.782-.429-1.567-.854-2.353-1.265l-1.713-10.506a3.098 3.098 0 00-1.887-2.373 3.108 3.108 0 00-3.014.35l-8.628 6.213c-.85-.27-1.703-.53-2.56-.778l-3.716-9.97a3.111 3.111 0 00-2.311-1.97 3.134 3.134 0 00-2.89.933l-7.266 7.802a93.746 93.746 0 00-2.643-.258l-5.614-9.082A3.125 3.125 0 00111.97 4c-1.09 0-2.085.56-2.642 1.478l-5.615 9.081a93.32 93.32 0 00-2.642.259l-7.266-7.802a3.13 3.13 0 00-2.89-.933 3.106 3.106 0 00-2.312 1.97l-3.715 9.97c-.857.247-1.71.506-2.56.778L73.7 12.588a3.101 3.101 0 00-3.014-.35A3.127 3.127 0 0068.8 14.61l-1.713 10.506c-.79.41-1.575.832-2.353 1.265l-9.681-4.417a3.125 3.125 0 00-4.42 2.95l.372 10.67c-.69.553-1.373 1.115-2.048 1.685l-10.383-2.456a3.143 3.143 0 00-2.93.832 3.124 3.124 0 00-.833 2.93l2.436 10.383a93.897 93.897 0 00-1.68 2.043l-10.672-.372a3.138 3.138 0 00-2.704 1.385 3.126 3.126 0 00-.246 3.035l4.418 9.7c-.43.779-.855 1.563-1.266 2.353l-10.507 1.71a3.097 3.097 0 00-2.373 1.886 3.117 3.117 0 00.35 3.013l6.214 8.628a89.12 89.12 0 00-.78 2.58l-9.97 3.715a3.117 3.117 0 00-1.035 5.202l7.803 7.265c-.098.879-.184 1.76-.258 2.642l-9.062 5.614A3.122 3.122 0 004 112.021c0 1.092.56 2.084 1.478 2.642l9.062 5.614c.074.882.16 1.762.258 2.642l-7.803 7.265a3.117 3.117 0 001.034 5.201l9.97 3.716a110 110 0 00.78 2.58l-6.212 8.627a3.112 3.112 0 00.6 4.27c.419.33.916.547 1.443.63l10.507 1.709c.407.792.83 1.576 1.265 2.353l-4.417 9.68a3.126 3.126 0 002.95 4.42l10.65-.374c.553.69 1.115 1.372 1.685 2.047l-2.435 10.383a3.09 3.09 0 00.831 2.91 3.117 3.117 0 002.931.83l10.384-2.436a82.268 82.268 0 002.047 1.68l-.371 10.671a3.11 3.11 0 001.385 2.704 3.125 3.125 0 003.034.241l9.681-4.416c.779.432 1.563.854 2.353 1.265l1.713 10.505a3.147 3.147 0 001.887 2.395 3.111 3.111 0 003.014-.349l8.628-6.213c.853.271 1.71.535 2.58.783l3.716 9.969a3.112 3.112 0 002.312 1.967 3.112 3.112 0 002.89-.933l7.266-7.802c.877.101 1.761.186 2.642.264l5.615 9.061a3.12 3.12 0 002.642 1.478 3.165 3.165 0 002.663-1.478l5.614-9.061c.884-.078 1.765-.163 2.643-.264l7.265 7.802a3.106 3.106 0 002.89.933 3.105 3.105 0 002.312-1.967l3.716-9.969c.863-.248 1.719-.512 2.58-.783l8.629 6.213a3.12 3.12 0 004.9-2.045l1.713-10.506c.793-.411 1.577-.838 2.353-1.265l9.681 4.416a3.13 3.13 0 003.035-.241 3.126 3.126 0 001.385-2.704l-.372-10.671a81.794 81.794 0 002.046-1.68l10.383 2.436a3.123 3.123 0 003.763-3.74l-2.436-10.382a84.588 84.588 0 001.68-2.048l10.672.374a3.104 3.104 0 002.704-1.385 3.118 3.118 0 00.244-3.035l-4.417-9.68c.43-.779.852-1.563 1.263-2.353l10.507-1.709a3.08 3.08 0 002.373-1.886 3.11 3.11 0 00-.35-3.014l-6.214-8.627c.272-.857.532-1.717.781-2.58l9.97-3.716a3.109 3.109 0 001.967-2.311 3.107 3.107 0 00-.933-2.89l-7.803-7.265c.096-.88.182-1.761.258-2.642l9.062-5.614a3.11 3.11 0 001.478-2.642 3.157 3.157 0 00-1.476-2.663h-.064zm-60.687 75.337c-3.468-.747-5.656-4.169-4.913-7.637a6.412 6.412 0 017.617-4.933c3.468.741 5.676 4.169 4.933 7.637a6.414 6.414 0 01-7.617 4.933h-.02zm-3.076-20.847c-3.158-.677-6.275 1.334-6.936 4.5l-3.22 15.026c-9.929 4.5-21.055 7.018-32.614 7.018-11.89 0-23.12-2.622-33.234-7.328l-3.22-15.026c-.677-3.158-3.778-5.18-6.936-4.499l-13.273 2.848a80.222 80.222 0 01-6.853-8.091h64.61c.731 0 1.218-.132 1.218-.797v-22.91c0-.665-.487-.797-1.218-.797H94.133v-14.469h20.415c1.864 0 9.97.533 12.551 10.898.811 3.179 2.601 13.54 3.818 16.863 1.214 3.715 6.152 11.146 11.415 11.146h32.202c.365 0 .755-.041 1.166-.116a80.56 80.56 0 01-7.307 8.587l-13.583-2.911-.113.058zm-89.38 20.537a6.407 6.407 0 01-7.617-4.933c-.74-3.467 1.462-6.894 4.934-7.637a6.417 6.417 0 017.617 4.933c.74 3.468-1.464 6.894-4.934 7.637zm-24.564-99.28a6.438 6.438 0 01-3.261 8.484c-3.241 1.438-7.019-.025-8.464-3.261-1.445-3.237.025-7.039 3.262-8.483a6.416 6.416 0 018.463 3.26zM33.22 102.94l13.83-6.15c2.952-1.311 4.294-4.769 2.972-7.72l-2.848-6.44H58.36v50.362h-22.5a79.158 79.158 0 01-3.014-21.672c0-2.869.155-5.697.452-8.483l-.08.103zm60.687-4.892v-14.86h26.629c1.376 0 9.722 1.59 9.722 7.822 0 5.18-6.399 7.038-11.663 7.038h-24.77.082zm96.811 13.375c0 1.973-.072 3.922-.216 5.862h-8.113c-.811 0-1.137.532-1.137 1.327v3.715c0 8.752-4.934 10.671-9.268 11.146-4.129.464-8.691-1.726-9.248-4.252-2.436-13.684-6.482-16.595-12.881-21.672 7.948-5.036 16.204-12.487 16.204-22.498 0-10.753-7.369-17.523-12.385-20.847-7.059-4.644-14.862-5.572-16.968-5.572H52.899c11.374-12.673 26.835-21.673 44.174-24.975l9.887 10.361a5.849 5.849 0 008.278.19l11.064-10.568c23.119 4.314 42.729 18.721 54.082 38.598l-7.576 17.09c-1.306 2.951.027 6.419 2.973 7.72l14.573 6.48c.255 2.607.383 5.224.384 7.843l-.021.052zM106.912 24.94a6.398 6.398 0 019.062.209 6.437 6.437 0 01-.213 9.082 6.396 6.396 0 01-9.062-.21 6.436 6.436 0 01.213-9.083v.002zm75.137 60.476a6.402 6.402 0 018.463-3.26 6.425 6.425 0 013.261 8.482 6.402 6.402 0 01-8.463 3.261 6.425 6.425 0 01-3.261-8.483z"
    />
  </svg>
);

const RubyIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} preserveAspectRatio="xMidYMid" viewBox="0 0 256 255">
    <defs>
      <linearGradient x1="84.8%" y1="111.4%" x2="58.3%" y2="64.6%" id="ruby__a">
        <stop stopColor="#FB7655" offset="0%" />
        <stop stopColor="#E42B1E" offset="41%" />
        <stop stopColor="#900" offset="100%" />
      </linearGradient>
      <linearGradient x1="116.7%" y1="60.9%" x2="1.7%" y2="19.3%" id="ruby__b">
        <stop stopColor="#871101" offset="0%" />
        <stop stopColor="#911209" offset="100%" />
      </linearGradient>
      <linearGradient x1="75.8%" y1="219.3%" x2="39%" y2="7.8%" id="ruby__c">
        <stop stopColor="#871101" offset="0%" />
        <stop stopColor="#911209" offset="100%" />
      </linearGradient>
      <linearGradient x1="50%" y1="7.2%" x2="66.5%" y2="79.1%" id="ruby__d">
        <stop stopColor="#FFF" offset="0%" />
        <stop stopColor="#E57252" offset="23%" />
        <stop stopColor="#DE3B20" offset="46%" />
        <stop stopColor="#A60003" offset="100%" />
      </linearGradient>
      <linearGradient x1="46.2%" y1="16.3%" x2="49.9%" y2="83%" id="ruby__e">
        <stop stopColor="#FFF" offset="0%" />
        <stop stopColor="#E4714E" offset="23%" />
        <stop stopColor="#BE1A0D" offset="56%" />
        <stop stopColor="#A80D00" offset="100%" />
      </linearGradient>
      <linearGradient x1="37%" y1="15.6%" x2="49.5%" y2="92.5%" id="ruby__f">
        <stop stopColor="#FFF" offset="0%" />
        <stop stopColor="#E46342" offset="18%" />
        <stop stopColor="#C82410" offset="40%" />
        <stop stopColor="#A80D00" offset="100%" />
      </linearGradient>
      <linearGradient x1="13.6%" y1="58.3%" x2="85.8%" y2="-46.7%" id="ruby__g">
        <stop stopColor="#FFF" offset="0%" />
        <stop stopColor="#C81F11" offset="54%" />
        <stop stopColor="#BF0905" offset="100%" />
      </linearGradient>
      <linearGradient x1="27.6%" y1="21.1%" x2="50.7%" y2="79.1%" id="ruby__h">
        <stop stopColor="#FFF" offset="0%" />
        <stop stopColor="#DE4024" offset="31%" />
        <stop stopColor="#BF190B" offset="100%" />
      </linearGradient>
      <linearGradient x1="-20.7%" y1="122.3%" x2="104.2%" y2="-6.3%" id="ruby__i">
        <stop stopColor="#BD0012" offset="0%" />
        <stop stopColor="#FFF" offset="17%" />
        <stop stopColor="#C82F1C" offset="27%" />
        <stop stopColor="#820C01" offset="33%" />
        <stop stopColor="#A31601" offset="46%" />
        <stop stopColor="#B31301" offset="72%" />
        <stop stopColor="#E82609" offset="100%" />
      </linearGradient>
      <linearGradient x1="58.8%" y1="65.2%" x2="12%" y2="50.1%" id="ruby__j">
        <stop stopColor="#8C0C01" offset="0%" />
        <stop stopColor="#A80D0E" offset="100%" />
      </linearGradient>
      <linearGradient x1="79.3%" y1="62.8%" x2="23.1%" y2="17.9%" id="ruby__k">
        <stop stopColor="#7E110B" offset="0%" />
        <stop stopColor="#9E0C00" offset="100%" />
      </linearGradient>
      <linearGradient x1="92.9%" y1="74.1%" x2="59.8%" y2="39.7%" id="ruby__l">
        <stop stopColor="#79130D" offset="0%" />
        <stop stopColor="#9E120B" offset="100%" />
      </linearGradient>
      <linearGradient x1="56.6%" y1="101.7%" x2="3.1%" y2="12%" id="ruby__o">
        <stop stopColor="#8B2114" offset="0%" />
        <stop stopColor="#B3100C" offset="100%" />
      </linearGradient>
      <linearGradient x1="30.9%" y1="35.6%" x2="92.5%" y2="100.7%" id="ruby__p">
        <stop stopColor="#B31000" offset="0%" />
        <stop stopColor="#791C12" offset="100%" />
      </linearGradient>
      <radialGradient cx="32%" cy="40.2%" fx="32%" fy="40.2%" r="69.6%" id="ruby__m">
        <stop stopColor="#A80D00" offset="0%" />
        <stop stopColor="#7E0E08" offset="100%" />
      </radialGradient>
      <radialGradient cx="13.5%" cy="40.9%" fx="13.5%" fy="40.9%" r="88.4%" id="ruby__n">
        <stop stopColor="#A30C00" offset="0%" />
        <stop stopColor="#800E08" offset="100%" />
      </radialGradient>
    </defs>
    <path d="M197.5 167.8 51.9 254.2l188.5-12.8 14.5-190-57.4 116.4Z" fill="url(#ruby__a)" />
    <path d="m240.7 241.3-16.2-111.8-44.1 58.2 60.3 53.6Z" fill="url(#ruby__b)" />
    <path d="m240.9 241.3-118.7-9.4-69.6 22 188.3-12.6Z" fill="url(#ruby__c)" />
    <path d="M52.7 254l29.7-97.1-65.2 13.9L52.7 254Z" fill="url(#ruby__d)" />
    <path d="M180.4 188 153 81.3l-78 73.2L180.3 188Z" fill="url(#ruby__e)" />
    <path d="m248.7 82.7-73.8-60.2-20.5 66.4 94.3-6.2Z" fill="url(#ruby__f)" />
    <path d="m214.2 1-43.4 24L143.4.7l70.8.3Z" fill="url(#ruby__g)" />
    <path d="M0 203.4l18.2-33.2-14.7-39.5L0 203.4Z" fill="url(#ruby__h)" />
    <path
      d="m2.5 129.5 14.8 42L81.6 157 155 88.8 175.7 23 143 0 87.6 20.8C70.1 37 36.3 69 35 69.8c-1.2.6-22.4 40.6-32.5 59.7Z"
      fill="#FFF"
    />
    <path
      d="M54.4 54c37.9-37.4 86.7-59.6 105.4-40.7 18.8 18.9-1 64.8-39 102.3-37.8 37.5-86 61-104.7 42-18.8-18.8.5-66 38.3-103.5Z"
      fill="url(#ruby__i)"
    />
    <path d="m52.7 254 29.5-97.5 97.6 31.4c-35.3 33.1-74.6 61-127 66Z" fill="url(#ruby__j)" />
    <path d="m155 88.6 25.2 99.3c29.5-31 56-64.3 68.9-105.6l-94 6.3Z" fill="url(#ruby__k)" />
    <path d="M248.8 82.8c10-30.2 12.4-73.7-35-81.8l-38.7 21.5 73.7 60.3Z" fill="url(#ruby__l)" />
    <path d="M0 203c1.4 50 37.4 50.7 52.8 51.1l-35.5-82.9L0 203Z" fill="#9E1209" />
    <path d="m155.2 88.8 69.3 42.4c1.4.8 19.7-30.8 23.8-48.6l-93 6.2Z" fill="url(#ruby__m)" />
    <path d="m82.1 156.5 39.3 75.9c23.3-12.7 41.5-28 58.1-44.5l-97.4-31.4Z" fill="url(#ruby__n)" />
    <path d="m17.2 171.3-5.6 66.4c10.5 14.3 25 15.6 40.1 14.5-11-27.4-32.9-82-34.5-80.9Z" fill="url(#ruby__o)" />
    <path d="m174.8 22.7 78.1 11C248.8 16 236 4.5 214.1 1l-39.3 21.7Z" fill="url(#ruby__p)" />
  </svg>
);

const GoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 207 78">
    <g fill="currentColor" fillRule="evenodd">
      <path d="m16.2 24.1c-.4 0-.5-.2-.3-.5l2.1-2.7c.2-.3.7-.5 1.1-.5h35.7c.4 0 .5.3.3.6l-1.7 2.6c-.2.3-.7.6-1 .6z" />
      <path d="m1.1 33.3c-.4 0-.5-.2-.3-.5l2.1-2.7c.2-.3.7-.5 1.1-.5h45.6c.4 0 .6.3.5.6l-.8 2.4c-.1.4-.5.6-.9.6z" />
      <path d="m25.3 42.5c-.4 0-.5-.3-.3-.6l1.4-2.5c.2-.3.6-.6 1-.6h20c.4 0 .6.3.6.7l-.2 2.4c0 .4-.4.7-.7.7z" />
      <g transform="translate(55)">
        <path d="m74.1 22.3c-6.3 1.6-10.6 2.8-16.8 4.4-1.5.4-1.6.5-2.9-1-1.5-1.7-2.6-2.8-4.7-3.8-6.3-3.1-12.4-2.2-18.1 1.5-6.8 4.4-10.3 10.9-10.2 19 .1 8 5.6 14.6 13.5 15.7 6.8.9 12.5-1.5 17-6.6.9-1.1 1.7-2.3 2.7-3.7-3.6 0-8.1 0-19.3 0-2.1 0-2.6-1.3-1.9-3 1.3-3.1 3.7-8.3 5.1-10.9.3-.6 1-1.6 2.5-1.6h36.4c-.2 2.7-.2 5.4-.6 8.1-1.1 7.2-3.8 13.8-8.2 19.6-7.2 9.5-16.6 15.4-28.5 17-9.8 1.3-18.9-.6-26.9-6.6-7.4-5.6-11.6-13-12.7-22.2-1.3-10.9 1.9-20.7 8.5-29.3 7.1-9.3 16.5-15.2 28-17.3 9.4-1.7 18.4-.6 26.5 4.9 5.3 3.5 9.1 8.3 11.6 14.1.6.9.2 1.4-1 1.7z" />
        <path
          d="m107.2 77.6c-9.1-.2-17.4-2.8-24.4-8.8-5.9-5.1-9.6-11.6-10.8-19.3-1.8-11.3 1.3-21.3 8.1-30.2 7.3-9.6 16.1-14.6 28-16.7 10.2-1.8 19.8-.8 28.5 5.1 7.9 5.4 12.8 12.7 14.1 22.3 1.7 13.5-2.2 24.5-11.5 33.9-6.6 6.7-14.7 10.9-24 12.8-2.7.5-5.4.6-8 .9zm23.8-40.4c-.1-1.3-.1-2.3-.3-3.3-1.8-9.9-10.9-15.5-20.4-13.3-9.3 2.1-15.3 8-17.5 17.4-1.8 7.8 2 15.7 9.2 18.9 5.5 2.4 11 2.1 16.3-.6 7.9-4.1 12.2-10.5 12.7-19.1z"
          fillRule="nonzero"
        />
      </g>
    </g>
  </svg>
);

function RuntimeLogo({ runtime }: { runtime: string }) {
  const iconClassName = 'size-3.5 shrink-0';

  switch (runtime) {
    case 'node':
      return <NodejsIcon className={iconClassName} />;
    case 'python':
      return <PythonIcon className={iconClassName} />;
    case 'golang':
      return <GoIcon className={cn(iconClassName, 'text-sky-500')} />;
    case 'ruby':
      return <RubyIcon className={iconClassName} />;
    case 'rust':
      return <RustIcon className={cn(iconClassName, 'text-foreground/80')} />;
    default:
      return <Code2 className={cn(iconClassName, 'text-muted-foreground')} />;
  }
}

export const BoxInitResult = memo(function BoxInitResult({
  input,
  result,
  state,
}: {
  input: any;
  result: any;
  state: string;
}) {
  const runtime: string = input?.runtime ?? result?.runtime ?? '…';
  const reason: string = input?.reason ?? result?.message ?? '';
  const isDone = state === 'output-available' || state === 'result' || !!result;

  return (
    <div className="flex items-center gap-2 py-1 my-0.5">
      <span className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/70 bg-muted/60 text-[11px] font-mono font-medium text-foreground/80">
        {isDone ? (
          <Check className="size-3 text-emerald-500 shrink-0" strokeWidth={2.5} />
        ) : (
          <Loader2 className="size-3 animate-spin text-primary shrink-0" />
        )}
        <RuntimeLogo runtime={runtime} />
        <span>{runtime}</span>
      </span>
      {reason && <span className="text-[11px] text-muted-foreground/60 truncate">{reason}</span>}
    </div>
  );
});

export const BoxExecResult = memo(function BoxExecResult({
  input,
  result,
  state,
  annotation,
}: {
  input: any;
  result: any;
  state: string;
  annotation?: DataBuildSearchPart['data'];
}) {
  const command = input?.command ?? '';
  const ann = annotation?.kind === 'exec' ? annotation : null;

  const stdout = ann?.stdout ?? result?.stdout ?? '';
  const stderr = ann?.stderr ?? result?.stderr ?? '';
  const status = ann?.status ?? result?.status ?? (state === 'result' ? 'completed' : 'running');

  return (
    <CollapsibleCard
      icon={<Terminal className="size-3.5" />}
      title={command || 'Shell command'}
      badge={<StatusBadge status={status} />}
    >
      <div className="bg-muted/30 p-3 text-[11px] font-mono overflow-x-auto max-h-[300px] overflow-y-auto">
        <div className="text-muted-foreground/70 mb-2 select-all flex items-center gap-1">
          <span className="text-primary/50">$</span>
          <span>{command}</span>
        </div>
        {stdout && <pre className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{stdout}</pre>}
        {stderr && <pre className="text-destructive/70 whitespace-pre-wrap mt-1.5 leading-relaxed">{stderr}</pre>}
        {!stdout && !stderr && status === 'running' && (
          <div className="text-muted-foreground/60 flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" /> Running…
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
});

export const BoxWriteResult = memo(function BoxWriteResult({
  input,
  result,
  state,
  annotation,
}: {
  input: any;
  result: any;
  state: string;
  annotation?: DataBuildSearchPart['data'];
}) {
  const ann = annotation?.kind === 'write' ? annotation : null;
  const path = ann?.path ?? input?.path ?? result?.path ?? '';
  const content = input?.content ?? '';
  const preview = ann?.contentPreview ?? (content.length > 800 ? content.slice(0, 800) + '\n...' : content);
  const lang = inferLanguage(path);

  return (
    <CollapsibleCard
      icon={<FileCode2 className="size-3.5" />}
      title={path || 'Write file'}
      badge={<StatusBadge status={ann?.status ?? (state === 'result' ? 'completed' : 'running')} />}
      defaultOpen={preview.length < 500}
    >
      <div className="bg-muted/30 p-3 text-[11px] font-mono overflow-x-auto max-h-[400px] overflow-y-auto">
        <pre className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{preview}</pre>
      </div>
      <div className="px-3 py-1.5 text-[10px] text-muted-foreground/50 bg-muted/20 flex items-center gap-1.5">
        <span className="font-medium">{lang}</span>
        <span className="opacity-40">·</span>
        <span>{content.length.toLocaleString()} chars</span>
      </div>
    </CollapsibleCard>
  );
});

export const BoxReadResult = memo(function BoxReadResult({
  input,
  result,
  state,
  annotation,
}: {
  input: any;
  result: any;
  state: string;
  annotation?: DataBuildSearchPart['data'];
}) {
  const ann = annotation?.kind === 'read' ? annotation : null;
  const path = input?.path ?? '';
  const content = ann?.content ?? result?.content ?? '';
  const preview = content.length > 800 ? content.slice(0, 800) + '\n...' : content;
  const lang = inferLanguage(path);

  return (
    <CollapsibleCard
      icon={<File className="size-3.5" />}
      title={path || 'Read file'}
      badge={<StatusBadge status={ann?.status ?? (state === 'result' ? 'completed' : 'running')} />}
      defaultOpen={false}
    >
      <div className="bg-card p-3 text-xs font-mono overflow-x-auto max-h-[400px] overflow-y-auto">
        {content ? (
          <pre className="text-foreground/90 whitespace-pre-wrap">{preview}</pre>
        ) : (
          <div className="text-muted-foreground flex items-center gap-2 py-2">
            <Loader2 className="size-3 animate-spin" />
            Reading...
          </div>
        )}
      </div>
      {content && (
        <div className="px-3 py-1.5 font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider bg-muted/30">
          {lang} &middot; {content.length.toLocaleString()} chars
        </div>
      )}
    </CollapsibleCard>
  );
});

export const BoxListResult = memo(function BoxListResult({
  input,
  result,
  state,
  annotation,
}: {
  input: any;
  result: any;
  state: string;
  annotation?: DataBuildSearchPart['data'];
}) {
  const ann = annotation?.kind === 'list' ? annotation : null;
  const path = ann?.path ?? input?.path ?? '/work';
  const files = ann?.files ?? result?.files ?? [];

  return (
    <CollapsibleCard
      icon={<FolderOpen className="size-3.5" />}
      title={path}
      badge={
        <span className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider">
          {files.length} items
        </span>
      }
      defaultOpen={files.length <= 20}
    >
      <div className="px-3 py-2 space-y-0.5 max-h-[300px] overflow-y-auto">
        {files.map((file: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs py-0.5">
            {file.isDir ? (
              <Folder className="size-3.5 text-primary/70 shrink-0" />
            ) : (
              <File className="size-3.5 text-muted-foreground shrink-0" />
            )}
            <span className={cn('truncate', file.isDir ? 'text-primary/70 font-medium' : 'text-foreground')}>
              {file.name}
            </span>
            {file.size != null && !file.isDir && (
              <span className="font-pixel text-[9px] text-muted-foreground/40 ml-auto shrink-0">
                {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`}
              </span>
            )}
          </div>
        ))}
        {files.length === 0 && state !== 'result' && (
          <div className="text-xs text-muted-foreground flex items-center gap-2 py-2">
            <Loader2 className="size-3 animate-spin" /> Listing...
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
});

export const BoxDownloadResult = memo(function BoxDownloadResult({
  input,
  result,
  state,
  annotation,
}: {
  input: any;
  result: any;
  state: string;
  annotation?: DataBuildSearchPart['data'];
}) {
  const ann = annotation?.kind === 'download' ? annotation : null;
  const path = input?.path ?? '';
  const url = ann?.url ?? result?.url ?? '';
  const filename = ann?.filename ?? result?.filename ?? path.split('/').pop() ?? 'download';

  return (
    <CollapsibleCard
      icon={<Download className="size-3.5" />}
      title={filename}
      badge={<StatusBadge status={url ? 'completed' : 'running'} />}
    >
      <div className="px-3 py-3">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Download className="size-3.5" />
            Download {filename}
          </a>
        ) : (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-3 animate-spin" /> Preparing download...
          </div>
        )}
        <div className="font-pixel text-[9px] text-muted-foreground/40 uppercase tracking-wider mt-2">{path}</div>
      </div>
    </CollapsibleCard>
  );
});

export const BoxPreviewResult = memo(function BoxPreviewResult({
  input,
  result,
  state,
  annotation,
  isOpen = false,
  onToggle,
}: {
  input: any;
  result: any;
  state: string;
  annotation?: DataBuildSearchPart['data'];
  isOpen?: boolean;
  onToggle?: (preview: {
    previewId: string;
    url: string;
    port: number;
    token?: string;
    username?: string;
    password?: string;
  }) => void;
}) {
  const ann = annotation?.kind === 'preview' ? annotation : null;
  const port = ann?.port ?? result?.port ?? input?.port ?? '';
  const url = ann?.url ?? result?.url ?? '';
  const token = ann?.kind === 'preview' ? ann.token : result?.token;
  const username = ann?.kind === 'preview' ? ann.username : result?.username;
  const password = ann?.kind === 'preview' ? ann.password : result?.password;
  const previewId = ann?.kind === 'preview' ? ann.previewId : (result?.previewId ?? '');
  const canToggle = Boolean(url && previewId && onToggle);

  return (
    <CollapsibleCard
      icon={<Globe className="size-3.5" />}
      title={url ? `Preview :${port}` : `Creating preview :${port}`}
      badge={<StatusBadge status={url ? 'completed' : 'running'} />}
    >
      <div className="px-3 py-3 space-y-3">
        {url ? (
          <button
            type="button"
            onClick={() => {
              if (!canToggle || !onToggle) return;
              onToggle({
                previewId,
                url,
                port: Number(port),
                ...(token ? { token } : {}),
                ...(username ? { username } : {}),
                ...(password ? { password } : {}),
              });
            }}
            disabled={!canToggle}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity',
              isOpen
                ? 'bg-foreground text-background hover:opacity-90'
                : 'bg-primary text-primary-foreground hover:opacity-90',
              !canToggle && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Globe className="size-3.5" />
            {isOpen ? 'Close Preview' : 'Open Preview'}
          </button>
        ) : (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-3 animate-spin" /> Creating preview...
          </div>
        )}

        {url ? (
          <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-2">
            <div className="text-[11px] text-foreground break-all">{url}</div>
            <div className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider">Port {port}</div>
          </div>
        ) : null}

        {token ? (
          <div className="rounded-lg border border-border bg-muted/30 p-2.5">
            <div className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-1">
              Bearer token protected
            </div>
            <div className="text-[11px] text-muted-foreground">Use the returned token to access this preview.</div>
          </div>
        ) : null}

        {username && password ? (
          <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1">
            <div className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-1">
              Basic auth enabled
            </div>
            <div className="text-[11px] text-foreground break-all">Username: {username}</div>
            <div className="text-[11px] text-foreground break-all">Password: {password}</div>
          </div>
        ) : null}
      </div>
    </CollapsibleCard>
  );
});

const TOOL_ICONS: Record<string, string> = {
  Bash: '$ ',
  Write: '+ ',
  Read: '~ ',
  TodoWrite: '# ',
  ToolSearch: '? ',
  Glob: '* ',
  Grep: '/ ',
};

function formatToolInput(toolName: string, input: Record<string, unknown>): string {
  if (toolName === 'Bash' && input.command) return String(input.command).slice(0, 100);
  if (toolName === 'Write' && input.file_path) return String(input.file_path);
  if (toolName === 'Read' && input.file_path) return String(input.file_path);
  if (toolName === 'TodoWrite' && input.todos) {
    const todos = input.todos as Array<{ content?: string }>;
    return todos
      .map((t) => t.content || '')
      .filter(Boolean)
      .join(', ')
      .slice(0, 80);
  }
  if (toolName === 'ToolSearch' && input.query) return String(input.query);
  if (toolName === 'Glob' && input.glob_pattern) return String(input.glob_pattern);
  if (toolName === 'Grep' && input.pattern) return String(input.pattern);
  const firstVal = Object.values(input)[0];
  return firstVal ? String(firstVal).slice(0, 80) : '';
}

function BoxAgentResultInner({
  input,
  result,
  state,
  annotations,
}: {
  input: any;
  result: any;
  state: string;
  annotations: DataBuildSearchPart[];
}) {
  const prompt = input?.prompt ?? '';
  const containerRef = useRef<HTMLDivElement>(null);

  type TimelineEntry =
    | { type: 'text'; text: string }
    | { type: 'tool'; toolName: string; input: Record<string, unknown> };

  const agentData = useMemo(() => {
    const entries: TimelineEntry[] = [];
    let lastStatus = state === 'output-available' ? 'completed' : 'running';
    let finalCost = result?.cost;
    let pendingText = '';
    let lastToolSignature: string | null = null;

    const flushText = () => {
      if (pendingText.trim()) {
        entries.push({ type: 'text', text: pendingText.trim() });
      }
      pendingText = '';
    };

    for (const ann of annotations) {
      const d = ann.data;
      if (d.kind !== 'agent') continue;

      lastStatus = d.status;

      if (d.event) {
        if (d.event.type === 'text_delta') {
          lastToolSignature = null;
          pendingText += d.event.text;
        } else if (d.event.type === 'tool_call') {
          flushText();
          const signature = `${d.event.toolName}:${JSON.stringify(d.event.input ?? {})}`;
          if (signature !== lastToolSignature) {
            entries.push({ type: 'tool', toolName: d.event.toolName, input: d.event.input });
            lastToolSignature = signature;
          }
        }
      }

      if (d.cost) finalCost = d.cost;
    }

    flushText();

    if (entries.length === 0) {
      const fallbackText = result?.result ?? (typeof result === 'string' ? result : null);
      if (fallbackText) {
        entries.push({ type: 'text', text: String(fallbackText) });
      }
      if (!finalCost && result?.cost) finalCost = result.cost;
      if (lastStatus === 'running' && (state === 'output-available' || fallbackText)) {
        lastStatus = 'completed';
      }
    }

    return { timeline: entries, status: lastStatus, cost: finalCost, entryCount: entries.length };
  }, [annotations, result, state]);

  const { timeline, status, cost, entryCount } = agentData;

  useEffect(() => {
    if (containerRef.current && status !== 'completed') {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
     
  }, [entryCount, status]);

  const isMobile = useIsMobile();
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(true);

  return (
    <div>
      {(() => {
        // Extract latest TodoWrite from agent timeline
        const todos: Array<{ content: string; status: string; activeForm?: string }> = [];
        for (const entry of timeline) {
          if (entry.type === 'tool' && entry.toolName === 'TodoWrite' && (entry.input as any)?.todos) {
            const items = (entry.input as any).todos;
            if (Array.isArray(items) && items.length > 0) {
              todos.length = 0;
              todos.push(...items);
            }
          }
        }
        const todoDoneCount = todos.filter((t) => t.status === 'completed').length;
        const todoActiveItem = todos.find((t) => t.status === 'in_progress');
        const todoAllDone = todos.length > 0 && todoDoneCount === todos.length;

        return (
          <div className="rounded-lg border border-border/70 overflow-hidden my-1.5">
            {/* Header / trigger */}
            <button
              onClick={() => setIsAgentOpen(!isAgentOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
            >
              {isAgentOpen ? (
                <ChevronDown className="size-3 text-muted-foreground/50 shrink-0" />
              ) : (
                <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />
              )}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <ClaudeAI className="size-4 shrink-0 opacity-70" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-foreground/70 leading-none">Claude Code</span>
                    <StatusBadge status={status} />
                  </div>
                  {prompt && <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5 leading-snug">{prompt}</p>}
                </div>
                {prompt && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPromptDialogOpen(true);
                        }}
                        className="shrink-0 p-1 rounded-md hover:bg-muted-foreground/10 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
                        aria-label="View full prompt"
                      >
                        <Maximize2 className="size-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      View full prompt
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </button>

            {/* Todo list — always visible regardless of accordion state */}
            {todos.length > 0 && (
              <div className="border-t border-border/50">
                <div className="px-3 py-2 flex items-center gap-2">
                  <ListChecks
                    className={cn('size-3.5 shrink-0', todoAllDone ? 'text-emerald-500' : 'text-primary/60')}
                  />
                  <span className="text-[11px] font-medium text-foreground/70 flex-1 min-w-0 truncate">
                    {todoAllDone ? 'All tasks complete' : (todoActiveItem?.activeForm ?? 'Working…')}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground/50 shrink-0">
                    {todoDoneCount}/{todos.length}
                  </span>
                </div>
                <div className="px-3 pb-2.5 space-y-1.5">
                  {todos.map((todo, ti) => (
                    <div key={ti} className="flex items-start gap-2">
                      {todo.status === 'completed' ? (
                        <CircleCheck className="size-3.5 mt-0.5 shrink-0 text-emerald-500" />
                      ) : todo.status === 'in_progress' ? (
                        <Loader2 className="size-3.5 mt-0.5 shrink-0 text-primary animate-spin" />
                      ) : (
                        <CircleDashed className="size-3.5 mt-0.5 shrink-0 text-muted-foreground/30" />
                      )}
                      <span
                        className={cn(
                          'text-[11px] leading-snug',
                          todo.status === 'completed' && 'text-muted-foreground/40 line-through',
                          todo.status === 'in_progress' && 'text-foreground/90 font-medium',
                          todo.status === 'pending' && 'text-muted-foreground/50',
                        )}
                      >
                        {todo.content}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible content */}
            <AnimatePresence initial={false}>
              {isAgentOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border/60">
                    <div ref={containerRef} className="max-h-125 overflow-y-auto divide-y divide-border/40">
                      {timeline.length > 0 ? (
                        timeline.map((entry, i) => {
                          if (entry.type === 'tool') {
                            if (entry.toolName === 'TodoWrite') return null;
                            const prefix = TOOL_ICONS[entry.toolName] || '> ';
                            const summary = formatToolInput(entry.toolName, entry.input);
                            return (
                              <div key={i} className="flex items-start gap-2 px-3 py-1.5 bg-muted/15">
                                <Wrench className="size-3 text-muted-foreground/40 mt-0.5 shrink-0" />
                                <div className="min-w-0 text-[11px] font-mono">
                                  <span className="font-medium text-foreground/60">{entry.toolName}</span>
                                  {summary && (
                                    <span className="text-muted-foreground/50 ml-1.5 truncate block">
                                      {prefix}{summary}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={i} className="px-3 py-2">
                              <MarkdownRenderer content={entry.text} />
                            </div>
                          );
                        })
                      ) : status !== 'completed' && status !== 'error' ? (
                        <div className="px-3 py-4 text-[11px] text-muted-foreground/60 flex items-center gap-2">
                          <Loader2 className="size-3 animate-spin" />
                          {state === 'input-streaming'
                            ? 'Preparing prompt…'
                            : state === 'input-available'
                              ? 'Starting Claude Code…'
                              : 'Claude Code is working…'}
                        </div>
                      ) : null}
                    </div>
                    {cost && (
                      <div className="px-3 py-1.5 text-[10px] text-muted-foreground/40 bg-muted/20 border-t border-border/40 flex items-center gap-3">
                        {cost.inputTokens != null && <span>{cost.inputTokens.toLocaleString()} in</span>}
                        {cost.outputTokens != null && <span>{cost.outputTokens.toLocaleString()} out</span>}
                        {cost.totalUsd != null && <span>${cost.totalUsd.toFixed(4)}</span>}
                        {cost.computeMs != null && <span>{(cost.computeMs / 1000).toFixed(1)}s</span>}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}
      <Dialog open={!isMobile && promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent className="max-w-2xl! w-full">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Agent Prompt</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] px-1">
            <MarkdownRenderer content={prompt} />
          </div>
        </DialogContent>
      </Dialog>
      <Drawer open={!!isMobile && promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-sm font-medium">Agent Prompt</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto max-h-[60vh] px-1">
            <MarkdownRenderer content={prompt} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export const BoxAgentResult = memo(BoxAgentResultInner);

export const BuildWebSearchResult = memo(function BuildWebSearchResult({
  input,
  result,
  state,
  annotations,
}: {
  input: any;
  result: any;
  state: string;
  annotations: DataBuildSearchPart[];
}) {
  const queries = input?.queries ?? [];
  const inputActionTitle = input?.actionTitle as string | undefined;
  const [isOpen, setIsOpen] = useState(true);

  const { queryChips, allSources, isDone, actionTitle } = useMemo(() => {
    const chips: string[] = [];
    const sourceMap = new Map<string, { title: string; url: string; favicon?: string }>();
    let allCompleted = state === 'output-available' || result != null;
    const qStatuses = new Map<string, string>();
    let latestActionTitle: string | undefined;

    for (const ann of annotations) {
      const d = ann.data;
      if (d.kind === 'search_query') {
        if (!chips.includes(d.query)) chips.push(d.query);
        qStatuses.set(d.queryId, d.status);
        if (d.actionTitle) latestActionTitle = d.actionTitle;
        if (d.status === 'completed') {
          const all = Array.from(qStatuses.values());
          const expectedCount = d.total ?? (queries.length > 0 ? queries.length : all.length);
          allCompleted = all.length >= expectedCount && all.every((s) => s === 'completed');
        }
      } else if (d.kind === 'search_source') {
        if (!sourceMap.has(d.source.url)) sourceMap.set(d.source.url, d.source);
      }
    }

    if (chips.length === 0) for (const q of queries) if (!chips.includes(q)) chips.push(q);

    return {
      queryChips: chips,
      allSources: Array.from(sourceMap.values()),
      isDone: allCompleted,
      actionTitle: latestActionTitle ?? inputActionTitle,
    };
  }, [annotations, state, queries, inputActionTitle]);

  return (
    <div className="relative ml-4">
      {/* Pulsing/solid dot aligned with the stepper stem */}
      <div
        className={cn(
          'absolute rounded-full transition-colors duration-300 z-10',
          !isDone ? 'bg-primary/70 animate-[pulse_1s_ease-in-out_infinite]' : 'bg-primary',
        )}
        style={{ left: '-0.6rem', top: '6px', width: '6px', height: '6px', transform: 'translateX(-50%)' }}
      />

      <div
        className="flex items-center gap-1.5 py-0.5 px-1.5 cursor-pointer hover:bg-accent/50 rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Search className="size-3 text-muted-foreground/70 shrink-0" />
        <span className="text-foreground/80 text-[11px] leading-snug flex-1 truncate">{actionTitle ?? 'Searching'}</span>
        {allSources.length > 0 && (
          <span className="text-[10px] tabular-nums text-muted-foreground/60 px-1.5 py-px rounded-full bg-muted/70 border border-border/50 shrink-0">
            {allSources.length} sources
          </span>
        )}
        {isOpen ? (
          <ChevronDown className="size-3 text-muted-foreground/50 shrink-0" />
        ) : (
          <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pl-1.5 py-1 space-y-1.5">
              {queryChips.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {queryChips.map((q, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground/80"
                    >
                      <Search className="size-2.5 text-muted-foreground/50 shrink-0" />
                      <span className="truncate max-w-[220px]">{q}</span>
                    </span>
                  ))}
                </div>
              )}
              {allSources.length > 0 && (
                <div className="rounded-lg bg-card border border-border/50 overflow-hidden max-h-[240px] overflow-y-auto">
                  {allSources.map((source, si) => {
                    let hostname = '';
                    try {
                      hostname = new URL(source.url).hostname.replace('www.', '');
                    } catch {
                      hostname = source.url;
                    }
                    return (
                      <a
                        key={si}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-accent/50 transition-colors border-b border-border/30 last:border-0"
                      >
                        <img
                          src={
                            source.favicon ||
                            `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(hostname)}`
                          }
                          alt=""
                          className="size-3.5 rounded shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://www.google.com/s2/favicons?sz=128&domain=example.com';
                            (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(100%)';
                          }}
                        />
                        <span className="flex-1 min-w-0 text-foreground/80 truncate">{source.title || hostname}</span>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0">{hostname}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export const BoxBrowsePageResult = memo(function BoxBrowsePageResult({
  input,
  result,
  state,
}: {
  input: any;
  result: any;
  state: string;
}) {
  const urls: string[] = input?.urls ?? [];
  const resultCount = (result?.results ?? []).length;
  const status = state === 'output-available' ? 'completed' : 'running';

  return (
    <CollapsibleCard
      icon={<Globe className="size-3.5" />}
      title={`Browsing ${urls.length} page${urls.length !== 1 ? 's' : ''}`}
      badge={<StatusBadge status={status} />}
      defaultOpen={false}
    >
      <div className="px-3 py-2 space-y-1">
        <div className="flex flex-wrap gap-1">
          {urls.map((url, ui) => {
            let hostname = '';
            try {
              hostname = new URL(url).hostname.replace('www.', '');
            } catch {
              hostname = url;
            }
            return (
              <a
                key={ui}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground hover:border-primary/30 transition-colors"
              >
                <Globe className="size-2.5 text-muted-foreground/60 shrink-0" />
                <span className="truncate max-w-[200px]">{hostname}</span>
              </a>
            );
          })}
        </div>
        {status === 'completed' && resultCount > 0 && (
          <p className="font-pixel text-[9px] text-muted-foreground/40 uppercase tracking-wider pt-0.5">
            {resultCount} page{resultCount !== 1 ? 's' : ''} read
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
});

export const BoxCodeResult = memo(function BoxCodeResult({
  input,
  result,
  state,
  annotation,
}: {
  input: any;
  result: any;
  state: string;
  annotation?: DataBuildSearchPart['data'];
}) {
  const ann = annotation?.kind === 'code' ? annotation : null;
  const code = input?.code ?? '';
  const lang = input?.lang ?? 'js';
  const output = ann?.result ?? result?.result ?? '';
  const exitCode = ann?.exitCode ?? result?.exitCode;
  const status =
    ann?.status ??
    (exitCode === 0 ? 'completed' : exitCode != null ? 'error' : state === 'result' ? 'completed' : 'running');

  return (
    <CollapsibleCard
      icon={<Code2 className="size-3.5" />}
      title={`Run ${lang}`}
      badge={<StatusBadge status={status} />}
    >
      <div className="bg-muted/30 p-3 text-[11px] font-mono overflow-x-auto max-h-[200px] overflow-y-auto">
        <pre className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{code}</pre>
      </div>
      {(output || state === 'result') && (
        <div className="border-t border-border/60 bg-muted/20 p-3 text-[11px] font-mono overflow-x-auto max-h-[200px] overflow-y-auto">
          <div className="text-[10px] text-muted-foreground/40 uppercase tracking-wide mb-1.5">Output</div>
          <pre
            className={cn(
              'whitespace-pre-wrap leading-relaxed',
              exitCode !== 0 ? 'text-destructive/70' : 'text-emerald-600 dark:text-emerald-400',
            )}
          >
            {output || '(no output)'}
          </pre>
        </div>
      )}
      {exitCode != null && (
        <div className="px-3 py-1 text-[10px] text-muted-foreground/40 bg-muted/20 flex items-center gap-1">
          <span>exit</span>
          <span className={cn('font-medium', exitCode !== 0 ? 'text-destructive/60' : 'text-emerald-500/70')}>{exitCode}</span>
        </div>
      )}
    </CollapsibleCard>
  );
});
