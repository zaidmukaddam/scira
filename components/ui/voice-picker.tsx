"use client"

import * as React from "react"
import type { ElevenLabs } from "@elevenlabs/elevenlabs-js"
import { Check, ChevronsUpDown, Pause, Play } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  AudioPlayerProvider,
  useAudioPlayer,
} from "@/components/ui/audio-player"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Orb } from "@/components/ui/orb"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

function useOrbColors(): [string, string] {
  const [colors, setColors] = React.useState<[string, string]>(() => {
    if (typeof window === "undefined") {
      return ["#6B5B4F", "#8B7355"];
    }
    return resolveColors();
  });

  React.useEffect(() => {
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
  
  // Check for specific themes
  if (html.classList.contains("colourful")) {
    // Warm amber/tan tones matching colourful theme
    return ["#D4A574", "#C49A6C"];
  }
  
  if (html.classList.contains("t3chat")) {
    // Pink/magenta tones matching t3chat theme
    return ["#E8B4C8", "#D49AAE"];
  }
  
  if (html.classList.contains("claudelight")) {
    // Warm terracotta matching claude light theme
    return ["#C4907A", "#A67860"];
  }
  
  if (html.classList.contains("claudedark")) {
    // Warm cream/beige matching claude dark theme  
    return ["#E8D5C4", "#D4BFA8"];
  }

  if (html.classList.contains("neutrallight")) {
    // Soft amber tones matching neutral light theme
    return ["#BF6E35", "#A65F2E"];
  }

  if (html.classList.contains("neutraldark")) {
    // Muted sand tones matching neutral dark theme
    return ["#D7B28D", "#B88F68"];
  }
  
  if (html.classList.contains("dark")) {
    // Bright warm cream/gold tones for default dark mode
    return ["#F5E6D3", "#E8C9A0"];
  }
  
  // Default light mode - earthy browns
  return ["#6B5B4F", "#8B7355"];
}

interface VoicePickerProps {
  voices: ElevenLabs.Voice[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function VoicePicker({
  voices,
  value,
  onValueChange,
  placeholder = "Select a voice...",
  className,
  open,
  onOpenChange,
}: VoicePickerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen
  const orbColors = useOrbColors()

  const selectedVoice = voices.find((v) => v.voiceId === value)

  return (
    <AudioPlayerProvider>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn("w-full justify-between", className)}
          >
            {selectedVoice ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="relative size-6 shrink-0 overflow-visible">
                  <Orb
                    agentState="thinking"
                    colors={orbColors}
                    className="absolute inset-0"
                  />
                </div>
                <span className="truncate">{selectedVoice.name}</span>
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Search voices..." />
            <CommandList>
              <CommandEmpty>No voice found.</CommandEmpty>
              <CommandGroup>
                {voices.map((voice) => (
                  <VoicePickerItem
                    key={voice.voiceId}
                    voice={voice}
                    isSelected={value === voice.voiceId}
                    onSelect={() => {
                      onValueChange?.(voice.voiceId!)
                      setIsOpen?.(false)
                    }}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </AudioPlayerProvider>
  )
}

interface VoicePickerItemProps {
  voice: ElevenLabs.Voice
  isSelected: boolean
  onSelect: () => void
}

function VoicePickerItem({
  voice,
  isSelected,
  onSelect,
}: VoicePickerItemProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const player = useAudioPlayer()
  const orbColors = useOrbColors()

  const preview = voice.previewUrl
  const audioItem = React.useMemo(
    () => (preview ? { id: voice.voiceId!, src: preview, data: voice } : null),
    [preview, voice]
  )

  const isPlaying =
    audioItem && player.isItemActive(audioItem.id) && player.isPlaying

  const handlePreview = React.useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!audioItem) return

      if (isPlaying) {
        player.pause()
      } else {
        player.play(audioItem)
      }
    },
    [audioItem, isPlaying, player]
  )

  return (
    <CommandItem
      value={voice.voiceId!}
      keywords={[
        voice.name,
        voice.labels?.accent,
        voice.labels?.gender,
        voice.labels?.age,
        voice.labels?.description,
        voice.labels?.["use case"],
      ].filter((k): k is string => Boolean(k))}
      onSelect={onSelect}
      className="flex items-center gap-3"
    >
      <div
        className="relative z-10 size-8 shrink-0 cursor-pointer overflow-visible"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handlePreview}
      >
        <Orb
          agentState={isPlaying ? "talking" : undefined}
          colors={orbColors}
          className="pointer-events-none absolute inset-0"
        />
        {preview && isHovered && (
          <div className="pointer-events-none absolute inset-0 flex size-8 shrink-0 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-opacity hover:bg-black/50">
            {isPlaying ? (
              <Pause className="size-3 text-white" />
            ) : (
              <Play className="size-3 text-white" />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-medium">{voice.name}</span>
        {voice.labels && (
          <div className="text-muted-foreground flex flex-col gap-0.5 text-xs">
            {voice.labels.description && (
              <span>{voice.labels.description}</span>
            )}
            {(voice.labels.accent || voice.labels.gender || voice.labels.age) && (
              <div className="flex items-center gap-1.5">
                {voice.labels.accent && <span>{voice.labels.accent}</span>}
                {voice.labels.gender && <span>•</span>}
                {voice.labels.gender && (
                  <span className="capitalize">{voice.labels.gender}</span>
                )}
                {voice.labels.age && <span>•</span>}
                {voice.labels.age && (
                  <span className="capitalize">{voice.labels.age}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Check
        className={cn(
          "ml-auto size-4 shrink-0",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
    </CommandItem>
  )
}

export { VoicePicker, VoicePickerItem }
