/**
 * Split model text into plain `text` vs `reasoning` segments.
 * Supports:
 * - `think` … `</think>` (DeepSeek-style)
 * - `<thinking>` … `</thinking>` (Claude / MAGPiE-style XML)
 */

/** DeepSeek-style: <think> … </think> */
const OPEN_THINK = '<think>';
const CLOSE_THINK = '</think>';
const OPEN_THINKING_XML = '<thinking>';
const CLOSE_THINKING_XML = '</thinking>';

export type ThinkingPart = { type: 'text' | 'reasoning'; content: string };

export function extractThinkingTags(text: string): { parts: ThinkingPart[] } {
  const parts: ThinkingPart[] = [];
  const s = text;
  if (!s.trim()) return { parts: [] };

  let i = 0;

  while (i < s.length) {
    const idxThink = s.indexOf(OPEN_THINK, i);
    const idxXml = s.indexOf(OPEN_THINKING_XML, i);
    const nextThink = idxThink === -1 ? Infinity : idxThink;
    const nextXml = idxXml === -1 ? Infinity : idxXml;
    const next = Math.min(nextThink, nextXml);

    if (next === Infinity) {
      const rest = s.slice(i).trim();
      if (rest) parts.push({ type: 'text', content: rest });
      break;
    }

    if (next > i) {
      const before = s.slice(i, next).trim();
      if (before) parts.push({ type: 'text', content: before });
    }

    if (next === nextThink) {
      const closeIdx = s.indexOf(CLOSE_THINK, next + OPEN_THINK.length);
      if (closeIdx === -1) {
        const inner = s.slice(next + OPEN_THINK.length).trim();
        if (inner) parts.push({ type: 'reasoning', content: inner });
        return { parts };
      }
      const inner = s.slice(next + OPEN_THINK.length, closeIdx).trim();
      if (inner) parts.push({ type: 'reasoning', content: inner });
      i = closeIdx + CLOSE_THINK.length;
    } else {
      const closeIdx = s.indexOf(CLOSE_THINKING_XML, next + OPEN_THINKING_XML.length);
      if (closeIdx === -1) {
        const inner = s.slice(next + OPEN_THINKING_XML.length).trim();
        if (inner) parts.push({ type: 'reasoning', content: inner });
        return { parts };
      }
      const inner = s.slice(next + OPEN_THINKING_XML.length, closeIdx).trim();
      if (inner) parts.push({ type: 'reasoning', content: inner });
      i = closeIdx + CLOSE_THINKING_XML.length;
    }
  }

  if (parts.length === 0 && s.trim()) {
    parts.push({ type: 'text', content: s });
  }

  return { parts };
}
