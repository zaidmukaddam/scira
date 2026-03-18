"use client";

import { useRouter } from "next/navigation";
import { Mic, Globe, Zap } from "lucide-react";
import { SciraLogo } from "@/components/logos/scira-logo";
import { Orb } from "@/components/ui/orb";

interface ProUpgradeScreenProps {
  user: unknown;
  isProUser: boolean;
  isProStatusLoading: boolean;
}

const FEATURES = [
  { icon: Mic, label: "Voice conversations" },
  { icon: Globe, label: "Real-time web search" },
  { icon: Zap, label: "5 voices to choose from" },
];

export function ProUpgradeScreen({ user }: ProUpgradeScreenProps) {
  const router = useRouter();

  return (
    <div className="relative flex h-dvh w-full flex-col items-center overflow-hidden bg-background">
      <div className="relative z-10 flex min-h-0 flex-1 w-full max-w-lg flex-col items-center p-4 sm:p-6 safe-area-inset-bottom">

        {/* Header */}
        <header className="flex w-full shrink-0 items-center pt-2 sm:pt-4">
          <div className="flex items-center gap-2">
            <SciraLogo className="shrink-0 size-7 sm:size-8" />
            <h1 className="font-pixel text-base sm:text-2xl text-foreground tracking-wider">
              Voice
            </h1>
          </div>
        </header>

        {/* Orb — dimmed, same position as the real page */}
        <div className="flex flex-1 min-h-0 items-center justify-center w-full">
          <div className="relative size-[260px] sm:size-[300px] opacity-30 pointer-events-none">
            <Orb
              colors={["#6B5B4F", "#8B7355"]}
              agentState={null}
              volumeMode="auto"
              inputVolumeRef={{ current: 0 }}
              outputVolumeRef={{ current: 0 }}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Upgrade card — sits where the accordion + controls live */}
        <div className="flex w-full shrink-0 flex-col gap-3 pb-2 sm:pb-0">
          <div className="w-full rounded-xl border border-border/60 bg-card/30 p-4 flex flex-col gap-4">

            <div className="flex flex-col gap-1">
              <div className="inline-flex items-center gap-1.5 w-fit rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 mb-1">
                <span className="font-pixel text-[9px] text-muted-foreground/70 tracking-wider uppercase">Pro feature</span>
              </div>
              <p className="text-sm font-medium text-foreground">Unlock Voice</p>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Have natural voice conversations with Scira. Ask questions, search the web, and get real-time responses.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center size-6 rounded-md bg-primary/10 border border-primary/20 shrink-0">
                    <Icon className="size-3.5 text-primary" aria-hidden />
                  </div>
                  <span className="text-xs text-foreground/70">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push("/new")}
                className="flex-1 h-9 rounded-lg border border-border/50 bg-transparent text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                Back to search
              </button>
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
