import { wrapLanguageModel, customProvider, extractReasoningMiddleware } from 'ai';

import { openai, createOpenAI } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { groq } from '@ai-sdk/groq';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { InlineTranslationOptions } from 'gt-next/types';

const middleware = extractReasoningMiddleware({
  tagName: 'think',
});

const huggingface = createOpenAI({
  baseURL: 'https://router.huggingface.co/fireworks-ai/inference/v1',
  apiKey: process.env.HF_TOKEN,
});

export const scira = customProvider({
  languageModels: {
    'scira-default': xai('grok-3-mini'),
    'scira-x-fast-mini': xai('grok-3-mini-fast'),
    'scira-x-fast': xai('grok-3-fast'),
    'scira-nano': openai.responses('gpt-4.1-nano'),
    'scira-grok-3': xai('grok-3'),
    'scira-vision': xai('grok-2-vision-1212'),
    'scira-g2': xai('grok-2-latest'),
    'scira-4o-mini': openai.responses('gpt-4o-mini'),
    'scira-o4-mini': openai.responses('o4-mini-2025-04-16'),
    'scira-o3': openai.responses('o3'),
    'scira-qwen-32b': wrapLanguageModel({
      model: groq('qwen/qwen3-32b', {
        parallelToolCalls: false,
      }),
      middleware,
    }),
    'scira-qwen-30b': wrapLanguageModel({
      model: huggingface('accounts/fireworks/models/qwen3-30b-a3b'),
      middleware,
    }),
    'scira-deepseek-v3': wrapLanguageModel({
      model: huggingface('accounts/fireworks/models/deepseek-v3-0324'),
      middleware,
    }),
    'scira-haiku': anthropic('claude-3-5-haiku-20241022'),
    'scira-mistral': mistral('mistral-small-latest'),
    'scira-google-lite': google('gemini-2.5-flash-lite-preview-06-17'),
    'scira-google': google('gemini-2.5-flash'),
    'scira-google-pro': google('gemini-2.5-pro'),
    'scira-anthropic': anthropic('claude-sonnet-4-20250514'),
    'scira-anthropic-thinking': anthropic('claude-sonnet-4-20250514'),
    'scira-opus': anthropic('claude-4-opus-20250514'),
    'scira-opus-pro': anthropic('claude-4-opus-20250514'),
    'scira-llama-4': groq('meta-llama/llama-4-maverick-17b-128e-instruct', {
      parallelToolCalls: false,
    }),
  },
});

export const getModels = (t: (content: string, options?: InlineTranslationOptions) => string) => [
  // Free Unlimited Models (xAI)
  {
    value: 'scira-default',
    label: t('Grok 3.0 Mini'),
    description: t("xAI's most efficient reasoning model"),
    vision: false,
    reasoning: true,
    experimental: false,
    category: t('Mini'),
    pdf: false,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'scira-vision',
    label: t('Grok 2.0 Vision'),
    description: t("xAI's advanced vision model"),
    vision: true,
    reasoning: false,
    experimental: false,
    category: t('Mini'),
    pdf: false,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 8000,
  },
  {
    value: 'scira-grok-3',
    label: t('Grok 3.0'),
    description: t("xAI's most intelligent model"),
    vision: false,
    reasoning: false,
    experimental: false,
    category: t('Pro'),
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },

  // Mini Models (Free/Paid)
  {
    value: 'scira-mistral',
    label: t('Mistral Small'),
    description: t("Mistral's small model"),
    vision: true,
    reasoning: false,
    experimental: false,
    category: t('Mini'),
    pdf: true,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 128000,
  },
  {
    value: 'scira-qwen-30b',
    label: t('Qwen 3 30B A3B'),
    description: t("Alibaba's advanced MoE reasoning model"),
    vision: false,
    reasoning: true,
    experimental: false,
    category: t('Mini'),
    pdf: false,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'scira-qwen-32b',
    label: t('Qwen 3 32B'),
    description: t("Alibaba's advanced reasoning model"),
    vision: false,
    reasoning: true,
    experimental: false,
    category: t('Mini'),
    pdf: false,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 40960,
  },
  {
    value: 'scira-deepseek-v3',
    label: t('DeepSeek V3 0324'),
    description: t("DeepSeek's advanced model"),
    vision: false,
    reasoning: false,
    experimental: false,
    category: t('Mini'),
    pdf: false,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'scira-4o-mini',
    label: t('GPT 4o Mini'),
    description: t("OpenAI's flagship model"),
    vision: true,
    reasoning: false,
    experimental: false,
    category: t('Mini'),
    pdf: true,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'scira-google-lite',
    label: t('Gemini 2.5 Flash Lite'),
    description: t("Google's advanced small reasoning model"),
    vision: true,
    reasoning: false,
    experimental: false,
    category: t('Mini'),
    pdf: true,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 64000,
  },

  // Pro Models
  {
    value: 'scira-anthropic',
    label: t('Claude 4 Sonnet'),
    description: t("Anthropic's most advanced model"),
    vision: true,
    reasoning: false,
    experimental: false,
    category: t('Pro'),
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 64000,
  },
  {
    value: 'scira-anthropic-thinking',
    label: t('Claude 4 Sonnet Thinking'),
    description: t("Anthropic's most advanced reasoning model"),
    vision: true,
    reasoning: true,
    experimental: false,
    category: t('Pro'),
    pdf: true,
    pro: true,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 64000,
  },
  {
    value: 'scira-opus',
    label: t('Claude 4 Opus'),
    description: t("Anthropic's most advanced reasoning model"),
    vision: true,
    reasoning: true,
    experimental: false,
    category: t('Pro'),
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 32000,
  },
  {
    value: 'scira-opus-pro',
    label: t('Claude 4 Opus Thinking'),
    description: t("Anthropic's most advanced reasoning model"),
    vision: true,
    reasoning: true,
    experimental: false,
    category: t('Pro'),
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 32000,
  },
  {
    value: 'scira-google',
    label: t('Gemini 2.5 Flash'),
    description: t("Google's advanced small reasoning model"),
    vision: true,
    reasoning: true,
    experimental: false,
    category: t('Pro'),
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 65000,
  },
  {
    value: 'scira-google-pro',
    label: t('Gemini 2.5 Pro'),
    description: t("Google's advanced reasoning model"),
    vision: true,
    reasoning: true,
    experimental: false,
    category: t('Pro'),
    pdf: true,
    pro: true,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 65000,
  },
  {
    value: 'scira-o4-mini',
    label: t('o4 mini'),
    description: t("OpenAI's faster mini reasoning model"),
    vision: true,
    reasoning: true,
    experimental: false,
    category: t('Pro'),
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 100000,
  },
  {
    value: 'scira-o3',
    label: t('o3'),
    description: t("OpenAI's big reasoning model"),
    vision: true,
    reasoning: true,
    experimental: false,
    category: t('Pro'),
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 100000,
  },

  // Experimental Models
  {
    value: 'scira-llama-4',
    label: t('Llama 4 Maverick'),
    description: t("Meta's latest model"),
    vision: true,
    reasoning: false,
    experimental: true,
    category: t('Experimental'),
    pdf: false,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 8000,
  },
];

// Static models array for helper functions (no translations)
export const models = getModels((str) => str);

// Helper functions for model access checks
export function getModelConfig(modelValue: string) {
  return models.find(model => model.value === modelValue);
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
export const authRequiredModels = models.filter(m => m.requiresAuth).map(m => m.value);
export const proRequiredModels = models.filter(m => m.pro).map(m => m.value);
export const freeUnlimitedModels = models.filter(m => m.freeUnlimited).map(m => m.value);
