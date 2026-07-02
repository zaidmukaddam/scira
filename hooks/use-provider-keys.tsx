'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Model, ModelProvider } from '@/ai/models';
import { getModelProvider } from '@/ai/models';
import {
  type ProviderApiKeys,
  type ProviderSettingsMap,
  type ServerConfiguredProviders,
  KEYED_MODEL_PROVIDERS,
  PROVIDER_KEYS_STORAGE_KEY,
  PROVIDER_SETTINGS_STORAGE_KEY,
  clearStoredProviderKeys,
  getStoredProviderKeys,
  getStoredProviderSettings,
  setStoredProviderKeys,
  setStoredProviderSettings,
} from '@/lib/local-settings';

/** Locally stored provider API keys, synced across tabs/components. */
export function useProviderKeys(): [ProviderApiKeys, (keys: ProviderApiKeys) => void, () => void] {
  const [keys, setKeysState] = useState<ProviderApiKeys>(() => getStoredProviderKeys());

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PROVIDER_KEYS_STORAGE_KEY) setKeysState(getStoredProviderKeys());
    };
    const handleCustom = (e: Event) => {
      if ((e as CustomEvent).detail?.key === PROVIDER_KEYS_STORAGE_KEY) setKeysState(getStoredProviderKeys());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('localStorage-change', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('localStorage-change', handleCustom);
    };
  }, []);

  const setKeys = useCallback((next: ProviderApiKeys) => {
    setStoredProviderKeys(next);
    setKeysState(getStoredProviderKeys());
  }, []);

  const clearKeys = useCallback(() => {
    clearStoredProviderKeys();
    setKeysState({});
  }, []);

  return [keys, setKeys, clearKeys];
}

async function fetchServerConfiguredProviders(): Promise<ServerConfiguredProviders | null> {
  const response = await fetch('/api/settings/providers', { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}

/** Which providers have a key configured on the server via environment variables. */
export function useServerConfiguredProviders() {
  return useQuery({
    queryKey: ['server-configured-providers'],
    queryFn: fetchServerConfiguredProviders,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Combined view of provider availability: a keyed model provider is configured
 * when the user saved a key locally or the server has a real one in its
 * environment. Providers not in KEYED_MODEL_PROVIDERS are served through
 * server-routed backends and are configured when the server reports the AI
 * gateway as available.
 */
export function useConfiguredProviders() {
  const [localKeys] = useProviderKeys();
  const { data: serverProviders, isLoading } = useServerConfiguredProviders();

  const isModelProviderConfigured = useCallback(
    (provider: ModelProvider): boolean => {
      const keyId = KEYED_MODEL_PROVIDERS[provider];
      if (keyId && localKeys[keyId]) return true;
      // While loading (or if the endpoint fails), don't lock models out.
      if (!serverProviders) return isLoading;
      return Boolean(keyId ? serverProviders[keyId] : serverProviders.gateway);
    },
    [localKeys, serverProviders, isLoading],
  );

  return { isModelProviderConfigured, isLoading, localKeys, serverProviders };
}

/** Per-provider enable/model preferences, synced across tabs/components. */
export function useProviderSettings(): [ProviderSettingsMap, (next: ProviderSettingsMap) => void] {
  const [settings, setSettingsState] = useState<ProviderSettingsMap>(() => getStoredProviderSettings());

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PROVIDER_SETTINGS_STORAGE_KEY) setSettingsState(getStoredProviderSettings());
    };
    const handleCustom = (e: Event) => {
      if ((e as CustomEvent).detail?.key === PROVIDER_SETTINGS_STORAGE_KEY) setSettingsState(getStoredProviderSettings());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('localStorage-change', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('localStorage-change', handleCustom);
    };
  }, []);

  const setSettings = useCallback((next: ProviderSettingsMap) => {
    setStoredProviderSettings(next);
    setSettingsState(getStoredProviderSettings());
  }, []);

  return [settings, setSettings];
}

/**
 * Availability rules for the model picker: a model is available when its
 * provider is configured (user key or real server key), the provider hasn't
 * been disabled in Settings, and the model itself hasn't been unchecked.
 */
export function useModelAvailability() {
  const { isModelProviderConfigured, isLoading, localKeys, serverProviders } = useConfiguredProviders();
  const [providerSettings] = useProviderSettings();

  const isProviderActive = useCallback(
    (provider: ModelProvider): boolean => {
      if (providerSettings[provider]?.enabled === false) return false;
      return isModelProviderConfigured(provider);
    },
    [providerSettings, isModelProviderConfigured],
  );

  const isModelEnabled = useCallback(
    (model: Pick<Model, 'value' | 'label' | 'provider'>): boolean => {
      const provider = model.provider || getModelProvider(model.value, model.label);
      if (!isProviderActive(provider)) return false;
      const enabledModels = providerSettings[provider]?.models;
      if (!enabledModels) return true;
      return enabledModels.includes(model.value);
    },
    [isProviderActive, providerSettings],
  );

  return { isProviderActive, isModelEnabled, isModelProviderConfigured, isLoading, localKeys, serverProviders };
}
