"use client"

import * as React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ComponentProps,
  type HTMLAttributes,
} from "react"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

function formatTimestamp(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00"
  const totalSeconds = Math.floor(value)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

interface ScrubBarContextValue {
  duration: number
  value: number
  progress: number
  onScrub?: (time: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
}

const ScrubBarContext = createContext<ScrubBarContextValue | null>(null)

function useScrubBarContext() {
  const context = useContext(ScrubBarContext)
  if (!context) {
    throw new Error("useScrubBarContext must be used within a ScrubBar.Root")
  }
  return context
}

interface ScrubBarContainerProps extends HTMLAttributes<HTMLDivElement> {
  duration: number
  value: number
  onScrub?: (time: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
}

function ScrubBarContainer({
  duration,
  value,
  onScrub,
  onScrubStart,
  onScrubEnd,
  children,
  className,
  ...props
}: ScrubBarContainerProps) {
  const progress = duration > 0 ? (value / duration) * 100 : 0

  const contextValue: ScrubBarContextValue = {
    duration,
    value,
    progress,
    onScrub,
    onScrubStart,
    onScrubEnd,
  }

  return (
    <ScrubBarContext.Provider value={contextValue}>
      <div
        data-slot="scrub-bar-root"
        className={cn("flex w-full items-center", className)}
        {...props}
      >
        {children}
      </div>
    </ScrubBarContext.Provider>
  )
}
ScrubBarContainer.displayName = "ScrubBarContainer"

type ScrubBarTrackProps = HTMLAttributes<HTMLDivElement>

function ScrubBarTrack({ className, children, ...props }: ScrubBarTrackProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const { duration, onScrub, onScrubStart, onScrubEnd, value } =
    useScrubBarContext()

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track || !duration) return null
      const rect = track.getBoundingClientRect()
      const ratio = (clientX - rect.left) / rect.width
      const clamped = Math.min(Math.max(ratio, 0), 1)
      return duration * clamped
    },
    [duration]
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!duration) return
      event.preventDefault()
      onScrubStart?.()
      const time = getTimeFromClientX(event.clientX)
      if (time != null) {
        onScrub?.(time)
      }

      const handleMove = (moveEvent: PointerEvent) => {
        const nextTime = getTimeFromClientX(moveEvent.clientX)
        if (nextTime != null) {
          onScrub?.(nextTime)
        }
      }

      const handleUp = () => {
        onScrubEnd?.()
        window.removeEventListener("pointermove", handleMove)
        window.removeEventListener("pointerup", handleUp)
      }

      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp, { once: true })
    },
    [duration, getTimeFromClientX, onScrub, onScrubEnd, onScrubStart]
  )

  const clampedValue = Math.min(Math.max(value, 0), duration || 0)

  return (
    <div
      ref={trackRef}
      data-slot="scrub-bar-track"
      className={cn(
        "bg-secondary relative h-2 w-full grow cursor-pointer touch-none rounded-full transition-none select-none",
        className
      )}
      onPointerDown={handlePointerDown}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={duration || 0}
      aria-valuenow={clampedValue}
      {...props}
    >
      {children}
    </div>
  )
}
ScrubBarTrack.displayName = "ScrubBarTrack"

type ScrubBarProgressProps = Omit<ComponentProps<typeof Progress>, "value">

function ScrubBarProgress({ className, ...props }: ScrubBarProgressProps) {
  const { progress } = useScrubBarContext()

  return (
    <Progress
      data-slot="scrub-bar-progress"
      value={progress}
      className={cn("absolute h-full [&>div]:transition-none", className)}
      {...props}
    />
  )
}
ScrubBarProgress.displayName = "ScrubBarProgress"

type ScrubBarThumbProps = HTMLAttributes<HTMLDivElement>

function ScrubBarThumb({ className, children, ...props }: ScrubBarThumbProps) {
  const { progress } = useScrubBarContext()
  return (
    <div
      data-slot="scrub-bar-thumb"
      className={cn(
        "bg-primary absolute top-1/2 block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      style={{ left: `${progress}%` }}
      {...props}
    >
      {children}
    </div>
  )
}
ScrubBarThumb.displayName = "ScrubBarThumb"

interface ScrubBarTimeLabelProps extends HTMLAttributes<HTMLSpanElement> {
  time: number
  format?: (time: number) => string
}

function ScrubBarTimeLabel({
  className,
  time,
  format = formatTimestamp,
  ...props
}: ScrubBarTimeLabelProps) {
  return (
    <span
      data-slot="scrub-bar-time-label"
      {...props}
      className={cn("tabular-nums", className)}
    >
      {format(time)}
    </span>
  )
}
ScrubBarTimeLabel.displayName = "ScrubBarTimeLabel"

export {
  ScrubBarContainer,
  ScrubBarTrack,
  ScrubBarProgress,
  ScrubBarThumb,
  ScrubBarTimeLabel,
}
