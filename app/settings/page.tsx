'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarLayout } from '@/components/sidebar-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import { useUser } from '@/contexts/user-context';
import { ProvidersSection, SearchKeysSection } from '@/components/settings/api-keys-section';
import {
  ACCOUNT_SETTINGS_SECTIONS,
  SETTINGS_SECTIONS,
  resolveSettingsTab,
} from '@/components/settings/settings-nav';
import {
  AdvancedSection,
  ModelDefaultsSection,
  SearchPreferencesSection,
  UiPreferencesSection,
} from '@/components/settings/local-sections';
import { ConnectorsSection, MemoriesSection, UploadsSection } from '@/components/settings-dialog';

function SettingsContent() {
  // TODO(auth): user is null while authentication is disabled; account-backed
  // sections (Connectors, Memories, Uploads) reappear when auth is restored.
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const sections = user ? [...SETTINGS_SECTIONS, ...ACCOUNT_SETTINGS_SECTIONS] : SETTINGS_SECTIONS;
  const activeTab = resolveSettingsTab(searchParams.get('tab'));
  const activeSection = sections.find((s) => s.value === activeTab) || sections[0];

  const setActiveTab = (tab: string) => {
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="w-full">
      {/* Header — matches the compact page headers used elsewhere in the app */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b border-border/40">
        <div className="flex h-14 items-center gap-3 px-4 md:px-6 max-w-3xl mx-auto w-full">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
          <span className="text-xs text-muted-foreground">/ {activeSection.label}</span>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6 max-w-3xl mx-auto w-full space-y-5">
        {/* Mobile section picker — on desktop the app sidebar shows the sections */}
        <div className="md:hidden">
          <Select value={activeSection.value} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={activeSection.icon} size={16} strokeWidth={1.5} />
                  <span>{activeSection.label}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section.value} value={section.value}>
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={section.icon} size={16} strokeWidth={1.5} />
                    <span>{section.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <h2 className="text-base font-semibold">{activeSection.label}</h2>
          <p className="text-sm text-muted-foreground">{activeSection.description}</p>
        </div>

        {activeSection.value === 'providers' && <ProvidersSection />}
        {activeSection.value === 'models' && <ModelDefaultsSection />}
        {activeSection.value === 'search' && (
          <div className="space-y-4">
            <SearchPreferencesSection />
            <SearchKeysSection />
          </div>
        )}
        {activeSection.value === 'ui' && <UiPreferencesSection />}
        {activeSection.value === 'advanced' && <AdvancedSection />}
        {activeSection.value === 'connectors' && <ConnectorsSection user={user} />}
        {activeSection.value === 'memories' && <MemoriesSection />}
        {activeSection.value === 'uploads' && <UploadsSection />}
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <SidebarLayout>
      <Suspense
        fallback={
          <div className="w-full">
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40">
              <div className="flex h-14 items-center px-4 md:px-6 max-w-3xl mx-auto w-full">
                <div className="h-5 w-24 bg-muted rounded" />
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 md:p-6 max-w-3xl mx-auto w-full space-y-4">
              <div className="h-8 w-40 bg-muted rounded" />
              <div className="h-64 w-full bg-muted/30 rounded-xl" />
            </main>
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </SidebarLayout>
  );
}
