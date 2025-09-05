import { tool } from 'ai';
import { z } from 'zod';
import { paidGenerateObject } from '@paid-ai/paid-node';
import { scira } from '@/ai/providers';
import { getClient } from '../client';

export const textTranslateTool = tool({
  description: 'Translate text from one language to another.',
  inputSchema: z.object({
    text: z.string().describe('The text to translate.'),
    to: z.string().describe('The language to translate to (e.g., French).'),
  }),
  execute: async ({ text, to }: { text: string; to: string }) => {
    const client = await getClient();
    const { object: translation } = await client.trace('blah', async () => {
      return paidGenerateObject({
        model: scira.languageModel('scira-default'),
        system: `You are a helpful assistant that translates text from one language to another.`,
        prompt: `Translate the following text to ${to} language: ${text}`,
        schema: z.object({
          translatedText: z.string(),
          detectedLanguage: z.string(),
        }),
      });
    });
    console.log(translation);
    return {
      translatedText: translation.translatedText,
      detectedLanguage: translation.detectedLanguage,
    };
  },
});