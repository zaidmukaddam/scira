import { wrapLanguageModel, customProvider, extractReasoningMiddleware } from "ai";

import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";

const middleware = extractReasoningMiddleware({
    tagName: 'think',
});


export const scira = customProvider({
    languageModels: {
        'scira-default': xai("grok-3-mini"),
        'scira-grok-3': xai('grok-3-fast'),
        'scira-vision': xai('grok-2-vision-1212'),
        'scira-4o': openai('gpt-4o', {
            structuredOutputs: true,
        }),
        'scira-o4-mini': openai.responses('o4-mini-2025-04-16'),
        'scira-qwq': wrapLanguageModel({
            model: groq('qwen-qwq-32b'),
            middleware,
        }),
        'scira-google': google('gemini-2.5-flash-preview-04-17', {
            structuredOutputs: true,
        }),
        'scira-google-pro': google('gemini-2.5-pro-preview-05-06', {
            structuredOutputs: true,
        }),
        'scira-anthropic': anthropic('claude-3-7-sonnet-20250219'),
        'scira-llama-4': groq('meta-llama/llama-4-maverick-17b-128e-instruct', {
            parallelToolCalls: false,
        }),
    }
})
