import type { TextStreamPart, ToolSet } from "ai";

// Regex patterns for markdown matching
const LINK_PATTERN = /^\[.*?\]\(.*?\)$/;
const BOLD_PATTERN = /^\*\*.*?\*\*$/;
const TABLE_ROW_PATTERN = /^\|.+\|$/;
// Matches markdown table delimiter rows like: | --- | ---: | :-: |
const TABLE_DELIMITER_PATTERN = /^\|\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|\s*$/;
const WHITESPACE_PATTERN = /\s/;

class MarkdownJoiner {
  private buffer = "";
  private bufferMode: "inline" | null = null;
  private tableLineBuffer = "";
  private tableLineMode: "header" | "delimiter" | null = null;
  private isAtLineStart = true;
  private isInTable = false;
  private pendingTableHeaderLine: string | null = null;

  processText(text: string): string {
    let output = "";

    for (const char of text) {
      if (this.tableLineMode) {
        this.tableLineBuffer += char;
        if (char === "\n") {
          output += this.flushTableLine();
          this.isAtLineStart = true;
        } else {
          this.isAtLineStart = false;
        }
      } else if (this.bufferMode === "inline") {
        this.buffer += char;

        // Check for complete markdown elements or false positives
        if (this.isCompleteLink() || this.isCompleteBold()) {
          // Complete markdown element - flush buffer as is
          output += this.buffer;
          this.clearBuffer();
        } else if (this.isFalsePositive(char)) {
          // False positive - flush buffer as raw text
          output += this.buffer;
          this.clearBuffer();
        }

        this.isAtLineStart = char === "\n";
      } else {
        if (this.isAtLineStart) {
          if (this.pendingTableHeaderLine) {
            if (char !== "|") {
              output += this.pendingTableHeaderLine;
              this.pendingTableHeaderLine = null;
              // fall through to handle this char normally
            } else {
              this.tableLineMode = "delimiter";
              this.tableLineBuffer = char;
              this.isAtLineStart = false;
              continue;
            }
          }

          if (this.isInTable && char !== "|") this.isInTable = false;

          if (!this.isInTable && !this.pendingTableHeaderLine && char === "|") {
            this.tableLineMode = "header";
            this.tableLineBuffer = char;
            this.isAtLineStart = false;
            continue;
          }
        }

        if (char === "[" || char === "*") {
          this.buffer = char;
          this.bufferMode = "inline";
          this.isAtLineStart = false;
          continue;
        }

        // Pass through character directly
        output += char;
        this.isAtLineStart = char === "\n";
      }
    }

    return output;
  }

  private flushTableLine(): string {
    const lineWithNewline = this.tableLineBuffer;
    const line = lineWithNewline.endsWith("\n") ? lineWithNewline.slice(0, -1) : lineWithNewline;

    this.tableLineBuffer = "";
    const mode = this.tableLineMode;
    this.tableLineMode = null;

    if (mode === "header") {
      if (this.isTableHeaderCandidate(line)) {
        // Hold header line until we see whether next line is a delimiter row
        this.pendingTableHeaderLine = lineWithNewline;
        return "";
      }

      return lineWithNewline;
    }

    if (mode === "delimiter") {
      const headerLine = this.pendingTableHeaderLine ?? "";
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

  private isFalsePositive(char: string): boolean {
    // For links: if we see [ followed by something other than valid link syntax
    if (this.buffer.startsWith("[")) {
      // If we hit a newline or another [ without completing the link, it's false positive
      return char === "\n" || (char === "[" && this.buffer.length > 1);
    }

    // For bold: if we see * or ** followed by whitespace or newline
    if (this.buffer.startsWith("*")) {
      // Single * followed by whitespace is likely a list item
      if (this.buffer.length === 1 && WHITESPACE_PATTERN.test(char)) {
        return true;
      }
      // If we hit newline without completing bold, it's false positive
      return char === "\n";
    }

    return false;
  }

  private clearBuffer(): void {
    this.buffer = "";
    this.bufferMode = null;
  }

  flush(): string {
    const remaining =
      (this.pendingTableHeaderLine ?? "") +
      this.tableLineBuffer +
      this.buffer;
    this.pendingTableHeaderLine = null;
    this.tableLineBuffer = "";
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
        if (chunk.type === "text-delta") {
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
            type: "text-delta",
            text: remaining,
          } as TextStreamPart<TOOLS>);
        }
      },
    });
  };