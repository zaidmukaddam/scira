"use client";

import { useRouter } from "next/navigation";
import { AlarmClock, Clock, Zap } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface ProUpgradeScreenProps {
  user: unknown;
  isProUser: boolean;
  isProStatusLoading: boolean;
}

const FEATURES = [
  {
    icon: AlarmClock,
    label: "Scheduled runs",
    description: "Daily, weekly, monthly",
  },
  {
    icon: Clock,
    label: "Custom frequency",
    description: "Timezone-aware scheduling",
  },
  {
    icon: Zap,
    label: "10 active lookouts",
    description: "Multiple search modes",
  },
];

export function ProUpgradeScreen(_props: ProUpgradeScreenProps) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col min-h-screen">
      <div className="md:hidden fixed top-4 left-4 z-10">
        <SidebarTrigger />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm flex flex-col gap-5">

          {/* Title block */}
          <div className="flex flex-col gap-1.5">
            <div className="inline-flex items-center gap-1.5 w-fit rounded-full border border-border/50 bg-muted/40 px-2.5 py-1">
              <span className="font-pixel text-[9px] text-muted-foreground/70 tracking-wider uppercase">Pro feature</span>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Unlock Lookouts</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Automate searches on a schedule and get notified when results are ready.
            </p>
          </div>

          {/* Features */}
          <div className="rounded-xl border border-border/50 bg-card/30 divide-y divide-border/40">
            {FEATURES.map(({ icon: Icon, label, description }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <div className="flex items-center justify-center size-7 rounded-md bg-primary/10 border border-primary/20 shrink-0">
                  <Icon className="size-3.5 text-primary" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">{description}</p>
                </div>
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
