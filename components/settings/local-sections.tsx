'use client';

import React, { useMemo, useState } from 'react';
import { sileo } from 'sileo';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useSyncedPreferences } from '@/hooks/use-synced-preferences';
import { useModelAvailability } from '@/hooks/use-provider-keys';
import { models, getModelProvider, getModelProviderInfo } from '@/ai/models';
import { ProviderIcon } from '@/components/ui/model-selector';
import { searchGroups, searchProviderInfo, type SearchProvider } from '@/lib/utils';
import { ThemePreviews } from '@/components/settings/theme-previews';

function SettingRow({
  label,
  description,
  children,
  htmlFor,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="space-y-0.5 min-w-0">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const EXTREME_SEARCH_MODELS = [
  { value: 'scira-ext-1', label: 'Grok 4.1 Fast Reasoning' },
  { value: 'scira-ext-2', label: 'GPT-5.4' },
  { value: 'scira-ext-4', label: 'GLM 4.7 Flash' },
  { value: 'scira-ext-5', label: 'Kimi K2.5' },
  { value: 'scira-ext-6', label: 'Gemini 3.1 Pro' },
  { value: 'scira-ext-7', label: 'Qwen 3.5 Flash' },
  { value: 'scira-ext-8', label: 'Grok 4.20 Experimental Beta' },
] as const;

export function ModelDefaultsSection() {
  const [defaultModel, setDefaultModel] = useLocalStorage('scira-selected-model', 'scira-default');
  const [extremeModel, setExtremeModel] = useSyncedPreferences<string>('scira-extreme-search-model', 'scira-ext-1');
  const [autoRouterEnabled, setAutoRouterEnabled] = useSyncedPreferences<boolean>('scira-auto-router-enabled', false);

  const { isModelEnabled } = useModelAvailability();

  const sortedModels = useMemo(
    () =>
      models
        .filter((model) => isModelEnabled(model))
        .sort((a, b) => {
          const providerA = getModelProviderInfo(a.value)?.name ?? '';
          const providerB = getModelProviderInfo(b.value)?.name ?? '';
          return providerA.localeCompare(providerB) || a.label.localeCompare(b.label);
        }),
    [isModelEnabled],
  );

  return (
    <Card className="p-4 md:p-6 shadow-none border-border/60 divide-y divide-border/60">
      <SettingRow
        label="Default model"
        description={
          sortedModels.length === 0
            ? 'No providers are configured — add an API key under Providers to enable models.'
            : 'Used for new searches. Only models from configured providers are listed.'
        }
      >
        <Select value={defaultModel} onValueChange={setDefaultModel}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {sortedModels.map((model) => {
              const provider = model.provider || getModelProvider(model.value, model.label);
              const providerName = getModelProviderInfo(model.value)?.name ?? provider;
              return (
                <SelectItem key={model.value} value={model.value}>
                  <span className="inline-flex items-center gap-2">
                    <ProviderIcon provider={provider} size={14} className="text-foreground/70" />
                    {model.label}
                    <span className="text-[10px] text-muted-foreground">{providerName}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label="Extreme search model" description="Model used for deep multi-step research runs.">
        <Select value={extremeModel} onValueChange={setExtremeModel}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {EXTREME_SEARCH_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Auto router"
        description="Automatically route each query to a suitable model."
        htmlFor="auto-router"
      >
        <Switch id="auto-router" checked={!!autoRouterEnabled} onCheckedChange={setAutoRouterEnabled} />
      </SettingRow>
    </Card>
  );
}

// Search modes that make sense as user toggles (infrastructure-style modes are excluded).
const TOGGLEABLE_MODE_IDS = [
  'web',
  'chat',
  'x',
  'reddit',
  'youtube',
  'academic',
  'github',
  'stocks',
  'crypto',
  'prediction',
  'spotify',
  'code',
  'canvas',
] as const;

export function SearchPreferencesSection() {
  const [searchProvider, setSearchProvider] = useSyncedPreferences<SearchProvider>('scira-search-provider', 'exa');
  const [visibleModes, setVisibleModes] = useSyncedPreferences<string[]>('scira-visible-modes', []);

  const toggleableGroups = useMemo(
    () => searchGroups.filter((group) => (TOGGLEABLE_MODE_IDS as readonly string[]).includes(group.id)),
    [],
  );

  // Empty list means "all modes visible".
  const effectiveModes = useMemo(
    () => new Set(visibleModes.length > 0 ? visibleModes : searchGroups.map((group) => group.id)),
    [visibleModes],
  );

  const toggleMode = (modeId: string, enabled: boolean) => {
    const next = new Set(effectiveModes);
    if (enabled) next.add(modeId);
    else next.delete(modeId);
    const allIds = searchGroups.map((group) => group.id);
    const nextList = allIds.filter((id) => next.has(id));
    // Store [] when everything is enabled to keep the "all visible" default.
    setVisibleModes(nextList.length === allIds.length ? [] : nextList);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-6 shadow-none border-border/60">
        <SettingRow label="Web search provider" description="Source used for standard web search results.">
          <Select value={searchProvider} onValueChange={(v) => setSearchProvider(v as SearchProvider)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(searchProviderInfo) as SearchProvider[]).map((provider) => (
                <SelectItem key={provider} value={provider} className="capitalize">
                  {provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </Card>

      <Card className="p-4 md:p-6 shadow-none border-border/60">
        <div className="space-y-1 mb-2">
          <h3 className="text-sm font-semibold">Search modes</h3>
          <p className="text-xs text-muted-foreground">
            Choose which modes appear in the search bar (for example Reddit or YouTube video search).
          </p>
        </div>
        <div className="divide-y divide-border/60">
          {toggleableGroups.map((group) => (
            <SettingRow key={group.id} label={group.name} description={group.description} htmlFor={`mode-${group.id}`}>
              <Switch
                id={`mode-${group.id}`}
                checked={effectiveModes.has(group.id)}
                onCheckedChange={(checked) => toggleMode(group.id, checked)}
              />
            </SettingRow>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function UiPreferencesSection() {
  const [blurPersonalInfo, setBlurPersonalInfo] = useSyncedPreferences<boolean>('scira-blur-personal-info', false);
  const [scrollToLatest, setScrollToLatest] = useSyncedPreferences<boolean>('scira-scroll-to-latest-on-open', false);

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-6 shadow-none border-border/60">
        <div className="space-y-1 mb-4">
          <h3 className="text-sm font-semibold">Theme</h3>
          <p className="text-xs text-muted-foreground">Visual style of the app.</p>
        </div>
        <ThemePreviews variant="compact" />
      </Card>

      <Card className="p-4 md:p-6 shadow-none border-border/60 divide-y divide-border/60">
        <SettingRow
          label="Blur personal info"
          description="Blur names and emails in the interface."
          htmlFor="blur-personal"
        >
          <Switch id="blur-personal" checked={!!blurPersonalInfo} onCheckedChange={setBlurPersonalInfo} />
        </SettingRow>

        <SettingRow
          label="Scroll to latest on open"
          description="Jump to the newest message when opening a chat."
          htmlFor="scroll-latest"
        >
          <Switch id="scroll-latest" checked={!!scrollToLatest} onCheckedChange={setScrollToLatest} />
        </SettingRow>
      </Card>
    </div>
  );
}

export function AdvancedSection() {
  const [customInstructionsEnabled, setCustomInstructionsEnabled] = useSyncedPreferences<boolean>(
    'scira-custom-instructions-enabled',
    true,
  );
  const [locationMetadataEnabled, setLocationMetadataEnabled] = useSyncedPreferences<boolean>(
    'scira-location-metadata-enabled',
    false,
  );
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleResetLocalData = () => {
    // Remove all app-local settings (preferences, drafts, and API keys).
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('scira-')) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    setResetDialogOpen(false);
    sileo.success({
      title: 'Local data cleared',
      description: 'All locally stored settings and keys were removed. Reload to apply defaults.',
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-6 shadow-none border-border/60 divide-y divide-border/60">
        <SettingRow
          label="Custom instructions"
          description="Apply your saved custom instructions to responses."
          htmlFor="custom-instructions"
        >
          <Switch
            id="custom-instructions"
            checked={!!customInstructionsEnabled}
            onCheckedChange={setCustomInstructionsEnabled}
          />
        </SettingRow>

        <SettingRow
          label="Location metadata"
          description="Share approximate location to improve local results."
          htmlFor="location-metadata"
        >
          <Switch
            id="location-metadata"
            checked={!!locationMetadataEnabled}
            onCheckedChange={setLocationMetadataEnabled}
          />
        </SettingRow>
      </Card>

      <Card className="p-4 md:p-6 shadow-none border-border/60">
        <SettingRow
          label="Reset local data"
          description="Remove all settings, drafts, and API keys stored in this browser."
        >
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setResetDialogOpen(true)}>
            Reset
          </Button>
        </SettingRow>
      </Card>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all local data?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every locally stored preference, draft, and API key for this app from your browser. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetLocalData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
