"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BorderTrail } from "@/components/core/border-trail";
import { TextShimmer } from "@/components/core/text-shimmer";
import { cn } from "@/lib/utils";
import { TreeStructure } from "@phosphor-icons/react";

export interface CyrusLoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  duration?: number;
}

export function CyrusLoadingState({ size = 80, duration = 5, className, ...props }: CyrusLoadingStateProps) {
  return (
    <Card
      className={cn("relative overflow-hidden shadow-none", className)}
      role="status"
      aria-live="polite"
      aria-label="Structuration en cours"
      {...props}
    >
      <BorderTrail
        className={cn(
          "bg-linear-to-l from-[#7D7064] via-[#70665D] to-[#3C3732]",
          "dark:from-[#C7C0B9] dark:via-[#A8998B] dark:to-[#8F877F]"
        )}
        size={size}
        transition={{ repeat: Infinity, duration, ease: "linear" }}
      />
      <CardContent className="px-6 py-4">
        <div className="relative flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full flex items-center justify-center bg-[#EDEAE7]/60 dark:bg-[#3C3732]/40">
            <BorderTrail
              className={cn(
                "bg-linear-to-l from-[#7D7064] via-[#70665D] to-[#3C3732]",
                "dark:from-[#C7C0B9] dark:via-[#A8998B] dark:to-[#8F877F]"
              )}
              size={40}
              transition={{ repeat: Infinity, duration, ease: "linear" }}
            />
            <TreeStructure className={cn("h-5 w-5 text-[#70665D] dark:text-[#C7C0B9]")} />
          </div>
          <div className="min-w-0">
            <TextShimmer className="text-base font-medium" duration={1.6}>
              {"Structuration en cours…"}
            </TextShimmer>
          </div>
        </div>

        <div className="mt-4 space-y-5">
          {/* H1 */}
          <div className="h-5 w-2/3 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />

          {/* Two H2 sections */}
          {[0, 1].map((section) => (
            <div key={section} className="space-y-3">
              {/* H2 */}
              <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />

              {/* H3 group */}
              <div className="pl-4 space-y-2">
                <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
              </div>

              {/* Bulleted list under H3 */}
              <div className="pl-8 space-y-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                    <div
                      className="h-2 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse"
                      style={{ width: `${40 + (i % 3) * 20}px` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
