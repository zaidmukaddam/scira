import type { TextStreamPart, ToolSet } from 'ai';

// Regex patterns for markdown matching
const LINK_PATTERN = /^\[.*?\]\(.*?\)$/;
const BOLD_PATTERN = /^\*\*.*?\*\*$/;
// Matches *text* but NOT **text** (negative lookahead ensures second char isn't *)
const ITALIC_PATTERN = /^\*(?!\*).+\*$/;
const TABLE_ROW_PATTERN = /^\|.+\|$/;
// Matches markdown table delimiter rows like: | --- | ---: | :-: |
const TABLE_DELIMITER_PATTERN = /^\|\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|\s*$/;
const WHITESPACE_PATTERN = /\s/;

// Rich XML tags that must be passed through intact
const RICH_TAGS = ['app_preview', 'download'] as const;
// Matches an opening rich tag e.g. <app_preview> or <download>
const RICH_TAG_OPEN_RE = new RegExp(`<(${RICH_TAGS.join('|')})>`, 'i');

class MarkdownJoiner {
  private buffer = '';
  private bufferMode: 'inline' | 'rich-tag' | null = null;
  private richTagName: string | null = null;
  private tableLineBuffer = '';
  private tableLineMode: 'header' | 'delimiter' | null = null;
  private isAtLineStart = true;
  private isInTable = false;
  private pendingTableHeaderLine: string | null = null;

  processText(text: string): string {
    let output = '';

    for (const char of text) {
      // Rich-tag passthrough mode: buffer everything until closing tag
      if (this.bufferMode === 'rich-tag') {
        this.buffer += char;
        const closeTag = `</${this.richTagName}>`;
        if (this.buffer.endsWith(closeTag)) {
          output += this.buffer;
          this.richTagName = null;
          this.clearBuffer();
        }
        continue;
      }

      if (this.tableLineMode) {
        this.tableLineBuffer += char;
        if (char === '\n') {
          output += this.flushTableLine();
          this.isAtLineStart = true;
        } else {
          this.isAtLineStart = false;
        }
      } else if (this.bufferMode === 'inline') {
        this.buffer += char;

        // Check if buffer has grown into a rich tag opener
        if (this.buffer.startsWith('<')) {
          const match = RICH_TAG_OPEN_RE.exec(this.buffer);
          if (match && this.buffer.endsWith('>')) {
            // Confirmed rich tag open — switch to rich-tag mode
            this.richTagName = match[1];
            this.bufferMode = 'rich-tag';
            this.isAtLineStart = false;
            continue;
          }
          // Still potentially building a rich tag — keep buffering until > or mismatch
          if (!this.isFalsePositiveTag(char)) {
            this.isAtLineStart = char === '\n';
            continue;
          }
          // Not a rich tag — flush as raw text
          output += this.buffer;
          this.clearBuffer();
          this.isAtLineStart = char === '\n';
          continue;
        }

        // Check for complete markdown elements or false positives
        if (this.isCompleteLink() || this.isCompleteBold() || this.isCompleteItalic()) {
          // Complete markdown element - flush buffer as is
          output += this.buffer;
          this.clearBuffer();
        } else if (this.isFalsePositive(char)) {
          // False positive - flush buffer as raw text
          output += this.buffer;
          this.clearBuffer();
        }

        this.isAtLineStart = char === '\n';
      } else {
        if (this.isAtLineStart) {
          if (this.pendingTableHeaderLine) {
            if (char !== '|') {
              output += this.pendingTableHeaderLine;
              this.pendingTableHeaderLine = null;
              // fall through to handle this char normally
            } else {
              this.tableLineMode = 'delimiter';
              this.tableLineBuffer = char;
              this.isAtLineStart = false;
              continue;
            }
          }

          if (this.isInTable && char !== '|') this.isInTable = false;

          if (!this.isInTable && !this.pendingTableHeaderLine && char === '|') {
            this.tableLineMode = 'header';
            this.tableLineBuffer = char;
            this.isAtLineStart = false;
            continue;
          }
        }

        if (char === '<') {
          this.buffer = char;
          this.bufferMode = 'inline';
          this.isAtLineStart = false;
          continue;
        }

        if (char === '[' || char === '*') {
          this.buffer = char;
          this.bufferMode = 'inline';
          this.isAtLineStart = false;
          continue;
        }

        // Pass through character directly
        output += char;
        this.isAtLineStart = char === '\n';
      }
    }

    return output;
  }

  private flushTableLine(): string {
    const lineWithNewline = this.tableLineBuffer;
    const line = lineWithNewline.endsWith('\n') ? lineWithNewline.slice(0, -1) : lineWithNewline;

    this.tableLineBuffer = '';
    const mode = this.tableLineMode;
    this.tableLineMode = null;

    if (mode === 'header') {
      if (this.isTableHeaderCandidate(line)) {
        // Hold header line until we see whether next line is a delimiter row
        this.pendingTableHeaderLine = lineWithNewline;
        return '';
      }

      return lineWithNewline;
    }

    if (mode === 'delimiter') {
      const headerLine = this.pendingTableHeaderLine ?? '';
      this.pendingTableHeaderLine = null;

      if (TABLE_DELIMITER_PATTERN.test(line)) this.isInTable = true;

      return headerLine + lineWithNewline;
    }

    return lineWithNewline;
  }

  private isTableHeaderCandidate(line: string): boolean {
    return TABLE_ROW_PATTERN.test(line) && !TABLE_DELIMITER_PATTERN.test(line);
  }

  private isCompleteLink(): boolean {
    // Match [text](url) pattern
    return LINK_PATTERN.test(this.buffer);
  }

  private isCompleteBold(): boolean {
    // Match **text** pattern
    return BOLD_PATTERN.test(this.buffer);
  }

  private isCompleteItalic(): boolean {
    // Match *text* pattern (but not **text**)
    return ITALIC_PATTERN.test(this.buffer);
  }

  private isFalsePositiveTag(char: string): boolean {
    // A < buffer is a false positive if we hit newline, another <, or > without matching a rich tag
    if (char === '\n' || (char === '<' && this.buffer.length > 1)) return true;
    if (char === '>' && !RICH_TAG_OPEN_RE.test(this.buffer)) return true;
    return false;
  }

  private isFalsePositive(char: string): boolean {
    // For links: if we see [ followed by something other than valid link syntax
    if (this.buffer.startsWith('[')) {
      // If we hit a newline or another [ without completing the link, it's false positive
      return char === '\n' || (char === '[' && this.buffer.length > 1);
    }

    // For emphasis: if we see * or ** followed by whitespace or newline
    if (this.buffer.startsWith('*')) {
      // Single * followed by whitespace is likely a list item or not emphasis
      // (buffer already includes char, so length 2 means just "*" + the whitespace char)
      if (this.buffer.length === 2 && WHITESPACE_PATTERN.test(char)) {
        return true;
      }
      // If we hit newline without completing emphasis, it's false positive
      return char === '\n';
    }

    return false;
  }

  private clearBuffer(): void {
    this.buffer = '';
    this.bufferMode = null;
  }

  flush(): string {
    const remaining = (this.pendingTableHeaderLine ?? '') + this.tableLineBuffer + this.buffer;
    this.pendingTableHeaderLine = null;
    this.tableLineBuffer = '';
    this.tableLineMode = null;
    this.clearBuffer();
    return remaining;
  }
}

export const markdownJoinerTransform =
  <TOOLS extends ToolSet>() =>
  () => {
    const joiner = new MarkdownJoiner();

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (chunk.type === 'text-delta') {
          const processedText = joiner.processText(chunk.text);
          if (processedText) {
            controller.enqueue({
              ...chunk,
              text: processedText,
            });
          }
        } else {
          controller.enqueue(chunk);
        }
      },
      flush(controller) {
        const remaining = joiner.flush();
        if (remaining) {
          controller.enqueue({
            type: 'text-delta',
            text: remaining,
          } as TextStreamPart<TOOLS>);
        }
      },
    });
  };
