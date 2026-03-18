import 'server-only';
import { wrapLanguageModel, customProvider, extractReasoningMiddleware, gateway } from 'ai';

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenAI } from '@ai-sdk/openai';
import { createWebSocketFetch } from 'ai-sdk-openai-websocket-fetch';
import { xai } from '@ai-sdk/xai';
import { groq } from '@ai-sdk/groq';
import { mistral } from '@ai-sdk/mistral';
import { google } from '@ai-sdk/google';
import { baseten } from '@ai-sdk/baseten';
import { anthropic } from '@ai-sdk/anthropic';
import { cohere } from '@ai-sdk/cohere';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createRetryable } from 'ai-retry';
import { createWorkersAI } from 'workers-ai-provider';

const ark = createOpenAICompatible({
  name: 'ark',
  baseURL: 'https://ark.ap-southeast.bytepluses.com/api/v3',
  apiKey: process.env.ARK_API_KEY,
});

const sarvam = createOpenAICompatible({
  name: 'sarvam',
  baseURL: 'https://api.sarvam.ai/v1',
  apiKey: process.env.SARVAM_API_KEY,
});

const zai = createOpenAICompatible({
  name: 'zai',
  baseURL: 'https://api.z.ai/api/paas/v4',
  apiKey: process.env.ZAI_API_KEY,
});

const middleware = extractReasoningMiddleware({
  tagName: 'think',
});

const middlewareWithStartWithReasoning = extractReasoningMiddleware({
  tagName: 'think',
  startWithReasoning: true,
});

const huggingface = createOpenAICompatible({
  name: 'huggingface',
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_TOKEN,
});

const novita = createOpenAICompatible({
  name: 'novita',
  baseURL: 'https://api.novita.ai/openai',
  apiKey: process.env.NOVITA_API_KEY,
});

const workersai = createWorkersAI({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiKey: process.env.CLOUDFLARE_API_TOKEN!,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': 'https://sciraai.in',
    'X-Title': 'Scira AI',
    'Content-Type': 'application/json',
  },
});

const minimax = createOpenAICompatible({
  name: 'minimax',
  baseURL: 'https://api.minimax.io/v1',
  apiKey: process.env.MINIMAX_API_KEY,
});

const wsFetch = createWebSocketFetch();
const openai = createOpenAI({
  fetch: wsFetch,
});

const openai_2 = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
  fetch: wsFetch,
});

export const scira = customProvider({
  languageModels: {
    'scira-arch-router': huggingface.chatModel('katanemo/Arch-Router-1.5B:hf-inference'),
    'scira-default': xai('grok-4-1-fast-non-reasoning'),
    'scira-auto': xai('grok-4-1-fast-non-reasoning'),
    'scira-sarvam-105b': sarvam.chatModel('sarvam-105b'),
    'scira-grok4.1-fast-thinking': xai('grok-4-1-fast-reasoning'),
    'scira-ext-1': createRetryable({
      model: xai('grok-4-1-fast-reasoning'),
      retries: [gateway('xai/grok-4.1-fast-reasoning')],
    }),
    'scira-ext-2': createRetryable({
      model: openai('gpt-5.4'),
      retries: [openai_2('gpt-5.4'), gateway('openai/gpt-5.4')],
    }),
    // 'scira-ext-3': gateway('anthropic/claude-sonnet-4.6'),
    'scira-ext-4': createRetryable({
      model: workersai('@cf/zai-org/glm-4.7-flash'),
      retries: [novita.chatModel('zai-org/glm-4.7-flash')],
    }),
    'scira-ext-5': gateway('moonshotai/kimi-k2.5'),
    'scira-ext-6': createRetryable({
      model: google('gemini-3.1-pro-preview'),
      retries: [gateway('google/gemini-3.1-pro-preview')],
    }),
    'scira-ext-7': gateway('alibaba/qwen3.5-flash'),
    'scira-ext-8': xai('grok-4.20-experimental-beta-0304-non-reasoning'),
    'scira-nano': groq('llama-3.3-70b-versatile'),
    'scira-name': createRetryable({
      model: gateway('google/gemini-2.5-flash-lite-preview-09-2025'),
      retries: [google('gemini-2.5-flash-lite-preview-09-2025'), google('gemini-2.5-flash-lite')],
    }),
    'scira-grok-3-mini': xai('grok-3-mini'),
    'scira-grok-3': xai('grok-3'),
    'scira-grok-4': xai('grok-4'),
    'scira-grok-4.20-experimental-beta-0304': xai('grok-4.20-beta-0309-non-reasoning'),
    'scira-grok-4.20-experimental-beta-0304-thinking': xai('grok-4.20-beta-0309-reasoning'),
    'scira-grok-4-fast': xai('grok-4-fast-non-reasoning'),
    'scira-grok-4-fast-think': xai('grok-4-fast-reasoning'),
    'scira-code': xai('grok-code-fast-1'),
    'scira-enhance': groq('moonshotai/kimi-k2-instruct-0905'),
    'scira-follow-up': createRetryable({
      model: google('gemini-2.5-flash-lite-preview-09-2025'),
      retries: [
        google('gemini-2.5-flash-lite'),
        gateway('google/gemini-2.5-flash-lite'),
        gateway('google/gemini-2.5-flash-lite-preview-09-2025'),
      ],
    }),
    'scira-qwen-4b': huggingface.chatModel('Qwen/Qwen3-4B-Instruct-2507:nscale'),
    'scira-qwen-4b-thinking': wrapLanguageModel({
      model: huggingface.chatModel('Qwen/Qwen3-4B-Thinking-2507:nscale'),
      middleware: [middlewareWithStartWithReasoning],
    }),
    'scira-gpt-4.1-nano': createRetryable({
      model: openai('gpt-4.1-nano'),
      retries: [openai_2('gpt-4.1-nano')],
    }),
    'scira-gpt-4.1-mini': createRetryable({
      model: openai('gpt-4.1-mini'),
      retries: [openai_2('gpt-4.1-mini')],
    }),
    'scira-gpt-4.1': createRetryable({
      model: openai('gpt-4.1'),
      retries: [openai_2('gpt-4.1')],
    }),
    'scira-gpt-5.1': createRetryable({
      model: openai('gpt-5.1'),
      retries: [openai_2('gpt-5.1')],
    }),
    'scira-gpt-5.1-thinking': createRetryable({
      model: openai('gpt-5.1'),
      retries: [openai_2('gpt-5.1')],
    }),
    'scira-gpt-5.2': createRetryable({
      model: openai('gpt-5.2'),
      retries: [openai_2('gpt-5.2')],
    }),
    'scira-gpt-5.3-chat-latest': createRetryable({
      model: openai('gpt-5.3-chat-latest'),
      retries: [openai_2('gpt-5.3-chat-latest')],
    }),
    'scira-gpt-5.4': createRetryable({
      model: openai('gpt-5.4'),
      retries: [openai_2('gpt-5.4')],
    }),
    'scira-gpt-5.4-mini': createRetryable({
      model: openai('gpt-5.4-mini'),
      retries: [openai_2('gpt-5.4-mini')],
    }),
    'scira-gpt-5.4-nano': createRetryable({
      model: openai('gpt-5.4-nano'),
      retries: [openai_2('gpt-5.4-nano')],
    }),
    'scira-gpt-5.4-thinking': createRetryable({
      model: openai('gpt-5.4'),
      retries: [openai_2('gpt-5.4')],
    }),
    'scira-gpt-5.4-thinking-xhigh': createRetryable({
      model: openai('gpt-5.4'),
      retries: [openai_2('gpt-5.4')],
    }),
    'scira-gpt-5.2-thinking': createRetryable({
      model: openai('gpt-5.2'),
      retries: [openai_2('gpt-5.2')],
    }),
    'scira-gpt-5.2-thinking-xhigh': createRetryable({
      model: openai('gpt-5.2'),
      retries: [openai_2('gpt-5.2')],
    }),
    'scira-gpt-5.1-codex': createRetryable({
      model: openai('gpt-5.1-codex'),
      retries: [openai_2('gpt-5.1-codex')],
    }),
    'scira-gpt-5.1-codex-mini': createRetryable({
      model: openai('gpt-5.1-codex-mini'),
      retries: [openai_2('gpt-5.1-codex-mini')],
    }),
    'scira-gpt-5.1-codex-max': createRetryable({
      model: openai('gpt-5.1-codex-max'),
      retries: [openai_2('gpt-5.1-codex-max')],
    }),
    'scira-gpt-5.2-codex': createRetryable({
      model: openai('gpt-5.2-codex'),
      retries: [openai_2('gpt-5.2-codex')],
    }),
    'scira-gpt-5.3-codex': createRetryable({
      model: openai('gpt-5.3-codex'),
      retries: [openai_2('gpt-5.3-codex')],
    }),
    'scira-gpt5': createRetryable({
      model: openai('gpt-5'),
      retries: [openai_2('gpt-5')],
    }),
    'scira-gpt5-medium': createRetryable({
      model: openai('gpt-5'),
      retries: [openai_2('gpt-5')],
    }),
    'scira-gpt5-mini': createRetryable({
      model: openai('gpt-5-mini'),
      retries: [openai_2('gpt-5-mini')],
    }),
    'scira-gpt5-nano': createRetryable({
      model: openai('gpt-5-nano'),
      retries: [openai_2('gpt-5-nano')],
    }),
    'scira-o3': createRetryable({
      model: openai('o3'),
      retries: [openai_2('o3')],
    }),
    'scira-o4-mini': createRetryable({
      model: openai('o4-mini'),
      retries: [openai_2('o4-mini')],
    }),
    'scira-gpt5-codex': createRetryable({
      model: openai('gpt-5-codex'),
      retries: [openai_2('gpt-5-codex')],
    }),
    'scira-qwen-32b': wrapLanguageModel({
      model: groq('qwen/qwen3-32b'),
      middleware,
    }),
    'scira-qwen-32b-thinking': wrapLanguageModel({
      model: groq('qwen/qwen3-32b'),
      middleware,
    }),
    'scira-gpt-oss-20': wrapLanguageModel({
      model: groq('openai/gpt-oss-20b'),
      middleware,
    }),
    'scira-gpt-oss-120': wrapLanguageModel({
      model: baseten('openai/gpt-oss-120b'),
      middleware,
    }),
    'scira-trinity-mini': wrapLanguageModel({
      model: gateway('arcee-ai/trinity-mini'),
      middleware,
    }),
    'scira-trinity-large': wrapLanguageModel({
      model: openrouter('arcee-ai/trinity-large-preview:free'),
      middleware,
    }),
    'scira-step-3.5-flash': openrouter('stepfun/step-3.5-flash:free'),
    'scira-kat-coder': gateway('kwaipilot/kat-coder-pro-v1'),
    'scira-deepseek-v3': baseten('deepseek-ai/DeepSeek-V3-0324'),
    'scira-deepseek-v3.1-terminus': gateway('deepseek/deepseek-v3.1-terminus'),
    'scira-deepseek-chat': gateway('deepseek/deepseek-v3.2'),
    'scira-deepseek-chat-think': gateway('deepseek/deepseek-v3.2-thinking'),
    'scira-deepseek-chat-exp': gateway('deepseek/deepseek-v3.2-exp'),
    'scira-deepseek-chat-think-exp': wrapLanguageModel({
      model: novita.chatModel('deepseek/deepseek-v3.2-exp'),
      middleware,
    }),
    'scira-v0-10': gateway('vercel/v0-1.0-md'),
    'scira-v0-15': gateway('vercel/v0-1.5-md'),
    'scira-deepseek-r1': wrapLanguageModel({
      model: novita.chatModel('deepseek/deepseek-r1-turbo'),
      middleware,
    }),
    'scira-deepseek-r1-0528': wrapLanguageModel({
      model: novita.chatModel('deepseek/deepseek-r1-0528'),
      middleware,
    }),
    'scira-qwen-coder-small': gateway('alibaba/qwen3-coder-30b-a3b'),
    'scira-qwen-coder': baseten('Qwen/Qwen3-Coder-480B-A35B-Instruct'),
    'scira-qwen-coder-plus': gateway('alibaba/qwen3-coder-plus'),
    'scira-qwen-coder-next': novita.chatModel('qwen/qwen3-coder-next'),
    'scira-qwen-30': huggingface.chatModel('Qwen/Qwen3-30B-A3B-Instruct-2507:nebius'),
    'scira-qwen-30-think': wrapLanguageModel({
      model: huggingface.chatModel('Qwen/Qwen3-30B-A3B-Thinking-2507:nebius'),
      middleware,
    }),
    'scira-qwen-3-vl-30b': novita.chatModel('qwen/qwen3-vl-30b-a3b-instruct'),
    'scira-qwen-3-vl-30b-thinking': wrapLanguageModel({
      model: novita.chatModel('qwen/qwen3-vl-30b-a3b-thinking'),
      middleware,
    }),
    'scira-qwen-3-next': huggingface.chatModel('Qwen/Qwen3-Next-80B-A3B-Instruct:hyperbolic'),
    'scira-qwen-3-next-think': wrapLanguageModel({
      model: huggingface.chatModel('Qwen/Qwen3-Next-80B-A3B-Thinking:hyperbolic'),
      middleware: [middlewareWithStartWithReasoning],
    }),
    'scira-qwen-3-max': gateway('alibaba/qwen3-max'),
    'scira-qwen-3-max-preview': gateway('alibaba/qwen3-max-preview'),
    'scira-qwen-3-max-preview-thinking': gateway('alibaba/qwen3-max-thinking'),
    'scira-qwen-235': gateway('alibaba/qwen-3-235b'),
    'scira-qwen-235-think': wrapLanguageModel({
      model: huggingface.chatModel('Qwen/Qwen3-235B-A22B-Thinking-2507:fireworks-ai'),
      middleware: [middlewareWithStartWithReasoning],
    }),
    'scira-qwen-3.5-27b': novita.chatModel('qwen/qwen3.5-27b'),
    'scira-qwen-3.5-35b': novita.chatModel('qwen/qwen3.5-35b-a3b'),
    'scira-qwen-3.5-122b': novita.chatModel('qwen/qwen3.5-122b-a10b'),
    'scira-qwen-3.5': novita.chatModel('qwen/qwen3.5-397b-a17b'),
    'scira-qwen-3.5-plus': gateway('alibaba/qwen3.5-plus'),
    'scira-qwen-3.5-flash': gateway('alibaba/qwen3.5-flash'),
    'scira-qwen-3-vl': gateway('alibaba/qwen3-vl-instruct'),
    'scira-qwen-3-vl-thinking': wrapLanguageModel({
      model: gateway('alibaba/qwen3-vl-thinking'),
      middleware,
    }),
    'scira-glm-air': gateway('zai/glm-4.5-air'),
    'scira-glm': wrapLanguageModel({
      model: gateway('zai/glm-4.5'),
      middleware,
    }),
    'scira-glm-4.6': wrapLanguageModel({
      model: huggingface.chatModel('zai-org/GLM-4.6:zai-org'),
      middleware,
    }),
    'scira-glm-4.6v-flash': wrapLanguageModel({
      model: huggingface.chatModel('zai-org/GLM-4.6V-Flash:zai-org'),
      middleware,
    }),
    'scira-glm-4.6v': wrapLanguageModel({
      model: huggingface.chatModel('zai-org/GLM-4.6V:zai-org'),
      middleware,
    }),
    'scira-glm-4.7': wrapLanguageModel({
      model: huggingface.chatModel('zai-org/GLM-4.7:novita'),
      middleware,
    }),
    'scira-glm-4.7-flash': createRetryable({
      model: novita.chatModel('zai-org/glm-4.7-flash'),
      retries: [gateway('zai/glm-4.7-flashx')],
    }),
    'scira-glm-5': wrapLanguageModel({
      model: zai('glm-5-turbo'),
      middleware,
    }),
    'scira-glm-5-thinking': wrapLanguageModel({
      model: zai('glm-5-turbo'),
      middleware,
    }),
    'scira-minimax': wrapLanguageModel({
      model: novita.chatModel('minimaxai/minimax-m1-80k'),
      middleware,
    }),
    'scira-minimax-m2': wrapLanguageModel({
      model: gateway('minimax/minimax-m2'),
      middleware,
    }),
    'scira-minimax-m2.1': wrapLanguageModel({
      model: gateway('minimax/minimax-m2.1'),
      middleware,
    }),
    'scira-minimax-m2.1-lightning': wrapLanguageModel({
      model: gateway('minimax/minimax-m2.1-lightning'),
      middleware,
    }),
    'scira-minimax-m2.5': createRetryable({
      model: baseten.chatModel('MiniMaxAI/MiniMax-M2.5'),
      retries: [
        minimax.chatModel('MiniMax-M2.5-highspeed'),
        novita.chatModel('minimax/minimax-m2.5'),
        gateway('minimax/minimax-m2.5'),
      ],
    }),
    'scira-cmd-a': cohere('command-a-03-2025'),
    'scira-cmd-a-think': cohere('command-a-reasoning-08-2025'),
    'scira-kimi-k2-v2': groq('moonshotai/kimi-k2-instruct-0905'),
    'scira-kimi-k2-v2-thinking': wrapLanguageModel({
      model: gateway('moonshotai/kimi-k2-thinking-turbo'),
      middleware,
    }),
    'scira-kimi-k2.5': createRetryable({
      model: baseten.chatModel('moonshotai/Kimi-K2.5'),
      retries: [gateway('moonshotai/kimi-k2.5')],
    }),
    'scira-kimi-k2.5-thinking': gateway('moonshotai/kimi-k2.5'),
    'scira-ministral-3b': mistral('ministral-3b-2512'),
    'scira-ministral-8b': mistral('ministral-8b-2512'),
    'scira-ministral-14b': mistral('ministral-14b-2512'),
    'scira-mistral-large': mistral('mistral-large-2512'),
    'scira-mistral-medium': mistral('mistral-medium-2508'),
    'scira-magistral-small': mistral('magistral-small-2509'),
    'scira-magistral-medium': mistral('magistral-medium-2509'),
    'scira-mistral-small': mistral('mistral-small-2603'),
    'scira-mistral-small-think': mistral('mistral-small-2603'),
    'scira-leanstral': mistral('labs-leanstral-2603'),
    'scira-devstral': mistral('devstral-2512'),
    'scira-devstral-small': mistral('labs-devstral-small-2512'),
    'scira-google-lite': google('gemini-flash-lite-latest'),
    'scira-google': google('gemini-flash-latest'),
    'scira-google-think': google('gemini-flash-latest'),
    'scira-google-pro': createRetryable({
      model: google('gemini-2.5-pro'),
      retries: [gateway('google/gemini-2.5-pro')],
    }),
    'scira-google-pro-think': createRetryable({
      model: google('gemini-2.5-pro'),
      retries: [gateway('google/gemini-2.5-pro')],
    }),
    'scira-gemini-3-flash': createRetryable({
      model: google('gemini-3-flash-preview'),
      retries: [gateway('google/gemini-3-flash')],
    }),
    'scira-gemini-3-flash-think': google('gemini-3-flash-preview'),
    'scira-gemini-3.1-flash-lite': createRetryable({
      model: gateway('google/gemini-3.1-flash-lite-preview'),
      retries: [google('gemini-3.1-flash-lite-preview')],
    }),
    'scira-gemini-3.1-flash-lite-think': createRetryable({
      model: gateway('google/gemini-3.1-flash-lite-preview'),
      retries: [google('gemini-3.1-flash-lite-preview')],
    }),
    'scira-gemini-3.1-pro': createRetryable({
      model: google('gemini-3.1-pro-preview'),
      retries: [gateway('google/gemini-3.1-pro-preview')],
    }),
    'scira-anthropic-small': gateway('anthropic/claude-haiku-4-5'),
    'scira-anthropic': gateway('anthropic/claude-sonnet-4-5'),
    'scira-anthropic-think': gateway('anthropic/claude-sonnet-4-5'),
    'scira-anthropic-sonnet-4.6': gateway('anthropic/claude-sonnet-4-6'),
    'scira-anthropic-sonnet-4.6-think': gateway('anthropic/claude-sonnet-4-6'),
    'scira-mimo-v2-flash': wrapLanguageModel({
      model: gateway('xiaomi/mimo-v2-flash'),
      middleware,
    }),
    'scira-anthropic-opus': gateway('anthropic/claude-opus-4-5'),
    'scira-anthropic-opus-think': gateway('anthropic/claude-opus-4-5'),
    'scira-anthropic-opus-4.6': gateway('anthropic/claude-opus-4-6'),
    'scira-anthropic-opus-4.6-think': gateway('anthropic/claude-opus-4-6'),
    'scira-nova-2-lite': gateway('amazon/nova-2-lite'),
    'scira-seed-1.6': wrapLanguageModel({
      model: ark('seed-1-6-250915'),
      middleware,
    }),
    'scira-seed-1.8': wrapLanguageModel({
      model: ark('seed-1-8-251228'),
      middleware,
    }),
    'scira-seed-2.0-mini': wrapLanguageModel({
      model: ark('seed-2-0-mini-260215'),
      middleware,
    }),
    'scira-seed-2.0-lite': ark('seed-2-0-lite-260228'),
    'scira-seed-1.6-flash': wrapLanguageModel({
      model: ark('seed-1-6-flash-250715'),
      middleware,
    }),
    'scira-mercury-2': gateway('inception/mercury-2'),
  },
});

// Re-export all model data and pure helpers from the client-safe models module
export type { ModelProvider, ProviderInfo, Model } from './models';
export {
  PROVIDERS,
  models,
  getModelConfig,
  requiresAuthentication,
  requiresProSubscription,
  requiresMaxSubscription,
  isFreeUnlimited,
  hasVisionSupport,
  hasPdfSupport,
  hasReasoningSupport,
  isExperimentalModel,
  getMaxOutputTokens,
  getModelParameters,
  canUseModel,
  shouldBypassRateLimits,
  getAcceptedFileTypes,
  supportsExtremeMode,
  getExtremeModels,
  supportsCanvasMode,
  isModelRestrictedInRegion,
  getFilteredModels,
  authRequiredModels,
  proRequiredModels,
  freeUnlimitedModels,
  getModelProvider,
  getModelProviderInfo,
  getActiveProviders,
  getModelsByProvider,
} from './models';
