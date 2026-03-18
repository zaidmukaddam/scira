import 'server-only';

import { generateText, UIMessage } from 'ai';
import { GoogleGenerativeAIProviderOptions, GoogleLanguageModelOptions } from '@ai-sdk/google';
import { GatewayProviderOptions } from '@ai-sdk/gateway';
import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';

import { scira } from '@/ai/providers';

export async function generateTitleFromUserMessage({ message }: { message: UIMessage }) {
  const startTime = Date.now();
  const firstTextPart = message.parts.find((part) => part.type === 'text');
  const prompt = JSON.stringify(firstTextPart && firstTextPart.type === 'text' ? firstTextPart.text : '');

  console.log('Prompt: ', prompt);

  const { text: title } = await generateText({
    model: scira.languageModel('scira-name'),
    system: `You are an expert title generator. You are given a message and you need to generate a short title based on it.

    - you will generate a short 3-4 words title based on the first message a user begins a conversation with
    - the title should creative and unique
    - do not write anything other than the title
    - do not use quotes or colons
    - no markdown formatting allowed
    - keep plain text only
    - not more than 4 words in the title
    - do not use any other text other than the title`,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    providerOptions: {
      openai: {
        reasoningEffort: 'minimal',
        reasoningSummary: null,
        textVerbosity: 'low',
        store: false,
        include: ['reasoning.encrypted_content'],
      } satisfies OpenAIResponsesProviderOptions,
      gateway: {
        only: ['vertex', 'google'],
        order: ['vertex', 'google'],
      } satisfies GatewayProviderOptions,
      google: {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      } satisfies GoogleGenerativeAIProviderOptions,
      vertex: {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      } satisfies GoogleLanguageModelOptions,
    },
    onFinish: (output) => {
      console.log('Title generated: ', output.text);
      console.log('Model Used: ', output.model.modelId);
      const durationMs = Date.now() - startTime;
      console.log(`⏱️ [USAGE] generateTitleFromUserMessage: Model took ${durationMs}ms`);
    },
  });

  console.log('Title: ', title);

  const durationMs = Date.now() - startTime;
  console.log(`⏱️ [USAGE] generateTitleFromUserMessage: Model took ${durationMs}ms`);

  return title;
}
