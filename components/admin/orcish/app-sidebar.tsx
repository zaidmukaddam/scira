"use client";

import * as React from "react";
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
} from "@/components/admin/orcish/ui/sidebar";

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
              <a href="/admin">
                <span className="text-base font-semibold">Admin</span>
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
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
