import type { Chat, Message } from '@/lib/db/schema';

/**
 * Extract searchable text from a chat and its messages
 * Combines title with first user message text for semantic search
 */
export function extractChatSearchableText(chat: Chat, messages: Message[]): string {
  const parts: string[] = [];
  
  // Add chat title
  if (chat.title) {
    parts.push(chat.title);
  }
  
  // Find first user message and extract text from parts
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (firstUserMessage && firstUserMessage.parts) {
    const messageParts = Array.isArray(firstUserMessage.parts) ? firstUserMessage.parts : [];
    const textParts = messageParts
      .filter((part: any) => part.type === 'text' && part.text)
      .map((part: any) => String(part.text).trim())
      .filter((text: string) => text.length > 0);
    
    if (textParts.length > 0) {
      parts.push(textParts.join(' '));
    }
  }
  
  return parts.join(' ').trim();
}

/**
 * Extract preview text from a chat (first user message, truncated)
 */
export function extractChatPreview(messages: Message[], maxLength: number = 150): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage || !firstUserMessage.parts) {
    return 'No messages';
  }
  
  const messageParts = Array.isArray(firstUserMessage.parts) ? firstUserMessage.parts : [];
  const textParts = messageParts
    .filter((part: any) => part.type === 'text' && part.text)
    .map((part: any) => String(part.text).trim())
    .filter((text: string) => text.length > 0);
  
  const fullText = textParts.join(' ');
  if (fullText.length > maxLength) {
    return fullText.substring(0, maxLength) + '...';
  }
  
  return fullText || 'No messages';
}
