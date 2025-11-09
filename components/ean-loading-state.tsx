"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BorderTrail } from "@/components/core/border-trail";
import { TextShimmer } from "@/components/core/text-shimmer";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export interface EANLoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  duration?: number;
  barcode?: string;
}

export function EANLoadingState({ 
  size = 80, 
  duration = 5, 
  barcode,
  className, 
  ...props 
}: EANLoadingStateProps) {
  return (
    <Card
      className={cn("relative w-full h-[120px] my-4 overflow-hidden shadow-none", className)}
      role="status"
      aria-live="polite"
      aria-label="Recherche de produit en cours"
      {...props}
    >
      <BorderTrail
        className={cn(
          "bg-linear-to-l from-blue-500 via-cyan-500 to-blue-600",
          "dark:from-blue-400 dark:via-cyan-400 dark:to-blue-500"
        )}
        size={size}
        transition={{ repeat: Infinity, duration, ease: "linear" }}
      />
      <CardContent className="px-6 py-4">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 rounded-lg flex items-center justify-center bg-blue-50/60 dark:bg-blue-950/40">
              <BorderTrail
                className={cn(
                  "bg-linear-to-l from-blue-500 via-cyan-500 to-blue-600",
                  "dark:from-blue-400 dark:via-cyan-400 dark:to-blue-500"
                )}
                size={56}
                transition={{ repeat: Infinity, duration, ease: "linear" }}
              />
              <div className="flex gap-[2px] items-end h-8">
                {[0.6, 1, 0.8, 0.7, 1, 0.5, 0.9, 1, 0.6, 0.8].map((height, i) => (
                  <div
                    key={i}
                    className="w-[2px] bg-blue-600 dark:bg-blue-400 rounded-sm"
                    style={{ height: `${height * 100}%` }}
                  />
                ))}
              </div>
              <motion.div
                className="absolute left-0 w-[2px] h-full bg-red-500"
                initial={{ x: 0 }}
                animate={{ x: 56 }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: "linear",
                }}
              />
            </div>
            
            <div className="space-y-2">
              <TextShimmer className="text-base font-medium" duration={1.6}>
                {"Recherche en cours…"}
              </TextShimmer>
              {barcode && (
                <div className="text-xs text-muted-foreground font-mono">
                  Code-barres: {barcode}
                </div>
              )}
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full bg-blue-200 dark:bg-blue-800 animate-pulse"
                    style={{ width: `${Math.random() * 40 + 30}px`, animationDelay: `${i * 0.3}s` }}
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
