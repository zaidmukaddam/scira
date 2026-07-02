/**
 * Local-first settings storage for the self-hosted build.
 *
 * Provider API keys entered by the user are stored in localStorage and sent to
 * the server with each search request via the `x-provider-api-keys` header.
 *
 * TODO(secret-storage): localStorage keeps keys in plaintext on the device.
 * When a secure secret store is added (encrypted at rest and/or server-side
 * per-user secrets), migrate reads/writes here so the rest of the app is
 * unaffected.
 */

import type { ModelProvider } from '@/ai/models';

/** API keys the user can configure in Settings. All optional. */
export interface ProviderApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  groq?: string;
  xai?: string;
  mistral?: string;
  // Search / scraping providers
  exa?: string;
  firecrawl?: string;
  tavily?: string;
}

export type ProviderKeyId = keyof ProviderApiKeys;

/**
 * Which providers on the server report an API key configured via env vars.
 * `gateway` reports whether server-routed models (Vercel AI Gateway and other
 * server backends) are available at all.
 */
export type ServerConfiguredProviders = Record<ProviderKeyId, boolean> & { gateway?: boolean };

/**
 * App preferences persisted locally (via useLocalStorage / useSyncedPreferences).
 * Documented here so settings data has a single typed source of truth.
 */
export interface LocalAppPreferences {
  /** localStorage key: 'scira-selected-model' */
  defaultModel: string;
  /** preference key: 'scira-search-provider' */
  searchProvider: 'exa' | 'parallel' | 'firecrawl';
  /** preference key: 'scira-visible-modes' — empty array means all modes visible */
  visibleModes: string[];
  /** preference key: 'scira-custom-instructions-enabled' */
  customInstructionsEnabled: boolean;
  /** preference key: 'scira-blur-personal-info' */
  blurPersonalInfo: boolean;
}

export const PROVIDER_KEYS_STORAGE_KEY = 'scira-provider-api-keys';

export interface ProviderKeyField {
  id: ProviderKeyId;
  label: string;
  placeholder: string;
  /** Loose prefix hint used for soft validation only. */
  prefix?: string;
  kind: 'model' | 'search';
}

export const PROVIDER_KEY_FIELDS: ProviderKeyField[] = [
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...', prefix: 'sk-', kind: 'model' },
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...', prefix: 'sk-ant-', kind: 'model' },
  { id: 'google', label: 'Google / Gemini', placeholder: 'AIza...', kind: 'model' },
  { id: 'groq', label: 'Groq', placeholder: 'gsk_...', prefix: 'gsk_', kind: 'model' },
  { id: 'xai', label: 'xAI / Grok', placeholder: 'xai-...', prefix: 'xai-', kind: 'model' },
  { id: 'mistral', label: 'Mistral', placeholder: 'API key', kind: 'model' },
  { id: 'exa', label: 'Exa (web search)', placeholder: 'API key', kind: 'search' },
  { id: 'firecrawl', label: 'Firecrawl (web search & scraping)', placeholder: 'fc-...', prefix: 'fc-', kind: 'search' },
  { id: 'tavily', label: 'Tavily (search)', placeholder: 'tvly-...', prefix: 'tvly-', kind: 'search' },
];

/**
 * Model providers whose models are called directly with a per-provider API key
 * and can therefore use a user-supplied key. Models from other providers are
 * served through server-configured backends (gateway, groq, novita, ...) and
 * do not require a user key.
 */
export const KEYED_MODEL_PROVIDERS: Partial<Record<ModelProvider, ProviderKeyId>> = {
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'google',
  xai: 'xai',
  mistral: 'mistral',
};

export function getStoredProviderKeys(): ProviderApiKeys {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PROVIDER_KEYS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const keys: ProviderApiKeys = {};
    for (const field of PROVIDER_KEY_FIELDS) {
      const value = parsed[field.id];
      if (typeof value === 'string' && value.trim()) {
        keys[field.id] = value.trim();
      }
    }
    return keys;
  } catch {
    return {};
  }
}

export function setStoredProviderKeys(keys: ProviderApiKeys): void {
  if (typeof window === 'undefined') return;
  const cleaned: ProviderApiKeys = {};
  for (const field of PROVIDER_KEY_FIELDS) {
    const value = keys[field.id];
    if (typeof value === 'string' && value.trim()) {
      cleaned[field.id] = value.trim();
    }
  }
  window.localStorage.setItem(PROVIDER_KEYS_STORAGE_KEY, JSON.stringify(cleaned));
  window.dispatchEvent(
    new CustomEvent('localStorage-change', { detail: { key: PROVIDER_KEYS_STORAGE_KEY, value: cleaned } }),
  );
}

export function clearStoredProviderKeys(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PROVIDER_KEYS_STORAGE_KEY);
  window.dispatchEvent(
    new CustomEvent('localStorage-change', { detail: { key: PROVIDER_KEYS_STORAGE_KEY, value: {} } }),
  );
}

/**
 * Per-provider preferences for the model picker.
 * - `enabled` — undefined defaults to true; false hides the provider's models
 *   everywhere even when a key is configured.
 * - `models` — enabled model values for the provider; undefined means all of
 *   the provider's models are enabled.
 */
export interface ProviderPrefs {
  enabled?: boolean;
  models?: string[];
}

export type ProviderSettingsMap = Partial<Record<ModelProvider, ProviderPrefs>>;

export const PROVIDER_SETTINGS_STORAGE_KEY = 'scira-provider-settings';

export function getStoredProviderSettings(): ProviderSettingsMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as ProviderSettingsMap;
  } catch {
    return {};
  }
}

export function setStoredProviderSettings(settings: ProviderSettingsMap): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PROVIDER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(
    new CustomEvent('localStorage-change', { detail: { key: PROVIDER_SETTINGS_STORAGE_KEY, value: settings } }),
  );
}

/** Header used to send user-configured keys to the search API. */
export const PROVIDER_KEYS_HEADER = 'x-provider-api-keys';

/** Serialized keys for the request header, or undefined when none are set. */
export function getProviderKeysHeaderValue(): string | undefined {
  const keys = getStoredProviderKeys();
  return Object.keys(keys).length > 0 ? JSON.stringify(keys) : undefined;
}
