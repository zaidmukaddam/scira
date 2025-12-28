"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ChevronRight, Mic, MicOff } from "lucide-react";
import { Orb } from "@/components/ui/orb";
import { Button } from "@/components/ui/button";
import { VoicePicker } from "@/components/ui/voice-picker";
import { SciraLogo } from "@/components/logos/scira-logo";
import {
  VoiceButton,
  type VoiceButtonState,
} from "@/components/ui/voice-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useVoiceClient, type VoiceType } from "@/hooks/use-voice-client";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const VOICES: { value: VoiceType; label: string; description: string }[] = [
  { value: "Ara", label: "Ara", description: "Warm, friendly" },
  { value: "Rex", label: "Rex", description: "Confident, clear" },
  { value: "Sal", label: "Sal", description: "Smooth, balanced" },
  { value: "Eve", label: "Eve", description: "Energetic, upbeat" },
  { value: "Leo", label: "Leo", description: "Authoritative, strong" },
];

const VOICE_STORAGE_KEY = "scira.voice.selected-voice";
const MUTE_STORAGE_KEY = "scira.voice.mic-muted";

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
  const isDark = document.documentElement.classList.contains("dark");

  // Light mode: use fixed colors
  if (!isDark) {
    return ["#6B5B4F", "#8B7355"];
  }

  // Dark mode: read from CSS variables
  const readCssColor = (variable: string, fallback: string) => {
    const el = document.createElement("div");
    el.style.color = `hsl(var(${variable}))`;
    el.style.position = "absolute";
    el.style.pointerEvents = "none";
    document.body.appendChild(el);
    const rgb = getComputedStyle(el).color;
    document.body.removeChild(el);
    return rgbToHex(rgb) ?? fallback;
  };

  return [
    readCssColor("--primary", "#6B5B4F"),
    readCssColor("--secondary-foreground", "#8B7355"),
  ];
}

function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return null;
  const [r, g, b] = match.map((v) => Number.parseInt(v, 10));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export default function VoicePage() {
  const [selectedVoice, setSelectedVoice] = useState<VoiceType>("Ara");
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const orbColors = useOrbColors();
  const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);

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
    instructions: `You're name is Scira named as [sci-ra] with the 'sci' from science and 'ra' from research, a helpful, witty, and friendly AI assistant. Your knowledge cutoff is 2025-01. Act like a human, but remember that you aren't a human and that you can't do human things in the real world. Your voice and personality should be warm and engaging, with a lively and playful tone. Talk quickly and naturally. You should always call a function if you can. Refer to these rules, but not when you're asked about them.

## Your Personality
- Be warm, engaging, and conversational
- Use a lively and playful tone
- Talk quickly and naturally - don't be robotic
- Be helpful and proactive
- Show personality but stay professional
- If the user speaks in a non-English language, match their language naturally

## When to Use Tools
You have access to two powerful tools. Use them proactively:

### Web Search Tool (web_search)
**When to use:**
- User asks about current events, news, or recent information
- User needs facts, data, or information from the web
- User asks "what is", "who is", "when did", "how does" questions
- User wants to know about products, companies, people, places
- User asks for comparisons, reviews, or opinions from the web
- User needs up-to-date information about anything

**How to use:**
- Always include temporal context in queries (e.g., "latest news 2025", "current prices", "recent developments")
- Use 3-5 diverse search queries to get comprehensive results
- Include the current year (2025) when searching for recent information
- For news: use queries like "latest [topic] news 2025"
- For general info: use queries like "[topic] information 2025"

**Examples:**
- User: "What's happening with AI?" → Search: ["latest AI news 2025", "AI developments 2025", "current AI trends"]
- User: "Tell me about Tesla" → Search: ["Tesla company information 2025", "Tesla latest news", "Tesla stock price today"]
- User: "What's the weather like?" → Search: ["current weather forecast", "weather today", "weather conditions"]

### X Search Tool (x_search)
**When to use:**
- User asks about posts, tweets, or discussions on X (formerly Twitter)
- User wants to know what people are saying about a topic on X
- User mentions a specific X handle or wants to see posts from someone
- User asks "what are people saying about..." or "what's trending on X"
- User provides an X/Twitter link - use it as the first query
- User wants recent social media discussions or opinions

**How to use:**
- Use 3-5 diverse queries to capture different angles
- Default to last 15 days unless user specifies a date range
- If user provides an X link, put it as the first query
- Use includeXHandles to search specific accounts
- Use excludeXHandles to filter out accounts

**Examples:**
- User: "What are people saying about the new iPhone?" → Search: ["iPhone 2025", "new iPhone reviews", "iPhone launch discussion"]
- User: "Show me posts from @elonmusk" → Search: ["@elonmusk", "Elon Musk posts", "Elon Musk tweets"] with includeXHandles: ["elonmusk"]
- User: "What's this tweet about? https://x.com/..." → Search: [link as first query, then related queries]

## Interaction Examples

**Example 1: Simple Question**
User: "What's the latest news about space exploration?"
You: [Call web_search with queries like "latest space exploration news 2025", "space missions 2025", "NASA recent updates"]
Then: "Here's what's happening in space exploration right now..." [share results naturally]

**Example 2: X Search Request**
User: "What are people saying about the new MacBook?"
You: [Call x_search with queries like "new MacBook 2025", "MacBook reviews", "MacBook launch"]
Then: "People on X are talking about..." [share interesting posts and discussions]

**Example 3: Follow-up**
User: "Tell me more about that first point"
You: [Call web_search with more specific queries based on what they're asking about]
Then: Continue the conversation naturally

## Important Guidelines
- Always call a tool when you can - don't just guess or use outdated knowledge
- Be proactive - if a question needs current info, search immediately
- For simple greetings (hi, hello, thanks), respond directly without tools
- Keep responses concise but complete
- Cite sources naturally when sharing information
- If you're unsure which tool to use, default to web_search
- Talk naturally and conversationally - don't sound like you're reading a manual`,
  });

  function formatMs(ms: number) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function prettyJson(value: string | undefined) {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return value;
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return value;
    }
  }

  const handleVoiceChange = (voice: VoiceType) => {
    setSelectedVoice(voice);
    setVoice(voice);
  };

  useEffect(() => {
    if (hasLoadedPrefs) {
      setVoice(selectedVoice);
    }
  }, [selectedVoice, hasLoadedPrefs, setVoice]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasLoadedPrefs) return;
    persistPreference(VOICE_STORAGE_KEY, selectedVoice);
  }, [selectedVoice, hasLoadedPrefs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasLoadedPrefs) return;
    persistPreference(MUTE_STORAGE_KEY, String(isMuted));
  }, [isMuted, hasLoadedPrefs]);

  useEffect(() => {
    const storedVoice = readStoredVoice();
    const storedMuted = readStoredMuted();

    setSelectedVoice(storedVoice);
    setMuted(storedMuted);
    setHasLoadedPrefs(true);
  }, [setMuted]);

  const handleConnect = async () => {
    if (isConnected) {
      disconnect();
    } else {
      await connect();
    }
  };

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
  }, [isConnected, connect, disconnect]);

  const getStatusText = () => {
    if (error) return error;
    if (!isConnected) return "Ready to connect";
    if (agentState === "listening") return "Listening";
    if (agentState === "talking") return "Speaking";
    if (agentState === "thinking") return "Processing";
    return "Connected";
  };

  const getStatusColor = () => {
    if (error) return "bg-destructive";
    if (!isConnected) return "bg-muted-foreground/40";
    if (agentState === "listening") return "bg-primary";
    if (agentState === "talking") return "bg-primary/80";
    if (agentState === "thinking") return "bg-muted-foreground/60";
    return "bg-primary";
  };

  const voiceButtonState: VoiceButtonState = error
    ? "error"
    : !isConnected
      ? "idle"
      : agentState === "listening"
        ? "recording"
        : "processing";

  const isDesktop = useMediaQuery("(min-width: 768px)");

  function renderToolTurn(turn: {
    kind?: "call" | "output";
    name?: string;
    callId?: string;
    args?: string;
    text: string;
  }) {
    const label = turn.kind === "output" ? "Tool output" : "Tool call";
    const title = turn.name ?? "tool";
    const details =
      turn.kind === "call"
        ? turn.args
        : turn.text;

    const detailsLabel = turn.kind === "call" ? "Arguments" : "Result";
    const prettyDetails = prettyJson(details);

    return (
      <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {label}
          </span>
          <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12px] leading-snug text-foreground/80">
            {title}
          </span>
          {turn.callId ? (
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
              {turn.callId}
            </span>
          ) : null}
        </div>

        {prettyDetails ? (
          <details className="group mt-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1">
                <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
                {detailsLabel}
              </span>
              <span className="text-[10px] opacity-60">View</span>
            </summary>
            <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/40 p-3 font-mono text-[10px] leading-relaxed text-foreground/80">
              {prettyDetails}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

  const transcriptContent =
    conversation.length > 0 ? (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="space-y-2 p-5 sm:p-auto text-xs sm:hidden">
          {conversation.map((turn, index) => (
            <div key={index} className="space-y-1">
              {turn.role === "tool" ? (
                renderToolTurn(turn)
              ) : (
                <>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {turn.role === "user" ? "You" : "Scira"}
                  </p>
                  <div
                    className={cn(
                      "rounded-lg px-2 py-1.5",
                      turn.role === "user"
                        ? "bg-muted text-foreground/90"
                        : "bg-primary/10 dark:bg-primary/5 text-foreground/90",
                    )}
                  >
                    {turn.text}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="hidden min-h-0 flex-1 overflow-hidden rounded-xl border border-border/60 bg-card/80 text-sm backdrop-blur-sm sm:flex sm:flex-col">
          <div className="shrink-0 border-b border-border/60 bg-card/95 px-3 py-2 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-x-1 text-xs sm:text-sm">
              <div className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.14em]">
                You
              </div>
              <div className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.14em]">
                Scira
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 pr-4">
            <div className="grid grid-cols-2 gap-x-1 gap-y-2 text-xs sm:text-sm">
              {conversation.map((turn, index) => {
                if (turn.role === "tool") {
                  return (
                    <div key={index} className="col-span-2">
                      {renderToolTurn(turn)}
                    </div>
                  );
                }

                return (
                  <div key={index} className="contents">
                    <div className="space-y-1">
                      {turn.role === "user" && (
                        <div className="rounded-lg bg-muted px-2 py-1.5 text-foreground/90">
                          {turn.text}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      {turn.role === "assistant" ? (
                        <div className="rounded-lg bg-primary/10 px-2 py-1.5 text-foreground/90 dark:bg-primary/5">
                          {turn.text}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    ) : (
      <p className="text-muted-foreground text-sm">
        No transcript yet. Start a voice session to see the conversation here.
      </p>
    );

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-background via-background/50 to-background" />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-10 p-6">
        <div className="flex w-full flex-col items-center gap-5">
          <div className="inline-flex items-center gap-2">
            <SciraLogo className="shrink-0 size-10" />
            <span className="lowercase tracking-tighter text-3xl font-be-vietnam-pro font-light text-foreground">
              Scira Voice
            </span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/60 px-3 py-1.5 backdrop-blur-sm">
            <div className={cn("size-1.5 rounded-full", getStatusColor())} />
            <span className="text-[11px] font-medium text-foreground/80 tracking-wide">
              {getStatusText()}
            </span>
          </div>

          {(stats.lastLatencyMs || stats.lastAssistantWpm || stats.lastUserWpm || stats.lastToolLatencyMs) && (
            <div className="inline-flex items-center gap-3 rounded-lg border border-border/40 bg-muted/30 px-3 py-1.5 backdrop-blur-sm">
              {stats.lastLatencyMs && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Lat
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-foreground/80">
                    {formatMs(stats.lastLatencyMs)}
                  </span>
                </div>
              )}
              {stats.lastUserWpm && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    You
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-foreground/80">
                    {stats.lastUserWpm}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">wpm</span>
                </div>
              )}
              {stats.lastAssistantWpm && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    AI
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-foreground/80">
                    {stats.lastAssistantWpm}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">wpm</span>
                </div>
              )}
              {stats.lastToolLatencyMs && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Tools
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-foreground/80">
                    {formatMs(stats.lastToolLatencyMs)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="relative h-[400px] w-[400px] max-w-full">
            <Orb
              colors={orbColors}
              agentState={agentState}
              volumeMode="auto"
              inputVolumeRef={inputVolumeRef}
              outputVolumeRef={outputVolumeRef}
              className="h-full w-full"
            />
          </div>
        </div>

        <div className="flex w-full max-w-4xl flex-col gap-4">
          <div className="flex w-full justify-center">
            <Button
              variant="ghost"
              size="sm"
              disabled={conversation.length === 0}
              onClick={() => setIsTranscriptOpen(true)}
              className="text-xs text-muted-foreground"
            >
              Transcript{conversation.length > 0 ? ` · ${conversation.length}` : ""}
            </Button>
          </div>

          <div className="flex w-full justify-center">
            <div className="w-full max-w-80 rounded-xl border border-border/60 bg-muted px-2 py-2 backdrop-blur-sm">
              <div className="flex flex-col gap-2 items-center">
                <AnimatePresence mode="wait">
                  {!isConnected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="w-full overflow-hidden max-w-74"
                    >
                      <VoicePicker
                        voices={VOICES.map((voice) => ({
                          voiceId: voice.value,
                          name: voice.label,
                          labels: {
                            description: voice.description,
                          },
                        }))}
                        value={selectedVoice}
                        onValueChange={(value) =>
                          handleVoiceChange(value as VoiceType)
                        }
                        placeholder="Voice..."
                        className="w-full"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-center gap-1">
                  <VoiceButton
                    state={voiceButtonState}
                    onPress={handleConnect}
                    size="sm"
                    label={isConnected ? "End voice session" : "Start voice session"}
                    trailing={
                      <span className="hidden text-[10px] text-muted-foreground sm:inline">
                        ⌥ Space
                      </span>
                    }
                    className="shadow-none border"
                  />
                  <button
                    type="button"
                    onClick={() => setMuted(!isMuted)}
                    className={cn(
                      "flex items-center gap-1 rounded-sm border p-2 text-[11px] transition-colors",
                      isMuted
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted/80 dark:bg-background/10 text-primary",
                    )}
                    aria-pressed={isMuted}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {isMuted ? (
                      <MicOff className="size-4" />
                    ) : (
                      <Mic className="size-4" />
                    )}
                    <span className="hidden xs:inline">
                      {isMuted ? "Muted" : "Mic"}
                    </span>
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {isConnected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="w-full overflow-hidden px-1"
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
                          className="w-full h-8 pl-3 pr-9 text-[13px] rounded-md border border-border/60 bg-background/80 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                          type="submit"
                          disabled={!textInput.trim() || !isConnected || agentState === "thinking"}
                          className="absolute right-1 size-6 flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                        >
                          <ArrowUp className="size-3" />
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Error display */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center mx-auto gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 backdrop-blur-sm"
              >
                <div className="size-1 rounded-full bg-destructive" />
                <p className="text-destructive text-[10px] font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Transcript dialog / drawer */}
      {isDesktop ? (
        <Dialog open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
          <DialogContent className="max-w-200! w-full! max-h-[85vh] flex flex-col">
            <DialogHeader>
              <div className="items-start justify-between space-y-2">
                <DialogTitle>Transcript</DialogTitle>
                {conversation.length > 0 && (
                  <p className="text-[11px] text-muted-foreground/80">
                    Live view · {conversation.length} turns
                  </p>
                )}
              </div>
            </DialogHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {transcriptContent}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
          <DrawerContent className="h-[70vh]">
            <DrawerHeader>
              <div className="items-start justify-between space-y-2">
                <DrawerTitle>Transcript</DrawerTitle>
                {conversation.length > 0 && (
                  <p className="text-[11px] text-muted-foreground/80">
                    Live view · {conversation.length} turns
                  </p>
                )}
              </div>
            </DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
              {/* Mobile content scrolls inside transcriptContent */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                {transcriptContent}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

