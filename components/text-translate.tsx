'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sileo } from 'sileo';
import { Copy, Languages, Loader2, Pause, Play, Volume2 } from 'lucide-react';
import type { CharacterAlignmentResponseModel } from '@elevenlabs/elevenlabs-js/api/types/CharacterAlignmentResponseModel';

import { generateSpeech, type GenerateSpeechResult } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Matrix, loader } from '@/components/ui/matrix';
import {
  TranscriptViewerContainer,
  TranscriptViewerWords,
  TranscriptViewerAudio,
  TranscriptViewerPlayPauseButton,
  TranscriptViewerScrubBar,
} from '@/components/ui/transcript-viewer';

interface TextTranslateToolArgs {
  text?: string;
  to: string;
  from?: string;
}

interface TextTranslateToolResult {
  translatedText: string;
  detectedLanguage: string;
}

export interface TextTranslateProps {
  args?: TextTranslateToolArgs | null;
  result?: TextTranslateToolResult | null;
  className?: string;
}

function normalizeLanguageCode(value: string | undefined | null): string {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  return normalized.split(/[-_]/)[0] || normalized;
}

function getLanguageName(languageCode: string): string {
  if (!languageCode) return '';
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    return displayNames.of(languageCode) || languageCode;
  } catch {
    return languageCode;
  }
}

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    sileo.success({ title: `${label} copied` });
  } catch {
    sileo.error({ title: 'Failed to copy' });
  }
}

// Simple audio player fallback (when no alignment data)
function SimpleAudioPlayer({
  audioUrl,
  isPlaying,
  isGenerating,
  onPlayPause,
}: {
  audioUrl: string | null;
  isPlaying: boolean;
  isGenerating: boolean;
  onPlayPause: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onPlayPause}
          disabled={isGenerating}
          className="h-8 w-8"
          aria-label="Listen to translation"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : audioUrl ? (
            <Play className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {isGenerating ? 'Generating audio…' : isPlaying ? 'Pause' : 'Listen'}
      </TooltipContent>
    </Tooltip>
  );
}

// Loading matrix animation component
function LoadingMatrix() {
  return (
    <Matrix
      rows={7}
      cols={7}
      frames={loader}
      fps={12}
      autoplay
      loop
      size={4}
      gap={1}
      brightness={0.8}
      className="opacity-70"
      ariaLabel="Generating audio"
    />
  );
}

// Transcript player with word highlighting
function TranscriptPlayer({
  audioUrl,
  alignment,
  onPlayStateChange,
}: {
  audioUrl: string;
  alignment: CharacterAlignmentResponseModel;
  onPlayStateChange?: (isPlaying: boolean) => void;
}) {
  return (
    <TranscriptViewerContainer
      audioSrc={audioUrl}
      audioType="audio/mpeg"
      alignment={alignment}
      hideAudioTags
      onPlay={() => onPlayStateChange?.(true)}
      onPause={() => onPlayStateChange?.(false)}
      onEnded={() => onPlayStateChange?.(false)}
      className="p-0 space-y-3"
    >
      <TranscriptViewerAudio className="hidden" />

      {/* Word-by-word highlighted text */}
      <div className="rounded-md border border-border/60 bg-background px-3 py-2 overflow-hidden">
        <TranscriptViewerWords
          className="text-sm font-medium text-foreground leading-relaxed"
          wordClassNames="transition-colors duration-150"
          gapClassNames="text-muted-foreground"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <TranscriptViewerPlayPauseButton variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0">
          {({ isPlaying }) => (isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />)}
        </TranscriptViewerPlayPauseButton>

        <TranscriptViewerScrubBar
          className="flex-1"
          showTimeLabels
          trackClassName="h-1.5"
          thumbClassName="h-3 w-3"
          labelsClassName="text-[10px] text-muted-foreground"
        />
      </div>
    </TranscriptViewerContainer>
  );
}

export function TextTranslate({ args, result, className }: TextTranslateProps) {
  const [speechResult, setSpeechResult] = useState<GenerateSpeechResult | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fromCode = normalizeLanguageCode(result?.detectedLanguage || args?.from);
  const toCode = normalizeLanguageCode(args?.to);

  const fromName = useMemo(() => (fromCode && fromCode !== 'auto' ? getLanguageName(fromCode) : ''), [fromCode]);
  const toName = useMemo(() => getLanguageName(toCode), [toCode]);

  const fromLabel = fromCode === 'auto' || !fromCode ? 'Auto-detected' : fromName || fromCode;
  const toLabel = toName || toCode;

  const audioUrl = speechResult?.audio ?? null;
  const alignment = speechResult?.alignment ?? null;

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      audio.pause();
      audio.src = '';
    };
  }, []);

  const handleGenerateAudio = useCallback(async () => {
    const translatedText = result?.translatedText?.trim();
    if (!translatedText || isGeneratingAudio) return;

    setIsGeneratingAudio(true);
    try {
      const response = await generateSpeech(translatedText);
      setSpeechResult(response);
    } catch (error) {
      console.error('Error generating speech:', error);
      sileo.error({ title: 'Failed to generate audio' });
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [result?.translatedText, isGeneratingAudio]);

  const handleSimplePlayPause = useCallback(async () => {
    if (!audioUrl) {
      await handleGenerateAudio();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await audio.play().catch(() => null);
    } else {
      audio.pause();
    }
  }, [audioUrl, handleGenerateAudio]);

  if (!result) {
    return (
      <div className={cn('my-2 rounded-md border border-border bg-background p-3', className)}>
        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
              <Skeleton className="h-4 w-4 rounded-sm" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-28 rounded-full" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </div>

        {/* Body skeleton */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-9/12" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-10/12" />
                <Skeleton className="h-3 w-8/12" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const originalText = args?.text ?? '';
  const translatedText = result.translatedText ?? '';

  return (
    <div className={cn('my-2 rounded-md border border-border bg-background p-3', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Languages className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-foreground">Translation</div>
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {fromCode && fromCode !== 'auto' ? fromCode : 'auto'} → {toCode || ''}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {fromLabel} → {toLabel || ''}
              </div>
            </div>
          </div>
        </div>

        {/* Matrix loading animation (shown when generating audio) */}
        {isGeneratingAudio && (
          <div className="shrink-0">
            <LoadingMatrix />
          </div>
        )}
      </div>

      <TooltipProvider>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {/* Original text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-xs font-medium text-muted-foreground">Original</div>
                {fromCode && fromCode !== 'auto' && (
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {fromCode}
                  </Badge>
                )}
                {fromName && <div className="text-[11px] text-muted-foreground truncate">{fromName}</div>}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(originalText, 'Original')}
                    className="h-8 w-8"
                    aria-label="Copy original text"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Copy original
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground/90 whitespace-pre-wrap">
              {originalText || '—'}
            </div>
          </div>

          {/* Translated text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-xs font-medium text-muted-foreground">Translated</div>
                {toCode && (
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {toCode}
                  </Badge>
                )}
                {toName && <div className="text-[11px] text-muted-foreground truncate">{toName}</div>}
              </div>

              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(translatedText, 'Translation')}
                      className="h-8 w-8"
                      aria-label="Copy translation"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6}>
                    Copy translation
                  </TooltipContent>
                </Tooltip>

                {/* Show generate button if no audio yet, or simple play/pause if no alignment */}
                {(!audioUrl || !alignment) && (
                  <SimpleAudioPlayer
                    audioUrl={audioUrl}
                    isPlaying={isPlaying}
                    isGenerating={isGeneratingAudio}
                    onPlayPause={handleSimplePlayPause}
                  />
                )}
              </div>
            </div>

            {/* Transcript player with word highlighting (when alignment is available) */}
            {audioUrl && alignment ? (
              <TranscriptPlayer audioUrl={audioUrl} alignment={alignment} onPlayStateChange={setIsPlaying} />
            ) : (
              <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground whitespace-pre-wrap">
                {translatedText || '—'}
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>

      {/* Hidden audio element for simple playback (when no alignment) */}
      {audioUrl && !alignment && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
}
