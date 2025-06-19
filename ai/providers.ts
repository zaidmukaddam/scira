import { wrapLanguageModel, customProvider, extractReasoningMiddleware } from 'ai';

import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { groq } from '@ai-sdk/groq';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';

const middleware = extractReasoningMiddleware({
  tagName: 'think',
});

export const scira = customProvider({
  languageModels: {
    'scira-default': xai('grok-3-mini'),
    'scira-fast': xai('grok-3-mini-fast-latest'),
    'scira-grok-3': xai('grok-3'),
    'scira-vision': xai('grok-2-vision-1212'),
    'scira-g2': xai('grok-2-latest'),
    'scira-4o-mini': openai.responses('gpt-4o-mini'),
    'scira-o4-mini': openai.responses('o4-mini-2025-04-16'),
    'scira-o3': openai.responses('o3'),
    'scira-qwq': wrapLanguageModel({
      model: groq('qwen-qwq-32b', {
        parallelToolCalls: false,
      }),
      middleware,
    }),
    'scira-qwen-32b': wrapLanguageModel({
      model: groq('qwen/qwen3-32b', {
        parallelToolCalls: false,
      }),
      middleware,
    }),
    'scira-haiku': anthropic('claude-3-5-haiku-20241022'),
    'scira-mistral': mistral('ministral-8b-latest'),
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
