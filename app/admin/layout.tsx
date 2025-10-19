import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActiveThemeProvider } from "@/components/admin/orcish/active-theme";
import { SidebarProvider } from "@/components/admin/orcish/ui/sidebar";
import { AppSidebar } from "@/components/admin/orcish/app-sidebar";
import { SiteHeader } from "@/components/admin/orcish/site-header";
import { assertAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
  description: "Panneau d'administration",
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get("active_theme")?.value;
  const isScaled = activeThemeValue?.endsWith("-scaled");

  const adminUser = await assertAdmin({ headers: await headers() });
  if (!adminUser) {
    redirect("/sign-in");
  }

  return (
    <ActiveThemeProvider initialTheme={activeThemeValue}>
      <div
        className={[
          activeThemeValue ? `theme-${activeThemeValue}` : "",
          isScaled ? "theme-scaled" : "",
        ].join(" ")}
      >
        <SidebarProvider
          style={{
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties}
        >
          <AppSidebar variant="inset" />
          <div data-slot="sidebar-inset" className="relative flex w-full flex-1 flex-col md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2">
            <SiteHeader />
            {children}
          </div>
        </SidebarProvider>
      </div>
    </ActiveThemeProvider>
  );
}
