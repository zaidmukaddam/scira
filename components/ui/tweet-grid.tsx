"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tweet } from "react-tweet"

import { cn } from "@/lib/utils"

const tweetGridVariants = cva("max-w-4xl md:max-w-6xl px-2", {
  variants: {
    columns: {
      1: "columns-1",
      2: "sm:columns-2",
      3: "md:columns-3",
      4: "lg:columns-4",
      5: "xl:columns-5",
    },
  },
  defaultVariants: {
    columns: 3,
  },
})

const tweetItemVariants = cva("break-inside-avoid", {
  variants: {
    spacing: {
      sm: "mb-2",
      md: "mb-4",
      lg: "mb-6",
    },
  },
  defaultVariants: {
    spacing: "md",
  },
})

export interface TweetGridProps
  extends VariantProps<typeof tweetGridVariants>,
    VariantProps<typeof tweetItemVariants> {
  tweets: string[]
  className?: string
}

export const TweetGrid: React.FC<TweetGridProps> = ({
  tweets,
  columns,
  spacing,
  className,
}) => {
  return (
    <div className={cn(tweetGridVariants({ columns }), className)}>
      {tweets.map((tweetId, i) => (
        <div
          key={`${tweetId}-${i}`}
          className={cn(tweetItemVariants({ spacing }))}
        >
          <Tweet id={tweetId} />
        </div>
      ))}
    </div>
  )
}
