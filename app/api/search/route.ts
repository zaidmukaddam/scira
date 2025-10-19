// /app/api/search/route.ts
import { convertToModelMessages, streamText, createUIMessageStream, JsonToSseTransformStream, generateText } from 'ai';
import { scira } from '@/ai/providers';
import { createResumableStreamContext, type ResumableStreamContext } from 'resumable-stream';
import { after } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { google } from '@ai-sdk/google';
import { SMART_PDF_TO_EXCEL_PROMPT } from '@/ai/prompts/pdf-to-excel';
import { geolocation } from '@vercel/functions';

import { saveChat, saveMessages, createStreamId, getChatById, updateChatTitleById } from '@/lib/db/queries';
import { extremeSearchTool } from '@/lib/tools';
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
      const { instructions, tools: toolIds } = await getGroupConfig(group);
      const systemParts: string[] = [];
      if (instructions) systemParts.unshift(instructions);
      if (autoContext) systemParts.push(autoContext);
      if (latitude && longitude) systemParts.push(`User location (approx): ${latitude}, ${longitude}`);

      // Correction Libeller special handling
      if (group === 'libeller') {
        const normalized = (lastText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const askForPrompt = normalized.length === 0 && /\b(prompt(?:\s*complet)?|les\s+règles|règles\s+(?:internes|de|du|d’|d'))\b/i.test(lastText || '');
        if (askForPrompt) {
          const msg: ChatMessage = {
            id: 'msg-' + uuidv4(),
            role: 'assistant',
            parts: [{ type: 'text', text: "J’applique des règles internes de nettoyage et de standardisation. Pour les détails spécifiques, contactez Arka (développeur)." }],
            attachments: [],
            metadata: {
              model: String(model),
              completionTime: 0,
              createdAt: new Date().toISOString(),
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
            },
          } as any;
          writer.write({ type: 'data-appendMessage', data: JSON.stringify(msg), transient: false });
          return;
        }
        if (normalized.length === 0) {
          const msg: ChatMessage = {
            id: 'msg-' + uuidv4(),
            role: 'assistant',
            parts: [{ type: 'text', text: "Format d’entrée invalide. Collez une liste multi‑ligne avec un libellé par ligne (pas de texte libre)." }],
            attachments: [],
            metadata: {
              model: String(model),
              completionTime: 0,
              createdAt: new Date().toISOString(),
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
            },
          } as any;
          writer.write({ type: 'data-appendMessage', data: JSON.stringify(msg), transient: false });
          return;
        }

        function containsLeakSignals(text: string) {
          return /(RÔLE\s+ET\s+OBJECTIF|M[ÉE]THODOLOGIE|prompt\s*complet)/i.test(text);
        }

        function extractFirstMarkdownTable(text: string): string | null {
          const lines = text.split(/\r?\n/);
          let start = -1;
          let end = -1;
          for (let i = 0; i < lines.length; i++) {
            if (/^\s*\|.*\|\s*$/.test(lines[i])) {
              if (start === -1) start = i;
              end = i;
            } else if (start !== -1) {
              break;
            }
          }
          if (start !== -1 && end > start) {
            const block = lines.slice(start, end + 1).join('\n').trim();
            // Require at least header + alignment + one row OR allow empty rows to repair later
            return block;
          }
          return null;
        }

        function parseTable(tableText: string): { headers: string[]; rows: string[][] } | null {
          const rows = tableText
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => /^\|.*\|$/.test(l));
          if (rows.length < 2) return null; // need header + alignment
          const header = rows[0]
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          const body = rows.slice(2).map((r) => r.slice(1, -1).split('|').map((c) => c.trim()));
          return { headers: header, rows: body };
        }

        function buildTable(headers: string[], rows: string[][]): string {
          const headerLine = `| ${headers.join(' | ')} |`;
          const alignLine = `| ${headers.map(() => '---').join(' | ')} |`;
          const body = rows.map((r) => `| ${r.map((c) => c ?? '').join(' | ')} |`).join('\n');
          return [headerLine, alignLine, body].filter(Boolean).join('\n');
        }

        async function repairTableWithModel(originals: string[], maybeText: string): Promise<string | null> {
          const repairSystem = [
            ...systemParts,
            'STRICT REPAIR ONLY: Convert the following content into a valid Markdown table with exactly two columns named "Libellé Original" and "Libellé Corrigé". Preserve every original label exactly as provided and in the same order. If a corrected value is missing, generate it using the transformation methodology without adding new words beyond transformations. Output ONLY the table.'
          ].join('\n\n');
          const { text } = await generateText({
            model: google('gemini-2.5-flash' as any),
            system: repairSystem,
            temperature: 0,
            topP: 0.1,
            prompt: `Libellés (ordre à respecter):\n${originals.join('\n')}\n\nContenu à réparer:\n${maybeText}`,
          });
          const table = extractFirstMarkdownTable(text) || text.trim();
          return table && /^\|.*\|/m.test(table) ? table : null;
        }

        // Conversational greeting handling — do NOT produce a table for simple salutations
        const isGreeting = (t: string) => /\b(?:salut|bonjour|bonsoir|coucou|hello|hi|slt|bjr|ça va|ca va|comment\s+ça\s+va|comment\s+ca\s+va|السلام\s+عليكم|marhaba|مرحبا)\b/i.test(t.trim());
        if (isGreeting(lastText || '') && normalized.length <= 1) {
          const msg: ChatMessage = {
            id: 'msg-' + uuidv4(),
            role: 'assistant',
            parts: [{ type: 'text', text: "Bonjour ! Ça va ? Je suis un agent spécialisé dans la correction de libellés produits. Comment puis-je vous aider ?" }],
            attachments: [],
            metadata: {
              model: String(model),
              completionTime: 0,
              createdAt: new Date().toISOString(),
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
            },
          } as any;
          writer.write({ type: 'data-appendMessage', data: JSON.stringify(msg), transient: false });
          return;
        }

        // Nomenclature-like streaming pipeline for Libeller
        if (normalized.length > 300) {
          const warn: ChatMessage = {
            id: 'msg-' + uuidv4(),
            role: 'assistant',
            parts: [{ type: 'text', text: `Grand volume détecté (${normalized.length}). Traitement en cours…` }],
            attachments: [],
            metadata: {
              model: String(model),
              completionTime: 0,
              createdAt: new Date().toISOString(),
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
            },
          } as any;
          writer.write({ type: 'data-appendMessage', data: JSON.stringify(warn), transient: true });
        }

        const modelPlan: Array<{ name: string; retries: number }> = [
          { name: 'gemini-2.5-flash', retries: 1 },
          { name: 'gemini-2.0-flash', retries: 2 },
        ];
        let result: ReturnType<typeof streamText> | null = null;
        let lastError: unknown = null;
        outer: for (const item of modelPlan) {
          for (let attempt = 0; attempt < item.retries; attempt++) {
            try {
              const toolsSpec = undefined;
              result = streamText({
                model: google(item.name as any),
                messages: convertToModelMessages(messages),
                system: systemParts.join('\n\n'),
                temperature: 0,
                topP: 0.1,
                tools: toolsSpec as any,
                toolChoice: 'auto',
              });
              break outer;
            } catch (err) {
              lastError = err;
              continue;
            }
          }
        }
        if (!result) throw lastError ?? new Error('Échec du démarrage du flux Libeller');

        result.consumeStream();
        writer.merge(
          result.toUIMessageStream({
            sendReasoning: false,
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
        return;
      }

      if (group === 'pdfExcel') {
        const lastMsg = messages?.[messages.length - 1] || {};
        const parts = (lastMsg.parts || []) as any[];
        const pdfParts = parts.filter((p) => p?.type === 'file' && (p?.contentType === 'application/pdf' || p?.mediaType === 'application/pdf'));

        if (!pdfParts || pdfParts.length === 0) {
          const msg: ChatMessage = {
            id: 'msg-' + uuidv4(),
            role: 'assistant',
            parts: [{ type: 'text', text: 'Merci d’uploader au moins un PDF.' }],
            attachments: [],
            metadata: {
              model: String(model),
              completionTime: 0,
              createdAt: new Date().toISOString(),
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
            },
          } as any;
          writer.write({ type: 'data-appendMessage', data: JSON.stringify(msg), transient: false });
          return;
        }

        const modelPlan: Array<{ name: string; retries: number }> = [
          { name: 'gemini-2.5-flash', retries: 1 },
          { name: 'gemini-2.0-flash', retries: 2 },
        ];
        let result: ReturnType<typeof streamText> | null = null;
        let lastError: unknown = null;
        outer: for (const item of modelPlan) {
          for (let attempt = 0; attempt < item.retries; attempt++) {
            try {
              const toolsSpec = undefined;
              result = streamText({
                model: google(item.name as any),
                messages: convertToModelMessages(messages),
                system: SMART_PDF_TO_EXCEL_PROMPT,
                temperature: 0,
                topP: 0.1,
                tools: toolsSpec as any,
                toolChoice: 'auto',
              });
              break outer;
            } catch (err) {
              lastError = err;
              continue;
            }
          }
        }
        if (!result) throw lastError ?? new Error('Échec du démarrage du flux PDF → Excel');

        result.consumeStream();
        writer.merge(
          result.toUIMessageStream({
            sendReasoning: false,
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
        return;
      }

      if (group === 'nomenclature') {
        const normalized = (lastText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

        // Conversational greeting handling — do NOT produce a table for simple salutations
        const isGreeting = (t: string) => /\b(?:salut|bonjour|bonsoir|coucou|hello|hi|slt|bjr|ça va|ca va|comment\s+ça\s+va|comment\s+ca\s+va|السلام\s+عليكم|marhaba|مرحبا)\b/i.test((t || '').trim());
        if (isGreeting(lastText || '') && normalized.length <= 1) {
          const msg: ChatMessage = {
            id: 'msg-' + uuidv4(),
            role: 'assistant',
            parts: [{ type: 'text', text: "Bonjour ! Ça va ? Je suis un agent spécialisé dans la classification douanière et les taxes. Comment puis-je vous aider ?" }],
            attachments: [],
            metadata: {
              model: String(model),
              completionTime: 0,
              createdAt: new Date().toISOString(),
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
            },
          } as any;
          writer.write({ type: 'data-appendMessage', data: JSON.stringify(msg), transient: false });
          return;
        }

        const askForPrompt = normalized.length === 0 && /\b(prompt(?:\s*complet)?|les\s+règles|règles\s+(?:internes|de|du|d’|d'))\b/i.test(lastText || '');
        if (askForPrompt) {
          const msg: ChatMessage = {
            id: 'msg-' + uuidv4(),
            role: 'assistant',
            parts: [{ type: 'text', text: "J’applique des règles internes définies par le développeur. Pour les détails, contactez Arka." }],
            attachments: [],
            metadata: {
              model: String(model),
              completionTime: 0,
              createdAt: new Date().toISOString(),
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
            },
          } as any;
          writer.write({ type: 'data-appendMessage', data: JSON.stringify(msg), transient: false });
          return;
        }
        if (normalized.length === 0) {
          const msg: ChatMessage = {
            id: 'msg-' + uuidv4(),
            role: 'assistant',
            parts: [{ type: 'text', text: "Format d’entrée invalide. Collez une liste multi‑ligne avec un article par ligne (pas de texte libre)." }],
            attachments: [],
            metadata: {
              model: String(model),
              completionTime: 0,
              createdAt: new Date().toISOString(),
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
            },
          } as any;
          writer.write({ type: 'data-appendMessage', data: JSON.stringify(msg), transient: false });
          return;
        }
        if (normalized.length > 300) {
          const warn: ChatMessage = {
            id: 'msg-' + uuidv4(),
            role: 'assistant',
            parts: [{ type: 'text', text: "Grand volume détecté, traitement par lots en cours…" }],
            attachments: [],
            metadata: {
              model: String(model),
              completionTime: 0,
              createdAt: new Date().toISOString(),
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
            },
          } as any;
          writer.write({ type: 'data-appendMessage', data: JSON.stringify(warn), transient: true });
        }

        const modelPlan: Array<{ name: string; retries: number }> = [
          { name: 'gemini-2.5-flash', retries: 1 },
          { name: 'gemini-2.0-flash', retries: 2 },
        ];
        let result: ReturnType<typeof streamText> | null = null;
        let lastError: unknown = null;
        outer: for (const item of modelPlan) {
          for (let attempt = 0; attempt < item.retries; attempt++) {
            try {
              const toolsSpec = undefined;
              result = streamText({
                model: google(item.name as any),
                messages: convertToModelMessages(messages),
                system: systemParts.join('\n\n'),
                temperature: 0,
                topP: 0.1,
                tools: toolsSpec as any,
                toolChoice: 'auto',
              });
              break outer;
            } catch (err) {
              lastError = err;
              continue;
            }
          }
        }
        if (!result) throw lastError ?? new Error('Échec du démarrage du flux Nomenclature');

        result.consumeStream();
        writer.merge(
          result.toUIMessageStream({
            sendReasoning: false,
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
        return;
      }

      // Try Gemini 2.5 with fallbacks
      const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-exp'];
      let result: ReturnType<typeof streamText> | null = null;
      let lastError: unknown = null;
      for (const name of modelNames) {
        try {
          {
            const toolsSpec = Array.isArray(toolIds) && toolIds.includes('extreme_search')
              ? { extreme_search: extremeSearchTool(writer) }
              : undefined;
            result = streamText({
              model: google(name as any),
              messages: convertToModelMessages(messages),
              system: systemParts.join('\n\n'),
              tools: toolsSpec as any,
              toolChoice: toolsSpec ? 'required' : 'auto',
            });
          }
          break;
        } catch (err) {
          lastError = err;
          continue;
        }
      }
      if (!result) throw lastError ?? new Error('Failed to start stream');

      result.consumeStream();
      const enableReasoning = new Set(['scira-google-think','scira-google-think-v2','scira-google-think-v3']).has(String(model));
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
