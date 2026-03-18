"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, Mic, MicOff, Globe, MessageCircle, Wrench, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { Orb } from "@/components/ui/orb";
import { VoicePicker } from "@/components/ui/voice-picker";
import { SciraLogo } from "@/components/logos/scira-logo";
import {
  VoiceButton,
  type VoiceButtonState,
} from "@/components/ui/voice-button";
import { useVoiceClient, type VoiceType, type ConversationTurn } from "@/hooks/use-voice-client";
import { useUser } from "@/contexts/user-context";
import { cn, normalizeError } from "@/lib/utils";
import { ProUpgradeScreen } from "./components/pro-upgrade-screen";

const VOICES: { value: VoiceType; label: string; description: string }[] = [
  { value: "Ara", label: "Ara", description: "Warm, friendly" },
  { value: "Rex", label: "Rex", description: "Confident, clear" },
  { value: "Sal", label: "Sal", description: "Smooth, balanced" },
  { value: "Eve", label: "Eve", description: "Energetic, upbeat" },
  { value: "Leo", label: "Leo", description: "Authoritative, strong" },
];

const VOICE_STORAGE_KEY = "scira.voice.selected-voice";
const MUTE_STORAGE_KEY = "scira.voice.mic-muted";
const TRANSCRIPT_VISIBLE_KEY = "scira.voice.transcript-visible";

function isVoiceType(value: string): value is VoiceType {
  return value === "Ara" || value === "Rex" || value === "Sal" || value === "Eve" || value === "Leo";
}

function readStoredVoice(): VoiceType {
  if (typeof window === "undefined") return "Ara";
  const stored = window.localStorage.getItem(VOICE_STORAGE_KEY);
  if (!stored) return "Ara";
  return isVoiceType(stored) ? stored : "Ara";
}

function readStoredMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_STORAGE_KEY) === "true";
}

function persistPreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
  }
}

function useOrbColors(): [string, string] {
  const [colors, setColors] = useState<[string, string]>(() => {
    if (typeof window === "undefined") {
      return ["#6B5B4F", "#8B7355"];
    }
    return resolveColors();
  });

  useEffect(() => {
    const updateColors = () => setColors(resolveColors());

    updateColors();

    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}

function resolveColors(): [string, string] {
  const html = document.documentElement;

  if (html.classList.contains("colourful")) {
    return ["#D4A574", "#C49A6C"];
  }
  if (html.classList.contains("t3chat")) {
    return ["#E8B4C8", "#D49AAE"];
  }
  if (html.classList.contains("claudelight")) {
    return ["#C4907A", "#A67860"];
  }
  if (html.classList.contains("claudedark")) {
    return ["#E8D5C4", "#D4BFA8"];
  }
  if (html.classList.contains("neutrallight")) {
    return ["#BF6E35", "#A65F2E"];
  }
  if (html.classList.contains("neutraldark")) {
    return ["#D7B28D", "#B88F68"];
  }
  if (html.classList.contains("dark")) {
    return ["#F5E6D3", "#E8C9A0"];
  }
  return ["#6B5B4F", "#8B7355"];
}

function readStoredTranscriptVisible(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(TRANSCRIPT_VISIBLE_KEY);
  if (stored === "false") return false;
  return true;
}

export default function VoicePage() {
  const [selectedVoice, setSelectedVoice] = useState<VoiceType>(readStoredVoice);
  const [textInput, setTextInput] = useState("");
  const [showTranscript, setShowTranscript] = useState(readStoredTranscriptVisible);
  const orbColors = useOrbColors();
  const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);


  const { user, isProUser, isLoading: isProStatusLoading } = useUser();
  const router = useRouter();

  const {
    agentState,
    isConnected,
    error,
    conversation,
    stats,
    connect,
    disconnect,
    setVoice,
    inputVolumeRef,
    outputVolumeRef,
    isMuted,
    setMuted,
    sendText,
  } = useVoiceClient({
    voice: selectedVoice,
  });

  function formatMs(ms: number) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }


  const handleVoiceChange = (voice: VoiceType) => {
    setSelectedVoice(voice);
    setVoice(voice);
  };

  // Sync voice to client when preferences are loaded
  useEffect(() => {
    if (hasLoadedPrefs) {
      setVoice(selectedVoice);
    }
  }, [selectedVoice, hasLoadedPrefs, setVoice]);

  // Persist preferences to localStorage (combined effect for better performance)
  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedPrefs) return;
    persistPreference(VOICE_STORAGE_KEY, selectedVoice);
    persistPreference(MUTE_STORAGE_KEY, String(isMuted));
    persistPreference(TRANSCRIPT_VISIBLE_KEY, String(showTranscript));
  }, [selectedVoice, isMuted, showTranscript, hasLoadedPrefs]);

  // Rolling dialogue: scroll to bottom when conversation updates
  useEffect(() => {
    if (!showTranscript || !transcriptBottomRef.current) return;
    transcriptBottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation, showTranscript]);

  useEffect(() => {
    const storedVoice = readStoredVoice();
    const storedMuted = readStoredMuted();
    const storedTranscript = readStoredTranscriptVisible();
    setSelectedVoice((prev) => prev !== storedVoice ? storedVoice : prev);
    setMuted(storedMuted);
    setShowTranscript(storedTranscript);
    setHasLoadedPrefs(true);
  }, [setMuted]);

  useEffect(() => {
    if (!isProStatusLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, isProStatusLoading, router]);

  const handleConnect = useCallback(async () => {
    if (isConnected) {
      disconnect();
    } else {
      await connect();
    }
  }, [isConnected, connect, disconnect]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.altKey && event.code === "Space") {
        event.preventDefault();
        void handleConnect();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleConnect]);



  // Memoize status text to avoid recreating on every render
  const statusText = useMemo(() => {
    if (error) return "Error";
    if (!isConnected) return "Ready";
    if (agentState === "listening") return "Listening";
    if (agentState === "talking") return "Speaking";
    if (agentState === "thinking") return "Thinking";
    return "Connected";
  }, [error, isConnected, agentState]);

  // Memoize status color to avoid recreating on every render
  const statusColor = useMemo(() => {
    if (error) return "bg-destructive";
    if (!isConnected) return "bg-muted-foreground/40";
    if (agentState === "listening") return "bg-primary";
    if (agentState === "talking") return "bg-primary/80";
    if (agentState === "thinking") return "bg-muted-foreground/60";
    return "bg-primary";
  }, [error, isConnected, agentState]);

  const voiceButtonState: VoiceButtonState = error
    ? "error"
    : !isConnected
      ? "idle"
      : agentState === "listening"
        ? "recording"
        : "processing";

  const hasStats = isConnected && (stats.lastLatencyMs || stats.lastToolLatencyMs);

  // Loading state
  if (isProStatusLoading) {
    return (
      <div className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-background">
        <div className="flex flex-col items-center gap-4">
          <SciraLogo className="size-10 sm:size-12 animate-pulse motion-reduce:animate-none" />
          <p className="font-pixel text-xs text-muted-foreground/50 tracking-wider">Loading</p>
        </div>
      </div>
    );
  }

  // Pro gate
  if (!isProUser) {
    return <ProUpgradeScreen user={user} isProUser={isProUser} isProStatusLoading={isProStatusLoading} />;
  }

  return (
    <div className="relative flex h-dvh w-full flex-col items-center overflow-hidden bg-background">
      <div className="relative z-10 flex min-h-0 flex-1 w-full max-w-lg flex-col items-center gap-3 p-4 sm:p-6 safe-area-inset-bottom">

        {/* ── Header ── */}
        <header className="flex w-full shrink-0 flex-col items-center gap-2.5 pt-2 sm:pt-4">
          {/* Top row: logo + title + status */}
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <SciraLogo className="shrink-0 size-7 sm:size-8" />
              <h1 className="font-pixel text-base sm:text-2xl text-foreground tracking-wider">
                Voice
              </h1>
            </div>

            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors duration-150",
                isConnected
                  ? "border-primary/30 bg-primary/5"
                  : "border-border/40 bg-card/60"
              )}
              role="status"
              aria-live="polite"
            >
              <div
                className={cn("size-1.5 rounded-full transition-colors duration-150", statusColor)}
                aria-hidden="true"
              />
              <span className="font-pixel text-[10px] text-foreground/60 tracking-wider">
                {statusText}
              </span>
            </div>
          </div>

          {/* Stats row — fixed height, opacity-only transition so the orb never moves */}
          <div className="h-6 w-full flex items-center justify-center">
            <motion.div
              animate={{ opacity: hasStats ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center justify-center gap-4"
            >
              {stats.lastLatencyMs && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground/50">Response</span>
                  <span className="text-[11px] font-medium tabular-nums text-foreground/70">{formatMs(stats.lastLatencyMs)}</span>
                </div>
              )}
              {stats.lastToolLatencyMs && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground/50">Tools</span>
                  <span className="text-[11px] font-medium tabular-nums text-foreground/70">{formatMs(stats.lastToolLatencyMs)}</span>
                </div>
              )}
            </motion.div>
          </div>
        </header>

        {/* ── Middle: orb + transcript accordion ── */}
        <div className="flex flex-1 min-h-0 w-full flex-col gap-2">
          {/* Orb — centered in all remaining space above the accordion */}
          <div className="flex flex-1 min-h-0 items-center justify-center">
            <div className="relative size-[260px] sm:size-[300px]">
              <Orb
                colors={orbColors}
                agentState={agentState}
                volumeMode="auto"
                inputVolumeRef={inputVolumeRef}
                outputVolumeRef={outputVolumeRef}
                className="h-full w-full"
              />
              {!isConnected && (
                <p className="absolute -bottom-7 left-0 right-0 text-center font-pixel text-sm text-muted-foreground/30 tracking-wider">
                  Press start to begin
                </p>
              )}
            </div>
          </div>

          {/* Transcript accordion — shrink-0, header always visible when connected */}
          {isConnected && conversation.length > 0 && (
            <div className="shrink-0 w-full rounded-xl border border-border/40 bg-card/30 overflow-hidden">
              {/* Toggle header */}
              <button
                type="button"
                onClick={() => setShowTranscript(v => !v)}
                className="flex w-full items-center justify-between px-3 py-2.5"
                aria-label={showTranscript ? "Hide transcript" : "Show transcript"}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-3.5 text-muted-foreground/60" aria-hidden />
                  <span className="font-pixel text-[9px] text-muted-foreground/60 tracking-wider uppercase">
                    Transcript
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: showTranscript ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronUp className="size-3.5 text-muted-foreground/50" aria-hidden />
                </motion.div>
              </button>

              {/* Accordion body */}
              <AnimatePresence initial={false}>
                {showTranscript && (
                  <motion.div
                    key="transcript-body"
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 40, mass: 0.8 }}
                    className="overflow-hidden"
                  >
                    <div
                      ref={transcriptScrollRef}
                      className="overflow-y-auto overflow-x-hidden px-3 pb-3 space-y-2 scroll-smooth border-t border-border/30"
                      style={{ maxHeight: 220 }}
                    >
                  {conversation.slice(-14).map((turn, i) => {
                    const globalIndex = Math.max(0, conversation.length - 14) + i;
                    if (turn.role === "user") {
                      return (
                        <motion.div
                          key={`${globalIndex}-user`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-start gap-2 pt-2"
                        >
                          <span className="font-pixel text-[9px] text-muted-foreground/40 tracking-wider pt-0.5 shrink-0 w-6 text-right">You</span>
                          <p className="text-xs leading-relaxed text-foreground/50">{turn.text}</p>
                        </motion.div>
                      );
                    }
                    if (turn.role === "assistant") {
                      return (
                        <motion.div
                          key={`${globalIndex}-assistant`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn("flex items-start gap-2 pt-2", turn.interrupted && "opacity-50")}
                        >
                          <span className="font-pixel text-[9px] text-muted-foreground/40 tracking-wider pt-0.5 shrink-0 w-6 text-right">Scira</span>
                          <p className="text-xs leading-relaxed text-foreground/70">
                            {turn.text}
                            {turn.interrupted && <span className="ml-1 text-muted-foreground/60 italic">— interrupted</span>}
                          </p>
                        </motion.div>
                      );
                    }
                    if (turn.role === "tool") {
                      const toolName = turn.name ?? "tool";
                      const isCall = turn.kind === "call";
                      const isOutput = turn.kind === "output";
                      const toolLabel = toolName === "web_search" ? "Web search" : toolName === "x_search" ? "X search" : toolName.replace(/_/g, " ");
                      const ToolIcon = toolName === "web_search" ? Globe : toolName === "x_search" ? MessageCircle : Wrench;
                      if (isCall) {
                        let argsPreview: string | null = null;
                        if (turn.args) {
                          try {
                            const parsed = JSON.parse(turn.args) as Record<string, unknown>;
                            if (Array.isArray(parsed.queries) && parsed.queries.length > 0) {
                              argsPreview = String(parsed.queries[0]).slice(0, 50);
                              if (String(parsed.queries[0]).length > 50) argsPreview += "…";
                            } else if (typeof parsed.query === "string") {
                              argsPreview = parsed.query.slice(0, 50);
                              if (parsed.query.length > 50) argsPreview += "…";
                            }
                          } catch {
                            argsPreview = turn.args.slice(0, 50);
                            if (turn.args.length > 50) argsPreview += "…";
                          }
                        }
                        return (
                          <motion.div
                            key={`${globalIndex}-tool-call-${turn.callId ?? i}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-start gap-2 pt-2 pl-6"
                          >
                            <div className="flex flex-col gap-1 w-full min-w-0">
                              <div className="inline-flex items-center gap-1.5 w-fit rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5">
                                <ToolIcon className="size-3 text-primary shrink-0" aria-hidden />
                                <span className="font-pixel text-[9px] text-primary tracking-wider uppercase">{toolLabel}</span>
                              </div>
                              {argsPreview && <p className="text-[11px] text-muted-foreground/70 truncate pl-0.5">{argsPreview}</p>}
                            </div>
                          </motion.div>
                        );
                      }
                      if (isOutput) {
                        const preview = turn.text?.slice(0, 120) ?? "";
                        const hasMore = (turn.text?.length ?? 0) > 120;
                        return (
                          <motion.div
                            key={`${globalIndex}-tool-out-${turn.callId ?? i}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-start gap-2 pt-2 pl-6"
                          >
                            <div className="rounded-md border border-border/50 bg-muted/30 px-2 py-1.5 w-full min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <ToolIcon className="size-2.5 text-muted-foreground shrink-0" aria-hidden />
                                <span className="font-pixel text-[8px] text-muted-foreground/60 tracking-wider uppercase">{toolLabel} result</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground/80 leading-snug line-clamp-2">{preview}{hasMore ? "…" : ""}</p>
                            </div>
                          </motion.div>
                        );
                      }
                    }
                    return null;
                  })}
                      <div ref={transcriptBottomRef} className="h-px shrink-0" aria-hidden />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Controls (pinned to bottom) ── */}
        <div className="flex w-full shrink-0 flex-col items-center gap-2.5 pb-2 sm:pb-0">
          <div className="w-full rounded-xl border border-border/60 bg-card/30 p-2.5">
            <div className="flex flex-col gap-2 items-center">
              {/* Voice Picker (idle) / Text Input (connected) */}
              <AnimatePresence mode="wait">
                {!isConnected ? (
                  <motion.div
                    key="voice-picker"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="w-full motion-reduce:transition-none"
                  >
                    <VoicePicker
                      voices={VOICES.map((voice) => ({
                        voiceId: voice.value,
                        name: voice.label,
                        labels: { description: voice.description },
                      }))}
                      value={selectedVoice}
                      onValueChange={(value) => handleVoiceChange(value as VoiceType)}
                      placeholder="Choose a voice..."
                      className="w-full"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="text-input"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="w-full motion-reduce:transition-none"
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (textInput.trim()) {
                          sendText(textInput);
                          setTextInput("");
                        }
                      }}
                      className="relative flex items-center"
                    >
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Type a message..."
                        disabled={!isConnected || agentState === "thinking"}
                        className="w-full h-9 pl-3 pr-10 text-sm rounded-lg border border-border/40 bg-background/60 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        type="submit"
                        disabled={!textInput.trim() || !isConnected || agentState === "thinking"}
                        className="absolute right-1.5 size-6 flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                        aria-label="Send message"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-2 w-full">
                <VoiceButton
                  state={voiceButtonState}
                  onPress={handleConnect}
                  size="sm"
                  label={isConnected ? "End session" : "Start session"}
                  trailing={
                    <kbd className="hidden font-pixel text-[9px] text-muted-foreground/40 tracking-wider sm:inline">
                      ⌥ Space
                    </kbd>
                  }
                  className="flex-1 shadow-none border"
                />
                <button
                  type="button"
                  onClick={() => setMuted(!isMuted)}
                  className={cn(
                    "relative flex items-center justify-center size-8 rounded-lg border transition-colors",
                    isMuted
                      ? "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/60"
                      : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15",
                  )}
                  aria-pressed={isMuted}
                  aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                  title={isMuted ? "Click to unmute" : "Click to mute"}
                >
                  {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                  {isMuted && (
                    <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-destructive" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 motion-reduce:transition-none"
                role="alert"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-1.5 rounded-full bg-destructive shrink-0" aria-hidden="true" />
                  <p className="text-destructive text-[11px] font-medium text-pretty">{normalizeError(error)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleConnect}
                  className="shrink-0 text-[11px] font-medium text-destructive/80 hover:text-destructive underline-offset-2 hover:underline transition-colors"
                >
                  Try again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
