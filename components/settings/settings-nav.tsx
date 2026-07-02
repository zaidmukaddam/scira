'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import {
  Key01Icon,
  CpuIcon,
  Search01Icon,
  PaintBrush01Icon,
  Settings02Icon,
  ConnectIcon,
  Brain02Icon,
  Attachment01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

export interface SettingsSection {
  value: string;
  label: string;
  icon: typeof Key01Icon;
  description: string;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { value: 'providers', label: 'Providers', icon: Key01Icon, description: 'Model providers, API keys, and models' },
  { value: 'models', label: 'Models', icon: CpuIcon, description: 'Default model and routing' },
  { value: 'search', label: 'Search', icon: Search01Icon, description: 'Search provider, keys, and modes' },
  { value: 'ui', label: 'Interface', icon: PaintBrush01Icon, description: 'Theme and display preferences' },
  { value: 'advanced', label: 'Advanced', icon: Settings02Icon, description: 'Instructions, metadata, and reset' },
];

/** Sections that require a signed-in account. */
export const ACCOUNT_SETTINGS_SECTIONS: SettingsSection[] = [
  { value: 'connectors', label: 'Connectors', icon: ConnectIcon, description: 'External services and data sources' },
  { value: 'memories', label: 'Memories', icon: Brain02Icon, description: 'Stored memories and context' },
  { value: 'uploads', label: 'Uploads', icon: Attachment01Icon, description: 'Files uploaded in chats' },
];

export function resolveSettingsTab(raw: string | null): string {
  const tab = raw || 'providers';
  // Old links used ?tab=keys for the API keys page.
  return tab === 'keys' ? 'providers' : tab;
}

/**
 * Settings sections rendered inside the main app sidebar while on /settings,
 * replacing the page-local second sidebar. Must be rendered inside a
 * SidebarMenu (and a Suspense boundary, because of useSearchParams).
 */
export function SidebarSettingsNav({
  showAccountSections,
  onNavigate,
}: {
  showAccountSections: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname !== '/settings') return null;

  const activeTab = resolveSettingsTab(searchParams.get('tab'));
  const sections = showAccountSections ? [...SETTINGS_SECTIONS, ...ACCOUNT_SETTINGS_SECTIONS] : SETTINGS_SECTIONS;

  return (
    <>
      <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
        <span className="font-pixel text-[11px] text-muted-foreground/60 uppercase tracking-[0.12em]">Settings</span>
      </div>
      {sections.map((section) => (
        <SidebarMenuItem key={section.value}>
          <SidebarMenuButton
            asChild
            tooltip={section.label}
            className={cn(
              'hover:bg-primary/10 transition-all duration-200',
              activeTab === section.value ? 'bg-primary/15 text-foreground font-medium' : '',
            )}
          >
            <Link
              href={`/settings?tab=${section.value}`}
              onClick={onNavigate}
              className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
            >
              <HugeiconsIcon icon={section.icon} size={18} strokeWidth={1.5} />
              <span className="group-data-[collapsible=icon]:hidden">{section.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
}
