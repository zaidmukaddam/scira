import { UIMessagePart } from 'ai';
import { formatISO } from 'date-fns';
import { type Message } from '@/lib/db/schema';
import { ChatMessage, ChatTools, CustomUIDataTypes } from '@/lib/types';

export function convertToUIMessages(messages: Message[]): ChatMessage[] {
  console.log('Messages: ', messages);

  return messages.map((message) => {
    const partsArray = Array.isArray(message.parts) ? message.parts : [];
    const convertedParts = partsArray
      .map((part: unknown) => convertLegacyToolInvocation(part))
      .map((part: unknown) => convertLegacyReasoningPart(part));

    return {
      id: message.id,
      role: message.role as 'user' | 'assistant' | 'system',
      parts: convertedParts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
      metadata: {
        createdAt: formatISO(message.createdAt),
        model: message.model ?? '',
        completionTime: message.completionTime,
        inputTokens: message.inputTokens,
        outputTokens: message.outputTokens,
        totalTokens: message.totalTokens,
      },
    };
  });
}

function convertLegacyToolInvocation(part: unknown): unknown {
  if (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    part.type === 'tool-invocation' &&
    'toolInvocation' in part &&
    typeof part.toolInvocation === 'object' &&
    part.toolInvocation !== null &&
    'toolName' in part.toolInvocation
  ) {
    const toolInvocation = part.toolInvocation as {
      toolName: string;
      toolCallId: string;
      state: string;
      args: unknown;
      result: unknown;
    };

    function mapState(oldState: string): string {
      switch (oldState) {
        case 'result':
          return 'output-available';
        case 'partial-result':
          return 'input-available';
        case 'call':
          return 'input-streaming';
        default:
          return oldState;
      }
    }

    return {
      type: `tool-${toolInvocation.toolName}`,
      toolCallId: toolInvocation.toolCallId,
      state: mapState(toolInvocation.state),
      input: toolInvocation.args,
      output: toolInvocation.result,
    };
  }

  return part;
}

function convertLegacyReasoningPart(part: unknown): unknown {
  if (typeof part !== 'object' || part === null || !('type' in part)) {
    return part;
  }

  const maybePart = part as {
    type?: unknown;
    text?: unknown;
    reasoning?: unknown;
    details?: unknown;
  };

  if (maybePart.type === 'reasoning') {
    if (typeof maybePart.text === 'string' && maybePart.text.length > 0) {
      return part;
    }

    const mainText = typeof maybePart.reasoning === 'string' ? maybePart.reasoning : '';

    let detailsText = '';
    if (Array.isArray(maybePart.details)) {
      const collected: string[] = [];
      for (const entry of maybePart.details as Array<unknown>) {
        if (
          typeof entry === 'object' &&
          entry !== null &&
          'type' in entry &&
          (entry as { type?: unknown }).type === 'text' &&
          'text' in entry &&
          typeof (entry as { text?: unknown }).text === 'string'
        ) {
          collected.push((entry as { text: string }).text);
        }
      }
      if (collected.length > 0) {
        detailsText = collected.join('\n\n');
      }
    }

    const combinedText = [mainText, detailsText].filter((value) => value && value.trim().length > 0).join('\n\n');

    return {
      type: 'reasoning',
      text: combinedText,
    };
  }

  return part;
}
