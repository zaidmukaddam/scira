import 'katex/dist/katex.min.css';

import { Geist_Mono } from 'next/font/google';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useTheme } from 'next-themes';

import Image from 'next/image';
import Link from 'next/link';
import Latex from 'react-latex-next';
import Marked, { ReactRenderer } from 'marked-react';
import { Lexer } from 'marked';
import React, { useCallback, useMemo, useState, Fragment, useRef, lazy, Suspense, useEffect, use } from 'react';

import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  type LucideIcon,
  Check,
  Copy,
  WrapText,
  ArrowLeftRight,
  ArrowUpRight,
  Download,
  Globe,
  File as FileIcon,
  FileText,
  FileArchive,
  FileCode2,
  Image as ImageIcon,
  Music4,
  Video,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Youtube,
  Loader2,
  X,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Cambio } from 'cambio';
import { useIsMobile } from '@/hooks/use-mobile';

// Spotify icon component
const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

// Helper to detect platform from URL
const getPlatformFromUrl = (url: string): 'youtube' | 'spotify' | null => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube';
    }
    if (hostname.includes('spotify.com')) {
      return 'spotify';
    }
  } catch {
    // Invalid URL
  }
  return null;
};

// Helper to get a compact, TLD-stripped domain label for display
const getDisplayDomain = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // Strip protocol and path if present
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
  const hostOnly = withoutProtocol.split('/')[0];

  // Remove common www prefix
  const withoutWww = hostOnly.replace(/^www\./i, '');

  const parts = withoutWww.split('.');
  if (parts.length <= 1) return withoutWww;

  // Drop only the final TLD segment: timesofindia.com -> timesofindia
  return parts.slice(0, -1).join('.');
};

interface FilePreviewDefinition {
  filename: string;
  title: string;
  typeLabel: string;
  icon: LucideIcon;
}

interface TaggedLinkData {
  href: string;
  title?: string;
}

const NON_DOWNLOADABLE_EXTENSIONS = new Set(['html', 'htm', 'php', 'asp', 'aspx', 'jsp']);

const FILE_TYPE_MAP: Record<string, { typeLabel: string; icon: LucideIcon }> = {
  pdf: { typeLabel: 'PDF', icon: FileText },
  doc: { typeLabel: 'DOC', icon: FileText },
  docx: { typeLabel: 'DOCX', icon: FileText },
  txt: { typeLabel: 'TXT', icon: FileText },
  md: { typeLabel: 'Markdown', icon: FileText },
  rtf: { typeLabel: 'RTF', icon: FileText },
  csv: { typeLabel: 'CSV', icon: FileSpreadsheet },
  xls: { typeLabel: 'XLS', icon: FileSpreadsheet },
  xlsx: { typeLabel: 'XLSX', icon: FileSpreadsheet },
  ods: { typeLabel: 'ODS', icon: FileSpreadsheet },
  png: { typeLabel: 'PNG', icon: ImageIcon },
  jpg: { typeLabel: 'JPG', icon: ImageIcon },
  jpeg: { typeLabel: 'JPEG', icon: ImageIcon },
  webp: { typeLabel: 'WEBP', icon: ImageIcon },
  gif: { typeLabel: 'GIF', icon: ImageIcon },
  svg: { typeLabel: 'SVG', icon: ImageIcon },
  ico: { typeLabel: 'ICO', icon: ImageIcon },
  mp3: { typeLabel: 'MP3', icon: Music4 },
  wav: { typeLabel: 'WAV', icon: Music4 },
  m4a: { typeLabel: 'M4A', icon: Music4 },
  flac: { typeLabel: 'FLAC', icon: Music4 },
  ogg: { typeLabel: 'OGG', icon: Music4 },
  mp4: { typeLabel: 'MP4', icon: Video },
  mov: { typeLabel: 'MOV', icon: Video },
  webm: { typeLabel: 'WEBM', icon: Video },
  mkv: { typeLabel: 'MKV', icon: Video },
  avi: { typeLabel: 'AVI', icon: Video },
  zip: { typeLabel: 'ZIP', icon: FileArchive },
  tar: { typeLabel: 'TAR', icon: FileArchive },
  gz: { typeLabel: 'GZ', icon: FileArchive },
  tgz: { typeLabel: 'TGZ', icon: FileArchive },
  rar: { typeLabel: 'RAR', icon: FileArchive },
  '7z': { typeLabel: '7Z', icon: FileArchive },
  ts: { typeLabel: 'TypeScript', icon: FileCode2 },
  tsx: { typeLabel: 'TSX', icon: FileCode2 },
  js: { typeLabel: 'JavaScript', icon: FileCode2 },
  jsx: { typeLabel: 'JSX', icon: FileCode2 },
  json: { typeLabel: 'JSON', icon: FileCode2 },
  yaml: { typeLabel: 'YAML', icon: FileCode2 },
  yml: { typeLabel: 'YML', icon: FileCode2 },
  toml: { typeLabel: 'TOML', icon: FileCode2 },
  xml: { typeLabel: 'XML', icon: FileCode2 },
  css: { typeLabel: 'CSS', icon: FileCode2 },
  scss: { typeLabel: 'SCSS', icon: FileCode2 },
  htmlx: { typeLabel: 'HTML', icon: FileCode2 },
  sh: { typeLabel: 'Shell', icon: FileCode2 },
  bash: { typeLabel: 'Bash', icon: FileCode2 },
  zsh: { typeLabel: 'Zsh', icon: FileCode2 },
  py: { typeLabel: 'Python', icon: FileCode2 },
  rb: { typeLabel: 'Ruby', icon: FileCode2 },
  go: { typeLabel: 'Go', icon: FileCode2 },
  rs: { typeLabel: 'Rust', icon: FileCode2 },
  java: { typeLabel: 'Java', icon: FileCode2 },
  sql: { typeLabel: 'SQL', icon: FileCode2 },
  apk: { typeLabel: 'APK', icon: Download },
  dmg: { typeLabel: 'DMG', icon: Download },
  exe: { typeLabel: 'EXE', icon: Download },
  msi: { typeLabel: 'MSI', icon: Download },
  pkg: { typeLabel: 'PKG', icon: Download },
  deb: { typeLabel: 'DEB', icon: Download },
  rpm: { typeLabel: 'RPM', icon: Download },
};

function parseUrlLike(href: string): URL | null {
  try {
    if (href.startsWith('/')) return new URL(href, 'https://scira.ai');
    return new URL(href);
  } catch {
    return null;
  }
}

function getAppPreviewHref(href: string): string {
  // if (href.startsWith('/')) return href;
  return href;
}

function getAppPreviewScreenshotSrc(href: string): string | null {
  return `/api/app-preview/screenshot?url=${encodeURIComponent(getAppPreviewHref(href))}`;
}

function getAppPreviewDescription(href: string): string {
  const url = parseUrlLike(href);
  if (!url) return href;

  if (href.startsWith('/')) {
    const suffix = `${url.search}${url.hash}`;
    return `${url.pathname}${suffix}` || '/';
  }

  const host = url.hostname.replace(/^www\./, '');
  const suffix = `${url.pathname}${url.search}${url.hash}`;
  return `${host}${suffix}`;
}

function extractFilenameFromHref(href: string, fallbackText?: string): string {
  const url = parseUrlLike(href);
  const rawPathSegment = url?.pathname.split('/').filter(Boolean).pop();
  const decodedPathSegment = rawPathSegment ? decodeURIComponent(rawPathSegment) : '';

  if (decodedPathSegment) return decodedPathSegment;

  const candidateFromText = fallbackText?.trim();
  if (candidateFromText && candidateFromText.includes('.')) return candidateFromText;

  return 'download';
}

function getFilePreviewDefinition(href: string, fallbackText?: string): FilePreviewDefinition | null {
  const url = parseUrlLike(href);
  const pathname = url?.pathname ?? '';
  const filename = extractFilenameFromHref(href, fallbackText);
  const ext = filename.includes('.') ? (filename.split('.').pop()?.toLowerCase() ?? '') : '';
  const hasBuildDownloadPath = pathname.includes('/scira/builds/');
  const hasKnownDownloadExtension = Boolean(ext && FILE_TYPE_MAP[ext] && !NON_DOWNLOADABLE_EXTENSIONS.has(ext));
  const hasDownloadHint =
    url?.searchParams.get('download') === '1' ||
    url?.searchParams.get('download') === 'true' ||
    url?.searchParams.has('filename');

  const isLikelyFile = hasBuildDownloadPath || hasKnownDownloadExtension || Boolean(hasDownloadHint);

  if (!isLikelyFile) return null;

  const matchedType = (ext && FILE_TYPE_MAP[ext]) || null;
  return {
    filename,
    title: fallbackText?.trim() && fallbackText.trim() !== href ? fallbackText.trim() : filename,
    typeLabel: matchedType?.typeLabel ?? (ext ? ext.toUpperCase() : 'File'),
    icon: matchedType?.icon ?? FileIcon,
  };
}

function parseTaggedLinkContent(raw: string): TaggedLinkData | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const markdownLinkMatch = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/s);
  if (markdownLinkMatch) {
    return {
      title: markdownLinkMatch[1].trim(),
      href: markdownLinkMatch[2].trim(),
    };
  }

  return { href: trimmed };
}

import { sileo } from 'sileo';
// Custom syntax themes that match Scira's design system
const sciraDarkTheme: { [key: string]: React.CSSProperties } = {
  'code[class*="language-"]': { color: '#e1e4e8', background: 'transparent' },
  'pre[class*="language-"]': { color: '#e1e4e8', background: 'transparent' },
  comment: { color: '#6a737d' },
  prolog: { color: '#6a737d' },
  doctype: { color: '#6a737d' },
  cdata: { color: '#6a737d' },
  punctuation: { color: '#e1e4e8' },
  namespace: { opacity: 0.7 },
  property: { color: '#79b8ff' },
  tag: { color: '#85e89d' },
  boolean: { color: '#79b8ff' },
  number: { color: '#79b8ff' },
  constant: { color: '#79b8ff' },
  symbol: { color: '#79b8ff' },
  deleted: { color: '#f97583' },
  selector: { color: '#85e89d' },
  'attr-name': { color: '#b392f0' },
  string: { color: '#9ecbff' },
  char: { color: '#9ecbff' },
  builtin: { color: '#79b8ff' },
  inserted: { color: '#85e89d' },
  operator: { color: '#e1e4e8' },
  entity: { color: '#79b8ff', cursor: 'help' },
  url: { color: '#79b8ff' },
  variable: { color: '#ffab70' },
  atrule: { color: '#b392f0' },
  'attr-value': { color: '#9ecbff' },
  function: { color: '#b392f0' },
  'class-name': { color: '#b392f0' },
  keyword: { color: '#f97583' },
  regex: { color: '#85e89d' },
  important: { color: '#f97583', fontWeight: 'bold' },
};

const sciraLightTheme: { [key: string]: React.CSSProperties } = {
  'code[class*="language-"]': { color: '#24292e', background: 'transparent' },
  'pre[class*="language-"]': { color: '#24292e', background: 'transparent' },
  comment: { color: '#6a737d' },
  prolog: { color: '#6a737d' },
  doctype: { color: '#6a737d' },
  cdata: { color: '#6a737d' },
  punctuation: { color: '#24292e' },
  namespace: { opacity: 0.7 },
  property: { color: '#005cc5' },
  tag: { color: '#22863a' },
  boolean: { color: '#005cc5' },
  number: { color: '#005cc5' },
  constant: { color: '#005cc5' },
  symbol: { color: '#005cc5' },
  deleted: { color: '#d73a49' },
  selector: { color: '#22863a' },
  'attr-name': { color: '#6f42c1' },
  string: { color: '#032f62' },
  char: { color: '#032f62' },
  builtin: { color: '#005cc5' },
  inserted: { color: '#22863a' },
  operator: { color: '#24292e' },
  entity: { color: '#005cc5', cursor: 'help' },
  url: { color: '#005cc5' },
  variable: { color: '#e36209' },
  atrule: { color: '#6f42c1' },
  'attr-value': { color: '#032f62' },
  function: { color: '#6f42c1' },
  'class-name': { color: '#6f42c1' },
  keyword: { color: '#d73a49' },
  regex: { color: '#22863a' },
  important: { color: '#d73a49', fontWeight: 'bold' },
};
interface MarkdownRendererProps {
  content: string;
  isUserMessage?: boolean;
}

interface CitationLink {
  text: string;
  link: string;
  metadata?: {
    title?: string;
    description?: string;
    image?: string;
    logo?: string;
  };
}

interface CitationGroup {
  urls: string[];
  texts: string[];
  id: string;
}

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  preload: true,
  display: 'swap',
});

const isValidUrl = (str: string) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

interface CodeBlockProps {
  language: string | undefined;
  children: string;
  elementKey: string;
}

// Threshold for auto-collapsing large code blocks
const AUTO_COLLAPSE_THRESHOLD = 25;
const PREVIEW_LINES = 4;

// Code block state type
interface CodeBlockState {
  collapsed: boolean;
  contentLength: number;
  userCollapsed: boolean;
}

// Global store for code block states - persists across component remounts
// NOTE: This MUST be module-level (not React context) because:
// 1. Marked re-creates all elements on each render, destroying any component state
// 2. React context would be recreated with the MarkdownRenderer, losing all state
// 3. This is a client-side component, so the Map is per-browser-tab, not shared across users
// The Map is keyed by content hash, so different code blocks have different keys
const codeBlockStates = new Map<string, CodeBlockState>();

// Cleanup old entries periodically to prevent memory leaks
// Entries older than 30 minutes are removed
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRY_AGE_MS = 30 * 60 * 1000; // 30 minutes
const codeBlockTimestamps = new Map<string, number>();

let lastCleanupTime = Date.now();
function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) return;

  lastCleanupTime = now;
  for (const [key, timestamp] of codeBlockTimestamps) {
    if (now - timestamp > MAX_ENTRY_AGE_MS) {
      codeBlockStates.delete(key);
      codeBlockTimestamps.delete(key);
    }
  }
}

// Helper to get a STABLE key for a code block based on its content prefix (not length)
// This ensures the same code block during streaming gets the same key
function getCodeBlockStateKey(content: string): string {
  // Use only the first 100 chars for the hash - this part stays stable during streaming
  const prefix = content.slice(0, 100);
  let hash = 0;
  for (let i = 0; i < prefix.length; i++) {
    hash = ((hash << 5) - hash + prefix.charCodeAt(i)) | 0;
  }
  return `cb-${Math.abs(hash).toString(36)}`;
}

// Unified CodeBlock component - consolidates LazyCodeBlockComponent and SyncCodeBlock
// The `allowPlainTextFallback` prop controls whether very large code (>10000 chars) renders as plain text
interface CodeBlockInnerProps extends CodeBlockProps {
  allowPlainTextFallback?: boolean;
}

const CodeBlockInner: React.FC<CodeBlockInnerProps> = ({
  children,
  language,
  elementKey,
  allowPlainTextFallback = false,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const lineCount = useMemo(() => children.split('\n').length, [children]);

  // Use global state store for collapse state - persists across remounts
  // Key is stable (based on content prefix, not length)
  const stateKey = useMemo(() => getCodeBlockStateKey(children), [children]);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Run cleanup periodically
    cleanupOldEntries();

    const stored = codeBlockStates.get(stateKey);
    if (stored) {
      // Update timestamp on access
      codeBlockTimestamps.set(stateKey, Date.now());
      // Content is growing (streaming) - expand unless user manually collapsed
      if (children.length > stored.contentLength && !stored.userCollapsed) {
        return false;
      }
      return stored.collapsed;
    }
    // New code block - start expanded during streaming, collapse later if needed
    const defaultCollapsed = lineCount > AUTO_COLLAPSE_THRESHOLD;
    codeBlockStates.set(stateKey, {
      collapsed: defaultCollapsed,
      contentLength: children.length,
      userCollapsed: false,
    });
    codeBlockTimestamps.set(stateKey, Date.now());
    return defaultCollapsed;
  });

  // Detect streaming and auto-expand
  useEffect(() => {
    const stored = codeBlockStates.get(stateKey);
    if (stored && children.length > stored.contentLength && !stored.userCollapsed) {
      // Content is growing and user hasn't manually collapsed - expand
      setIsCollapsed(false);
    }
    // Always update the stored content length and timestamp
    codeBlockStates.set(stateKey, {
      collapsed: isCollapsed,
      contentLength: children.length,
      userCollapsed: stored?.userCollapsed ?? false,
    });
    codeBlockTimestamps.set(stateKey, Date.now());
  }, [children.length, stateKey, isCollapsed]);

  // Sync collapse state changes to global store
  useEffect(() => {
    const stored = codeBlockStates.get(stateKey);
    codeBlockStates.set(stateKey, {
      collapsed: isCollapsed,
      contentLength: stored?.contentLength ?? children.length,
      userCollapsed: stored?.userCollapsed ?? false,
    });
    codeBlockTimestamps.set(stateKey, Date.now());
  }, [isCollapsed, stateKey, children.length]);

  // Get preview of first few lines for collapsed state
  const previewCode = useMemo(() => {
    if (!isCollapsed) return '';
    return children.split('\n').slice(0, PREVIEW_LINES).join('\n');
  }, [children, isCollapsed]);

  // Handle hydration - only access theme after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use react-syntax-highlighter for secure, isolated rendering
  // For very large code blocks with allowPlainTextFallback, skip syntax highlighting
  const shouldHighlight = useMemo(() => {
    if (allowPlainTextFallback && children.length >= 10000) return false;
    return true;
  }, [children.length, allowPlainTextFallback]);

  // Get theme-aware syntax highlighting style (default to dark for SSR)
  // Light-background themes need light syntax colors; all others use dark
  const syntaxTheme = useMemo(() => {
    if (!mounted) return sciraDarkTheme;
    const isLightTheme =
      resolvedTheme === 'light' || resolvedTheme === 'claudelight' || resolvedTheme === 'neutrallight';
    return isLightTheme ? sciraLightTheme : sciraDarkTheme;
  }, [mounted, resolvedTheme]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      sileo.success({
        title: 'Code copied to clipboard',
        description: 'You can now paste it anywhere',
        icon: <Copy className="h-4 w-4" />,
      });
    } catch (error) {
      console.error('Failed to copy code:', error);
      sileo.error({ title: 'Failed to copy code' });
    }
  }, [children]);

  const toggleWrap = useCallback(() => {
    setIsWrapped((prev) => {
      const newState = !prev;
      sileo.success({
        title: newState ? 'Code wrap enabled' : 'Code wrap disabled',
        description: newState ? 'Long lines will now wrap' : 'Long lines will scroll horizontally',
        icon: <WrapText className="h-4 w-4" />,
      });
      return newState;
    });
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      // Track user intent in global store
      const stored = codeBlockStates.get(stateKey);
      codeBlockStates.set(stateKey, {
        collapsed: newState,
        contentLength: stored?.contentLength ?? children.length,
        userCollapsed: newState, // User manually collapsed if newState is true
      });
      codeBlockTimestamps.set(stateKey, Date.now());
      return newState;
    });
  }, [stateKey, children.length]);

  // Render code content (either with syntax highlighting or plain text)
  const renderCodeContent = (code: string) => {
    if (shouldHighlight) {
      return (
        <SyntaxHighlighter
          language={language || 'text'}
          style={syntaxTheme}
          customStyle={{
            margin: 0,
            padding: '0.5rem',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            background: 'transparent',
          }}
        >
          {code}
        </SyntaxHighlighter>
      );
    }
    return (
      <pre
        className={cn(
          'font-mono text-sm leading-relaxed p-2',
          isWrapped && 'whitespace-pre-wrap wrap-break-words',
          !isWrapped && 'whitespace-pre overflow-x-auto',
        )}
      >
        {code}
      </pre>
    );
  };

  return (
    <div className="group relative my-5 rounded-xl border border-border/60 bg-accent/50 overflow-hidden">
      <div
        className={cn(
          'flex items-center justify-between px-3.5 py-2 cursor-pointer select-none',
          !isCollapsed && 'border-b border-border/40',
        )}
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse();
            }}
            className="p-0.5 rounded text-muted-foreground/50 hover:text-foreground transition-colors"
            title={isCollapsed ? 'Expand code' : 'Collapse code'}
          >
            {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
          {language && (
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">{language}</span>
          )}
          <span className="text-[11px] text-muted-foreground/60 tabular-nums">{lineCount} lines</span>
        </div>

        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {!isCollapsed && (
            <button
              onClick={toggleWrap}
              className={cn(
                'p-1 rounded border border-border/40 bg-background/50 transition-colors touch-manipulation',
                isWrapped ? 'text-primary' : 'text-muted-foreground/50 hover:text-foreground active:text-foreground',
              )}
              title={isWrapped ? 'Disable wrap' : 'Enable wrap'}
            >
              {isWrapped ? <ArrowLeftRight size={11} /> : <WrapText size={11} />}
            </button>
          )}
          <button
            onClick={handleCopy}
            className={cn(
              'p-1 rounded border border-border/40 bg-background/50 transition-colors touch-manipulation',
              isCopied ? 'text-primary' : 'text-muted-foreground/50 hover:text-foreground active:text-foreground',
            )}
            title={isCopied ? 'Copied!' : 'Copy code'}
          >
            {isCopied ? <Check size={11} /> : <Copy size={11} />}
          </button>
        </div>
      </div>

      {isCollapsed ? (
        <div className="relative cursor-pointer" onClick={toggleCollapse}>
          <div
            className="relative [&_pre]:m-0! [&_pre]:p-2! [&_code]:text-sm! [&_code]:leading-relaxed! [&_pre]:overflow-hidden! max-h-24 overflow-hidden"
            style={{ fontFamily: geistMono.style.fontFamily }}
          >
            {renderCodeContent(previewCode)}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-accent/50 via-accent/40 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-2 pointer-events-none">
            <span className="font-pixel text-[9px] text-muted-foreground/50 bg-accent/80 px-2.5 py-1 rounded-full flex items-center gap-1 tracking-wider">
              <ChevronDown size={10} />
              {lineCount - PREVIEW_LINES} more lines
            </span>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'relative [&_pre]:m-0! [&_pre]:p-2! [&_code]:text-sm! [&_code]:leading-relaxed!',
            isWrapped &&
              '[&_pre]:whitespace-pre-wrap! [&_pre]:wrap-break-word! [&_code]:whitespace-pre-wrap! [&_code]:wrap-break-word!',
            !isWrapped && '[&_pre]:overflow-x-auto!',
          )}
          style={{ fontFamily: geistMono.style.fontFamily }}
        >
          {renderCodeContent(children)}
        </div>
      )}
    </div>
  );
};

// Lazy-loaded wrapper for large code blocks
const LazyCodeBlockComponent: React.FC<CodeBlockProps> = (props) => (
  <CodeBlockInner {...props} allowPlainTextFallback={true} />
);

const LazyCodeBlock = lazy(() => Promise.resolve({ default: LazyCodeBlockComponent }));

// Synchronous CodeBlock component for smaller blocks
const SyncCodeBlock: React.FC<CodeBlockProps> = (props) => <CodeBlockInner {...props} allowPlainTextFallback={false} />;

const CodeBlock: React.FC<CodeBlockProps> = React.memo(
  ({ language, children, elementKey }) => {
    // Use lazy loading for large code blocks
    if (children.length > 5000) {
      return (
        <Suspense
          fallback={
            <div className="group relative my-5 rounded-md border border-border bg-accent overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-accent border-b border-border">
                <div className="flex items-center gap-2">
                  {language && (
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {language}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{children.split('\n').length} lines</span>
                </div>
              </div>
              <div className="font-mono text-sm leading-relaxed p-2 text-muted-foreground">
                <div className="animate-pulse">Loading code block...</div>
              </div>
            </div>
          }
        >
          <LazyCodeBlock language={language} elementKey={elementKey}>
            {children}
          </LazyCodeBlock>
        </Suspense>
      );
    }

    // Use synchronous rendering for smaller blocks
    return (
      <SyncCodeBlock language={language} elementKey={elementKey}>
        {children}
      </SyncCodeBlock>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.children === nextProps.children &&
      prevProps.language === nextProps.language &&
      prevProps.elementKey === nextProps.elementKey
    );
  },
);

CodeBlock.displayName = 'CodeBlock';

// Optimized synchronous content processor using useMemo
const useProcessedContent = (content: string) => {
  return useMemo(() => {
    const citations: CitationLink[] = [];
    const latexBlocks: Array<{ id: string; content: string; isBlock: boolean }> = [];
    const appPreviewBlocks: Array<{ id: string; href: string; title?: string }> = [];
    const downloadBlocks: Array<{ id: string; href: string; title?: string }> = [];
    let modifiedContent = content;

    try {
      // Extract and protect code blocks FIRST
      const codeBlocks: Array<{ id: string; content: string }> = [];

      // Combined pattern that matches triple backticks first (longer matches), then single backticks
      // This prevents the issue where single backticks match parts of already-protected content
      const allCodeMatches: Array<{ match: string; index: number; length: number }> = [];

      // First, find all triple-backtick code blocks
      const tripleBacktickPattern = /```[\s\S]*?```/g;
      let match;
      while ((match = tripleBacktickPattern.exec(modifiedContent)) !== null) {
        allCodeMatches.push({
          match: match[0],
          index: match.index,
          length: match[0].length,
        });
      }

      // Then, find all inline code (single backticks) that don't overlap with triple-backtick blocks
      const inlineCodePattern = /`[^`\n]+`/g;
      while ((match = inlineCodePattern.exec(modifiedContent)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;

        // Check if this inline code is inside a triple-backtick block
        const isInsideTripleBacktick = allCodeMatches.some(
          (m) => matchStart >= m.index && matchEnd <= m.index + m.length,
        );

        if (!isInsideTripleBacktick) {
          allCodeMatches.push({
            match: match[0],
            index: match.index,
            length: match[0].length,
          });
        }
      }

      // Sort by index to process in order
      allCodeMatches.sort((a, b) => a.index - b.index);

      // Replace all code blocks with placeholders
      let newContent = '';
      let lastIndex = 0;

      for (const codeMatch of allCodeMatches) {
        // Use very unique placeholder that won't match markdown syntax
        const id = `<<<CODEBLOCK_PROTECTED_${codeBlocks.length}>>>`;
        codeBlocks.push({ id, content: codeMatch.match });

        newContent += modifiedContent.slice(lastIndex, codeMatch.index) + id;
        lastIndex = codeMatch.index + codeMatch.length;
      }

      newContent += modifiedContent.slice(lastIndex);
      modifiedContent = newContent;

      // Extract explicit rich-link tags before normal markdown/link processing.
      const richTagPatterns = [
        {
          regex: /<app_preview>([\s\S]*?)<\/app_preview>/gi,
          prefix: 'XAPPPREVX',
          target: appPreviewBlocks,
        },
        {
          regex: /<download>([\s\S]*?)<\/download>/gi,
          prefix: 'XDOWNLOADX',
          target: downloadBlocks,
        },
      ] as const;

      for (const { regex, prefix, target } of richTagPatterns) {
        regex.lastIndex = 0;
        let richTagProcessed = '';
        let lastRichTagIndex = 0;
        let richTagMatch: RegExpExecArray | null;

        while ((richTagMatch = regex.exec(modifiedContent)) !== null) {
          const parsed = parseTaggedLinkContent(richTagMatch[1]);
          if (!parsed) continue;

          const id = `${prefix}${target.length}XEND`;
          target.push({ id, href: parsed.href, title: parsed.title });
          richTagProcessed += modifiedContent.slice(lastRichTagIndex, richTagMatch.index) + id;
          lastRichTagIndex = richTagMatch.index + richTagMatch[0].length;
        }

        richTagProcessed += modifiedContent.slice(lastRichTagIndex);
        modifiedContent = richTagProcessed;
      }

      // Protect table rows to preserve pipe delimiters
      const tableBlocks: Array<{ id: string; content: string }> = [];
      const tableRowPattern = /^\|.+\|$/gm;
      const tableMatches = [...modifiedContent.matchAll(tableRowPattern)];

      if (tableMatches.length > 0) {
        let lastIndex = 0;
        let newContent = '';

        for (let i = 0; i < tableMatches.length; i++) {
          const match = tableMatches[i];
          const id = `TABLEROW${tableBlocks.length}END`;
          tableBlocks.push({ id, content: match[0] });

          newContent += modifiedContent.slice(lastIndex, match.index) + id;
          lastIndex = match.index! + match[0].length;
        }

        newContent += modifiedContent.slice(lastIndex);
        modifiedContent = newContent;
      }

      // Extract monetary amounts FIRST to protect them from LaTeX patterns
      const monetaryBlocks: Array<{ id: string; content: string }> = [];
      // Match monetary amounts with optional scale words and currency codes
      // Exclude mathematical expressions by using negative lookahead for backslashes or ending $
      const monetaryRegex =
        /(^|[\s([>~≈<)/])\$\d+(?:,\d{3})*(?:\.\d+)?(?:[kKmMbBtT]|\s+(?:thousand|million|billion|trillion|k|K|M|B|T))?(?:\s+(?:USD|EUR|GBP|CAD|AUD|JPY|CNY|CHF))?(?:\s*(?:per\s+(?:million|thousand|token|month|year)|\/(?:mo|month|yr|year|wk|week|day|token|hr|hour)))?(?=\s|$|[).,;!?<\]/])(?![^$]*\\[^$]*\$)/g;

      let monetaryProcessed = '';
      let lastMonetaryIndex = 0;
      const monetaryMatches = [...modifiedContent.matchAll(monetaryRegex)];

      for (let i = 0; i < monetaryMatches.length; i++) {
        const match = monetaryMatches[i];
        const prefix = match[1];
        const id = `MONETARY${monetaryBlocks.length}END`;
        monetaryBlocks.push({ id, content: match[0].slice(prefix.length) });

        monetaryProcessed += modifiedContent.slice(lastMonetaryIndex, match.index) + prefix + id;
        lastMonetaryIndex = match.index! + match[0].length;
      }

      monetaryProcessed += modifiedContent.slice(lastMonetaryIndex);
      modifiedContent = monetaryProcessed;

      // Also protect monetary amounts inside protected table rows
      if (typeof tableBlocks !== 'undefined' && tableBlocks.length > 0) {
        for (let t = 0; t < tableBlocks.length; t++) {
          let rowContent = tableBlocks[t].content;
          const rowMonetaryMatches = [...rowContent.matchAll(monetaryRegex)];
          if (rowMonetaryMatches.length === 0) continue;
          let lastIndex = 0;
          let newRow = '';
          for (let i = 0; i < rowMonetaryMatches.length; i++) {
            const match = rowMonetaryMatches[i];
            const prefix = match[1];
            const id = `MONETARY${monetaryBlocks.length}END`;
            monetaryBlocks.push({ id, content: match[0].slice(prefix.length) });
            newRow += rowContent.slice(lastIndex, match.index) + prefix + id;
            lastIndex = match.index! + match[0].length;
          }
          newRow += rowContent.slice(lastIndex);
          tableBlocks[t].content = newRow;
        }
      }

      // Extract LaTeX blocks AFTER monetary amounts are protected
      const allLatexPatterns = [
        { patterns: [/\\\[([\s\S]*?)\\\]/g, /\$\$([\s\S]*?)\$\$/g], isBlock: true, prefix: 'XLATEXBLOCKX' },
        {
          patterns: [
            /\\\(([\s\S]*?)\\\)/g,
            // Match $ expressions containing LaTeX commands (backslash followed by letters)
            /\$[^\$\n]*\\[a-zA-Z]+[^\$\n]*\$/g,
            // Match $ expressions containing LaTeX commands, superscripts, subscripts, or braces
            /\$[^\$\n]*[\\^_{}][^\$\n]*\$/g,
            // Match function-call style math like $O(1)$, $f(n)$, $T(n^2)$ (letter followed by parens)
            // Must run BEFORE the broad parenthetical pattern to prevent false cross-dollar matches
            /\$[a-zA-Z]+\([^\)]*\)[^\$\n]*\$/g,
            // Match algebraic expressions with parentheses and variables
            /\$[^\$\n]*\([^\)]*[a-zA-Z][^\)]*\)[^\$\n]*\$/g,
            // Match matrix notation with square brackets
            /\$[^\$\n]*\[[^\]]*\][^\$\n]*\$/g,
            // Match absolute value notation with pipes
            /\$[^\$\n]*\|[^\|]*\|[^\$\n]*\$/g,
            // Match $ expressions with multiple letters and equals signs (e.g., $Av = 2v$)
            /\$[a-zA-Z]+[^\$\n]*[=<>≤≥≠][^\$\n]*\$/g,
            // Match $ expressions with single-letter variable followed by operator and number/variable
            /\$[a-zA-Z]\s*[=<>≤≥≠]\s*[0-9a-zA-Z][^\$\n]*\$/g,
            // Match $ expressions with number followed by LaTeX-style operators
            /\$[0-9][^\$\n]*[\\^_≤≥≠∈∉⊂⊃∪∩θΘπΠαβγδεζηλμνξρσςτφχψωΑΒΓΔΕΖΗΛΜΝΞΡΣΤΦΧΨΩ°][^\$\n]*\$/g,
            // Match pure numeric inline math like $5$ or $3.14$
            /\$\d+(?:\.\d+)?\$/g,
            // Match simple mathematical variables (single letter or Greek letters, but not plain numbers)
            /\$[a-zA-ZθΘπΠαβγδεζηλμνξρσςτφχψωΑΒΓΔΕΖΗΛΜΝΞΡΣΤΦΧΨΩ]+\$/g,
            // Match simple single-letter variables (like $ m $, $ b $, $ x $, $ y $)
            /\$\s*[a-zA-Z]\s*\$/g,
          ],
          isBlock: false,
          prefix: 'XLATEXINLINEX',
        },
      ];

      for (const { patterns, isBlock, prefix } of allLatexPatterns) {
        for (const pattern of patterns) {
          // Use exec() instead of matchAll() so we can reset regex position when skipping bad matches
          // This allows us to find valid LaTeX expressions that might be at the end of a rejected long span
          const regex = new RegExp(pattern.source, pattern.flags);
          let lastIndex = 0;
          let newContent = '';
          let match;

          while ((match = regex.exec(modifiedContent)) !== null) {
            const full = match[0];

            // Skip if it contains a protected code block placeholder (prevents matching across inline code)
            // When skipping, only consume up to (and including) the first $ so regex can find matches starting later
            if (/<<<CODEBLOCK_PROTECTED_\d+>>>/.test(full)) {
              // Copy content up to and including the first character of the bad match (the opening $)
              newContent += modifiedContent.slice(lastIndex, match.index + 1);
              lastIndex = match.index + 1;
              // Reset regex to search from right after the opening $
              regex.lastIndex = match.index + 1;
              continue;
            }

            // Heuristics to avoid misclassifying currency and long cross-dollar spans as LaTeX
            if (!isBlock) {
              const isDollarDelimited = full.startsWith('$') && full.endsWith('$');
              const inner = isDollarDelimited ? full.slice(1, -1) : full; // handles \( ... \) via pattern itself

              // 1) Skip if looks like currency (e.g., $13 billion, $500, $80B)
              const currencyLike =
                /^(\s*)\d{1,3}(?:[,\s]?\d{3})*(?:\.\d+)?(?:\s*(?:k|K|M|B|T|thousand|million|billion|trillion))?(\s*(?:USD|EUR|GBP|CAD|AUD|JPY|CNY|CHF))?\s*$/i.test(
                  inner.replace(/\u00A0/g, ' ').trim(),
                );

              // 2) Skip if it contains obvious URL/link syntax which indicates markdown, not math
              // Only check for actual link patterns, not standalone brackets (which are common in math)
              const containsUrlOrMarkdown = /https?:\/\/|\]\(|:\/\//.test(inner);

              // 3) Skip very long spans (likely accidental cross-dollar match)
              const isTooLong = inner.length > 80;

              // 4) Skip if inner content starts or ends with whitespace (standard TeX convention:
              // $x$ is math but $ x$ or $x $ is not). This prevents false cross-dollar matches
              // like "$O(1)$ some text with (parens) $O(n)$" being misread as one expression.
              // Exception: single-letter variables like $ m $ are still allowed.
              const hasEdgeWhitespace = isDollarDelimited && (/^\s/.test(inner) || /\s$/.test(inner));
              const isSingleLetterVar = hasEdgeWhitespace && /^\s*[a-zA-Z]\s*$/.test(inner);

              if (currencyLike || containsUrlOrMarkdown || isTooLong || (hasEdgeWhitespace && !isSingleLetterVar)) {
                // Do not replace; keep original content but only skip the opening $
                newContent += modifiedContent.slice(lastIndex, match.index + 1);
                lastIndex = match.index + 1;
                regex.lastIndex = match.index + 1;
                continue;
              }
            }

            const id = `${prefix}${latexBlocks.length}XEND`;
            latexBlocks.push({ id, content: full, isBlock });

            newContent += modifiedContent.slice(lastIndex, match.index) + id;
            lastIndex = match.index + full.length;
          }

          newContent += modifiedContent.slice(lastIndex);
          modifiedContent = newContent;
        }
      }

      // Additionally, extract LaTeX inside protected table rows so it renders later
      if (typeof tableBlocks !== 'undefined' && tableBlocks.length > 0) {
        for (let t = 0; t < tableBlocks.length; t++) {
          let rowContent = tableBlocks[t].content;
          for (const { patterns, isBlock, prefix } of allLatexPatterns) {
            for (const pattern of patterns) {
              const matches = [...rowContent.matchAll(pattern)];
              if (matches.length === 0) continue;
              let lastIndex = 0;
              let newRow = '';
              for (let i = 0; i < matches.length; i++) {
                const match = matches[i];
                const id = `${prefix}${latexBlocks.length}XEND`;
                latexBlocks.push({ id, content: match[0], isBlock });
                newRow += rowContent.slice(lastIndex, match.index) + id;
                lastIndex = match.index! + match[0].length;
              }
              newRow += rowContent.slice(lastIndex);
              rowContent = newRow;
            }
          }
          tableBlocks[t].content = rowContent;
        }
      }

      // Escape unescaped pipe characters inside explicit markdown link texts to avoid table cell splits
      // Example: [A | B](url) -> [A \| B](url)
      try {
        const explicitLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        const linkMatches = [...modifiedContent.matchAll(explicitLinkPattern)];
        if (linkMatches.length > 0) {
          let rebuilt = '';
          let lastPos = 0;
          for (let i = 0; i < linkMatches.length; i++) {
            const m = linkMatches[i];
            const full = m[0];
            const textPart = m[1];
            const urlPart = m[2];
            // Replace only unescaped '|'
            const fixedText = textPart.replace(/(^|[^\\])\|/g, '$1\\|');
            rebuilt += modifiedContent.slice(lastPos, m.index!) + `[${fixedText}](${urlPart})`;
            lastPos = m.index! + full.length;
          }
          rebuilt += modifiedContent.slice(lastPos);
          modifiedContent = rebuilt;
        }
      } catch {}

      // Process citations (simplified for performance)
      // Updated regex to handle brackets and exclamation marks in citation text
      // The pattern now matches text that may contain ] characters before the final ](url) pattern
      // Uses negative lookahead to allow ] in text as long as it's not followed by ( or [
      // Uses + quantifier to ensure at least one character is captured (prevents empty brackets)
      const refWithUrlRegex =
        /(?:\[(?:(?:\[?(PDF|DOC|HTML)\]?\s+)?((?:[^\]]|](?!\s*[(\[]))+))\]|\b([^.!?\n]+?(?:\s+[-–—]\s+\w+|\s+\([^)]+\)))\b)(?:\s*(?:\(|\[\s*|\s+))(https?:\/\/[^\s)]+)(?:\s*[)\]]|\s|$)/g;

      let citationProcessed = '';
      let lastCitationIndex = 0;
      const citationMatches = [...modifiedContent.matchAll(refWithUrlRegex)];

      for (let i = 0; i < citationMatches.length; i++) {
        const match = citationMatches[i];
        const [fullMatch, docType, bracketText, plainText, url] = match;
        const text = bracketText || plainText;
        // Skip if text is empty/undefined to prevent malformed citations
        // Preserve the skipped match's content while keeping position tracking correct
        if (!text) {
          const matchStart = match.index ?? 0;
          const matchEnd = matchStart + fullMatch.length;
          citationProcessed += modifiedContent.slice(lastCitationIndex, matchEnd);
          lastCitationIndex = matchEnd;
          continue;
        }
        const fullText = (docType ? `[${docType}] ` : '') + text;
        const cleanUrl = url.replace(/[.,;:]+$/, '');
        citations.push({ text: fullText.trim(), link: cleanUrl });

        citationProcessed +=
          modifiedContent.slice(lastCitationIndex, match.index) + `[${fullText.trim()}](${cleanUrl})`;
        lastCitationIndex = match.index! + fullMatch.length;
      }

      citationProcessed += modifiedContent.slice(lastCitationIndex);
      modifiedContent = citationProcessed;

      // Group consecutive citations using marked's Lexer for robust link parsing
      const citationGroups: CitationGroup[] = [];

      // Helper function to extract links using marked's Lexer (handles all edge cases)
      // Uses a hybrid approach: Lexer to parse links correctly, then finds positions in text
      function extractLinksWithLexer(
        text: string,
      ): Array<{ raw: string; href: string; text: string; index: number; end: number }> {
        const links: Array<{ raw: string; href: string; text: string; index: number; end: number }> = [];

        try {
          // Tokenize the text to find all links using marked's robust parser
          const tokens = Lexer.lexInline(text);

          // Build a map of link tokens with their hrefs and texts
          const linkTokens: Array<{ href: string; text: string; raw: string }> = [];
          for (const token of tokens) {
            if (token.type === 'link') {
              const linkText =
                typeof token.text === 'string' ? token.text : token.tokens?.map((t) => t.raw || '').join('') || '';
              linkTokens.push({
                href: token.href,
                text: linkText,
                raw: token.raw,
              });
            }
          }

          // Now find positions of these links in the original text
          // We'll search for each link pattern, but validate against Lexer results
          let searchPos = 0;
          for (const linkToken of linkTokens) {
            // Try to find this link in the text starting from searchPos
            // Use a more flexible regex that handles edge cases, but validate with Lexer
            const escapedHref = linkToken.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Match link pattern with flexible bracket/paren handling
            const linkPattern = new RegExp(`\\[([^\\]]+)\\]\\(${escapedHref}\\)`, 'g');
            linkPattern.lastIndex = searchPos;
            const match = linkPattern.exec(text);

            if (match && match[0] === linkToken.raw) {
              // Validate: re-parse this match with Lexer to ensure it's correct
              let isValidated = false;
              try {
                const validateTokens = Lexer.lexInline(match[0]);
                const validateLink = validateTokens.find((t) => t.type === 'link');
                if (
                  validateLink &&
                  'href' in validateLink &&
                  (validateLink as { href: string }).href === linkToken.href
                ) {
                  isValidated = true;
                }
              } catch {
                // Validation failed, but match looks good - we'll use it anyway since match[0] === linkToken.raw
              }

              // Use the match if validated OR if raw matches (regex found the correct link)
              if (isValidated || match[0] === linkToken.raw) {
                links.push({
                  raw: match[0],
                  href: linkToken.href,
                  text: linkToken.text,
                  index: match.index!,
                  end: match.index! + match[0].length,
                });
                searchPos = match.index! + match[0].length;
                continue;
              }
            }

            // Fallback: search for the raw link text directly
            const rawIndex = text.indexOf(linkToken.raw, searchPos);
            if (rawIndex !== -1) {
              links.push({
                raw: linkToken.raw,
                href: linkToken.href,
                text: linkToken.text,
                index: rawIndex,
                end: rawIndex + linkToken.raw.length,
              });
              searchPos = rawIndex + linkToken.raw.length;
            } else {
              // Last resort: try to find by href and reconstruct
              // Search backwards from href to find the opening bracket, then match forward
              const hrefIndex = text.indexOf(linkToken.href, searchPos);
              if (hrefIndex !== -1) {
                // Search backwards from href position to find the opening bracket '['
                // Use a reasonable lookback limit (e.g., 500 chars) to handle long link text
                const maxLookback = Math.min(500, hrefIndex);
                const searchStart = Math.max(0, hrefIndex - maxLookback);
                const searchEnd = Math.min(text.length, hrefIndex + linkToken.href.length + 10); // Small lookahead for closing paren
                const searchWindow = text.slice(searchStart, searchEnd);

                // Find the last '[' before the href that could be the start of our link
                // Then match the full link pattern from that position
                const bracketPos = searchWindow.lastIndexOf('[', hrefIndex - searchStart);
                let linkFound = false;

                if (bracketPos !== -1) {
                  // Try to match the full link pattern from this bracket position
                  const patternFromBracket = new RegExp(`\\[([^\\]]+)\\]\\(${escapedHref}\\)`);
                  const matchFromBracket = searchWindow.slice(bracketPos).match(patternFromBracket);
                  if (matchFromBracket) {
                    const absoluteIndex = searchStart + bracketPos;
                    links.push({
                      raw: matchFromBracket[0],
                      href: linkToken.href,
                      text: matchFromBracket[1],
                      index: absoluteIndex,
                      end: absoluteIndex + matchFromBracket[0].length,
                    });
                    searchPos = absoluteIndex + matchFromBracket[0].length;
                    linkFound = true;
                  } else {
                    // If direct match fails, try a broader search with the pattern
                    const windowPattern = new RegExp(`\\[([^\\]]+)\\]\\(${escapedHref}\\)`);
                    const windowMatch = searchWindow.match(windowPattern);
                    if (windowMatch) {
                      const absoluteIndex = searchStart + searchWindow.indexOf(windowMatch[0]);
                      links.push({
                        raw: windowMatch[0],
                        href: linkToken.href,
                        text: windowMatch[1],
                        index: absoluteIndex,
                        end: absoluteIndex + windowMatch[0].length,
                      });
                      searchPos = absoluteIndex + windowMatch[0].length;
                      linkFound = true;
                    }
                  }
                } else {
                  // No bracket found, try pattern match on the entire window as fallback
                  const windowPattern = new RegExp(`\\[([^\\]]+)\\]\\(${escapedHref}\\)`);
                  const windowMatch = searchWindow.match(windowPattern);
                  if (windowMatch) {
                    const absoluteIndex = searchStart + searchWindow.indexOf(windowMatch[0]);
                    links.push({
                      raw: windowMatch[0],
                      href: linkToken.href,
                      text: windowMatch[1],
                      index: absoluteIndex,
                      end: absoluteIndex + windowMatch[0].length,
                    });
                    searchPos = absoluteIndex + windowMatch[0].length;
                    linkFound = true;
                  }
                }

                // If we found the href but couldn't reconstruct the full link, advance searchPos
                // to prevent getting stuck on the same position for subsequent links
                if (!linkFound) {
                  searchPos = hrefIndex + linkToken.href.length;
                }
              } else {
                // href not found at all - advance searchPos to prevent infinite loops
                // Try to find the next potential link position by searching for common link patterns
                const nextBracket = text.indexOf('[', searchPos);
                if (nextBracket !== -1) {
                  searchPos = nextBracket;
                } else {
                  // No more brackets found, advance to end of text to stop searching
                  searchPos = text.length;
                }
              }
            }
          }
        } catch (error) {
          // Fallback to improved regex if Lexer fails
          // This regex handles URLs with parentheses by using balanced matching
          const linkPattern = /\[([^\]]*(?:\\.[^\]]*)*)\]\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g;
          let match;
          while ((match = linkPattern.exec(text)) !== null) {
            links.push({
              raw: match[0],
              href: match[2],
              text: match[1].replace(/\\(.)/g, '$1'), // Unescape
              index: match.index,
              end: match.index + match[0].length,
            });
          }
        }

        // Sort by index to ensure correct order
        links.sort((a, b) => a.index - b.index);
        return links;
      }

      // Extract all links using Lexer
      const allLinks = extractLinksWithLexer(modifiedContent);

      if (allLinks.length >= 2) {
        // Find groups of consecutive links (only whitespace between them)
        const groups: Array<{ links: typeof allLinks; startIndex: number; endIndex: number }> = [];
        let currentGroup: typeof allLinks = [allLinks[0]];

        for (let i = 1; i < allLinks.length; i++) {
          const prevLink = allLinks[i - 1];
          const currLink = allLinks[i];
          const between = modifiedContent.slice(prevLink.end, currLink.index);

          // Check if only whitespace between links
          if (/^\s*$/.test(between)) {
            currentGroup.push(currLink);
          } else {
            // End current group if it has 2+ links
            if (currentGroup.length >= 2) {
              groups.push({
                links: currentGroup,
                startIndex: currentGroup[0].index,
                endIndex: currentGroup[currentGroup.length - 1].end,
              });
            }
            // Start new group
            currentGroup = [currLink];
          }
        }

        // Don't forget the last group
        if (currentGroup.length >= 2) {
          groups.push({
            links: currentGroup,
            startIndex: currentGroup[0].index,
            endIndex: currentGroup[currentGroup.length - 1].end,
          });
        }

        // Replace groups with citation group placeholders (process in reverse to maintain indices)
        if (groups.length > 0) {
          let groupProcessed = modifiedContent;
          for (let g = groups.length - 1; g >= 0; g--) {
            const group = groups[g];
            const urls = group.links.map((l) => l.href);
            const texts = group.links.map((l) => l.text);
            const groupId = `XCITATIONGRPX${citationGroups.length}XEND`;

            citationGroups.push({ urls, texts, id: groupId });

            // Processing right-to-left means replacements don't affect earlier indices
            groupProcessed = groupProcessed.slice(0, group.startIndex) + groupId + groupProcessed.slice(group.endIndex);
          }
          modifiedContent = groupProcessed;
        }
      }

      // Additionally, process citation groups inside protected table rows
      // Use the same Lexer-based approach for consistency
      if (typeof tableBlocks !== 'undefined' && tableBlocks.length > 0) {
        for (let t = 0; t < tableBlocks.length; t++) {
          let rowContent = tableBlocks[t].content;

          // Extract links using Lexer (same function as above)
          const rowLinks = extractLinksWithLexer(rowContent);

          if (rowLinks.length < 2) continue;

          // Find groups of consecutive links (only whitespace between them)
          const groups: Array<{ links: typeof rowLinks; startIndex: number; endIndex: number }> = [];
          let currentGroup: typeof rowLinks = [rowLinks[0]];

          for (let i = 1; i < rowLinks.length; i++) {
            const prevLink = rowLinks[i - 1];
            const currLink = rowLinks[i];
            const between = rowContent.slice(prevLink.end, currLink.index);

            // Check if only whitespace between links
            if (/^\s*$/.test(between)) {
              currentGroup.push(currLink);
            } else {
              // End current group if it has 2+ links
              if (currentGroup.length >= 2) {
                groups.push({
                  links: currentGroup,
                  startIndex: currentGroup[0].index,
                  endIndex: currentGroup[currentGroup.length - 1].end,
                });
              }
              // Start new group
              currentGroup = [currLink];
            }
          }

          // Don't forget the last group
          if (currentGroup.length >= 2) {
            groups.push({
              links: currentGroup,
              startIndex: currentGroup[0].index,
              endIndex: currentGroup[currentGroup.length - 1].end,
            });
          }

          if (groups.length === 0) continue;

          // Replace groups with citation group placeholders (process in reverse to maintain indices)
          let newRow = rowContent;
          for (let g = groups.length - 1; g >= 0; g--) {
            const group = groups[g];
            const urls = group.links.map((l) => l.href);
            const texts = group.links.map((l) => l.text);
            const groupId = `XCITATIONGRPX${citationGroups.length}XEND`;

            citationGroups.push({ urls, texts, id: groupId });

            // Processing right-to-left means replacements don't affect earlier indices
            newRow = newRow.slice(0, group.startIndex) + groupId + newRow.slice(group.endIndex);
          }

          tableBlocks[t].content = newRow;
        }
      }

      // Restore protected blocks in the main content and in collected citation texts
      // Use replaceAll or global regex to ensure ALL instances are replaced
      monetaryBlocks.forEach(({ id, content }) => {
        const regex = new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        modifiedContent = modifiedContent.replace(regex, content);
        // Also restore inside citation titles so hover cards don't show placeholders
        for (let i = 0; i < citations.length; i++) {
          citations[i].text = citations[i].text.replace(regex, content);
        }
        // Also restore inside latexBlocks content to prevent placeholders showing in rendered LaTeX
        for (let i = 0; i < latexBlocks.length; i++) {
          latexBlocks[i].content = latexBlocks[i].content.replace(regex, content);
        }
      });

      codeBlocks.forEach(({ id, content }) => {
        const regex = new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        modifiedContent = modifiedContent.replace(regex, content);
        for (let i = 0; i < citations.length; i++) {
          citations[i].text = citations[i].text.replace(regex, content);
        }
        // Also restore inside latexBlocks content to prevent placeholders showing in rendered LaTeX
        for (let i = 0; i < latexBlocks.length; i++) {
          latexBlocks[i].content = latexBlocks[i].content.replace(regex, content);
        }
      });

      // Restore table rows LAST so they render with all LaTeX processed
      tableBlocks.forEach(({ id, content }) => {
        // Restore any protected monetary or code placeholders within the row content first
        let restoredRow = content;
        monetaryBlocks.forEach(({ id: mid, content: mcontent }) => {
          const mregex = new RegExp(mid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          restoredRow = restoredRow.replace(mregex, mcontent);
        });
        codeBlocks.forEach(({ id: cid, content: ccontent }) => {
          const cregex = new RegExp(cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          restoredRow = restoredRow.replace(cregex, ccontent);
        });

        const tregex = new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        modifiedContent = modifiedContent.replace(tregex, restoredRow);
        for (let i = 0; i < citations.length; i++) {
          citations[i].text = citations[i].text.replace(tregex, restoredRow);
        }
      });

      // Escape standalone ~ (not part of ~~) to prevent unintended strikethrough.
      // marked v17 treats ~text~ as <del>, which breaks patterns like ~$230 billion.
      // Using negative lookbehind/lookahead so intentional ~~text~~ is left intact.
      modifiedContent = modifiedContent.replace(/(?<![~\\])~(?!~)/g, '\\~');

      return {
        processedContent: modifiedContent,
        citations,
        citationGroups,
        latexBlocks,
        appPreviewBlocks,
        downloadBlocks,
        isProcessing: false,
      };
    } catch (error) {
      console.error('Error processing content:', error);
      return {
        processedContent: content,
        citations: [],
        citationGroups: [],
        latexBlocks: [],
        appPreviewBlocks: [],
        downloadBlocks: [],
        isProcessing: false,
      };
    }
  }, [content]);
};

const InlineCode: React.FC<{ code: string; elementKey: string }> = React.memo(({ code }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
      sileo.success({
        title: 'Code copied to clipboard',
        description: 'You can now paste it anywhere',
        icon: <Copy className="h-4 w-4" />,
      });
    } catch (error) {
      console.error('Failed to copy code:', error);
      sileo.error({
        title: 'Failed to copy code',
        description: 'Please try again or copy manually',
        icon: <X className="h-4 w-4" />,
      });
    }
  }, [code]);

  return (
    <code
      className={cn(
        'inline rounded px-1.5 py-0.5 font-mono text-[0.8em]',
        'bg-muted/40 border border-border/30',
        'text-foreground/80',
        'before:content-none after:content-none',
        'hover:bg-muted/60 active:bg-muted/60 transition-colors duration-150 cursor-pointer',
        'align-baseline touch-manipulation tracking-wide',
        isCopied && 'ring-1 ring-primary/30 bg-primary/5',
      )}
      onClick={handleCopy}
      title={isCopied ? 'Copied!' : 'Click to copy'}
    >
      {code}
    </code>
  );
});

InlineCode.displayName = 'InlineCode';

// Safe LaTeX wrapper with error handling
const SafeLatex: React.FC<{
  children: string;
  delimiters: Array<{ left: string; right: string; display: boolean }>;
  isBlock?: boolean;
}> = React.memo(({ children, delimiters, isBlock = false }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [children]);

  if (hasError) {
    // Fallback: render raw LaTeX text in a code-style format
    return (
      <code
        className={cn(
          'inline rounded px-1 py-0.5 font-mono text-[0.9em]',
          'bg-muted/50 text-foreground/85',
          isBlock && 'block my-4 p-2',
        )}
        style={{
          fontFamily: geistMono.style.fontFamily,
          fontSize: '0.85em',
        }}
        title="LaTeX rendering failed - showing raw content"
      >
        {children}
      </code>
    );
  }

  try {
    return (
      <Latex delimiters={delimiters} strict={false}>
        {children}
      </Latex>
    );
  } catch (error) {
    console.warn('LaTeX rendering error:', error, 'Content:', children);
    setHasError(true);
    return (
      <code
        className={cn(
          'inline rounded px-1 py-0.5 font-mono text-[0.9em]',
          'bg-muted/50 text-foreground/85',
          isBlock && 'block my-4 p-2',
        )}
        style={{
          fontFamily: geistMono.style.fontFamily,
          fontSize: '0.85em',
        }}
        title="LaTeX rendering failed - showing raw content"
      >
        {children}
      </code>
    );
  }
});

SafeLatex.displayName = 'SafeLatex';

const MarkdownTableWithActions: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isMobile = useIsMobile();

  const csvUtils = useMemo(
    () => ({
      escapeCsvValue: (value: string): string => {
        const needsQuotes = /[",\n]/.test(value);
        const escaped = value.replace(/"/g, '""');
        return needsQuotes ? `"${escaped}"` : escaped;
      },
      buildCsvFromTable: (table: HTMLTableElement): string => {
        const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[];
        const csvLines: string[] = [];
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('th,td')) as HTMLTableCellElement[];
          if (cells.length > 0) {
            const line = cells
              .map((cell) => csvUtils.escapeCsvValue(cell.innerText.replace(/\u00A0/g, ' ').trim()))
              .join(',');
            csvLines.push(line);
          }
        }
        return csvLines.join('\n');
      },
    }),
    [],
  );

  const handleDownloadCsv = useCallback(() => {
    const tableEl = containerRef.current?.querySelector('[data-slot="table"]') as HTMLTableElement | null;
    if (!tableEl) return;

    try {
      const csv = csvUtils.buildCsvFromTable(tableEl);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+/, '');
      a.href = url;
      a.download = `table-${timestamp}.csv`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download CSV:', error);
    }
  }, [csvUtils]);

  const updateScrollIndicators = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    updateScrollIndicators();
    scrollEl.addEventListener('scroll', updateScrollIndicators);
    const resizeObserver = new ResizeObserver(updateScrollIndicators);
    resizeObserver.observe(scrollEl);

    return () => {
      scrollEl.removeEventListener('scroll', updateScrollIndicators);
      resizeObserver.disconnect();
    };
  }, [updateScrollIndicators]);

  const handleTouchStart = useCallback(() => {
    if (isMobile) {
      setShowActions((prev) => !prev);
    }
  }, [isMobile]);

  return (
    <div
      ref={containerRef}
      className="relative group my-2.5"
      onMouseEnter={() => !isMobile && setShowActions(true)}
      onMouseLeave={() => !isMobile && setShowActions(false)}
      onTouchStart={handleTouchStart}
    >
      <div
        className={cn(
          'absolute -top-3 -right-3 z-10 transition-opacity duration-200',
          showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100',
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="size-7 text-xs shadow-sm rounded-sm"
              onClick={handleDownloadCsv}
              aria-label="Download CSV"
            >
              <Download className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={2}>
            Download CSV
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="border border-foreground/10 rounded-sm overflow-hidden">
        <div
          ref={scrollRef}
          className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ scrollbarWidth: 'thin' }}
        >
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-background to-transparent pointer-events-none z-10" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-background to-transparent pointer-events-none z-10" />
          )}
          <div>
            <Table className="m-0! min-w-full border-0! [&>div]:overflow-visible! [&>div]:relative! [&_tr]:border-foreground/10">
              {children}
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
});

MarkdownTableWithActions.displayName = 'MarkdownTableWithActions';

// Cache for metadata to avoid redundant fetches
const metadataCache = new Map<string, Promise<any>>();

function fetchMetadata(url: string) {
  if (!metadataCache.has(url)) {
    metadataCache.set(
      url,
      fetch(`https://metadata.scira.app/?url=${encodeURIComponent(url)}`)
        .then((res) => res.json())
        .then((data) => (data.url ? data : null))
        .catch(() => null),
    );
  }
  return metadataCache.get(url)!;
}

// Preload metadata for all citation URLs in the content
function preloadCitationMetadata(content: string) {
  // Extract all citation URLs from content
  const citationPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const urls = new Set<string>();
  let match;

  while ((match = citationPattern.exec(content)) !== null) {
    const url = match[2];
    if (isValidUrl(url)) {
      urls.add(url);
    }
  }

  // Start fetching metadata for all URLs in the background
  urls.forEach((url) => {
    fetchMetadata(url);
  });
}

const LinkPreviewContent = ({ href, title }: { href: string; title?: string }) => {
  const metadata = use(fetchMetadata(href));
  const [faviconError, setFaviconError] = useState(false);
  const [googleFaviconError, setGoogleFaviconError] = useState(false);
  const [proxyError, setProxyError] = useState(false);

  const domain = useMemo(() => {
    try {
      return new URL(href).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }, [href]);

  if (!domain) return null;

  const displayDomain = getDisplayDomain(domain);

  // Fallback to original text if metadata title is "Access Denied" or empty
  const isAccessDenied = metadata?.title === 'Access Denied';
  const displayTitle = metadata?.title && !isAccessDenied ? metadata.title : title;

  const metadataFavicon = metadata?.logo;
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  // Determine favicon source based on error states
  let favicon: string;
  let useProxy = false;
  let showIcon = false;

  if (!faviconError && metadataFavicon) {
    // Try metadata logo first
    favicon = metadataFavicon;
  } else if (!googleFaviconError) {
    // If metadata logo failed/doesn't exist, try Google favicon
    favicon = googleFavicon;
  } else if (!proxyError && metadataFavicon) {
    // If Google also failed and we have a metadata logo, try proxying it
    favicon = `/api/proxy-image?url=${encodeURIComponent(metadataFavicon)}`;
    useProxy = true;
  } else {
    // All failed, show globe icon
    showIcon = true;
    favicon = '';
  }

  const handleFaviconError = () => {
    if (metadataFavicon && !faviconError) {
      // Metadata logo failed, try Google next
      setFaviconError(true);
    } else if (!googleFaviconError) {
      // Google favicon failed, try proxy next
      setGoogleFaviconError(true);
    } else if (!proxyError) {
      // Proxy failed, show icon
      setProxyError(true);
    }
  };

  return (
    <div className="flex flex-col text-xs m-0">
      <div className="flex items-center gap-2 px-3 py-2">
        {showIcon ? (
          <div className="w-3.5 h-3.5 flex items-center justify-center text-muted-foreground/70">
            <Globe size={14} />
          </div>
        ) : useProxy ? (
          <img
            src={favicon}
            alt=""
            width={14}
            height={14}
            className="rounded-sm shrink-0"
            onError={handleFaviconError}
          />
        ) : (
          <Image
            src={favicon}
            alt=""
            width={14}
            height={14}
            className="rounded-sm shrink-0"
            onError={handleFaviconError}
          />
        )}
        <span className="truncate text-muted-foreground text-[10px]">{displayDomain}</span>
      </div>
      {displayTitle && (
        <div className="px-3 pb-2.5 pt-0">
          <h3 className="font-normal text-[11px] m-0 text-foreground/90 line-clamp-2 leading-relaxed">
            {displayTitle}
          </h3>
        </div>
      )}
    </div>
  );
};

const LinkPreview = React.memo(({ href, title }: { href: string; title?: string }) => {
  const domain = useMemo(() => {
    try {
      return new URL(href).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }, [href]);

  const displayDomain = getDisplayDomain(domain);

  return (
    <Suspense
      fallback={
        <div className="flex flex-col text-xs m-0">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-3.5 h-3.5 bg-muted rounded-sm shrink-0 animate-pulse" />
            <span className="truncate text-muted-foreground text-[10px]">{displayDomain}</span>
          </div>
          <div className="px-3 pb-2.5 pt-0">
            <div className="h-3.5 w-3/4 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      }
    >
      <LinkPreviewContent href={href} title={title} />
    </Suspense>
  );
});

LinkPreview.displayName = 'LinkPreview';

const AppLinkPreview = React.memo(({ href, title }: { href: string; title?: string }) => {
  const previewHref = useMemo(() => getAppPreviewHref(href), [href]);
  const screenshotSrc = useMemo(() => getAppPreviewScreenshotSrc(href), [href]);
  const previewDescription = useMemo(() => getAppPreviewDescription(href), [href]);
  const previewTitle = title?.trim() && title.trim() !== href ? title.trim() : 'Open deployed app';
  const [hasScreenshotError, setHasScreenshotError] = useState(false);

  return (
    <span className="inline-flex w-full max-w-full align-middle my-1">
      <Link
        href={previewHref}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex w-full max-w-[420px] flex-col overflow-hidden rounded-xl border border-border/60 bg-muted/40 no-underline transition-colors hover:bg-muted"
      >
        <span
          className="relative block w-full overflow-hidden border-b border-border/60 bg-muted/70"
          style={{ aspectRatio: '16/10' }}
        >
          {hasScreenshotError || !screenshotSrc ? (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,#ffffff14,transparent_55%),linear-gradient(180deg,#0f172a,#111827)] text-white/85">
              <Globe className="size-8 opacity-60" />
              <span className="px-4 text-center text-[11px] leading-relaxed text-white/50">Live app</span>
            </span>
          ) : (
            <Image
              src={screenshotSrc}
              alt={previewTitle}
              fill
              unoptimized
              className="object-fill object-top transition-transform duration-300 group-hover:scale-[1.02] m-0!"
              onError={() => setHasScreenshotError(true)}
            />
          )}
          <span className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/35 to-transparent" />
        </span>
        <span className="flex items-center gap-2 px-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background text-foreground/80">
            <Globe className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-medium text-foreground">{previewTitle}</span>
            <span className="block truncate text-[10px] text-muted-foreground">{previewDescription}</span>
          </span>
          <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </Link>
    </span>
  );
});

AppLinkPreview.displayName = 'AppLinkPreview';

// Mobile-friendly HoverCard component
// On desktop: uses uncontrolled mode so Radix manages hover state internally,
// which prevents streaming re-renders from closing the hover card.
// On mobile: uses controlled mode for tap-to-open behavior.
const MobileHoverCard: React.FC<{
  href: string;
  text: React.ReactNode;
  isCitation?: boolean;
  citationText?: string;
}> = React.memo(({ href, text, isCitation = false, citationText }) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const title = citationText || (typeof text === 'string' ? text : '');

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (isMobile) {
        if (isOpen) {
          // If preview is already open, allow navigation
          // Don't prevent default, let the link work normally
          setIsOpen(false);
        } else {
          // First tap: show preview
          e.preventDefault();
          setIsOpen(true);
        }
      }
      // On desktop, let the link work normally (hover will show preview)
    },
    [isMobile, isOpen],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const linkClassName = isCitation
    ? 'cursor-pointer inline-flex items-center align-middle text-[10px] leading-tight font-medium no-underline px-1.5 py-[2px] mb-0.5! m-0! rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 outline-none touch-manipulation'
    : 'text-primary/90 no-underline hover:text-primary font-medium transition-colors touch-manipulation rounded-sm px-0.5';

  // On mobile, use controlled mode for tap-to-open
  if (isMobile) {
    return (
      <HoverCard open={isOpen} onOpenChange={handleOpenChange}>
        <HoverCardTrigger asChild>
          <Link href={href} target="_blank" onClick={handleClick} className={linkClassName}>
            {text}
          </Link>
        </HoverCardTrigger>
        <HoverCardContent
          side="bottom"
          align="start"
          sideOffset={6}
          className="w-60 p-0 shadow-md border border-border/60 rounded-lg overflow-hidden bg-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <LinkPreview href={href} title={title} />
        </HoverCardContent>
      </HoverCard>
    );
  }

  // On desktop, use uncontrolled mode so hover state survives parent re-renders during streaming
  return (
    <HoverCard openDelay={10}>
      <HoverCardTrigger asChild>
        <Link href={href} target="_blank" className={linkClassName}>
          {text}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-60 p-0 shadow-md border border-border/60 rounded-lg overflow-hidden bg-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <LinkPreview href={href} title={title} />
      </HoverCardContent>
    </HoverCard>
  );
});

MobileHoverCard.displayName = 'MobileHoverCard';

interface CitationGroupProps {
  urls: string[];
  texts: string[];
  elementKey: string;
}

// Citation item with favicon fallback
const CitationItem = React.memo(
  ({
    url,
    text,
    domain,
    displayDomain,
    itemKey,
  }: {
    url: string;
    text: string;
    domain: string;
    displayDomain: string;
    itemKey: string;
  }) => {
    const [faviconError, setFaviconError] = useState(false);
    const [proxyError, setProxyError] = useState(false);
    const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    const proxiedFavicon = `/api/proxy-image?url=${encodeURIComponent(googleFavicon)}`;
    const platform = getPlatformFromUrl(url);

    const handleError = () => {
      if (!faviconError) {
        setFaviconError(true);
      } else {
        setProxyError(true);
      }
    };

    // Platform-specific icon rendering
    const renderIcon = () => {
      if (platform === 'youtube') {
        return (
          <div className="w-[14px] h-[14px] flex items-center justify-center text-muted-foreground">
            <Youtube size={14} />
          </div>
        );
      }
      if (platform === 'spotify') {
        return (
          <div className="w-[14px] h-[14px] flex items-center justify-center text-muted-foreground">
            <SpotifyIcon className="w-[14px] h-[14px]" />
          </div>
        );
      }
      if (proxyError) {
        return (
          <div className="w-[14px] h-[14px] flex items-center justify-center text-muted-foreground">
            <Globe size={14} />
          </div>
        );
      }
      if (faviconError) {
        return (
          <img
            src={proxiedFavicon}
            alt=""
            width={14}
            height={14}
            className="rounded-sm shrink-0"
            onError={handleError}
          />
        );
      }
      return (
        <Image
          src={googleFavicon}
          alt=""
          width={14}
          height={14}
          className="rounded-sm shrink-0"
          onError={handleError}
        />
      );
    };

    // Platform-specific label
    const platformLabel = platform === 'youtube' ? 'YouTube' : platform === 'spotify' ? 'Spotify' : displayDomain;

    return (
      <Link
        key={itemKey}
        href={url}
        target="_blank"
        className="flex items-center gap-2 px-3 py-1.5! no-underline hover:bg-accent/50 active:bg-accent/50 transition-colors duration-150 touch-manipulation"
      >
        {renderIcon()}
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          <h5 className="text-[11px] font-medium text-foreground truncate m-0 flex-1">{text}</h5>
          <span className="text-[9px] text-muted-foreground/60 m-0 shrink-0">{platformLabel}</span>
        </div>
      </Link>
    );
  },
);

CitationItem.displayName = 'CitationItem';

const CitationGroup = React.memo(({ urls, texts, elementKey }: CitationGroupProps) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const firstDomain = useMemo(() => {
    try {
      const hostname = new URL(urls[0]).hostname.replace('www.', '');
      return getDisplayDomain(hostname);
    } catch {
      return getDisplayDomain(urls[0]);
    }
  }, [urls]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      if (isMobile) {
        if (isOpen) {
          // If preview is already open, close it
          setIsOpen(false);
        } else {
          // First tap: show preview
          e.preventDefault();
          setIsOpen(true);
        }
      }
    },
    [isMobile, isOpen],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const triggerContent = (
    <span
      onClick={isMobile ? handleClick : undefined}
      className="cursor-pointer inline-flex items-center align-middle gap-1 text-[10px] leading-tight font-medium no-underline px-1.5 py-[2px] mb-0.5! m-0! rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 outline-none touch-manipulation"
    >
      <span>{firstDomain}</span>
      <span className="text-muted-foreground/50 text-[9px]">+{urls.length - 1}</span>
    </span>
  );

  const dropdownContent = (
    <div className="relative">
      <div className="px-3 py-0 border-b border-border/40">
        <span className="text-[10px] text-muted-foreground font-medium">{urls.length} sources</span>
      </div>
      <div className="max-h-[320px] overflow-y-auto divide-y divide-border/20">
        {urls.map((url, index) => {
          let domain = '';
          try {
            domain = new URL(url).hostname.replace('www.', '');
          } catch {
            domain = url;
          }

          const displayDomain = getDisplayDomain(domain);

          return (
            <CitationItem
              key={`${elementKey}-${index}`}
              url={url}
              text={texts[index]}
              domain={domain}
              displayDomain={displayDomain}
              itemKey={`${elementKey}-${index}`}
            />
          );
        })}
      </div>
    </div>
  );

  // On mobile, use controlled mode for tap-to-open
  if (isMobile) {
    return (
      <HoverCard open={isOpen} onOpenChange={handleOpenChange}>
        <HoverCardTrigger asChild>{triggerContent}</HoverCardTrigger>
        <HoverCardContent
          side="bottom"
          align="start"
          sideOffset={8}
          className="w-64 p-0 shadow-md border border-border/60 rounded-lg overflow-hidden bg-popover"
          onClick={(e) => e.stopPropagation()}
        >
          {dropdownContent}
        </HoverCardContent>
      </HoverCard>
    );
  }

  // On desktop, use uncontrolled mode so hover state survives parent re-renders during streaming
  return (
    <HoverCard openDelay={10}>
      <HoverCardTrigger asChild>{triggerContent}</HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-64 p-0 shadow-md border border-border/60 rounded-lg overflow-hidden bg-popover"
        onClick={(e) => e.stopPropagation()}
      >
        {dropdownContent}
      </HoverCardContent>
    </HoverCard>
  );
});

CitationGroup.displayName = 'CitationGroup';

// Fetch image as blob and trigger a real download. Tries direct URL first; on CORS failure uses our proxy.
async function downloadFileBlob(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

const FileLinkPreview = React.memo(({ href, title }: { href: string; title?: string }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const preview = useMemo(() => getFilePreviewDefinition(href, title), [href, title]);

  const handleDownload = useCallback(async () => {
    if (!preview) return;

    setIsDownloading(true);
    try {
      await downloadFileBlob(href, preview.filename);
    } catch {
      window.open(href, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloading(false);
    }
  }, [href, preview]);

  if (!preview) return null;

  const Icon = preview.icon;

  return (
    <span className="inline-flex max-w-full align-middle my-1">
      <span className="inline-flex max-w-[360px] items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-2.5 py-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 items-center gap-2 no-underline"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background text-foreground/80">
            <Icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-medium text-foreground">{preview.title}</span>
            <span className="block truncate text-[10px] uppercase tracking-wide text-muted-foreground">
              {preview.typeLabel} download
            </span>
          </span>
        </a>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 shrink-0 rounded-lg"
          onClick={handleDownload}
        >
          {isDownloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          <span className="sr-only">Download file</span>
        </Button>
      </span>
    </span>
  );
});

FileLinkPreview.displayName = 'FileLinkPreview';

async function downloadImageBlob(url: string, filename: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { mode: 'cors' });
  } catch {
    // CORS or network — fetch via same-origin proxy
    res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

// Module-level cache so image dimensions survive component remounts during streaming.
// Keyed by src URL. Once an image's natural size is known it never needs to be measured again.
const imageSizeCache = new Map<string, { w: number; h: number }>();

// Inline image with Cambio shared animation expand and 3-dot dropdown for actions.
// Dimensions are cached at module level so remounts during streaming don't cause layout shift.
const ImageWithPreview = React.memo(({ src, alt, title }: { src: string; alt?: string; title?: string }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Seed from cache so a remount is instant — no layout shift
  const cached = imageSizeCache.get(src);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(cached ?? null);

  const filename = useMemo(() => {
    const base = (alt || title || 'image').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const ext = src.match(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i)?.[1] || 'png';
    return `${base}.${ext}`;
  }, [alt, title, src]);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const size = { w: img.naturalWidth, h: img.naturalHeight };
      imageSizeCache.set(src, size);
      setNaturalSize(size);
    },
    [src],
  );

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      await downloadImageBlob(src, filename);
    } catch {
      // CORS or network error — fall back to opening in new tab
      window.open(src, '_blank');
    } finally {
      setIsDownloading(false);
    }
  }, [src, filename]);

  const handleOpenInNewTab = useCallback(() => {
    window.open(src, '_blank');
  }, [src]);

  // Lock layout: aspect-ratio from cache or 16:9 placeholder.
  // overflow-anchor:none tells the browser scroll-anchoring algo to ignore this element,
  // so recreating the <img> DOM node during streaming never pulls the viewport up.
  // contain:content prevents children from changing element size.
  const containerStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      contain: 'content',
      overflowAnchor: 'none',
    };
    if (naturalSize) {
      return { ...base, aspectRatio: `${naturalSize.w} / ${naturalSize.h}` };
    }
    return { ...base, aspectRatio: '16 / 9', maxHeight: '400px' };
  }, [naturalSize]);

  return (
    <span className="block my-2 relative group" style={{ overflowAnchor: 'none' }}>
      <Cambio.Root motion="smooth">
        <Cambio.Trigger
          className="w-full rounded-lg border border-border overflow-hidden cursor-zoom-in block bg-muted/30"
          style={containerStyle}
        >
          <img
            src={src}
            alt={alt || ''}
            title={title || undefined}
            className="w-full h-full object-contain p-0! m-0!"
            draggable={false}
            onLoad={handleLoad}
          />
        </Cambio.Trigger>
        <Cambio.Portal>
          <Cambio.Backdrop className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
          <Cambio.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative">
              <img
                src={src}
                alt={alt || ''}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                draggable={false}
              />
              <Cambio.Close className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </Cambio.Close>
            </div>
          </Cambio.Popup>
        </Cambio.Portal>
      </Cambio.Root>
      {/* 3-dot dropdown menu */}
      <span
        className={cn(
          'absolute top-2 right-2 rotate-90 transition-all duration-200',
          dropdownOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0',
        )}
      >
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 rounded-lg bg-background/95 backdrop-blur-md border border-border/50 shadow-none hover:bg-accent"
            >
              <MoreVertical className="h-3.5 w-3.5" />
              <span className="sr-only">Image options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {isDownloading ? 'Downloading...' : 'Download image'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenInNewTab}>
              <ExternalLink className="h-3.5 w-3.5" />
              Open in new tab
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
      {alt && alt !== '' && alt !== 'img' && (
        <span className="block text-xs text-muted-foreground my-1 text-center">{alt}</span>
      )}
    </span>
  );
});

ImageWithPreview.displayName = 'ImageWithPreview';

const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, isUserMessage = false }) => {
    const {
      processedContent,
      citations: extractedCitations,
      citationGroups,
      latexBlocks,
      appPreviewBlocks,
      downloadBlocks,
      isProcessing,
    } = useProcessedContent(content);
    const citationLinks = extractedCitations;

    // Preload metadata for all citation URLs as content streams in
    useEffect(() => {
      if (!isUserMessage && content) {
        preloadCitationMetadata(content);
      }
    }, [content, isUserMessage]);

    // Optimized element key generation using content hash instead of indices
    const contentHash = useMemo(() => {
      // Simple hash for stable keys
      let hash = 0;
      const str = content.slice(0, 200); // Use first 200 chars for hash
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36);
    }, [content]);

    // Use closures to maintain counters without re-creating on each render
    const getElementKey = useMemo(() => {
      const counters = {
        paragraph: 0,
        code: 0,
        heading: 0,
        list: 0,
        listItem: 0,
        blockquote: 0,
        table: 0,
        tableRow: 0,
        tableCell: 0,
        link: 0,
        text: 0,
        image: 0,
        hr: 0,
      };

      return (type: keyof typeof counters, content?: string) => {
        const count = counters[type]++;
        const contentPrefix = content ? content.slice(0, 20) : '';
        // For code blocks, use a content-based key WITHOUT contentHash to preserve state across re-renders
        // This prevents collapse state from resetting when other content changes
        if (type === 'code' && content) {
          let codeHash = 0;
          for (let i = 0; i < Math.min(content.length, 100); i++) {
            codeHash = ((codeHash << 5) - codeHash + content.charCodeAt(i)) | 0;
          }
          return `code-${Math.abs(codeHash).toString(36)}-${content.length}-${count}`;
        }
        // For images, use stable content-based keys WITHOUT contentHash
        // so Cambio expand state and image elements don't jank/remount during streaming
        if (type === 'image' && content) {
          let imgHash = 0;
          for (let i = 0; i < Math.min(content.length, 200); i++) {
            imgHash = ((imgHash << 5) - imgHash + content.charCodeAt(i)) | 0;
          }
          return `img-${Math.abs(imgHash).toString(36)}-${content.length}-${count}`;
        }
        // For table elements, use stable counter-based keys WITHOUT contentHash
        // so MarkdownTableWithActions copy/export state doesn't reset during streaming
        if (type === 'table' || type === 'tableRow' || type === 'tableCell') {
          return `${type}-${count}`;
        }
        // For links and citation groups, use content-based stable keys WITHOUT contentHash
        // so hover cards / citation group popovers don't get unmounted during streaming
        if (type === 'link' && content) {
          let linkHash = 0;
          for (let i = 0; i < Math.min(content.length, 100); i++) {
            linkHash = ((linkHash << 5) - linkHash + content.charCodeAt(i)) | 0;
          }
          return `link-${Math.abs(linkHash).toString(36)}-${count}`;
        }
        return `${contentHash}-${type}-${count}-${contentPrefix}`.replace(/[^a-zA-Z0-9-]/g, '');
      };
    }, [contentHash]);

    const renderHoverCard = useCallback(
      (href: string, text: React.ReactNode, isCitation: boolean = false, citationText?: string, stableKey?: string) => {
        return (
          <MobileHoverCard
            key={stableKey}
            href={href}
            text={text}
            isCitation={isCitation}
            citationText={citationText}
          />
        );
      },
      [],
    );

    const renderCitation = useCallback(
      (index: number, citationText: string, href: string, key: string) => {
        const platform = getPlatformFromUrl(href);

        // Special rendering for YouTube and Spotify
        if (platform === 'youtube' || platform === 'spotify') {
          const platformConfig =
            platform === 'youtube'
              ? { name: 'YouTube', icon: <Youtube className="w-3 h-3" /> }
              : { name: 'Spotify', icon: <SpotifyIcon className="w-3 h-3" /> };

          return (
            <HoverCard key={key} openDelay={10}>
              <HoverCardTrigger asChild>
                <Link
                  href={href}
                  target="_blank"
                  className="inline-flex items-center align-middle gap-1.5 px-1.5 py-[2px] mb-0.5! rounded-md text-[10px] leading-tight font-medium no-underline transition-colors bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {platformConfig.icon}
                  <span>{platformConfig.name}</span>
                </Link>
              </HoverCardTrigger>
              <HoverCardContent
                side="bottom"
                align="start"
                sideOffset={6}
                className="w-60 p-0 shadow-md border border-border/60 rounded-lg overflow-hidden bg-popover"
              >
                <LinkPreview href={href} title={citationText} />
              </HoverCardContent>
            </HoverCard>
          );
        }

        // Default citation rendering
        let displayDomain = '';
        try {
          const url = new URL(href);
          displayDomain = getDisplayDomain(url.hostname.replace('www.', ''));
        } catch {
          displayDomain = getDisplayDomain(href);
        }
        return <>{renderHoverCard(href, displayDomain, true, citationText, key)}</>;
      },
      [renderHoverCard],
    );

    const renderer: Partial<ReactRenderer> = useMemo(
      () => ({
        text(text: string) {
          // Check if text contains any LaTeX patterns or citation groups without mutating regex state
          const hasLatex = text.includes('XLATEXBLOCKX') || text.includes('XLATEXINLINEX');
          const hasCitationGroup = text.includes('XCITATIONGRPX');
          const hasAppPreview = text.includes('XAPPPREVX');
          const hasDownload = text.includes('XDOWNLOADX');

          if (!hasLatex && !hasCitationGroup && !hasAppPreview && !hasDownload) {
            return text;
          }

          // Create fresh regex patterns for execution
          const blockPattern = /XLATEXBLOCKX(\d+)XEND/g;
          const inlinePattern = /XLATEXINLINEX(\d+)XEND/g;
          const citationGroupPattern = /XCITATIONGRPX(\d+)XEND/g;
          const appPreviewPattern = /XAPPPREVX(\d+)XEND/g;
          const downloadPattern = /XDOWNLOADX(\d+)XEND/g;

          const components: any[] = [];
          let lastEnd = 0;
          const allMatches: Array<{
            match: RegExpExecArray;
            type: 'latex-block' | 'latex-inline' | 'citation-group' | 'app-preview' | 'download';
          }> = [];

          let match;
          while ((match = blockPattern.exec(text)) !== null) {
            allMatches.push({ match, type: 'latex-block' });
          }
          while ((match = inlinePattern.exec(text)) !== null) {
            allMatches.push({ match, type: 'latex-inline' });
          }
          while ((match = citationGroupPattern.exec(text)) !== null) {
            allMatches.push({ match, type: 'citation-group' });
          }
          while ((match = appPreviewPattern.exec(text)) !== null) {
            allMatches.push({ match, type: 'app-preview' });
          }
          while ((match = downloadPattern.exec(text)) !== null) {
            allMatches.push({ match, type: 'download' });
          }

          allMatches.sort((a, b) => a.match.index - b.match.index);

          allMatches.forEach(({ match, type }) => {
            const fullMatch = match[0];
            const start = match.index;

            if (start > lastEnd) {
              const textContent = text.slice(lastEnd, start);
              const key = getElementKey('text', textContent);
              components.push(<span key={key}>{textContent}</span>);
            }

            if (type === 'citation-group') {
              const citationGroup = citationGroups.find((group) => group.id === fullMatch);
              if (citationGroup) {
                const key = getElementKey('link', citationGroup.id);
                components.push(
                  <CitationGroup key={key} urls={citationGroup.urls} texts={citationGroup.texts} elementKey={key} />,
                );
              }
            } else if (type === 'app-preview') {
              const appPreview = appPreviewBlocks.find((block) => block.id === fullMatch);
              if (appPreview) {
                const key = getElementKey('link', appPreview.id);
                components.push(<AppLinkPreview key={key} href={appPreview.href} title={appPreview.title} />);
              }
            } else if (type === 'download') {
              const download = downloadBlocks.find((block) => block.id === fullMatch);
              if (download) {
                const key = getElementKey('link', download.id);
                components.push(<FileLinkPreview key={key} href={download.href} title={download.title} />);
              }
            } else {
              const latexBlock = latexBlocks.find((block) => block.id === fullMatch);
              if (latexBlock) {
                const key = getElementKey('text', latexBlock.content);
                if (type === 'latex-block') {
                  components.push(
                    <SafeLatex
                      key={key}
                      delimiters={[
                        { left: '$$', right: '$$', display: true },
                        { left: '\\[', right: '\\]', display: true },
                      ]}
                      isBlock={true}
                    >
                      {latexBlock.content}
                    </SafeLatex>,
                  );
                } else {
                  components.push(
                    <SafeLatex
                      key={key}
                      delimiters={[
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                      ]}
                      isBlock={false}
                    >
                      {latexBlock.content}
                    </SafeLatex>,
                  );
                }
              }
            }

            lastEnd = start + fullMatch.length;
          });

          if (lastEnd < text.length) {
            const textContent = text.slice(lastEnd);
            const key = getElementKey('text', textContent);
            components.push(<span key={key}>{textContent}</span>);
          }

          return components.length === 1 ? components[0] : <Fragment>{components}</Fragment>;
        },
        hr() {
          return <></>;
        },
        paragraph(children) {
          const key = getElementKey('paragraph', String(children));

          if (typeof children === 'string') {
            const blockMatch = children.match(/^XLATEXBLOCKX(\d+)XEND$/);
            if (blockMatch) {
              const latexBlock = latexBlocks.find((block) => block.id === children);
              if (latexBlock && latexBlock.isBlock) {
                return (
                  <div className="my-6 text-center" key={key}>
                    <SafeLatex
                      delimiters={[
                        { left: '$$', right: '$$', display: true },
                        { left: '\\[', right: '\\]', display: true },
                      ]}
                      isBlock={true}
                    >
                      {latexBlock.content}
                    </SafeLatex>
                  </div>
                );
              }
            }
          }

          return (
            <p
              key={key}
              className={`${isUserMessage ? 'leading-relaxed text-foreground mt-0 mb-1.5 last:mb-0' : 'pb-1 m-0!'} text-[15px] leading-[1.75] text-foreground/95`}
            >
              {children}
            </p>
          );
        },
        code(children, language) {
          const key = getElementKey('code', String(children));
          return (
            <CodeBlock language={language} elementKey={key} key={key}>
              {String(children)}
            </CodeBlock>
          );
        },
        codespan(code) {
          const codeString = typeof code === 'string' ? code : String(code || '');
          const key = getElementKey('code', codeString);
          return <InlineCode key={key} elementKey={key} code={codeString} />;
        },
        link(href, text) {
          const key = getElementKey('link', href);

          if (href.startsWith('mailto:')) {
            const email = href.replace('mailto:', '');
            return (
              <span key={key} className="break-all">
                {email}
              </span>
            );
          }

          const linkText = typeof text === 'string' ? text : href;
          const filePreview = getFilePreviewDefinition(href, typeof text === 'string' ? text : undefined);

          // For user messages, keep raw text to avoid accidental linkification changes
          if (isUserMessage) {
            if (linkText !== href && linkText !== '') {
              return (
                <span key={key} className="inline-block">
                  {linkText} ({href})
                </span>
              );
            }
            return (
              <span key={key} className="inline-block">
                {href}
              </span>
            );
          }

          if (filePreview) {
            return <FileLinkPreview key={key} href={href} title={linkText} />;
          }

          // If there's descriptive link text, render a normal anchor with hover preview.
          // This preserves full text inside tables and prevents truncation to citation chips.
          if (linkText && linkText !== href) {
            return renderHoverCard(href, linkText, false, undefined, key);
          }

          // For bare URLs, render as citation chips
          let citationIndex = citationLinks.findIndex((link) => link.link === href);
          if (citationIndex === -1) {
            citationLinks.push({ text: href, link: href });
            citationIndex = citationLinks.length - 1;
          }
          const citationText = citationLinks[citationIndex].text;
          return renderCitation(citationIndex, citationText, href, key);
        },
        image(src, alt, title) {
          const key = getElementKey('image', String(src));
          if (!src) return <span key={key} />;
          return <ImageWithPreview key={key} src={src} alt={alt || undefined} title={title || undefined} />;
        },
        heading(children, level) {
          const key = getElementKey('heading', String(children));
          const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
          const sizeClasses =
            {
              1: 'text-[18px] md:text-[22px] font-semibold! my-5!',
              2: 'text-[16px] md:text-[18px] font-semibold! my-4!',
              3: 'text-[15px] md:text-[16px] font-semibold! my-3.5!',
              4: 'text-[14px] md:text-[15px] font-medium my-3!',
              5: 'text-[13px] md:text-[14px] font-medium my-3!',
              6: 'text-[12px] md:text-[13px] font-medium my-3!',
            }[level] || '';

          return (
            <HeadingTag key={key} className={`${sizeClasses} text-foreground tracking-tight scroll-mt-20`}>
              {children}
            </HeadingTag>
          );
        },
        list(children, ordered) {
          const key = getElementKey('list');
          const ListTag = ordered ? 'ol' : 'ul';
          return (
            <ListTag
              key={key}
              className={cn(
                'my-6 space-y-3 text-foreground',
                ordered ? 'pl-8' : 'pl-8 list-disc marker:text-primary/70',
              )}
            >
              {children}
            </ListTag>
          );
        },
        listItem(children) {
          const key = getElementKey('listItem');
          return (
            <li key={key} className="pl-2 text-[15px] leading-relaxed text-foreground/90">
              <span className="inline">{children}</span>
            </li>
          );
        },
        blockquote(children) {
          const key = getElementKey('blockquote');
          return (
            <blockquote
              key={key}
              className="my-3 border-l-2 border-border/40 pl-3 text-[14px] leading-relaxed text-muted-foreground"
            >
              {children}
            </blockquote>
          );
        },
        strong(children) {
          const key = getElementKey('text', String(children));
          return (
            <strong key={key} className="font-medium text-foreground">
              {children}
            </strong>
          );
        },
        em(children) {
          const key = getElementKey('text', String(children));
          return (
            <em key={key} className="italic text-foreground/95">
              {children}
            </em>
          );
        },
        table(children) {
          const key = getElementKey('table');
          return <MarkdownTableWithActions key={key}>{children}</MarkdownTableWithActions>;
        },
        tableRow(children) {
          const key = getElementKey('tableRow');
          return <TableRow key={key}>{children}</TableRow>;
        },
        tableCell(children, flags) {
          const key = getElementKey('tableCell');
          const alignClass = flags.align ? `text-${flags.align}` : 'text-left';
          const isHeader = flags.header;

          // Map children with stable keys
          const childrenWithKeys = Array.isArray(children)
            ? children.map((child, index) => <React.Fragment key={`${key}-child-${index}`}>{child}</React.Fragment>)
            : children;

          return isHeader ? (
            <TableHead
              key={key}
              className={cn(
                alignClass,
                'text-[15px] border-r border-foreground/10 last:border-r-0 bg-foreground/6 font-semibold p-2! m-1! whitespace-normal wrap-break-word min-w-[120px]',
              )}
            >
              {childrenWithKeys}
            </TableHead>
          ) : (
            <TableCell
              key={key}
              className={cn(
                alignClass,
                'text-[15px] border-r border-foreground/10 last:border-r-0 p-2! m-1! whitespace-normal wrap-break-word min-w-[120px]',
              )}
            >
              {childrenWithKeys}
            </TableCell>
          );
        },
        tableHeader(children) {
          const key = getElementKey('table');
          return (
            <TableHeader key={key} className="p-1! m-1!">
              {children}
            </TableHeader>
          );
        },
        tableBody(children) {
          const key = getElementKey('table');
          return (
            <TableBody key={key} className="text-wrap! m-1!">
              {children}
            </TableBody>
          );
        },
      }),
      [
        latexBlocks,
        citationGroups,
        appPreviewBlocks,
        downloadBlocks,
        isUserMessage,
        renderCitation,
        renderHoverCard,
        getElementKey,
        citationLinks,
      ],
    );

    // Show a progressive loading state for large content
    if (isProcessing && content.length > 15000) {
      return (
        <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none text-foreground font-sans">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              Processing content ({Math.round(content.length / 1024)}KB)...
            </div>
            <div className="animate-pulse space-y-2">
              <div className="h-3 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
              <div className="h-3 bg-muted rounded w-5/6"></div>
              <div className="h-8 bg-muted rounded w-2/3"></div>
              <div className="h-3 bg-muted rounded w-4/5"></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="markdown-body prose prose-neutral dark:prose-invert max-w-none text-foreground font-sans"
        style={{ overflowAnchor: 'none' }}
      >
        <Marked renderer={renderer} breaks={isUserMessage}>
          {processedContent}
        </Marked>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.content === nextProps.content && prevProps.isUserMessage === nextProps.isUserMessage;
  },
);

MarkdownRenderer.displayName = 'MarkdownRenderer';

// Virtual scrolling component for very large content
const VirtualMarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, isUserMessage = false }) => {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Split content into chunks for virtual scrolling
    const contentChunks = useMemo(() => {
      const lines = content.split('\n');
      const chunkSize = 20; // Lines per chunk
      const chunks = [];

      for (let i = 0; i < lines.length; i += chunkSize) {
        chunks.push(lines.slice(i, i + chunkSize).join('\n'));
      }

      return chunks;
    }, [content]);

    const handleScroll = useCallback(() => {
      if (!containerRef.current) return;

      const { scrollTop, clientHeight } = containerRef.current;
      const lineHeight = 24; // Approximate line height
      const start = Math.floor(scrollTop / lineHeight);
      const end = Math.min(start + Math.ceil(clientHeight / lineHeight) + 10, contentChunks.length);

      setVisibleRange({ start: Math.max(0, start - 5), end });
    }, [contentChunks.length]);

    // Only use virtual scrolling for very large content
    if (content.length < 50000) {
      return <MarkdownRenderer content={content} isUserMessage={isUserMessage} />;
    }

    return (
      <div
        ref={containerRef}
        className="markdown-body prose prose-neutral dark:prose-invert max-w-none text-foreground font-sans max-h-96 overflow-y-auto"
        onScroll={handleScroll}
      >
        {contentChunks.slice(visibleRange.start, visibleRange.end).map((chunk, index) => (
          <MarkdownRenderer key={`chunk-${visibleRange.start + index}`} content={chunk} isUserMessage={isUserMessage} />
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.content === nextProps.content && prevProps.isUserMessage === nextProps.isUserMessage;
  },
);

VirtualMarkdownRenderer.displayName = 'VirtualMarkdownRenderer';

export const CopyButton = React.memo(({ text }: { text: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = React.useCallback(async () => {
    if (!navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    sileo.success({
      title: 'Copied to clipboard',
      description: 'You can now paste it anywhere',
      icon: <Copy className="h-4 w-4" />,
    });
  }, [text]);

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2 text-xs rounded-full">
      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
});

CopyButton.displayName = 'CopyButton';

// Performance monitoring hook
const usePerformanceMonitor = (content: string) => {
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
  }, [content]);

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    if (renderTime > 100) {
      console.warn(`Markdown render took ${renderTime.toFixed(2)}ms for ${content.length} characters`);
    }
  }, [content.length]);
};

// Main optimized markdown component with automatic optimization selection
const OptimizedMarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, isUserMessage = false }) => {
    usePerformanceMonitor(content);

    // Automatically choose the best rendering strategy based on content size
    if (content.length > 100000) {
      return <VirtualMarkdownRenderer content={content} isUserMessage={isUserMessage} />;
    }

    return <MarkdownRenderer content={content} isUserMessage={isUserMessage} />;
  },
  (prevProps, nextProps) => {
    return prevProps.content === nextProps.content && prevProps.isUserMessage === nextProps.isUserMessage;
  },
);

OptimizedMarkdownRenderer.displayName = 'OptimizedMarkdownRenderer';

export { MarkdownRenderer, VirtualMarkdownRenderer, OptimizedMarkdownRenderer as default };
