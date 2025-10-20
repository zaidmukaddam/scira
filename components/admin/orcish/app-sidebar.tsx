"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  IconDashboard,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconTrophy,
} from "@tabler/icons-react";

import { NavDocuments } from "@/components/admin/orcish/nav-documents";
import { NavMain } from "@/components/admin/orcish/nav-main";
import { NavSecondary } from "@/components/admin/orcish/nav-secondary";
import { NavUser } from "@/components/admin/orcish/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/admin/orcish/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Activity, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

async function fetchQuickStats() {
  const res = await fetch("/api/admin/metrics", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

const data = {
  user: {
    name: "Administrateur",
    email: "admin@local",
    avatar: "/icon.png",
  },
  navMain: [
    {
      title: "Tableau de bord",
      url: "/admin",
      icon: IconDashboard,
      isActive: true,
    },
    {
      title: "Utilisateurs",
      url: "/admin/users",
      icon: IconUsers,
    },
    {
      title: "Top Profil",
      url: "/admin/users/profile",
      icon: IconTrophy,
    },
    {
      title: "Journaux",
      url: "/admin/logs",
      icon: IconReport,
    },
  ],
  navSecondary: [
    {
      title: "Paramètres",
      url: "/admin/settings",
      icon: IconSettings,
    },
    {
      title: "Recherche",
      url: "/",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Rapports",
      url: "/admin/logs",
      icon: IconReport,
    },
  ],
};

function SidebarQuickStats() {
  const { state } = useSidebar();
  const { data: metrics } = useQuery({
    queryKey: ["sidebar-quick-stats"],
    queryFn: fetchQuickStats,
    refetchInterval: 30000,
  });

  if (state === "collapsed" || !metrics?.kpis) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="px-4 py-3 border-t"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Activity className="size-3" />
            Statistiques
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 p-2">
            <div className="text-xs text-muted-foreground">Utilisateurs</div>
            <div className="text-lg font-semibold">
              {metrics.kpis.activeUsers}
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              Msgs 24h
              <TrendingUp className="size-3 text-green-500" />
            </div>
            <div className="text-lg font-semibold">
              {metrics.kpis.messages24hTotal}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/admin" className="flex items-center gap-2">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2"
                >
                  <div className="size-6 rounded bg-primary/10 flex items-center justify-center">
                    <IconDashboard className="size-4 text-primary" />
                  </div>
                  <span className="text-base font-semibold">Admin</span>
                </motion.div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <SidebarQuickStats />
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
