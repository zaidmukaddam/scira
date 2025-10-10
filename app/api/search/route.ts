// /app/api/search/route.ts
import { convertToModelMessages, streamText, createUIMessageStream, JsonToSseTransformStream } from 'ai';
import { scira } from '@/ai/providers';
import { createResumableStreamContext, type ResumableStreamContext } from 'resumable-stream';
import { after } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { google } from '@ai-sdk/google';
import { geolocation } from '@vercel/functions';

import { saveChat, saveMessages, createStreamId, getChatById, updateChatTitleById } from '@/lib/db/queries';
import type { ChatMessage } from '@/lib/types';
import { getLightweightUser, generateTitleFromUserMessage, getGroupConfig } from '@/app/actions';

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
        keyPrefix: 'arka:stream',
      });
    } catch (error: any) {
      if (error.message?.includes('REDIS_URL')) {
        console.log(' > Resumable streams are disabled due to missing REDIS_URL');
      } else {
        console.error(error);
      }
    }
  }
  return globalStreamContext;
}

function extractUrlsFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s)"'>]+)(?![^<]*>|[^\(]*\))/g;
  const urls = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    urls.add(match[1]);
  }
  return Array.from(urls);
}

async function fetchAndSummarize(url: string): Promise<{ url: string; title?: string; excerpt?: string } | null> {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) return null;
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return null;

    const text = await res.text();
    if (contentType.includes('text/html')) {
      const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : undefined;
      const body = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return { url, title, excerpt: body.slice(0, 1200) };
    }
    return { url, excerpt: text.slice(0, 1200) };
  } catch {
    return null;
  }
}

function buildAutoContext(summaries: Array<{ url: string; title?: string; excerpt?: string }>): string {
  if (!summaries.length) return '';
  const lines: string[] = [];
  lines.push('Context: The user message contains URLs that were fetched server-side. Here are concise notes:');
  summaries.forEach((s, i) => {
    const header = `URL #${i + 1}: ${s.title ? `${s.title} — ` : ''}${s.url}`;
    const excerpt = s.excerpt ? s.excerpt : '';
    lines.push(header);
    if (excerpt) lines.push(excerpt);
  });
  lines.push('Use this fetched context to improve your response. Do not list raw URLs unless relevant.');
  return lines.join('\n\n');
}

export async function POST(req: Request) {
  const requestStart = Date.now();
  const { messages, model, group, timezone, id } = await req.json();
  const streamId = 'stream-' + uuidv4();
  const { latitude, longitude } = geolocation(req);

  // Ensure user (authenticated or anonymous via cookie) exists
  const lightweightUser = await getLightweightUser();
  const userId = lightweightUser?.userId;

  // Ensure chat exists and track stream id
  const existingChat = await getChatById({ id }).catch(() => null);
  if (!existingChat && userId) {
    await saveChat({ id, userId, title: 'New Chat', visibility: 'private' });
    after(async () => {
      try {
        const title = await generateTitleFromUserMessage({ message: messages[messages.length - 1] });
        await updateChatTitleById({ chatId: id, title });
      } catch {}
    });
  }
  after(async () => {
    try {
      await createStreamId({ streamId, chatId: id });
    } catch {}
  });

  // Save the last user message before streaming (if we have a user)
  if (userId) {
    try {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: messages[messages.length - 1].id,
            role: 'user',
            parts: messages[messages.length - 1].parts,
            attachments: messages[messages.length - 1].experimental_attachments ?? [],
            createdAt: new Date(),
            model,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            completionTime: 0,
          },
        ],
      });
    } catch {}
  }

  // Auto-fetch URLs from the last user text
  const lastText = (messages?.[messages.length - 1]?.parts || [])
    .filter((p: any) => p?.type === 'text')
    .map((p: any) => p.text)
    .join('\n');
  const urls = extractUrlsFromText(lastText).slice(0, 3);
  const fetched = await Promise.all(urls.map((u) => fetchAndSummarize(u)));
  const summaries = fetched.filter((x): x is NonNullable<typeof x> => Boolean(x));
  const autoContext = buildAutoContext(summaries);

  const streamStart = Date.now();

  const dataStream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer }) => {
      const { instructions } = await getGroupConfig(group);
      const systemParts: string[] = [];
      if (instructions) systemParts.unshift(instructions);
      if (autoContext) systemParts.push(autoContext);
      if (latitude && longitude) systemParts.push(`User location (approx): ${latitude}, ${longitude}`);

      // Try Gemini 2.5 with fallbacks
      const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-exp'];
      let result: ReturnType<typeof streamText> | null = null;
      let lastError: unknown = null;
      for (const name of modelNames) {
        try {
          result = streamText({
            model: google(name as any),
            messages: convertToModelMessages(messages),
            system: systemParts.join('\n\n'),
          });
          break;
        } catch (err) {
          lastError = err;
          continue;
        }
      }
      if (!result) throw lastError ?? new Error('Failed to start stream');

      result.consumeStream();
      const enableReasoning = String(model) === 'scira-google-think';
      writer.merge(
        result.toUIMessageStream({
          sendReasoning: enableReasoning,
          messageMetadata: ({ part }) => {
            if (part.type === 'finish') {
              const processingTime = (Date.now() - streamStart) / 1000;
              return {
                model: model as string,
                completionTime: processingTime,
                createdAt: new Date().toISOString(),
                totalTokens: part.totalUsage?.totalTokens ?? null,
                inputTokens: part.totalUsage?.inputTokens ?? null,
                outputTokens: part.totalUsage?.outputTokens ?? null,
              };
            }
          },
        }),
      );
    },
    onError() {
      return 'Oops, an error occurred!';
    },
    onFinish: async ({ messages: streamed }) => {
      if (userId) {
        try {
          await saveMessages({
            messages: streamed.map((m) => ({
              id: m.id,
              role: m.role,
              parts: m.parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id,
              model,
              completionTime: m.metadata?.completionTime ?? 0,
              inputTokens: m.metadata?.inputTokens ?? 0,
              outputTokens: m.metadata?.outputTokens ?? 0,
              totalTokens: m.metadata?.totalTokens ?? 0,
            })),
          });
        } catch {}
      }
    },
  });

  const streamContext = getStreamContext();
  if (streamContext) {
    return new Response(
      await streamContext.resumableStream(streamId, () => dataStream.pipeThrough(new JsonToSseTransformStream())),
    );
  }
  return new Response(dataStream.pipeThrough(new JsonToSseTransformStream()));
}
