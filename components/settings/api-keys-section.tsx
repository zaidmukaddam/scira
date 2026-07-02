'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Trash2 } from 'lucide-react';
import { sileo } from 'sileo';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProviderIcon } from '@/components/ui/model-selector';
import { useModelAvailability, useProviderKeys, useProviderSettings } from '@/hooks/use-provider-keys';
import {
  KEYED_MODEL_PROVIDERS,
  PROVIDER_KEY_FIELDS,
  type ProviderKeyField,
  type ProviderKeyId,
} from '@/lib/local-settings';
import { models, getModelProvider, PROVIDERS, type Model, type ModelProvider } from '@/ai/models';
import { cn } from '@/lib/utils';

/** All models grouped by UI provider, in registry order. */
function groupModelsByProvider(): Map<ModelProvider, Model[]> {
  const grouped = new Map<ModelProvider, Model[]>();
  for (const model of models) {
    const provider = model.provider || getModelProvider(model.value, model.label);
    const list = grouped.get(provider);
    if (list) list.push(model);
    else grouped.set(provider, [model]);
  }
  return grouped;
}

function StatusDot({ tone, text }: { tone: 'active' | 'server' | 'off'; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        className={cn(
          'size-1.5 rounded-full',
          tone === 'active' && 'bg-emerald-500',
          tone === 'server' && 'bg-sky-500',
          tone === 'off' && 'bg-muted-foreground/40',
        )}
      />
      {text}
    </span>
  );
}

function KeyInput({
  field,
  value,
  onSave,
  onClear,
  serverConfigured,
}: {
  field: ProviderKeyField;
  value: string;
  onSave: (value: string) => void;
  onClear: () => void;
  serverConfigured: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [visible, setVisible] = useState(false);
  const looksWrong = Boolean(draft && field.prefix && !draft.trim().startsWith(field.prefix));

  // Keep draft in sync when the stored key changes elsewhere (e.g. Clear all).
  const [lastSaved, setLastSaved] = useState(value);
  if (value !== lastSaved) {
    setLastSaved(value);
    setDraft(value);
  }

  const commit = () => {
    if (draft.trim() === value) return;
    onSave(draft.trim());
  };

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Input
            id={`key-${field.id}`}
            type={visible ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            placeholder={serverConfigured ? 'Using server key — enter to override' : field.placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
            }}
            className={cn('pr-9 font-mono text-xs h-9', looksWrong && 'border-amber-500/60')}
          />
          <button
            type="button"
            aria-label={visible ? 'Hide key' : 'Show key'}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${field.label} key`}
            onClick={() => {
              setDraft('');
              onClear();
            }}
            className="size-9 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      {looksWrong && (
        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
          Doesn&apos;t look like a typical {field.label} key (expected &quot;{field.prefix}…&quot;). It is saved anyway.
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground/70">
        Stored locally in this browser and sent only with your own requests.
      </p>
    </div>
  );
}

function ModelToggleList({
  provider,
  providerModels,
}: {
  provider: ModelProvider;
  providerModels: Model[];
}) {
  const [settings, setSettings] = useProviderSettings();
  const prefs = settings[provider] || {};
  const allValues = providerModels.map((m) => m.value);
  const enabledSet = new Set(prefs.models ?? allValues);

  const toggleModel = (value: string, enabled: boolean) => {
    const next = new Set(enabledSet);
    if (enabled) next.add(value);
    else next.delete(value);
    const nextList = allValues.filter((v) => next.has(v));
    setSettings({
      ...settings,
      [provider]: {
        ...prefs,
        // undefined = all enabled, keeps new models enabled by default
        models: nextList.length === allValues.length ? undefined : nextList,
      },
    });
  };

  const setAll = (enabled: boolean) => {
    setSettings({ ...settings, [provider]: { ...prefs, models: enabled ? undefined : [] } });
  };

  return (
    <div className="mt-3 rounded-lg border border-border/50 divide-y divide-border/40">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Models · {enabledSet.size}/{providerModels.length} enabled
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setAll(true)} className="text-[11px] text-primary hover:underline">
            All
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="text-[11px] text-muted-foreground hover:underline"
          >
            None
          </button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-border/30">
        {providerModels.map((model) => (
          <div key={model.value} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <Label htmlFor={`model-${model.value}`} className="text-xs font-medium leading-none">
                {model.label}
              </Label>
              <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{model.description}</p>
            </div>
            <Switch
              id={`model-${model.value}`}
              className="scale-90"
              checked={enabledSet.has(model.value)}
              onCheckedChange={(checked) => toggleModel(model.value, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  keyField,
  providerModels,
  requiresGateway,
}: {
  provider: ModelProvider;
  keyField?: ProviderKeyField;
  providerModels: Model[];
  requiresGateway?: boolean;
}) {
  const [savedKeys, setKeys] = useProviderKeys();
  const [settings, setSettings] = useProviderSettings();
  const { isModelProviderConfigured, serverProviders } = useModelAvailability();
  const [open, setOpen] = useState(false);

  const info = PROVIDERS[provider];
  const keyId = keyField?.id as ProviderKeyId | undefined;
  const hasLocalKey = Boolean(keyId && savedKeys[keyId]);
  const serverConfigured = Boolean(keyId ? serverProviders?.[keyId] : serverProviders?.gateway);
  const configured = isModelProviderConfigured(provider);
  const enabled = settings[provider]?.enabled !== false;
  const active = configured && enabled;

  const prefs = settings[provider];
  const enabledModelCount = prefs?.models ? prefs.models.length : providerModels.length;

  const status = !configured
    ? { tone: 'off' as const, text: requiresGateway ? 'Server gateway not configured' : 'No API key' }
    : hasLocalKey
      ? { tone: 'active' as const, text: 'Using your key' }
      : { tone: 'server' as const, text: requiresGateway ? 'Served by server' : 'Server key' };

  const setEnabled = (next: boolean) => {
    setSettings({ ...settings, [provider]: { ...prefs, enabled: next } });
  };

  return (
    <Card className={cn('p-0 shadow-none border-border/60 overflow-hidden', !active && 'opacity-75')}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-3 px-3.5 py-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-secondary/60 text-foreground/80 shrink-0">
            <ProviderIcon provider={provider} size={18} />
          </div>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex-1 min-w-0 text-left cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium leading-none">{info.name}</span>
                <span className="text-[10px] text-muted-foreground/60">
                  {enabledModelCount}/{providerModels.length} models
                </span>
                <ChevronDown
                  className={cn('size-3.5 text-muted-foreground/50 transition-transform', open && 'rotate-180')}
                />
              </div>
              <div className="mt-1">
                <StatusDot tone={status.tone} text={status.text} />
              </div>
            </button>
          </CollapsibleTrigger>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label={`${info.name} enabled`}
            disabled={!configured && !enabled}
          />
        </div>
        <CollapsibleContent>
          <div className="px-3.5 pb-3.5 border-t border-border/40 pt-3">
            {keyField && keyId && (
              <KeyInput
                field={keyField}
                value={savedKeys[keyId] || ''}
                serverConfigured={serverConfigured}
                onSave={(value) => {
                  setKeys({ ...savedKeys, [keyId]: value });
                  sileo.success({ title: `${info.name} key saved` });
                }}
                onClear={() => {
                  const next = { ...savedKeys };
                  delete next[keyId];
                  setKeys(next);
                  sileo.success({ title: `${info.name} key removed` });
                }}
              />
            )}
            {requiresGateway && !serverConfigured && (
              <p className="text-[11px] text-muted-foreground">
                These models are served through the server&apos;s AI Gateway. Set{' '}
                <code className="font-mono">AI_GATEWAY_API_KEY</code> in the server environment to enable them.
              </p>
            )}
            <ModelToggleList provider={provider} providerModels={providerModels} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/** Model providers with direct API keys, then server-routed providers. */
export function ProvidersSection() {
  const { isModelProviderConfigured } = useModelAvailability();
  const [settings] = useProviderSettings();

  const modelsByProvider = useMemo(() => groupModelsByProvider(), []);

  const keyedProviders = useMemo(
    () =>
      (Object.keys(KEYED_MODEL_PROVIDERS) as ModelProvider[]).filter((provider) => modelsByProvider.has(provider)),
    [modelsByProvider],
  );

  const routedProviders = useMemo(
    () =>
      Array.from(modelsByProvider.keys()).filter(
        (provider) => !(provider in KEYED_MODEL_PROVIDERS),
      ),
    [modelsByProvider],
  );

  const isActive = (provider: ModelProvider) =>
    isModelProviderConfigured(provider) && settings[provider]?.enabled !== false;

  const renderGroup = (providers: ModelProvider[], requiresGateway: boolean) => (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {providers.map((provider) => {
        const keyId = KEYED_MODEL_PROVIDERS[provider];
        const keyField = keyId ? PROVIDER_KEY_FIELDS.find((f) => f.id === keyId) : undefined;
        return (
          <ProviderCard
            key={provider}
            provider={provider}
            keyField={keyField}
            providerModels={modelsByProvider.get(provider) || []}
            requiresGateway={requiresGateway}
          />
        );
      })}
    </div>
  );

  const enabledKeyed = keyedProviders.filter(isActive);
  const disabledKeyed = keyedProviders.filter((p) => !isActive(p));
  const enabledRouted = routedProviders.filter(isActive);
  const disabledRouted = routedProviders.filter((p) => !isActive(p));

  return (
    <div className="space-y-6">
      {(enabledKeyed.length > 0 || enabledRouted.length > 0) && (
        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Enabled</h3>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              {enabledKeyed.length + enabledRouted.length}
            </span>
          </div>
          {enabledKeyed.length > 0 && renderGroup(enabledKeyed, false)}
          {enabledRouted.length > 0 && renderGroup(enabledRouted, true)}
        </section>
      )}

      {(disabledKeyed.length > 0 || disabledRouted.length > 0) && (
        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Not configured</h3>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              {disabledKeyed.length + disabledRouted.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Add an API key (or enable the provider) to make its models available in the model picker.
          </p>
          {disabledKeyed.length > 0 && renderGroup(disabledKeyed, false)}
          {disabledRouted.length > 0 && renderGroup(disabledRouted, true)}
        </section>
      )}
    </div>
  );
}

/** Simple key rows for search/scraping providers (Exa, Firecrawl, Tavily) and Groq. */
export function SearchKeysSection() {
  const [savedKeys, setKeys] = useProviderKeys();
  const { serverProviders } = useModelAvailability();
  const fields = PROVIDER_KEY_FIELDS.filter((f) => f.kind === 'search' || f.id === 'groq');

  return (
    <Card className="p-4 md:p-5 shadow-none border-border/60">
      <div className="mb-3 space-y-1">
        <h3 className="text-sm font-semibold">Search &amp; infrastructure keys</h3>
        <p className="text-xs text-muted-foreground">
          Used for web search, scraping, and retrieval. Keys are stored locally in this browser.
        </p>
      </div>
      <div className="divide-y divide-border/50">
        {fields.map((field) => {
          const hasLocalKey = Boolean(savedKeys[field.id]);
          const serverConfigured = Boolean(serverProviders?.[field.id]);
          return (
            <div key={field.id} className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="sm:w-56 shrink-0">
                <Label htmlFor={`key-${field.id}`} className="text-sm font-medium leading-none">
                  {field.label}
                </Label>
                <div className="mt-1">
                  <StatusDot
                    tone={hasLocalKey ? 'active' : serverConfigured ? 'server' : 'off'}
                    text={hasLocalKey ? 'Using your key' : serverConfigured ? 'Server key' : 'No key'}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <KeyInput
                  field={field}
                  value={savedKeys[field.id] || ''}
                  serverConfigured={serverConfigured}
                  onSave={(value) => {
                    setKeys({ ...savedKeys, [field.id]: value });
                    sileo.success({ title: `${field.label} key saved` });
                  }}
                  onClear={() => {
                    const next = { ...savedKeys };
                    delete next[field.id];
                    setKeys(next);
                    sileo.success({ title: `${field.label} key removed` });
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
