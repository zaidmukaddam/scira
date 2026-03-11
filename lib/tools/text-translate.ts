import { tool, generateText } from 'ai';
import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';
import { scx } from '@/ai/providers';

const translationSchema = z.object({
  translatedText: z.string(),
  detectedLanguage: z.string(),
});

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const braced = text.match(/\{[\s\S]*\}/);
  if (braced) return braced[0];
  return text;
}

export const textTranslateTool = tool({
  description: 'Translate text from one language to another.',
  inputSchema: z.object({
    text: z.string().describe('The text to translate.'),
    to: z.string().describe('The language to translate to in the format of ISO 639-1.'),
  }),
  execute: async ({ text, to }: { text: string; to: string }) => {
    const { text: response } = await generateText({
      model: scx.languageModel('llama-4'),
      maxOutputTokens: 1000,
      system: 'You translate text between languages. Use Australian spelling for English. Respond with ONLY JSON, no markdown.',
      prompt: `Translate to ${to}: ${text}

{"translatedText":"translated text","detectedLanguage":"ISO 639-1 code"}`,
    });

    const rawJSON = extractJSON(response);
    const repaired = jsonrepair(rawJSON);
    const parsed = JSON.parse(repaired);
    const translation = translationSchema.parse(parsed);

    return {
      translatedText: translation.translatedText,
      detectedLanguage: translation.detectedLanguage,
    };
  },
});
