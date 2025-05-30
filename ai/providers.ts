import { 
    wrapLanguageModel, 
    customProvider, 
    extractReasoningMiddleware,
} from "ai";

import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { groq } from "@ai-sdk/groq";
import { anthropic } from "@ai-sdk/anthropic";
import { createVertex } from '@ai-sdk/google-vertex';

const middleware = extractReasoningMiddleware({
    tagName: 'think',
});

const vertex = createVertex({
    location: process.env.GOOGLE_VERTEX_LOCATION,
    project: process.env.GOOGLE_VERTEX_PROJECT,
    googleAuthOptions: {
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY,
        },
    },
});


export const scira = customProvider({
    languageModels: {
        'scira-default': xai("grok-3-mini-fast"),
        'scira-grok-3': xai('grok-3-fast'),
        'scira-vision': xai('grok-2-vision-1212'),
        'scira-4o': openai.responses('gpt-4o'),
        'scira-o4-mini': openai.responses('o4-mini-2025-04-16'),
        'scira-qwq': wrapLanguageModel({
            model: groq('qwen-qwq-32b'),
            middleware,
        }),
        'scira-google': vertex('gemini-2.5-flash-preview-05-20'),
        'scira-google-pro': vertex('gemini-2.5-pro-preview-05-06'),
        'scira-anthropic': anthropic('claude-sonnet-4-20250514'),
        'scira-anthropic-thinking': anthropic('claude-sonnet-4-20250514'),
        'scira-llama-4': groq('meta-llama/llama-4-maverick-17b-128e-instruct', {
            parallelToolCalls: false,
        }),
    }
})
