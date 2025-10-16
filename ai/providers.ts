import { customProvider } from 'ai';
import { google } from '@ai-sdk/google';

// Arka backend: single provider mapping to Google Gemini Flash.
// Default model is gemini-2.5-flash with intended fallbacks to gemini-2.0-flash then gemini-2.0-flash-exp
// If 2.5 is unavailable in your project, adjust DEFAULT_GOOGLE_MODEL below.
const DEFAULT_GOOGLE_MODEL = 'gemini-2.5-flash';
// Fallbacks (documented only; selection is handled at call sites when needed):
const FALLBACK_GOOGLE_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-exp'];

// Single Google provider for all scira-* model ids expected by the UI.
// We keep all original model ids/labels for UI parity, but route everything to Gemini Flash.
export const scira = customProvider({
  languageModels: {
    'scira-default': google(DEFAULT_GOOGLE_MODEL),
    'scira-nano': google(DEFAULT_GOOGLE_MODEL),
    'scira-name': google(DEFAULT_GOOGLE_MODEL),
    'scira-grok-3': google(DEFAULT_GOOGLE_MODEL),
    'scira-grok-4': google(DEFAULT_GOOGLE_MODEL),
    'scira-grok-4-fast': google(DEFAULT_GOOGLE_MODEL),
    'scira-grok-4-fast-think': google(DEFAULT_GOOGLE_MODEL),
    'scira-code': google(DEFAULT_GOOGLE_MODEL),
    'scira-enhance': google(DEFAULT_GOOGLE_MODEL),
    'scira-qwen-4b': google(DEFAULT_GOOGLE_MODEL),
    'scira-qwen-4b-thinking': google(DEFAULT_GOOGLE_MODEL),
    'scira-gpt5': google(DEFAULT_GOOGLE_MODEL),
    'scira-gpt5-mini': google(DEFAULT_GOOGLE_MODEL),
    'scira-gpt5-nano': google(DEFAULT_GOOGLE_MODEL),
    'scira-o3': google(DEFAULT_GOOGLE_MODEL),
    'scira-qwen-32b': google(DEFAULT_GOOGLE_MODEL),
    'scira-gpt-oss-20': google(DEFAULT_GOOGLE_MODEL),
    'scira-gpt-oss-120': google(DEFAULT_GOOGLE_MODEL),
    'scira-deepseek-chat': google(DEFAULT_GOOGLE_MODEL),
    'scira-deepseek-chat-think': google(DEFAULT_GOOGLE_MODEL),
    'scira-deepseek-r1': google(DEFAULT_GOOGLE_MODEL),
    'scira-qwen-coder': google(DEFAULT_GOOGLE_MODEL),
    'scira-qwen-30': google(DEFAULT_GOOGLE_MODEL),
    'scira-qwen-30-think': google(DEFAULT_GOOGLE_MODEL),
    'scira-qwen-3-next': google(DEFAULT_GOOGLE_MODEL),
    'scira-qwen-3-next-think': google(DEFAULT_GOOGLE_MODEL),
    'scira-qwen-3-max': google(DEFAULT_GOOGLE_MODEL),
    'scira-qwen-3-max-preview': google(DEFAULT_GOOGLE_MODEL),
    'scira-qwen-235': google(DEFAULT_GOOGLE_MODEL),
    'scira-qwen-235-think': google(DEFAULT_GOOGLE_MODEL),
    'scira-glm-air': google(DEFAULT_GOOGLE_MODEL),
    'scira-glm': google(DEFAULT_GOOGLE_MODEL),
    'scira-glm-4.6': google(DEFAULT_GOOGLE_MODEL),
    'scira-kimi-k2-v2': google(DEFAULT_GOOGLE_MODEL),
    'scira-haiku': google(DEFAULT_GOOGLE_MODEL),
    'scira-mistral-medium': google(DEFAULT_GOOGLE_MODEL),
    'scira-magistral-small': google(DEFAULT_GOOGLE_MODEL),
    'scira-magistral-medium': google(DEFAULT_GOOGLE_MODEL),
    'scira-google-lite': google(DEFAULT_GOOGLE_MODEL),
    'scira-google': google(DEFAULT_GOOGLE_MODEL),
    'scira-google-think': google(DEFAULT_GOOGLE_MODEL),
    'scira-google-think-v2': google(DEFAULT_GOOGLE_MODEL),
    'scira-google-think-v3': google(DEFAULT_GOOGLE_MODEL),
    'scira-anthropic': google(DEFAULT_GOOGLE_MODEL),
  },
});

interface ModelParameters {
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  frequencyPenalty?: number;
}

interface Model {
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
  // Tags
  fast?: boolean;
  isNew?: boolean;
  parameters?: ModelParameters;
}

export const models: Model[] = [
  // Models (xAI)
  {
    value: 'scira-grok-3',
    label: 'Grok 3',
    description: "Le LLM le plus récent et le plus intelligent de xAI",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'scira-grok-4',
    label: 'Grok 4',
    description: "Le LLM le plus intelligent de xAI",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'scira-default',
    label: 'Grok 4 Fast',
    description: "LLM multimodèle le plus rapide de xAI",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Free',
    pdf: false,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: true,
    isNew: true,
  },
  {
    value: 'scira-grok-4-fast-think',
    label: 'Grok 4 Fast Thinking',
    description: "LLM multimodèle de raisonnement le plus rapide de xAI",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: true,
    isNew: true,
  },
  {
    value: 'scira-qwen-32b',
    label: 'Qwen 3 32B',
    description: "LLM de raisonnement avancé d'Alibaba",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Free',
    pdf: false,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 40960,
    fast: true,
    parameters: {
      temperature: 0.7,
      topP: 0.8,
      topK: 20,
      minP: 0,
    },
  },
  {
    value: 'scira-qwen-4b',
    label: 'Qwen 3 4B',
    description: "Petit LLM de base d'Alibaba",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Free',
    pdf: false,
    pro: false,
    requiresAuth: false,
    maxOutputTokens: 16000,
    freeUnlimited: false,
    parameters: {
      temperature: 0.7,
      topP: 0.8,
      topK: 20,
      minP: 0,
    },
  },
  {
    value: 'scira-qwen-4b-thinking',
    label: 'Qwen 3 4B Thinking',
    description: "Petit LLM de base d'Alibaba",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Free',
    pdf: false,
    pro: false,
    requiresAuth: false,
    maxOutputTokens: 16000,
    freeUnlimited: true,
    parameters: {
      temperature: 0.6,
      topP: 0.95,
      topK: 20,
      minP: 0,
    },
  },
  {
    value: 'scira-gpt-oss-20',
    label: 'GPT OSS 20B',
    description: "Petit LLM open source d'OpenAI",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Free',
    pdf: false,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: true,
  },
  {
    value: 'scira-gpt5-nano',
    label: 'GPT 5 Nano',
    description: "Plus petit LLM phare d'OpenAI",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Free',
    pdf: true,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: true,
  },
  {
    value: 'scira-google-lite',
    label: 'Gemini 2.5 Flash Lite',
    description: "Petit LLM avancé de Google",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Free',
    pdf: true,
    pro: false,
    requiresAuth: false,
    freeUnlimited: true,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'scira-code',
    label: 'Grok Code',
    description: "LLM de codage avancé de xAI",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: true,
  },
  {
    value: 'scira-mistral-medium',
    label: 'Mistral Medium',
    description: "LLM multimodal moyen de Mistral",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'scira-magistral-small',
    label: 'Magistral Small',
    description: "Petit LLM de raisonnement de Mistral",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'scira-magistral-medium',
    label: 'Magistral Medium',
    description: "Mistral's medium reasoning LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'scira-gpt-oss-120',
    label: 'GPT OSS 120B',
    description: "LLM open source avancé d'OpenAI",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: true,
  },
  {
    value: 'scira-gpt5-mini',
    label: 'GPT 5 Mini',
    description: "Petit LLM phare d'OpenAI",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: false,
    isNew: true,
  },
  {
    value: 'scira-gpt5',
    label: 'GPT 5',
    description: "LLM phare d'OpenAI",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: false,
    isNew: true,
  },
  {
    value: 'scira-o3',
    label: 'o3',
    description: "LLM avancé d'OpenAI",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: false,
    isNew: true,
  },
  {
    value: 'scira-deepseek-chat',
    label: 'DeepSeek 3.2 Exp',
    description: "LLM de conversation avancé de DeepSeek",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'scira-deepseek-chat-think',
    label: 'DeepSeek 3.2 Exp Thinking',
    description: "LLM de conversation avancé avec raisonnement de DeepSeek",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'scira-deepseek-r1',
    label: 'DeepSeek R1',
    description: "LLM de raisonnement avancé de DeepSeek",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'scira-qwen-coder',
    label: 'Qwen 3 Coder 480B-A35B',
    description: "Alibaba's advanced coding LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 130000,
    fast: true,
  },
  {
    value: 'scira-qwen-3-next',
    label: 'Qwen 3 Next 80B A3B Instruct',
    description: "LLM d'instruction avancé de Qwen",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 100000,
    fast: true,
    isNew: true,
    parameters: {
      temperature: 0.7,
      topP: 0.8,
      minP: 0,
    },
  },
  {
    value: 'scira-qwen-3-next-think',
    label: 'Qwen 3 Next 80B A3B Thinking',
    description: "LLM de raisonnement avancé de Qwen",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 100000,
    isNew: true,
    parameters: {
      temperature: 0.6,
      topP: 0.95,
      minP: 0,
    },
  },
  {
    value: 'scira-qwen-3-max',
    label: 'Qwen 3 Max',
    description: "LLM d'instruction avancé de Qwen",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'scira-qwen-3-max-preview',
    label: 'Qwen 3 Max Preview',
    description: "LLM d'instruction avancé de Qwen",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'scira-qwen-235',
    label: 'Qwen 3 235B A22B',
    description: "LLM d'instruction avancé de Qwen",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 100000,
    parameters: {
      temperature: 0.7,
      topP: 0.8,
      minP: 0,
    },
  },
  {
    value: 'scira-qwen-235-think',
    label: 'Qwen 3 235B A22B Thinking',
    description: "LLM de raisonnement avancé de Qwen",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 100000,
    parameters: {
      temperature: 0.6,
      topP: 0.95,
      minP: 0,
    },
  },
  {
    value: 'scira-kimi-k2-v2',
    label: 'Kimi K2 Latest',
    description: "LLM de base avancé de MoonShot AI",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 10000,
    fast: true,
    parameters: {
      temperature: 0.6,
    },
  },
  {
    value: 'scira-glm-4.6',
    label: 'GLM 4.6',
    description: "LLM de raisonnement avancé de Zhipu AI",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 130000,
    isNew: true,
  },
  {
    value: 'scira-glm-air',
    label: 'GLM 4.5 Air',
    description: "LLM de base efficace de Zhipu AI",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 130000,
  },
  {
    value: 'scira-glm',
    label: 'GLM 4.5',
    description: "Ancien LLM avancé de Zhipu AI",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 13000,
  },
  {
    value: 'scira-google',
    label: 'Gemini 2.5 Flash',
    description: "Petit LLM avancé de Google",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'scira-google-think',
    label: 'Hypermarché L’Hyper',
    description: "Petit LLM avancé de Google avec raisonnement",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: false,
    requiresAuth: false,
    freeUnlimited: true,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'scira-google-think-v2',
    label: 'Plateforme — Bientôt disponible',
    description: "Petit LLM avancé de Google avec raisonnement",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: false,
    requiresAuth: false,
    freeUnlimited: true,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'scira-google-think-v3',
    label: 'Direction — Bientôt disponible',
    description: "Petit LLM avancé de Google avec raisonnement",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: false,
    requiresAuth: false,
    freeUnlimited: true,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'scira-anthropic',
    label: 'Claude 4.5 Sonnet',
    description: "Le LLM le plus avancé d'Anthropic",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 8000,
    isNew: false,
  },
];

// Helper functions for model access checks
export function getModelConfig(modelValue: string) {
  return models.find((model) => model.value === modelValue);
}

export function requiresAuthentication(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.requiresAuth || false;
}

export function requiresProSubscription(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.pro || false;
}

export function isFreeUnlimited(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.freeUnlimited || false;
}

export function hasVisionSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.vision || false;
}

export function hasPdfSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.pdf || false;
}

export function hasReasoningSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.reasoning || false;
}

export function isExperimentalModel(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.experimental || false;
}

export function getMaxOutputTokens(modelValue: string): number {
  const model = getModelConfig(modelValue);
  return model?.maxOutputTokens || 8000;
}

export function getModelParameters(modelValue: string): ModelParameters {
  const model = getModelConfig(modelValue);
  return model?.parameters || {};
}

// Access control helper
export function canUseModel(modelValue: string, user: any, isProUser: boolean): { canUse: boolean; reason?: string } {
  const model = getModelConfig(modelValue);

  if (!model) {
    return { canUse: false, reason: 'Model not found' };
  }

  // Check if model requires authentication
  if (model.requiresAuth && !user) {
    return { canUse: false, reason: 'authentication_required' };
  }

  // Check if model requires Pro subscription
  if (model.pro && !isProUser) {
    return { canUse: false, reason: 'pro_subscription_required' };
  }

  return { canUse: true };
}

// Helper to check if user should bypass rate limits
export function shouldBypassRateLimits(modelValue: string, user: any): boolean {
  const model = getModelConfig(modelValue);
  return Boolean(user && model?.freeUnlimited);
}

// Get acceptable file types for a model
export function getAcceptedFileTypes(modelValue: string, isProUser: boolean): string {
  const model = getModelConfig(modelValue);
  if (model?.pdf && isProUser) {
    return 'image/*,.pdf';
  }
  return 'image/*';
}

// Legacy arrays for backward compatibility (deprecated - use helper functions instead)
export const authRequiredModels = models.filter((m) => m.requiresAuth).map((m) => m.value);
export const proRequiredModels = models.filter((m) => m.pro).map((m) => m.value);
export const freeUnlimitedModels = models.filter((m) => m.freeUnlimited).map((m) => m.value);
