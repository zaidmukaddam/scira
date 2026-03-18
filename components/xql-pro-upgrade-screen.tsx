"use client";

import { useRouter } from "next/navigation";
import { Search, Code, Database } from "lucide-react";
import { SciraLogo } from "@/components/logos/scira-logo";

const FEATURES = [
  { icon: Search, label: "Natural language X post queries" },
  { icon: Code, label: "SQL-like query generation" },
  { icon: Database, label: "Advanced filtering and search" },
];

export function XQLProUpgradeScreen() {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-background">
      {/* Header matching XQL page */}
      {/* <div className="flex items-center gap-2 px-4 sm:px-6 pt-12 sm:pt-14 pb-2">
        <SciraLogo className="size-6 shrink-0" />
        <span className="text-foreground font-semibold text-lg tracking-tight">XQL</span>
        <div className="ml-0.5 -mt-3">
          <span className="bg-primary text-primary-foreground px-1 py-0.5 rounded-sm text-[9px] font-semibold uppercase tracking-wide">
            Beta
          </span>
        </div>
      </div> */}

      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm flex flex-col gap-5">

          {/* Title block */}
          <div className="flex flex-col gap-1.5">
            <div className="inline-flex items-center gap-1.5 w-fit rounded-full border border-border/50 bg-muted/40 px-2.5 py-1">
              <span className="font-pixel text-[9px] text-muted-foreground/70 tracking-wider uppercase">Pro feature</span>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Unlock XQL</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Query X (Twitter) posts using natural language and get structured results. Available for Pro users only.
            </p>
          </div>

          {/* Features */}
          <div className="rounded-xl border border-border/50 bg-card/30 divide-y divide-border/40">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <div className="flex items-center justify-center size-7 rounded-md bg-primary/10 border border-primary/20 shrink-0">
                  <Icon className="size-3.5 text-primary" aria-hidden />
                </div>
                <p className="text-sm text-foreground/80">{label}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/new")}
              className="flex-1 h-9 rounded-lg border border-border/50 bg-transparent text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Back to search
            </button>
            <button
              type="button"
              onClick={() => router.push("/pricing")}
              className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Upgrade to Pro
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
