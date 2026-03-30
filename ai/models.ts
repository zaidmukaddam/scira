// Model metadata — safe to import on both client and server (no env vars here)

interface ModelParameters {
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  frequencyPenalty?: number;
}

export interface Model {
  value: string;
  label: string;
  description: string;
  vision: boolean;
  reasoning: boolean;
  experimental: boolean;
  category: string;
  pdf: boolean;
  pro: boolean;
  requiresAuth: boolean;
  freeUnlimited: boolean;
  maxOutputTokens: number;
  extreme?: boolean;
  fast?: boolean;
  isNew?: boolean;
  parameters?: ModelParameters;
  supportsFunctionCalling?: boolean;
  supportsParallelToolCalling?: boolean;
  documentSupport?: boolean;
  maxContextTokens?: number;
  toolTokenBudget?: number;
  comingSoon?: boolean;
  /** Always inject code_interpreter (Daytona) regardless of search group */
  supportsCodeInterpreter?: boolean;
}

// The model used when nothing is stored in localStorage or when the stored
// value no longer matches any active model (e.g. after a model is removed).
// Must be a value that exists in the models array below, requires no auth,
// and has freeUnlimited: true so it works for all users on first visit.
// Note: MAGPiE tools are handled server-side via SCX agent loop. Llama 4 is the free default.
export const DEFAULT_MODEL = 'llama-4';

// Active models shown in the UI
export const models: Model[] = [
  {
    value: 'gpt-oss-120b',
    label: 'OpenAI GPT-OSS 120B',
    description: "OpenAI's 120B open-source model on Australian sovereign cloud.",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Aussie Sovereign',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 8192,
    supportsFunctionCalling: true,
    supportsParallelToolCalling: false,
    documentSupport: true,
    maxContextTokens: 131072,
    toolTokenBudget: 25000,
    extreme: true,
  },
  {
    value: 'llama-4',
    label: 'Meta Llama 4',
    description: "Meta's latest model on Australian sovereign cloud.",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Aussie Sovereign',
    pdf: false,
    pro: false,
    requiresAuth: false,
    freeUnlimited: true,
    maxOutputTokens: 8000,
    supportsFunctionCalling: true,
    supportsParallelToolCalling: true,
    documentSupport: true,
    extreme: true,
    fast: true,
  },
  {
    value: 'scx-coder',
    label: 'SCX Coder',
    description: 'High performance coding assistant with reasoning, optimized for algorithms, debugging, and code review.',
    vision: false,
    reasoning: true,
    experimental: false,
    isNew: true,
    category: 'Aussie Sovereign',
    pdf: false,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 4096,
    // coder model uses a custom [TOOL_CALL] protocol incompatible with the AI SDK's
    // standard function-calling. Keeping all tool injection off until a protocol
    // middleware (similar to magpie-middleware.ts) is written for the coder model.
    supportsFunctionCalling: false,
    supportsParallelToolCalling: false,
    supportsCodeInterpreter: false,
    documentSupport: false,
    maxContextTokens: 196608,
    extreme: false,
    fast: false,
  },
  {
    value: 'magpie',
    label: 'SCX MAGPiE',
    description: "Australia's first sovereign AI, trained on local laws, culture, and context.",
    comingSoon: false,
    vision: false,
    reasoning: true,
    experimental: true,
    category: 'Aussie Sovereign',
    pdf: false,
    pro: false,
    requiresAuth: false,
    freeUnlimited: true,
    maxOutputTokens: 8192,
    // MAGPiE tools are executed server-side by the SCX agent loop.
    // The magpieProvider fetch wrapper (createMagpieNormalizedFetch) converts
    // Scira's OpenAI function schemas to SCX type IDs before the request is sent,
    // exactly mirroring what platform.scx.ai does in its custom fetch.
    supportsFunctionCalling: true,
    supportsParallelToolCalling: false,
    documentSupport: false,
    maxContextTokens: 131072,
    extreme: false,
    fast: false,
  },
];

// ─── Commented-out models (available in providers but hidden from UI) ─────────
/*
  {
    value: 'deepseek-v3',
    label: 'DeepSeek V3',
    description: 'Advanced coding & reasoning model on Australian sovereign cloud.',
    vision: false, reasoning: false, experimental: false, category: 'Aussie Sovereign',
    pdf: false, pro: false, requiresAuth: true, freeUnlimited: false,
    maxOutputTokens: 16000, supportsFunctionCalling: true, supportsParallelToolCalling: false,
    documentSupport: true, maxContextTokens: 65536, toolTokenBudget: 20000, extreme: true,
  },
  {
    value: 'deepseek-v3.1',
    label: 'DeepSeek V3.1',
    description: 'Latest DeepSeek with enhanced reasoning on Australian sovereign cloud.',
    vision: false, reasoning: true, experimental: false, category: 'Aussie Sovereign',
    pdf: false, pro: true, requiresAuth: true, freeUnlimited: false,
    maxOutputTokens: 16000, supportsFunctionCalling: true, supportsParallelToolCalling: false,
    documentSupport: true, extreme: true,
  },
  {
    value: 'deepseek-r1',
    label: 'DeepSeek R1',
    description: "DeepSeek's 671B reasoning model on Australian sovereign cloud.",
    vision: false, reasoning: true, experimental: false, category: 'Aussie Sovereign',
    pdf: false, pro: true, requiresAuth: true, freeUnlimited: false,
    maxOutputTokens: 7168, supportsFunctionCalling: true, supportsParallelToolCalling: false,
    documentSupport: true, maxContextTokens: 128000, toolTokenBudget: 20000, extreme: true,
  },
  {
    value: 'llama-3.3',
    label: 'Meta Llama 3.3',
    description: 'Optimised Llama 3.3 on Australian sovereign cloud.',
    vision: false, reasoning: false, experimental: false, category: 'Aussie Sovereign',
    pdf: false, pro: false, requiresAuth: false, freeUnlimited: true,
    maxOutputTokens: 32000, supportsFunctionCalling: false, supportsParallelToolCalling: false,
    documentSupport: true, extreme: false, fast: true,
  },
*/

// ─── Helper functions ───────────────────────────────────────────────────────

export function getModelConfig(modelValue: string): Model | undefined {
  return models.find((m) => m.value === modelValue);
}

export function requiresAuthentication(modelValue: string): boolean {
  return getModelConfig(modelValue)?.requiresAuth ?? false;
}

export function requiresProSubscription(modelValue: string): boolean {
  return getModelConfig(modelValue)?.pro ?? false;
}

export function isFreeUnlimited(modelValue: string): boolean {
  return getModelConfig(modelValue)?.freeUnlimited ?? false;
}

export function hasVisionSupport(modelValue: string): boolean {
  return getModelConfig(modelValue)?.vision ?? false;
}

export function hasPdfSupport(modelValue: string, isProUser = false): boolean {
  const model = getModelConfig(modelValue);
  return (model?.pdf ?? false) || ((model?.documentSupport ?? false) && isProUser);
}

export function hasReasoningSupport(modelValue: string): boolean {
  return getModelConfig(modelValue)?.reasoning ?? false;
}

export function hasDocumentSupport(modelValue: string): boolean {
  return getModelConfig(modelValue)?.documentSupport ?? false;
}

export function supportsFunctionCalling(modelValue: string): boolean {
  return getModelConfig(modelValue)?.supportsFunctionCalling ?? true;
}

export function supportsParallelToolCalling(modelValue: string): boolean {
  return getModelConfig(modelValue)?.supportsParallelToolCalling ?? false;
}

export function supportsCodeInterpreter(modelValue: string): boolean {
  return getModelConfig(modelValue)?.supportsCodeInterpreter ?? false;
}

export function isExperimentalModel(modelValue: string): boolean {
  return getModelConfig(modelValue)?.experimental ?? false;
}

export function getMaxOutputTokens(modelValue: string): number {
  return getModelConfig(modelValue)?.maxOutputTokens ?? 8000;
}

export function getMaxContextTokens(modelValue: string): number | undefined {
  return getModelConfig(modelValue)?.maxContextTokens;
}

export function getToolTokenBudget(modelValue: string): number | undefined {
  return getModelConfig(modelValue)?.toolTokenBudget;
}

export function getModelParameters(modelValue: string): ModelParameters {
  return getModelConfig(modelValue)?.parameters ?? {};
}

export function supportsExtremeMode(modelValue: string): boolean {
  return getModelConfig(modelValue)?.extreme ?? false;
}

export function getExtremeModels(): Model[] {
  return models.filter((m) => m.extreme);
}

export function canUseModel(
  modelValue: string,
  user: unknown,
  isProUser: boolean,
): { canUse: boolean; reason?: string } {
  const model = getModelConfig(modelValue);
  if (!model) return { canUse: false, reason: 'Model not found' };
  if (model.requiresAuth && !user) return { canUse: false, reason: 'authentication_required' };
  if (model.pro && !isProUser) return { canUse: false, reason: 'pro_subscription_required' };
  return { canUse: true };
}

export function shouldBypassRateLimits(modelValue: string, user: unknown): boolean {
  return Boolean(user && getModelConfig(modelValue)?.freeUnlimited);
}

export function getAcceptedFileTypes(modelValue: string, isProUser: boolean): string {
  const model = getModelConfig(modelValue);
  const imageTypes = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,image/heic';

  if (modelValue === 'magpie') return '';

  if (model?.documentSupport && isProUser) {
    const documentTypes =
      'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return `${imageTypes},${documentTypes}`;
  }

  if (model?.pdf && isProUser) return `${imageTypes},application/pdf`;

  return imageTypes;
}

// SCX models are not region-restricted (all traffic goes through Australian sovereign cloud)
export function isModelRestrictedInRegion(_modelValue: string, _countryCode?: string): boolean {
  return false;
}

export function getFilteredModels(_countryCode?: string): Model[] {
  return models;
}

// Legacy arrays for backward compatibility
export const authRequiredModels = models.filter((m) => m.requiresAuth).map((m) => m.value);
export const proRequiredModels = models.filter((m) => m.pro).map((m) => m.value);
export const freeUnlimitedModels = models.filter((m) => m.freeUnlimited).map((m) => m.value);
