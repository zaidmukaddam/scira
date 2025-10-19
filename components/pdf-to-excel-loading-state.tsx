"use client";
import React, { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BorderTrail } from "@/components/core/border-trail";
import { TextShimmer } from "@/components/core/text-shimmer";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";

import { File02Icon as FileExcelIcon } from "@hugeicons/core-free-icons";



export interface PdfToExcelLoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  duration?: number;
  iconComponent?: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

export function PdfToExcelLoadingState({
  size = 80,
  duration = 5,
  className,
  iconComponent: Icon = DefaultDbIcon,
  ...props
}: PdfToExcelLoadingStateProps) {
  return (
    <Card
      className={cn("relative w-full h-[100px] my-4 overflow-hidden shadow-none", className)}
      role="status"
      aria-live="polite"
      aria-label="Conversion PDF → Excel en cours"
      {...props}
    >
      <BorderTrail
        className={cn(
          "bg-linear-to-l from-[#3B5BDB] via-[#4263EB] to-[#364FC7]",
          "dark:from-[#91A7FF] dark:via-[#748FFC] dark:to-[#5C7CFA]"
        )}
        size={size}
        transition={{ repeat: Infinity, duration, ease: "linear" }}
      />
      <CardContent className="px-6">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-full flex items-center justify-center bg-[#EDF2FF]/70 dark:bg-[#364FC7]/30">
              <BorderTrail
                className={cn(
                  "bg-linear-to-l from-[#3B5BDB] via-[#4263EB] to-[#364FC7]",
                  "dark:from-[#91A7FF] dark:via-[#748FFC] dark:to-[#5C7CFA]"
                )}
                size={40}
                transition={{ repeat: Infinity, duration, ease: "linear" }}
              />
              <HugeiconsIcon icon={Icon} size={20} color="currentColor" strokeWidth={2} className={cn("text-[#3B5BDB] dark:text-[#91A7FF]")} />
            </div>
            <div className="space-y-2">
              <TextShimmer className="text-base font-medium" duration={1.6}>
                {"Conversion PDF → Excel en cours…"}
              </TextShimmer>
              <div className="flex gap-2">
                {[32, 48, 28].map((width, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse"
                    style={{ width: `${width}px`, animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
