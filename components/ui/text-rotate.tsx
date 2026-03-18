"use client"

import {
  ElementType,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react"
import {
  AnimatePresence,
  AnimatePresenceProps,
  motion,
  MotionProps,
  Transition,
} from "motion/react"

import { cn } from "@/lib/utils"

// handy function to split text into characters with support for unicode and emojis
const splitIntoCharacters = (text: string): string[] => {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" })
    return Array.from(segmenter.segment(text), ({ segment }) => segment)
  }
  // Fallback for browsers that don't support Intl.Segmenter
  return Array.from(text)
}

interface TextRotateProps {
  /**
   * Array of text strings to rotate through.
   * Required prop with no default value.
   */
  texts: string[]

  /**
   * render as HTML Tag
   */
  as?: ElementType

  /**
   * Time in milliseconds between text rotations.
   * @default 2000
   */
  rotationInterval?: number

  /**
   * Initial animation state or array of states.
   * @default { y: "100%", opacity: 0 }
   */
  initial?: MotionProps["initial"] | MotionProps["initial"][]

  /**
   * Animation state to animate to or array of states.
   * @default { y: 0, opacity: 1 }
   */
  animate?: MotionProps["animate"] | MotionProps["animate"][]

  /**
   * Animation state when exiting or array of states.
   * @default { y: "-120%", opacity: 0 }
   */
  exit?: MotionProps["exit"] | MotionProps["exit"][]

  /**
   * AnimatePresence mode
   * @default "wait"
   */
  animatePresenceMode?: AnimatePresenceProps["mode"]

  /**
   * Whether to run initial animation on first render.
   * @default false
   */
  animatePresenceInitial?: boolean

  /**
   * Duration of stagger delay between elements in seconds.
   * @default 0
   */
  staggerDuration?: number

  /**
   * Direction to stagger animations from.
   * @default "first"
   */
  staggerFrom?: "first" | "last" | "center" | number | "random"

  /**
   * Animation transition configuration.
   * @default { type: "spring", damping: 25, stiffness: 300 }
   */
  transition?: Transition

  /**
   * Whether to loop through texts continuously.
   * @default true
   */
  loop?: boolean

  /**
   * Whether to auto-rotate texts.
   * @default true
   */
  auto?: boolean

  /**
   * How to split the text for animation.
   * @default "characters"
   */
  splitBy?: "words" | "characters" | "lines" | string

  /**
   * Callback function triggered when rotating to next text.
   * @default undefined
   */
  onNext?: (index: number) => void

  /**
   * Class name for the main container element.
   * @default undefined
   */
  mainClassName?: string

  /**
   * Class name for the split level wrapper elements.
   * @default undefined
   */
  splitLevelClassName?: string

  /**
   * Class name for individual animated elements.
   * @default undefined
   */
  elementLevelClassName?: string
}

/**
 * Interface for the ref object exposed by TextRotate component.
 * Provides methods to control text rotation programmatically.
 * This allows external components to trigger text changes
 * without relying on the automatic rotation.
 */
export interface TextRotateRef {
  /**
   * Advance to next text in sequence.
   * If at the end, will loop to beginning if loop prop is true.
   */
  next: () => void

  /**
   * Go back to previous text in sequence.
   * If at the start, will loop to end if loop prop is true.
   */
  previous: () => void

  /**
   * Jump to specific text by index.
   * Will clamp index between 0 and texts.length - 1.
   */
  jumpTo: (index: number) => void

  /**
   * Reset back to first text.
   * Equivalent to jumpTo(0).
   */
  reset: () => void
}

/**
 * Internal interface for representing words when splitting text by characters.
 * Used to maintain proper word spacing and line breaks while allowing
 * character-by-character animation. This prevents words from breaking
 * across lines during animation.
 */
interface WordObject {
  /**
   * Array of individual characters in the word.
   * Uses Intl.Segmenter when available for proper Unicode handling.
   */
  characters: string[]

  /**
   * Whether this word needs a space after it.
   * True for all words except the last one in a sequence.
   */
  needsSpace: boolean
}

const TextRotate = forwardRef<TextRotateRef, TextRotateProps>(
  (
    {
      texts,
      as = "p",
      transition = { type: "spring", damping: 25, stiffness: 300 },
      initial = { y: "100%", opacity: 0 },
      animate = { y: 0, opacity: 1 },
      exit = { y: "-120%", opacity: 0 },
      animatePresenceMode = "wait",
      animatePresenceInitial = false,
      rotationInterval = 2000,
      staggerDuration = 0,
      staggerFrom = "first",
      loop = true,
      auto = true,
      splitBy = "characters",
      onNext,
      mainClassName,
      splitLevelClassName,
      elementLevelClassName,
      ...props
    },
    ref
  ) => {
    const [currentTextIndex, setCurrentTextIndex] = useState(0)

    // Splitting the text into animation segments
    const elements = useMemo(() => {
      const currentText = texts[currentTextIndex]
      if (splitBy === "characters") {
        const text = currentText.split(" ")
        return text.map((word, i) => ({
          characters: splitIntoCharacters(word),
          needsSpace: i !== text.length - 1,
        }))
      }
      return splitBy === "words"
        ? currentText.split(" ")
        : splitBy === "lines"
          ? currentText.split("\n")
          : currentText.split(splitBy)
    }, [texts, currentTextIndex, splitBy])

    // Helper function to calculate stagger delay for each text segment
    const getStaggerDelay = useCallback(
      (index: number, totalChars: number) => {
        const total = totalChars
        if (staggerFrom === "first") return index * staggerDuration
        if (staggerFrom === "last") return (total - 1 - index) * staggerDuration
        if (staggerFrom === "center") {
          const center = Math.floor(total / 2)
          return Math.abs(center - index) * staggerDuration
        }
        if (staggerFrom === "random") {
          const randomIndex = Math.floor(Math.random() * total)
          return Math.abs(randomIndex - index) * staggerDuration
        }
        return Math.abs(staggerFrom - index) * staggerDuration
      },
      [staggerFrom, staggerDuration]
    )

    // Helper function to handle index changes and trigger callback
    const handleIndexChange = useCallback(
      (newIndex: number) => {
        setCurrentTextIndex(newIndex)
        onNext?.(newIndex)
      },
      [onNext]
    )

    // Go to next text
    const next = useCallback(() => {
      const nextIndex =
        currentTextIndex === texts.length - 1
          ? loop
            ? 0
            : currentTextIndex
          : currentTextIndex + 1

      if (nextIndex !== currentTextIndex) {
        handleIndexChange(nextIndex)
      }
    }, [currentTextIndex, texts.length, loop, handleIndexChange])

    // Go back to previous text
    const previous = useCallback(() => {
      const prevIndex =
        currentTextIndex === 0
          ? loop
            ? texts.length - 1
            : currentTextIndex
          : currentTextIndex - 1

      if (prevIndex !== currentTextIndex) {
        handleIndexChange(prevIndex)
      }
    }, [currentTextIndex, texts.length, loop, handleIndexChange])

    // Jump to specific text by index
    const jumpTo = useCallback(
      (index: number) => {
        const validIndex = Math.max(0, Math.min(index, texts.length - 1))
        if (validIndex !== currentTextIndex) {
          handleIndexChange(validIndex)
        }
      },
      [texts.length, currentTextIndex, handleIndexChange]
    )

    // Reset back to first text
    const reset = useCallback(() => {
      if (currentTextIndex !== 0) {
        handleIndexChange(0)
      }
    }, [currentTextIndex, handleIndexChange])

    // Get animation props for each text segment. If array is provided, states will be mapped to text segments cyclically.
    const getAnimationProps = useCallback(
      (index: number) => {
        const getProp = (
          prop:
            | MotionProps["initial"]
            | MotionProps["initial"][]
            | MotionProps["animate"]
            | MotionProps["animate"][]
            | MotionProps["exit"]
            | MotionProps["exit"][]
        ) => {
          if (Array.isArray(prop)) {
            return prop[index % prop.length]
          }
          return prop
        }

        return {
          initial: getProp(initial) as MotionProps["initial"],
          animate: getProp(animate) as MotionProps["animate"],
          exit: getProp(exit) as MotionProps["exit"],
        }
      },
      [initial, animate, exit]
    )

    // Expose all navigation functions via ref
    useImperativeHandle(
      ref,
      () => ({
        next,
        previous,
        jumpTo,
        reset,
      }),
      [next, previous, jumpTo, reset]
    )

    // Auto-rotate text
    useEffect(() => {
      if (!auto) return
      const intervalId = setInterval(next, rotationInterval)
      return () => clearInterval(intervalId)
    }, [next, rotationInterval, auto])

    // Custom motion component to render the text as a custom HTML tag provided via prop
    const MotionComponent = useMemo(() => motion.create(as ?? "p"), [as])

    return (
      <MotionComponent
        className={cn("flex flex-wrap whitespace-pre-wrap", mainClassName)}
        transition={transition}
        layout
        {...props}
      >
        <span className="sr-only">{texts[currentTextIndex]}</span>

        <AnimatePresence
          mode={animatePresenceMode}
          initial={animatePresenceInitial}
        >
          <motion.span
            key={currentTextIndex}
            className={cn(
              "flex flex-wrap",
              splitBy === "lines" && "flex-col w-full"
            )}
            aria-hidden
            layout
          >
            {(splitBy === "characters"
              ? (elements as WordObject[])
              : (elements as string[]).map((el, i) => ({
                  characters: [el],
                  needsSpace: i !== elements.length - 1,
                }))
            ).map((wordObj, wordIndex, array) => {
              const previousCharsCount = array
                .slice(0, wordIndex)
                .reduce((sum, word) => sum + word.characters.length, 0)

              return (
                <span
                  key={wordIndex}
                  className={cn("inline-flex", splitLevelClassName)}
                >
                  {wordObj.characters.map((char, charIndex) => {
                    const totalIndex = previousCharsCount + charIndex
                    const animationProps = getAnimationProps(totalIndex)
                    return (
                      <span 
                      key={totalIndex}
                      className={cn(elementLevelClassName)}
                      >
                        <motion.span
                          {...animationProps}
                          key={charIndex}
                          transition={{
                            ...transition,
                            delay: getStaggerDelay(
                              previousCharsCount + charIndex,
                              array.reduce(
                                (sum, word) => sum + word.characters.length,
                                0
                              )
                            ),
                          }}
                          className={"inline-block"}
                        >
                          {char}
                        </motion.span>
                      </span>
                    )
                  })}
                  {wordObj.needsSpace && (
                    <span className="whitespace-pre"> </span>
                  )}
                </span>
              )
            })}
          </motion.span>
        </AnimatePresence>
      </MotionComponent>
    )
  }
)

TextRotate.displayName = "TextRotate"

export default TextRotate