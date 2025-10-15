"use client";
import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BorderTrail } from "@/components/core/border-trail";
import { TextShimmer } from "@/components/core/text-shimmer";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { AppleStocksIcon as TaxIcon } from "@hugeicons/core-free-icons";

export interface NomenclatureLoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  duration?: number;
}

export function NomenclatureLoadingState({ size = 80, duration = 5, className, ...props }: NomenclatureLoadingStateProps) {
  const skeletonWidths = useMemo(() => [45, 28, 52], []);
  return (
    <Card
      className={cn("relative w-full h-[100px] my-4 overflow-hidden shadow-none", className)}
      role="status"
      aria-live="polite"
      aria-label="Classification en cours"
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
      <CardContent className="px-6">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-full flex items-center justify-center bg-[#EDEAE7]/60 dark:bg-[#3C3732]/40">
              <BorderTrail
                className={cn(
                  "bg-linear-to-l from-[#7D7064] via-[#70665D] to-[#3C3732]",
                  "dark:from-[#C7C0B9] dark:via-[#A8998B] dark:to-[#8F877F]"
                )}
                size={40}
                transition={{ repeat: Infinity, duration, ease: "linear" }}
              />
              <HugeiconsIcon icon={TaxIcon} size={20} color="currentColor" strokeWidth={2} className={cn("text-[#70665D] dark:text-[#C7C0B9]")} />
            </div>
            <div className="space-y-2">
              <TextShimmer className="text-base font-medium" duration={1.6}>
                {"Classification douanière en cours…"}
              </TextShimmer>
              <div className="flex gap-2">
                {skeletonWidths.map((width, i) => (
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
