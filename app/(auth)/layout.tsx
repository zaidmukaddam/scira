'use client';

import { CpuArchitecture } from '@/components/core/cpu-architecture';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between h-screen bg-background">
      <div className="hidden lg:flex lg:w-1/2 h-full bg-muted/30 flex-col">
        <div className="w-full h-full flex items-center justify-center p-12">
          <CpuArchitecture
            className="text-muted-foreground"
            width="100%"
            height="100%"
            text="HYPER"
            showCpuConnections={true}
            animateText={true}
            animateLines={true}
            animateMarkers={true}
            lineMarkerSize={20}
          />
        </div>
      </div>
      <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center px-4 md:px-8">{children}</div>
    </div>
  );
}
