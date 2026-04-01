import type { UIMessage } from 'ai';

/** Fast provisional title for DB/sidebar — no LLM. Kept outside server actions so it can be imported from API routes without 'use server' restrictions. */
export function heuristicChatTitleFromMessage(message: UIMessage): string {
  const firstTextPart = message.parts.find((part) => part.type === 'text');
  const raw =
    firstTextPart && firstTextPart.type === 'text' && typeof firstTextPart.text === 'string'
      ? firstTextPart.text.trim()
      : '';
  if (!raw) return 'New Chat';
  const singleLine = raw.replace(/\s+/g, ' ');
  const max = 72;
  if (singleLine.length <= max) return singleLine;
  return `${singleLine.slice(0, max - 1)}…`;
}
