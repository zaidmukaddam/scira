"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/admin/orcish/ui/sidebar";
import { ThemeSelector } from "@/components/admin/orcish/theme-selector";
import { ModeSwitcher } from "@/components/admin/orcish/mode-switcher";
import { ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

async function fetchHealthStatus() {
  const res = await fetch("/api/admin/health", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

const routeLabels: Record<string, string> = {
  "/admin": "Tableau de bord",
  "/admin/users": "Utilisateurs",
  "/admin/users/profile": "Top Profil",
  "/admin/logs": "Journaux",
  "/admin/settings": "Paramètres",
};

export function SiteHeader() {
  const pathname = usePathname();
  const { data: health } = useQuery({
    queryKey: ["header-health"],
    queryFn: fetchHealthStatus,
    refetchInterval: 20000,
  });

  const breadcrumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((segment, index, array) => {
      const path = "/" + array.slice(0, index + 1).join("/");
      return {
        label: routeLabels[path] || segment,
        path,
        isLast: index === array.length - 1,
      };
    });

  const getHealthColor = (status?: string) => {
    if (status === "ok") return "text-green-500";
    if (status === "warn") return "text-yellow-500";
    if (status === "down") return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) sticky top-0 z-10">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        {breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1 flex-1 min-w-0">
            {breadcrumbs.map((crumb, index) => (
              <motion.div
                key={crumb.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-1"
              >
                {index > 0 && (
                  <ChevronRight className="size-4 text-muted-foreground flex-shrink-0" />
                )}
                <a
                  href={crumb.path}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary truncate",
                    crumb.isLast
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {crumb.label}
                </a>
              </motion.div>
            ))}
          </nav>
        ) : (
          <h1 className="text-base font-medium flex-1">Administration</h1>
        )}

        <div className="ml-auto flex items-center gap-2">
          {health && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50"
            >
              <Circle
                className={cn(
                  "size-2 fill-current animate-pulse",
                  getHealthColor(health.globalStatus)
                )}
              />
              <span className="text-xs font-medium text-muted-foreground">
                Système:{" "}
                <span
                  className={cn("font-semibold", getHealthColor(health.globalStatus))}
                >
                  {health.globalStatus === "ok"
                    ? "OK"
                    : health.globalStatus === "warn"
                      ? "Warning"
                      : "Down"}
                </span>
              </span>
            </motion.div>
          )}
          
          <ThemeSelector />
          <ModeSwitcher />
        </div>
      </div>
    </header>
  );
}
