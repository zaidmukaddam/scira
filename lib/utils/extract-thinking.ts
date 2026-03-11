/**
 * Extracts thinking tags from text content
 * Supports both <think> (DeepSeek R1) and <thinking> (Claude, MAGPiE) tag formats
 */
export function extractThinkingTags(text: string): { parts: Array<{ type: 'text' | 'reasoning', content: string }> } {
  const parts: Array<{ type: 'text' | 'reasoning', content: string }> = [];
  
  // Match both <think> and <thinking> tags
  const thinkRegex = /<(think|thinking)>([\s\S]*?)<\/\1>/g;
  let lastIndex = 0;
  let match;

  while ((match = thinkRegex.exec(text)) !== null) {
    // Add any text before the thinking tag
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }

    // Add the reasoning content (match[2] is the content inside the tags)
    const reasoningContent = match[2].trim();
    if (reasoningContent) {
      parts.push({ type: 'reasoning', content: reasoningContent });
    }

    lastIndex = match.index + match[0].length;
  }

  // Handle incomplete thinking tags (for streaming scenarios)
  // Check for both <think> and <thinking> incomplete tags
  const hasIncompleteThink = text.includes('<think>') && !text.includes('</think>');
  const hasIncompleteThinking = text.includes('<thinking>') && !text.includes('</thinking>');
  
  if (hasIncompleteThink || hasIncompleteThinking) {
    const incompleteMatch = text.match(/<(think|thinking)>([\s\S]*)/);
    if (incompleteMatch) {
      const reasoningContent = incompleteMatch[2].trim();
      if (reasoningContent) {
        parts.push({ type: 'reasoning', content: reasoningContent });
        return { parts }; // Return early for incomplete tags
      }
    }
  }

  // Add any remaining text after the last thinking tag
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex).trim();
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText });
    }
  }

  // If no thinking tags were found, return the original text
  if (parts.length === 0 && text.trim()) {
    parts.push({ type: 'text', content: text });
  }

  return { parts };
}

