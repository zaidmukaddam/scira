import { tool } from 'ai';
import { z } from 'zod';
import { generateObject } from 'ai';
import { scira } from '@/ai/providers';

export const textTranslateTool = tool({
  description: 'Translate text from one language to another.',
  inputSchema: z.object({
    text: z.string().describe('The text to translate.'),
    to: z.string().describe('The language to translate to in the format of ISO 639-1.'),
  }),
  execute: async ({ text, to }: { text: string; to: string }) => {
    const { object: translation } = await generateObject({
      model: scira.languageModel('scira-default'),
      system: `You are a helpful assistant that translates text from one language to another.`,
      prompt: `Translate the following text to ${to} language: ${text}`,
      schema: z.object({
        translatedText: z.string(),
        detectedLanguage: z.string().describe('The detected language of the input text in the format of ISO 639-1.'),
      }),
    });
    console.log(translation);
    return {
      translatedText: translation.translatedText,
      detectedLanguage: translation.detectedLanguage,
    };
  },
});
