import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, PDFName, PDFString } from 'pdf-lib';
import { Lexer } from 'marked';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import sharp from 'sharp';
import { mathjax } from '@mathjax/src/mjs/mathjax.js';
import { TeX } from '@mathjax/src/mjs/input/tex.js';
import { SVG } from '@mathjax/src/mjs/output/svg.js';
import { MathJaxNewcmFont } from '@mathjax/mathjax-newcm-font/mjs/svg.js';
import { liteAdaptor } from '@mathjax/src/mjs/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/mjs/handlers/html.js';
import '@mathjax/src/mjs/util/asyncLoad/esm.js';
import '@mathjax/src/mjs/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/mjs/input/tex/ams/AmsConfiguration.js';

function wrapText(text: string, widthFn: (s: string) => number, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\n{2,}/);

  // Helper function to break a long word at character level
  const breakLongWord = (word: string): string[] => {
    const parts: string[] = [];
    let current = '';

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const tentative = current + char;

      if (widthFn(tentative) > maxWidth) {
        if (current) {
          parts.push(current);
          current = char;
        } else {
          // Even a single character is too wide, just add it
          parts.push(char);
          current = '';
        }
      } else {
        current = tentative;
      }
    }

    if (current) parts.push(current);
    return parts;
  };

  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let line = '';

    for (const word of words) {
      const tentative = line ? `${line} ${word}` : word;

      if (widthFn(tentative) > maxWidth) {
        if (line) {
          lines.push(line);
          line = '';
        }

        // Check if the word itself is too long
        if (widthFn(word) > maxWidth) {
          // Break the long word into smaller parts
          const wordParts = breakLongWord(word);
          for (let i = 0; i < wordParts.length; i++) {
            if (i === wordParts.length - 1) {
              // Last part becomes the new line
              line = wordParts[i];
            } else {
              // Add complete parts as separate lines
              lines.push(wordParts[i]);
            }
          }
        } else {
          line = word;
        }
      } else {
        line = tentative;
      }
    }

    if (line) lines.push(line);
    // Add an empty line between paragraphs
    lines.push('');
  }

  // Remove trailing empty line
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title: string | null = body?.title ?? null;
    const rawContent: string = body?.content ?? '';
    const meta: any = body?.meta ?? {};

    if (!rawContent || typeof rawContent !== 'string') {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    // Utility: preprocess markdown for citations and math markers
    function preprocessMarkdownForCitationsAndMath(md: string): string {
      if (!md) return '';
      // Extract footnote definitions
      const footnoteDefs: Record<string, string> = {};
      md = md.replace(
        /^\[\^([^\]]+)\]:\s*([\s\S]*?)(?=\n{2,}|\n\[\^|\s*$)/gm,
        (_m: string, lbl: string, txt: string) => {
          footnoteDefs[String(lbl)] = String(txt).trim();
          return '';
        },
      );
      // Replace footnote references with numeric indices
      const footnoteOrder: string[] = [];
      md = md.replace(/\[\^([^\]]+)\]/g, (_m: string, lbl: string) => {
        const label = String(lbl);
        let idx = footnoteOrder.indexOf(label);
        if (idx === -1) {
          footnoteOrder.push(label);
          idx = footnoteOrder.length - 1;
        }
        return `[${idx + 1}]`;
      });
      // Replace pandoc-style citations [@key] with numeric indices
      const citationOrder: string[] = [];
      md = md.replace(/\[@([^\]]+)\]/g, (_m: string, key: string) => {
        const k = String(key);
        let idx = citationOrder.indexOf(k);
        if (idx === -1) {
          citationOrder.push(k);
          idx = citationOrder.length - 1;
        }
        return `[${idx + 1}]`;
      });
      // Normalize display math: convert $$...$$ blocks to \\[...\\] for consistent parsing
      md = md.replace(/\$\$([\s\S]*?)\$\$/g, (_m: string, block: string) => `\\[${block.trim()}\\]`);
      // Normalize common matrix environments inline to readable ASCII so they never leak raw LaTeX
      md = md.replace(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g, (_m: string, content: string) => {
        const norm = content
          .replace(/(?:\\\\|\\cr|\\0|\\n)/g, '; ') // row breaks
          .replace(/&/g, ', ') // columns
          .replace(/\s+/g, ' ') // collapse whitespace
          .trim();
        return `[${norm}]`;
      });
      md = md.replace(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g, (_m: string, content: string) => {
        const norm = content
          .replace(/(?:\\\\|\\cr|\\0|\\n)/g, '; ')
          .replace(/&/g, ', ')
          .replace(/\s+/g, ' ')
          .trim();
        return `(${norm})`;
      });
      // Append Notes and Citations sections
      let appendix = '';
      if (footnoteOrder.length) {
        appendix += `\n\n## Notes`;
        footnoteOrder.forEach((label, i) => {
          const text = footnoteDefs[label] || label;
          appendix += `\n- [${i + 1}] ${text}`;
        });
      }
      if (citationOrder.length) {
        appendix += `\n\n## Citations`;
        citationOrder.forEach((key, i) => {
          appendix += `\n- [${i + 1}] ${key}`;
        });
      }
      return md + appendix;
    }

    // Preprocess markdown for citations and display math
    const content: string = preprocessMarkdownForCitationsAndMath(rawContent);

    const pdfDoc = await PDFDocument.create();
    (pdfDoc as any).registerFontkit(fontkit);

    // Load Geist fonts for better Unicode support and modern design
    const geistRegularPath = path.join(process.cwd(), 'app/api/export/pdf/fonts/Geist-Regular.ttf');
    const geistBoldPath = path.join(process.cwd(), 'app/api/export/pdf/fonts/Geist-Bold.ttf');
    const geistItalicPath = path.join(process.cwd(), 'app/api/export/pdf/fonts/Geist-RegularItalic.ttf');
    const geistMonoPath = path.join(process.cwd(), 'app/api/export/pdf/fonts/GeistMono-Regular.ttf');

    const font = await pdfDoc.embedFont(readFileSync(geistRegularPath));
    const fontBold = await pdfDoc.embedFont(readFileSync(geistBoldPath));
    const fontItalic = await pdfDoc.embedFont(readFileSync(geistItalicPath));
    const fontCode = await pdfDoc.embedFont(readFileSync(geistMonoPath));

    const fontSize = 12;
    const lineGap = 6;
    const margin = 50;
    const pageWidth = 595; // A4 width in points
    const pageHeight = 842; // A4 height in points

    // Check if a character is supported by a font
    const isSupportedByFont = (ch: string, testFont: any): boolean => {
      if (!testFont) return false;
      try {
        const width = testFont.widthOfTextAtSize(ch, 10);
        // Return false if width is 0 or negative (glyph not found in font)
        return width !== undefined && width > 0;
      } catch {
        return false;
      }
    };

    // Draw text with font fallback support (tries main font, then symbol fonts)
    const drawTextWithFallback = (text: string, x: number, y: number, size: number, mainFont: any, color: any) => {
      if (!text) return;

      let currentX = x;
      for (const char of Array.from(text)) {
        if (char === '\t') {
          try {
            currentX += mainFont.widthOfTextAtSize('  ', size);
          } catch {
            currentX += size;
          }
          continue;
        }
        if (char === '\n') continue;

        let fontToUse = mainFont;

        // Use main font (Geist has excellent Unicode coverage)
        if (!isSupportedByFont(char, mainFont)) {
          // Log unsupported character for debugging
          const charCode = char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
          console.warn(`Unsupported character: '${char}' (U+${charCode}) in Geist font`);
          continue;
        }

        try {
          page.drawText(char, {
            x: currentX,
            y: y,
            size: size,
            font: fontToUse,
            color: color,
          });
          currentX += fontToUse.widthOfTextAtSize(char, size);
        } catch (err) {
          // Log error but continue rendering
          console.warn(`Failed to draw character '${char}':`, err);
        }
      }
    };

    // Sanitize text to remove completely unsupported glyphs
    const sanitizeForFont = (text: string, testFont: any): string => {
      if (!text) return '';
      return Array.from(text)
        .map((ch) => {
          if (ch === '\t') return '  ';
          if (ch === '\n') return ' ';
          // Keep character if supported by font
          if (isSupportedByFont(ch, testFont)) {
            return ch;
          }
          return '';
        })
        .join('');
    };
    // spacing constants for consistent vertical rhythm
    const SPACE_BEFORE_HEADING = 10;
    const SPACE_AFTER_HEADING = 8;
    const SPACE_AFTER_PARAGRAPH = 8;
    const SPACE_BEFORE_TABLE = 10;
    const SPACE_AFTER_TABLE = 18;
    const SPACE_AFTER_LIST = 8;
    const SPACE_AFTER_BLOCKQUOTE = 8;
    const SPACE_AFTER_CODE = 24;
    const KEEP_WITH_NEXT_MIN_SPACE_TABLE = 140;
    const KEEP_WITH_NEXT_MIN_SPACE_GENERIC = 60;

    const addPage = () => pdfDoc.addPage([pageWidth, pageHeight]);
    let page = addPage();
    let y = pageHeight - margin;

    const drawTextLine = (text: string, bold = false) => {
      const usedFont = bold ? fontBold : font;
      drawTextWithFallback(text, margin, y, fontSize, usedFont, rgb(0, 0, 0));
      y -= fontSize + lineGap;
      if (y <= margin) {
        page = addPage();
        y = pageHeight - margin;
      }
    };

    // Professional header with Scira branding and chat title
    const drawProfessionalHeader = () => {
      // One-line: logo + app name/title
      const titleSize = 16;
      const logoWidth = 20;
      const logoColor = rgb(0.15, 0.15, 0.15);

      // Align logo top to sit above the text baseline (cap height ~0.7x font size)
      const capHeight = titleSize * 0.7;
      const baselineAdjust = 25; // nudge downward for visual alignment
      const logoTop = y + capHeight + baselineAdjust;
      const logoHeight = drawSciraLogo(margin, logoTop, logoWidth, logoColor);
      const textX = margin + logoWidth + 8;
      const headerText = title ?? 'Scira AI';
      drawTextWithFallback(headerText, textX, y, titleSize, fontBold, rgb(0, 0, 0));
      y -= Math.max(titleSize, logoHeight) + 12;

      // Metadata — left-aligned, muted
      const info: string[] = [];
      if (meta?.modelLabel) info.push(`Model: ${meta.modelLabel}`);
      if (meta?.createdAt) info.push(`Date: ${new Date(meta.createdAt).toLocaleString()}`);
      if (info.length) {
        const infoText = info.join(' • ');
        const infoSize = 10;
        drawTextWithFallback(infoText, margin, y, infoSize, font, rgb(0.4, 0.4, 0.4));
        y -= infoSize + 16;
      }

      // Separator line full width
      const lineY = y + 8;
      page.drawLine({
        start: { x: margin, y: lineY },
        end: { x: pageWidth - margin, y: lineY },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });
      y -= 16;
    };

    drawProfessionalHeader();

    const maxLineWidth = pageWidth - margin * 2;

    // Calculate text width with Geist font
    const widthOf = (f: any, size: number) => (s: string) => {
      if (!s) return 0;
      let totalWidth = 0;

      for (const char of Array.from(s)) {
        if (char === '\t') {
          try {
            totalWidth += f.widthOfTextAtSize('  ', size);
          } catch {
            totalWidth += size;
          }
          continue;
        }
        if (char === '\n') continue;

        let charWidth = 0;
        if (isSupportedByFont(char, f)) {
          try {
            charWidth = f.widthOfTextAtSize(char, size);
          } catch {
            charWidth = size * 0.5;
          }
        } else {
          // Character not supported, skip it (width = 0)
          charWidth = 0;
        }

        totalWidth += charWidth;
      }

      return totalWidth;
    };

    const fontGreek = await pdfDoc.embedFont(StandardFonts.Symbol);

    // Track link citations for numbered badges and references list
    const citationIndex = new Map<string, number>();
    const citationText = new Map<string, string>();

    const drawWrapped = (text: string, opts: { font: any; size: number; indent?: number }) => {
      const indent = opts.indent ?? 0;
      const wFn = widthOf(opts.font, opts.size);
      const lines = wrapText(text, wFn, maxLineWidth - indent);
      for (const line of lines) {
        if (line === '') {
          y -= opts.size; // extra paragraph space
          if (y <= margin) {
            page = addPage();
            y = pageHeight - margin;
          }
          continue;
        }
        drawTextWithFallback(line, margin + indent, y, opts.size, opts.font, rgb(0, 0, 0));
        y -= opts.size + lineGap;
        if (y <= margin) {
          page = addPage();
          y = pageHeight - margin;
        }
      }
    };

    // Render inline tokens with styles (strong/em/codespan/link) and proper wrapping
    type Seg = {
      text: string;
      font: any;
      size: number;
      color?: any;
      break?: boolean;
      href?: string;
      badge?: boolean;
      center?: boolean;
      superscript?: boolean;
      latex?: string;
    };
    const flattenInline = (tokens: any[] | undefined, baseFont: any, baseSize: number): Seg[] => {
      if (!tokens || !Array.isArray(tokens)) return [];
      const segs: Seg[] = [];
      const sanitize = (s: string) => (s || '').replace(/\r?\n/g, ' ');

      // Helper to accumulate plain text for math buffers
      const appendText = (txt: string, buf: string) => buf + sanitize(txt);

      // Iterate with index to support cross-token math sequences like \( ... \) and \[ ... \]
      for (let idx = 0; idx < tokens.length; idx++) {
        const t: any = tokens[idx];
        const raw = String(t?.raw ?? '');

        // Handle display math start: \[
        if (t?.type === 'escape' && raw.startsWith('\\[')) {
          let content = '';
          let endIdx = idx + 1;
          for (; endIdx < tokens.length; endIdx++) {
            const tt: any = tokens[endIdx];
            const r = String(tt?.raw ?? '');
            if (tt?.type === 'escape' && r.startsWith('\\]')) break;
            // Collect text from intervening tokens
            if (typeof tt?.text === 'string') content = appendText(String(tt.text), content);
            else if (typeof tt?.raw === 'string') content = appendText(String(tt.raw), content);
            else if (tt?.type === 'space') content += ' ';
          }
          // If we found a closing \\], render centered math block
          if (endIdx < tokens.length) {
            const latex = content.trim();
            segs.push({ text: '', font: baseFont, size: baseSize, break: true });
            segs.push({ text: '', font: baseFont, size: baseSize + 2, center: true, latex });
            segs.push({ text: '', font: baseFont, size: baseSize, break: true });
            idx = endIdx; // skip through the closing token
            continue;
          }
          // No closing token: fall back to literal
          segs.push({ text: '(', font: baseFont, size: baseSize });
          continue;
        }

        // Handle inline math start: \(
        if (t?.type === 'escape' && raw.startsWith('\\(')) {
          let content = '';
          let endIdx = idx + 1;
          for (; endIdx < tokens.length; endIdx++) {
            const tt: any = tokens[endIdx];
            const r = String(tt?.raw ?? '');
            if (tt?.type === 'escape' && r.startsWith('\\)')) break;
            if (typeof tt?.text === 'string') content = appendText(String(tt.text), content);
            else if (typeof tt?.raw === 'string') content = appendText(String(tt.raw), content);
            else if (tt?.type === 'space') content += ' ';
          }
          if (endIdx < tokens.length) {
            const latex = content.trim();
            segs.push({ text: '', font: baseFont, size: baseSize, latex });
            idx = endIdx; // skip through the closing token
            continue;
          }
          segs.push({ text: '(', font: baseFont, size: baseSize });
          continue;
        }

        // Default handling for remaining token types
        switch (t.type) {
          case 'text': {
            const txt = sanitize(String(t.text ?? t.raw ?? ''));
            if (txt) {
              const mathSegs = splitMathInline(txt, baseFont, baseSize);
              if (mathSegs.length) segs.push(...mathSegs);
              else segs.push({ text: txt, font: baseFont, size: baseSize });
            }
            break;
          }
          case 'escape': {
            // Escaped non-math character; output literal without the backslash
            const txt = String(t.text ?? '').trim();
            const out = txt || raw.replace(/^\\/, '');
            if (out) segs.push({ text: out, font: baseFont, size: baseSize });
            break;
          }
          case 'space': {
            segs.push({ text: ' ', font: baseFont, size: baseSize });
            break;
          }
          case 'strong': {
            const inner = t.tokens ?? [{ type: 'text', text: t.text }];
            segs.push(...flattenInline(inner, fontBold, baseSize));
            break;
          }
          case 'em': {
            const inner = t.tokens ?? [{ type: 'text', text: t.text }];
            segs.push(...flattenInline(inner, fontItalic, baseSize));
            break;
          }
          case 'codespan': {
            const txt = sanitize(String(t.text ?? ''));
            if (txt) segs.push({ text: txt, font: fontCode, size: Math.max(8, baseSize - 1) });
            break;
          }
          case 'link': {
            const display = sanitize(String(t.text ?? t.href ?? t.raw ?? ''));
            const href = String(t.href ?? '');
            if (display || href) {
              let num = citationIndex.get(href);
              if (num == null) {
                num = citationIndex.size + 1;
                citationIndex.set(href, num);
              }
              if (display) citationText.set(href, display);
              const badgeText = String(num);
              segs.push({
                text: badgeText,
                font: baseFont,
                size: baseSize * 0.7,
                href,
                superscript: true,
                color: rgb(0.4, 0.4, 0.4),
              });
            }
            break;
          }
          case 'br': {
            segs.push({ text: '', font: baseFont, size: baseSize, break: true });
            break;
          }
          case 'paragraph': {
            const inner = t.tokens ?? [{ type: 'text', text: t.text }];
            segs.push(...flattenInline(inner, baseFont, baseSize));
            break;
          }
          default: {
            const txt = sanitize(String(t.text ?? t.raw ?? ''));
            if (txt) segs.push({ text: txt, font: baseFont, size: baseSize });
            break;
          }
        }
      }
      return segs;
    };

    // Helper to simplify common LaTeX macros to ASCII for PDF compatibility
    const simplifyLatex = (lx: string) =>
      (lx || '')
        .replace(/\\,|\\;|\\:\s*/g, ' ')
        .replace(/\\displaystyle|\\textstyle|\\scriptstyle/g, '')
        .replace(/\\text\{([^}]*)\}/g, '$1')
        .replace(/\\mathrm\{([^}]*)\}/g, '$1')
        .replace(/\\begin\{[bp]?matrix\}([\s\S]*?)\\end\{[bp]?matrix\}/g, (_m, content) => {
          const norm = String(content)
            .replace(/(?:\\\\|\\cr|\\0|\\n)/g, '; ')
            .replace(/&/g, ', ')
            .replace(/\s+/g, ' ')
            .trim();
          return '[' + norm + ']';
        })
        .replace(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g, (_m, content) => {
          const norm = String(content)
            .replace(/(?:\\\\|\\cr|\\0|\\n)/g, '; ')
            .replace(/&/g, ', ')
            .replace(/\s+/g, ' ')
            .trim();
          return '(' + norm + ')';
        })
        .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1/$2')
        // Keep greek commands ASCII-only in fallback to avoid WinAnsi issues
        .replace(/\\lambda\b/g, 'lambda')
        .replace(/\\alpha\b/g, 'alpha')
        .replace(/\\beta\b/g, 'beta')
        .replace(/\\gamma\b/g, 'gamma')
        .replace(/\\theta\b/g, 'theta')
        .replace(/\\tau\b/g, 'tau')
        .replace(/\\mu\b/g, 'mu')
        .replace(/\\Delta\b/g, 'Delta');

    // Parse inline math in plain text: handle $...$ and \(...\), leave others
    function splitMathInline(input: string, baseFont: any, baseSize: number): Seg[] {
      const segs: Seg[] = [];
      const s = input || '';
      let i = 0;

      // Check if a dollar sign at the given index is part of a monetary amount
      const isMonetaryAmount = (str: string, dollarIdx: number): boolean => {
        if (dollarIdx < 0 || dollarIdx >= str.length) return false;
        // Look ahead to see if it matches monetary pattern
        const afterDollar = str.slice(dollarIdx + 1);
        // Match: digits with optional commas/decimals followed by optional scale words
        const monetaryPattern =
          /^\d+(?:,\d{3})*(?:\.\d+)?(?:[kKmMbBtT]|\s+(?:thousand|million|billion|trillion|k|K|M|B|T))?/;
        return monetaryPattern.test(afterDollar);
      };

      // Route any Greek unicode characters to a Unicode font (Inter)
      const pushPlain = (txt: string) => {
        if (!txt) return;
        let buf = '';
        for (const ch of txt) {
          if (/[αβγθτμΔλ]/.test(ch)) {
            if (buf) segs.push({ text: buf, font: baseFont, size: baseSize });
            segs.push({ text: ch, font: fontGreek, size: baseSize });
            buf = '';
          } else {
            buf += ch;
          }
        }
        if (buf) segs.push({ text: buf, font: baseFont, size: baseSize });
      };

      const readGroup = (start: number): [string, number] => {
        if (s[start] !== '{') return ['', start];
        let depth = 0;
        let j = start;
        while (j < s.length) {
          const ch = s[j];
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) return [s.slice(start + 1, j), j + 1];
          }
          j++;
        }
        return [s.slice(start + 1), s.length];
      };

      while (i < s.length) {
        const idxDollar = s.indexOf('$', i);
        const idxInline = s.indexOf('\\(', i);
        const idxMacro = s.indexOf('\\', i);
        const cands = [idxDollar, idxInline, idxMacro].filter((n) => n !== -1);
        if (!cands.length) {
          pushPlain(s.slice(i));
          break;
        }
        const next = Math.min(...cands);
        if (next > i) pushPlain(s.slice(i, next));

        if (s[next] === '$') {
          // Check if this is a monetary amount (e.g., $100 billion)
          if (isMonetaryAmount(s, next)) {
            // Extract the monetary amount and treat it as plain text
            const afterDollar = s.slice(next + 1);
            const monetaryMatch = afterDollar.match(
              /^\d+(?:,\d{3})*(?:\.\d+)?(?:[kKmMbBtT]|\s+(?:thousand|million|billion|trillion|k|K|M|B|T))?/,
            );
            if (monetaryMatch) {
              const monetaryText = '$' + monetaryMatch[0];
              pushPlain(monetaryText);
              i = next + monetaryText.length;
              continue;
            }
          }

          // Otherwise, treat as LaTeX
          const end = s.indexOf('$', next + 1);
          if (end === -1) {
            pushPlain(s.slice(next));
            break;
          }
          const content = s.slice(next + 1, end).trim();
          segs.push({ text: '', font: baseFont, size: baseSize, latex: content });
          i = end + 1;
          continue;
        }
        if (s.slice(next, next + 2) === '\\(') {
          const end = s.indexOf('\\)', next + 2);
          if (end === -1) {
            pushPlain(s.slice(next));
            break;
          }
          const content = s.slice(next + 2, end).trim();
          segs.push({ text: '', font: baseFont, size: baseSize, latex: content });
          i = end + 2;
          continue;
        }
        if (s[next] === '\\') {
          let j = next + 1;
          while (j < s.length && /[A-Za-z]+/.test(s[j])) j++;
          const cmd = '\\' + s.slice(next + 1, j);
          if (cmd === '\\sqrt') {
            const [grp, after] = readGroup(j);
            const latex = grp ? `${cmd}{${grp}}` : cmd;
            segs.push({ text: '', font: baseFont, size: baseSize, latex });
            i = after;
            continue;
          }
          if (cmd === '\\frac') {
            const [num, p1] = readGroup(j);
            const [den, p2] = readGroup(p1);
            const latex = `${cmd}{${num}}{${den}}`;
            segs.push({ text: '', font: baseFont, size: baseSize, latex });
            i = p2;
            continue;
          }
          // Simple macros like \alpha, \Delta, etc
          segs.push({ text: '', font: baseFont, size: baseSize, latex: cmd });
          i = j;
          continue;
        }

        // Fallback: emit the single character
        pushPlain(s[next]);
        i = next + 1;
      }

      return segs;
    }

    // Minimal LaTeX-to-segments renderer for inline math (superscripts/subscripts & greek)
    const latexToSegs = (lx: string, size: number): Seg[] => {
      const out: Seg[] = [];
      const s = String(lx || '');
      const greek: Record<string, string> = {
        '\\alpha': 'α',
        '\\beta': 'β',
        '\\gamma': 'γ',
        '\\theta': 'θ',
        '\\mu': 'μ',
        '\\tau': 'τ',
        '\\Delta': 'Δ',
        '\\lambda': 'λ',
      };
      let i = 0;
      while (i < s.length) {
        const ch = s[i];
        if (ch === '\\') {
          let j = i + 1;
          while (j < s.length && /[A-Za-z]+/.test(s[j])) j++;
          const cmd = '\\' + s.slice(i + 1, j);
          if (greek[cmd]) {
            // Render LaTeX greek commands with Symbol font to avoid WinAnsi errors
            out.push({ text: greek[cmd], font: fontGreek, size });
            i = j;
            continue;
          }
          if (cmd === '\\frac') {
            const readGroup = (start: number): [string, number] => {
              if (s[start] === '{') {
                const end = s.indexOf('}', start + 1);
                return end !== -1 ? [s.slice(start + 1, end), end + 1] : [s.slice(start + 1), s.length];
              }
              return [s[start] || '', start + 1];
            };
            const [num, p1] = readGroup(j);
            const [den, p2] = readGroup(p1);
            out.push(...latexToSegs(num, size));
            out.push({ text: '/', font: fontItalic, size });
            out.push(...latexToSegs(den, size));
            i = p2;
            continue;
          }
          out.push({ text: s.slice(i, j), font: fontItalic, size });
          i = j;
          continue;
        }
        if (ch === '^' || ch === '_') {
          const isSup = ch === '^';
          let k = i + 1;
          let content = '';
          if (s[k] === '{') {
            const end = s.indexOf('}', k + 1);
            if (end !== -1) {
              content = s.slice(k + 1, end);
              i = end + 1;
            } else {
              content = s.slice(k + 1);
              i = s.length;
            }
          } else {
            content = s[k] || '';
            i = k + 1;
          }
          for (const c of content) {
            const isGreek = /[αβγθτμΔλ]/.test(c);
            out.push({
              text: c,
              font: isGreek ? fontGreek : fontItalic,
              size,
              superscript: isSup,
              ...(isSup ? {} : { subscript: true }),
            } as any);
          }
          continue;
        }
        // Default char rendering; route Greek unicode to Symbol font
        const greekChar = /[αβγθτμΔλ]/.test(ch);
        out.push({ text: ch, font: greekChar ? fontGreek : fontItalic, size });
        i++;
      }
      return out;
    };

    // Draw the Scira logo (vector) using the same SVG paths as components/logos/scira-logo.tsx
    // Positions the logo with its top-left at (x, yTop). Width controls overall size.
    function drawSciraLogo(x: number, yTop: number, width: number, color = rgb(0, 0, 0)) {
      // Original viewBox: 910 x 934
      const vbW = 910;
      const vbH = 934;
      const scale = width / vbW;
      const height = vbH * scale;
      const y = yTop - height; // convert to bottom-left anchor for PDF

      const border = (w: number) => Math.max(0.5, w * scale);

      // Paths extracted from /components/logos/scira-logo.tsx
      const p1 =
        'M647.664 197.775C569.13 189.049 525.5 145.419 516.774 66.8849C508.048 145.419 464.418 189.049 385.884 197.775C464.418 206.501 508.048 250.131 516.774 328.665C525.5 250.131 569.13 206.501 647.664 197.775Z';
      const p2 =
        'M516.774 304.217C510.299 275.491 498.208 252.087 480.335 234.214C462.462 216.341 439.058 204.251 410.333 197.775C439.059 191.3 462.462 179.209 480.335 161.336C498.208 143.463 510.299 120.06 516.774 91.334C523.25 120.059 535.34 143.463 553.213 161.336C571.086 179.209 594.49 191.3 623.216 197.775C594.49 204.251 571.086 216.341 553.213 234.214C535.34 252.087 523.25 275.491 516.774 304.217Z';
      const p3 =
        'M857.5 508.116C763.259 497.644 710.903 445.288 700.432 351.047C689.961 445.288 637.605 497.644 543.364 508.116C637.605 518.587 689.961 570.943 700.432 665.184C710.903 570.943 763.259 518.587 857.5 508.116Z';
      const p4 =
        'M700.432 615.957C691.848 589.05 678.575 566.357 660.383 548.165C642.191 529.973 619.499 516.7 592.593 508.116C619.499 499.533 642.191 486.258 660.383 468.066C678.575 449.874 691.848 427.181 700.432 400.274C709.015 427.181 722.289 449.874 740.481 468.066C758.673 486.258 781.365 499.533 808.271 508.116C781.365 516.7 758.673 529.973 740.481 548.165C722.289 566.357 709.015 589.05 700.432 615.957Z';
      const p5 =
        'M889.949 121.237C831.049 114.692 798.326 81.9698 791.782 23.0692C785.237 81.9698 752.515 114.692 693.614 121.237C752.515 127.781 785.237 160.504 791.782 219.404C798.326 160.504 831.049 127.781 889.949 121.237Z';
      const p6 =
        'M791.782 196.795C786.697 176.937 777.869 160.567 765.16 147.858C752.452 135.15 736.082 126.322 716.226 121.237C736.082 116.152 752.452 107.324 765.16 94.6152C777.869 81.9065 786.697 65.5368 791.782 45.6797C796.867 65.5367 805.695 81.9066 818.403 94.6152C831.112 107.324 847.481 116.152 867.338 121.237C847.481 126.322 831.112 135.15 818.403 147.858C805.694 160.567 796.867 176.937 791.782 196.795Z';
      const p7 =
        'M760.632 764.337C720.719 814.616 669.835 855.1 611.872 882.692C553.91 910.285 490.404 924.255 426.213 923.533C362.022 922.812 298.846 907.419 241.518 878.531C184.19 849.643 134.228 808.026 95.4548 756.863C56.6815 705.7 30.1238 646.346 17.8129 583.343C5.50206 520.339 7.76432 455.354 24.4266 393.359C41.0889 331.364 71.7099 274.001 113.947 225.658C156.184 177.315 208.919 139.273 268.117 114.442';

      // Draw strokes and fills
      page.drawSvgPath(p1, { x, y, scale, borderColor: color, borderWidth: border(8) });
      page.drawSvgPath(p2, { x, y, scale, color, borderColor: color, borderWidth: border(8) });
      page.drawSvgPath(p3, { x, y, scale, borderColor: color, borderWidth: border(20) });
      page.drawSvgPath(p4, { x, y, scale, borderColor: color, borderWidth: border(20) });
      page.drawSvgPath(p5, { x, y, scale, borderColor: color, borderWidth: border(8) });
      page.drawSvgPath(p6, { x, y, scale, color, borderColor: color, borderWidth: border(8) });
      page.drawSvgPath(p7, { x, y, scale, borderColor: color, borderWidth: border(30) });

      return height;
    }

    // Add a variant of inline wrapping that applies a hanging indent to continuation lines
    const drawInlineWrappedHanging = (segments: Seg[], baseSize: number, firstIndent = 0, hangingIndent = 20) => {
      let indent = firstIndent;
      let available = maxLineWidth - indent;
      let line: Seg[] = [];

      const widthOfSeg = (seg: Seg) => {
        try {
          return seg.font.widthOfTextAtSize(seg.text, seg.size);
        } catch {
          // Fallback: estimate width based on character count
          return seg.text.length * seg.size * 0.5;
        }
      };
      const flushLine = () => {
        let x = margin + indent;
        if (line.length === 1 && line[0].center) {
          const w = widthOfSeg(line[0]);
          x = margin + Math.max(0, (maxLineWidth - w) / 2);
        }
        for (const seg of line) {
          if (!seg.text) continue;
          const segWidth = widthOfSeg(seg);
          let advanceWidth = segWidth;

          // For superscript citations, render smaller and slightly raised with themed color (no circle)
          if (seg.superscript) {
            const yOffset = seg.size * 0.25; // Raise the text slightly
            const themeColor = rgb(0.2, 0.4, 0.8); // approx Shadcn primary
            drawTextWithFallback(seg.text, x, y + yOffset, seg.size, fontBold, themeColor);

            // Add a small gap after the superscript for breathing room
            advanceWidth = segWidth + 1;
          } else {
            drawTextWithFallback(seg.text, x, y, seg.size, seg.font, seg.color ?? rgb(0, 0, 0));
          }

          // Add clickable URI annotation if this segment represents a link
          if (seg.href) {
            try {
              const linkRef = pdfDoc.context.register(
                pdfDoc.context.obj({
                  Type: 'Annot',
                  Subtype: 'Link',
                  Rect: [x, y, x + advanceWidth, y + seg.size],
                  Border: [0, 0, 0],
                  A: { Type: 'Action', S: 'URI', URI: PDFString.of((seg as any).href) },
                }),
              );
              const existingAnnots: any = page.node.get(PDFName.of('Annots'));
              if (existingAnnots) (existingAnnots as any).push(linkRef);
              else page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkRef]));
            } catch {}
          }

          x += advanceWidth;
        }
        y -= baseSize + lineGap;
        if (y <= margin) {
          page = addPage();
          y = pageHeight - margin;
        }
        line = [];
        indent = hangingIndent; // hanging indent for subsequent lines
        available = maxLineWidth - indent;
      };

      for (const seg of segments ?? []) {
        if (seg.break) {
          if (line.length) flushLine();
          else {
            y -= baseSize + lineGap;
            if (y <= margin) {
              page = addPage();
              y = pageHeight - margin;
            }
          }
          continue;
        }
        let remaining = seg.text;
        while (remaining.length) {
          let w = 0;
          try {
            w = seg.font.widthOfTextAtSize(remaining, seg.size);
          } catch {
            w = remaining.length * seg.size * 0.5;
          }
          if (w <= available) {
            line.push({ ...seg, text: remaining });
            available -= w;
            remaining = '';
          } else {
            // character-based split to fit available space
            let cut = 0;
            for (let i = 1; i <= remaining.length; i++) {
              const candidate = remaining.slice(0, i);
              let cw = 0;
              try {
                cw = seg.font.widthOfTextAtSize(candidate, seg.size);
              } catch {
                cw = candidate.length * seg.size * 0.5;
              }
              if (cw > available) {
                cut = i - 1;
                break;
              }
              cut = i;
            }
            if (cut <= 0) {
              // nothing fits on this line, flush and retry
              if (line.length) flushLine();
              else {
                y -= baseSize + lineGap;
                if (y <= margin) {
                  page = addPage();
                  y = pageHeight - margin;
                }
              }
              available = maxLineWidth - indent;
              continue;
            }
            const fit = remaining.slice(0, cut);
            const rest = remaining.slice(cut).replace(/^\s+/, '');
            line.push({ ...seg, text: fit });
            remaining = rest;
            try {
              available -= seg.font.widthOfTextAtSize(fit, seg.size);
            } catch {
              available -= fit.length * seg.size * 0.5;
            }
            if (available <= 1) flushLine();
          }
        }
      }
      if (line.length) flushLine();
    };

    // MathJax engine setup for SVG rendering of display math
    const mjAdaptor = liteAdaptor();
    RegisterHTMLHandler(mjAdaptor);
    const mjTeX = new TeX({ packages: ['base', 'ams'] });
    const mjSVG = new SVG({ fontCache: 'local', fontData: MathJaxNewcmFont });
    const mjDocument = mathjax.document('', { InputJax: mjTeX, OutputJax: mjSVG });

    const drawMathBlock = async (latex: string, baseSize: number) => {
      try {
        const node = mjDocument.convert(latex, { display: true });
        const svg = mjAdaptor.outerHTML(node);
        console.log('Display math SVG preview:', svg.substring(0, 200));

        // Extract the actual SVG from MathJax container
        const svgMatch = svg.match(/<svg[^>]*>[\s\S]*?<\/svg>/);
        if (!svgMatch) {
          throw new Error('No SVG element found in MathJax output');
        }
        let pureSvg = svgMatch[0];

        // Remove any stroke, border, or outline attributes that cause unwanted lines
        console.log('DISPLAY MATH - Original SVG length:', pureSvg.length);
        const originalSvg = pureSvg;
        // More aggressive cleanup - remove ALL stroke-related elements
        pureSvg = pureSvg.replace(/stroke="[^"]*"/g, '');
        pureSvg = pureSvg.replace(/stroke-width="[^"]*"/g, '');
        pureSvg = pureSvg.replace(/stroke-opacity="[^"]*"/g, '');
        pureSvg = pureSvg.replace(/stroke-dasharray="[^"]*"/g, '');
        pureSvg = pureSvg.replace(/stroke-linecap="[^"]*"/g, '');
        pureSvg = pureSvg.replace(/stroke-linejoin="[^"]*"/g, '');
        pureSvg = pureSvg.replace(/outline="[^"]*"/g, '');
        pureSvg = pureSvg.replace(/border="[^"]*"/g, '');
        // Remove additional attributes that can cause visual artifacts
        pureSvg = pureSvg.replace(/fill-opacity="[^"]*"/g, '');
        pureSvg = pureSvg.replace(/opacity="[^"]*"/g, '');
        // Remove ALL rect and line elements entirely
        pureSvg = pureSvg.replace(/<rect[^>]*>/g, '');
        pureSvg = pureSvg.replace(/<line[^>]*>/g, '');
        // Remove stroke styles inside style attributes more aggressively
        pureSvg = pureSvg.replace(/style="([^"]*)"/g, (match, styles) => {
          const cleanedStyles = styles
            .replace(/stroke[^;]*;?/g, '')
            .replace(/border[^;]*;?/g, '')
            .replace(/outline[^;]*;?/g, '')
            .replace(/;;+/g, ';')
            .replace(/^;|;$/g, '');
          return cleanedStyles ? `style="${cleanedStyles}"` : '';
        });
        console.log('DISPLAY MATH - Cleaned SVG length:', pureSvg.length, 'Changed:', originalSvg !== pureSvg);

        // Parse ex-based height to estimate natural display size
        const heightExMatch = pureSvg.match(/height\s*=\s*"([\d.]+)ex"/) || pureSvg.match(/height:\s*([\d.]+)ex/);
        const heightEx = heightExMatch ? parseFloat(heightExMatch[1]) : NaN;
        const naturalDisplayH = Number.isFinite(heightEx) ? heightEx * baseSize : baseSize * 2;

        // High-resolution conversion
        const scaleFactor = 3;
        const tempPngBuf = await sharp(Buffer.from(pureSvg)).png().toBuffer();
        const tempPngImg = await pdfDoc.embedPng(tempPngBuf);
        const pngBuf = await sharp(Buffer.from(pureSvg))
          .png({ quality: 100 })
          .resize({
            width: Math.round(tempPngImg.width * scaleFactor),
            height: Math.round(tempPngImg.height * scaleFactor),
            fit: 'contain',
          })
          .toBuffer();
        const pngImg = await pdfDoc.embedPng(pngBuf);

        // Clamp display size: not wider than 75% line, not taller than ~2.0 line heights
        const maxW = maxLineWidth * 0.75;
        const maxH = Math.min(pageHeight * 0.25, baseSize * 2.5); // Slightly larger max height
        const minH = baseSize * 1.2; // Minimum height for readability
        const scaleW = maxW / pngImg.width;
        const scaleH = maxH / pngImg.height;
        const minScale = minH / pngImg.height;
        const scale = Math.min(scaleW, scaleH, Math.max(naturalDisplayH / pngImg.height, minScale));
        const w = pngImg.width * scale;
        const h = pngImg.height * scale;

        // Center horizontally
        const x = margin + (maxLineWidth - w) / 2;

        // Spacing
        const spaceBefore = Math.max(10, baseSize * 0.6);
        const spaceAfter = Math.max(10, baseSize * 0.6);

        y -= spaceBefore;
        if (y - h <= margin) {
          page = addPage();
          y = pageHeight - margin;
        }
        page.drawImage(pngImg, { x, y: y - h, width: w, height: h });
        y -= h + spaceAfter;
        if (y <= margin) {
          page = addPage();
          y = pageHeight - margin;
        }
      } catch (e) {
        console.warn('MathJax display render failed:', (e as any)?.message || e);
      }
    };

    // Standard inline wrapping used in general text rendering
    const drawInlineWrapped = async (segments: Seg[], baseSize: number, indent = 0) => {
      let available = maxLineWidth - indent;
      let line: Seg[] = [];

      // Precompute images and widths for inline LaTeX segments
      for (const seg of segments) {
        if ((seg as any).latex && !(seg as any).center) {
          try {
            const node = mjDocument.convert((seg as any).latex, { display: false });
            const svg = mjAdaptor.outerHTML(node);

            // Extract the actual SVG from MathJax container
            const svgMatch = svg.match(/<svg[^>]*>[\s\S]*?<\/svg>/);
            if (!svgMatch) {
              throw new Error('No SVG element found in MathJax output');
            }
            let pureSvg = svgMatch[0];

            // Remove any stroke, border, or outline attributes that cause unwanted lines
            pureSvg = pureSvg.replace(/stroke="[^"]*"/g, 'stroke="none"');
            pureSvg = pureSvg.replace(/stroke-width="[^"]*"/g, '');
            pureSvg = pureSvg.replace(/outline="[^"]*"/g, '');
            pureSvg = pureSvg.replace(/border="[^"]*"/g, '');
            // Remove additional attributes that can cause visual artifacts
            pureSvg = pureSvg.replace(/fill-opacity="[^"]*"/g, '');
            pureSvg = pureSvg.replace(/stroke-opacity="[^"]*"/g, '');
            pureSvg = pureSvg.replace(/opacity="[^"]*"/g, '');
            // Remove any rect elements that might be creating borders
            pureSvg = pureSvg.replace(/<rect[^>]*stroke[^>]*>/g, '');
            // Remove stroke styles inside style attributes
            pureSvg = pureSvg.replace(/style=\"[^\"]*stroke[^\"]*\"/g, (m) =>
              m.replace(/stroke:[^;\"]*;?/g, '').replace(/stroke-width:[^;\"]*;?/g, ''),
            );
            // Remove line elements that have strokes
            pureSvg = pureSvg.replace(/<line[^>]*stroke[^>]*>/g, '');

            // Convert SVG to high-quality PNG with proper scaling
            const scaleFactor = 3; // Consistent with display math
            const tempPngBuf = await sharp(Buffer.from(pureSvg)).png().toBuffer();
            const tempPngImg = await pdfDoc.embedPng(tempPngBuf);

            const pngBuf = await sharp(Buffer.from(pureSvg))
              .png({ quality: 100 })
              .resize({
                width: Math.round(tempPngImg.width * scaleFactor),
                height: Math.round(tempPngImg.height * scaleFactor),
                fit: 'contain',
              })
              .toBuffer();
            const pngImg = await pdfDoc.embedPng(pngBuf);
            (seg as any)._img = pngImg;

            // Size inline math to be proportional to text height with better scaling
            const targetH = Math.min(baseSize - 1, baseSize * 0.82); // Reduce to better match surrounding text
            const aspectRatio = pngImg.width / pngImg.height;
            const targetW = targetH * aspectRatio;

            // Ensure inline math doesn't get too wide or too small
            const maxInlineW = baseSize * 2.5; // Tighter max width for inline math
            const minInlineH = baseSize * 0.6; // Minimum height for readability

            let finalH = Math.max(targetH, minInlineH);
            let finalW = finalH * aspectRatio;

            if (finalW > maxInlineW) {
              finalW = maxInlineW;
              finalH = finalW / aspectRatio;
            }

            (seg as any)._drawH = finalH;
            (seg as any)._drawW = finalW;
          } catch (e) {
            console.warn('MathJax inline render failed:', (e as any)?.message || e);
            // Fallback: simplify LaTeX to text if MathJax fails
            const fb = simplifyLatex((seg as any).latex || '');
            seg.text = fb;
            delete (seg as any).latex;
          }
        }
      }

      const widthOfSeg = (seg: Seg) => {
        const w = (seg as any)._drawW;
        if (typeof w === 'number') return w;
        try {
          return seg.font.widthOfTextAtSize(seg.text, seg.size);
        } catch {
          return seg.text.length * seg.size * 0.5;
        }
      };
      const flushLine = () => {
        let x = margin + indent;
        // Center the whole line if requested, regardless of segment count
        if (line.length && line[0].center) {
          const totalWidth = line.reduce((sum, s) => sum + widthOfSeg(s), 0);
          x = margin + Math.max(0, (maxLineWidth - totalWidth) / 2);
        }
        for (const seg of line) {
          if ((seg as any).latex && !(seg as any).center && (seg as any)._img) {
            const img = (seg as any)._img;
            const w = (seg as any)._drawW;
            const h = (seg as any)._drawH;
            // Move math symbols higher - center around baseline
            const multiplier = 0.2; // Position so 60% of image is above baseline, 40% below
            const imgY = y - h * multiplier;
            console.log(`Math positioning: y=${y}, h=${h}, multiplier=${multiplier}, imgY=${imgY}`);
            page.drawImage(img, { x, y: imgY, width: w, height: h });
            x += w;
            continue;
          }
          if (!seg.text) continue;
          const segWidth = widthOfSeg(seg);
          let advanceWidth = segWidth;

          if ((seg as any).superscript) {
            const supSize = Math.max(6, Math.round(seg.size * 0.8));
            const yOffset = supSize * 0.35;
            drawTextWithFallback(seg.text, x, y + yOffset, supSize, seg.font ?? fontItalic, seg.color ?? rgb(0, 0, 0));
            try {
              advanceWidth = (seg.font ?? fontItalic).widthOfTextAtSize(seg.text, supSize) + 0.5;
            } catch {
              advanceWidth = seg.text.length * supSize * 0.5 + 0.5;
            }
          } else if ((seg as any).subscript) {
            const subSize = Math.max(6, Math.round(seg.size * 0.8));
            const yOffset = -subSize * 0.15;
            drawTextWithFallback(seg.text, x, y + yOffset, subSize, seg.font ?? fontItalic, seg.color ?? rgb(0, 0, 0));
            try {
              advanceWidth = (seg.font ?? fontItalic).widthOfTextAtSize(seg.text, subSize) + 0.5;
            } catch {
              advanceWidth = seg.text.length * subSize * 0.5 + 0.5;
            }
          } else {
            drawTextWithFallback(seg.text, x, y, seg.size, seg.font, seg.color ?? rgb(0, 0, 0));
          }

          if ((seg as any).href) {
            try {
              const linkRef = pdfDoc.context.register(
                pdfDoc.context.obj({
                  Type: 'Annot',
                  Subtype: 'Link',
                  Rect: [x, y, x + advanceWidth, y + seg.size],
                  Border: [0, 0, 0],
                  A: { Type: 'Action', S: 'URI', URI: PDFString.of((seg as any).href) },
                }),
              );
              const existingAnnots: any = page.node.get(PDFName.of('Annots'));
              if (existingAnnots) (existingAnnots as any).push(linkRef);
              else page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkRef]));
            } catch {}
          }

          x += advanceWidth;
        }
        y -= baseSize + lineGap;
        if (y <= margin) {
          page = addPage();
          y = pageHeight - margin;
        }
        line = [];
        available = maxLineWidth - indent;
      };

      for (const seg of segments) {
        if ((seg as any).latex && (seg as any).center) {
          if (line.length) flushLine();
          await drawMathBlock((seg as any).latex, baseSize);
          available = maxLineWidth - indent;
          continue;
        }
        if ((seg as any).break) {
          if (line.length) flushLine();
          continue;
        }
        if ((seg as any).latex && !(seg as any).center && (seg as any)._drawW) {
          const w = (seg as any)._drawW as number;
          if (w <= available) {
            line.push(seg);
            available -= w;
          } else {
            if (line.length) flushLine();
            available = maxLineWidth - indent;
            if (w <= available) {
              line.push(seg);
              available -= w;
            } else {
              /* If even a single inline math is wider than a line, reduce height for this segment */
              const img = (seg as any)._img;
              if (img) {
                const targetH = Math.max(8, Math.round(baseSize * 0.9));
                (seg as any)._drawH = targetH;
                (seg as any)._drawW = img.width * (targetH / img.height);
                const nw = (seg as any)._drawW as number;
                if (nw <= available) {
                  line.push(seg);
                  available -= nw;
                } else {
                  line.push(seg);
                  flushLine();
                }
              } else {
                // fallback: treat as plain text
                seg.text = simplifyLatex((seg as any).latex || '');
                delete (seg as any).latex;
              }
            }
          }
          continue;
        }
        // Word-aware wrapping: prefer breaking at spaces; only break mid-word if the word itself exceeds a full line.
        const tokens = seg.text.match(/[^\s]+|\s+/g) || [];
        for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
          const token = tokens[tIdx];
          const isSpace = /^\s+$/.test(token);
          let tokWidth = 0;
          try {
            tokWidth = seg.font.widthOfTextAtSize(token, seg.size);
          } catch {
            // Fallback: estimate width based on character count if font can't measure
            tokWidth = token.length * seg.size * 0.5;
          }

          if (tokWidth <= available) {
            // Token fits on current line
            if (!isSpace || line.length) {
              line.push({ ...seg, text: token });
              available -= tokWidth;
            }
            continue;
          }

          // Doesn't fit. If there's already content on this line, flush first.
          if (line.length) {
            flushLine();
            available = maxLineWidth - indent;
          }

          if (tokWidth <= available) {
            line.push({ ...seg, text: token });
            available -= tokWidth;
            continue;
          }

          // Extremely long token (word) that can't fit even on a fresh line: break at character level.
          let start = 0;
          while (start < token.length) {
            let end = start;
            let part = '';
            while (end < token.length) {
              const cand = token.slice(start, end + 1);
              let cw = 0;
              try {
                cw = seg.font.widthOfTextAtSize(cand, seg.size);
              } catch {
                // Fallback: estimate width based on character count
                cw = cand.length * seg.size * 0.5;
              }
              if (cw > available) break;
              part = cand;
              end++;
            }

            if (!part) {
              // If even a single character doesn't fit, flush and retry on next line.
              flushLine();
              available = maxLineWidth - indent;
              continue;
            }

            line.push({ ...seg, text: part });
            try {
              available -= seg.font.widthOfTextAtSize(part, seg.size);
            } catch {
              // Fallback: estimate width reduction based on character count
              available -= part.length * seg.size * 0.5;
            }
            start += part.length;

            if (start < token.length) {
              flushLine();
              available = maxLineWidth - indent;
            }
          }
        }
      }
      if (line.length) flushLine();
    };

    const drawListItem = async (item: any, bullet: string, orderedIndex?: number, baseIndent = 0) => {
      const bulletText = orderedIndex != null ? `${orderedIndex}.` : bullet;
      let bulletWidth = 0;
      try {
        bulletWidth = font.widthOfTextAtSize(bulletText, fontSize);
      } catch {
        bulletWidth = bulletText.length * fontSize * 0.5;
      }
      // Draw bullet at current indent
      drawTextWithFallback(bullet, margin + baseIndent, y, fontSize, font, rgb(0, 0, 0));
      const indent = baseIndent + bulletWidth + 10;

      // Build inline segments from possible block tokens inside list item
      let segs: Seg[] = [];
      const tks = item?.tokens;
      if (Array.isArray(tks) && tks.length) {
        for (const bt of tks) {
          // Handle nested lists inside a list item
          if (bt?.type === 'list') {
            if (segs.length) {
              await drawInlineWrapped(segs, fontSize, indent);
              segs = [];
            }
            let nestedCounter = bt.ordered ? bt.start || 1 : 1;
            for (const nItem of bt.items || []) {
              await drawListItem(nItem, '•', bt.ordered ? nestedCounter : undefined, indent);
              if (bt.ordered) nestedCounter++;
            }
            // Continue accumulating any following inline blocks
            continue;
          }

          if (bt && Array.isArray(bt.tokens)) {
            segs.push(...flattenInline(bt.tokens, font, fontSize));
            // break between blocks within a single list item
            segs.push({ text: '', font, size: fontSize, break: true });
          } else {
            segs.push(...flattenInline([bt], font, fontSize));
          }
        }
        if (segs.length && segs[segs.length - 1].break) segs.pop();
        if (segs.length) {
          await drawInlineWrapped(segs, fontSize, indent);
        }
      } else if (typeof item?.text === 'string') {
        let inlineTokens: any[] | undefined;
        try {
          inlineTokens = Lexer.lexInline(item.text);
        } catch {}
        const built = inlineTokens
          ? flattenInline(inlineTokens, font, fontSize)
          : [{ text: String(item.text), font, size: fontSize }];
        await drawInlineWrapped(built, fontSize, indent);
      } else {
        await drawInlineWrapped([{ text: '', font, size: fontSize }], fontSize, indent);
      }
    };

    // Draw a simple grid table for markdown `table` tokens
    const drawTable = (tk: any) => {
      const headers = Array.isArray(tk.header) ? tk.header : [];
      const rows = Array.isArray(tk.rows) ? tk.rows : [];
      const nCols = Math.max(headers.length, rows[0]?.length || 0);
      if (!nCols) {
        return;
      }

      const padX = 8;
      const padY = 4; // slightly larger padding for better breathing room
      const headerSize = fontSize;
      const cellSize = Math.max(9, fontSize - 1);
      const colWidth = Math.floor(maxLineWidth / nCols);

      // Build inline segments for a cell, preserving link citations
      const toSegments = (cell: any, baseFont: any, baseSize: number): Seg[] => {
        if (Array.isArray(cell?.tokens)) {
          const segs: Seg[] = [];
          for (const tt of cell.tokens) {
            if (tt?.type === 'link') {
              const display = String(tt.text ?? tt.href ?? tt.raw ?? '');
              const href = String(tt.href ?? '');
              let num = citationIndex.get(href);
              if (num == null) {
                num = citationIndex.size + 1;
                citationIndex.set(href, num);
              }
              if (display) citationText.set(href, display);
              segs.push({
                text: String(num),
                font: baseFont,
                size: Math.max(6, Math.round(baseSize * 0.7)),
                href,
                superscript: true,
                color: rgb(0.4, 0.4, 0.4),
              });
            } else {
              const s = String(tt.text ?? tt.raw ?? '');
              if (s) {
                const simple = simplifyLatex(s).replace(/\$(.*?)\$/g, '$1');
                segs.push({ text: simple, font: baseFont, size: baseSize });
              }
            }
          }
          return segs;
        }
        const s = typeof cell === 'string' ? cell : String(cell?.text ?? cell?.raw ?? '');
        const simple = simplifyLatex(s).replace(/\$(.*?)\$/g, '$1');
        return [{ text: simple, font: baseFont, size: baseSize }];
      };

      // Wrap segments into lines constrained to cell width
      const wrapSegments = (segments: Seg[], maxWidth: number): Seg[][] => {
        const lines: Seg[][] = [];
        let line: Seg[] = [];
        let available = maxWidth;

        const flush = () => {
          if (line.length) lines.push(line);
          line = [];
          available = maxWidth;
        };

        for (const seg of segments ?? []) {
          if ((seg as any).break) {
            flush();
            continue;
          }
          const font = seg.font;
          const size = seg.size;
          let remaining = seg.text || '';
          while (remaining.length) {
            let w = 0;
            try {
              w = font.widthOfTextAtSize(remaining, size);
            } catch {
              w = remaining.length * size * 0.5;
            }
            if (w <= available) {
              line.push({ ...seg, text: remaining });
              available -= w;
              remaining = '';
            } else {
              const firstLine =
                wrapText(
                  remaining,
                  (s) => {
                    try {
                      return font.widthOfTextAtSize(s, size);
                    } catch {
                      return s.length * size * 0.5;
                    }
                  },
                  available,
                )[0] ?? '';
              if (!firstLine.length) {
                flush();
                continue;
              }
              line.push({ ...seg, text: firstLine });
              flush();
              remaining = remaining.slice(firstLine.length);
            }
          }
        }
        if (line.length) lines.push(line);
        return lines;
      };

      // Measure row height and pre-wrapped lines for rendering
      const measureRow = (cells: any[], usedFont: any, usedSize: number) => {
        const wraps: Seg[][][] = [];
        const lineSpacing = Math.max(11, Math.round(usedSize * 1.08)); // tighter line height
        const cellHeights: number[] = [];
        let rowHeight = 0;
        for (let c = 0; c < nCols; c++) {
          const segs = toSegments(cells[c], usedFont, usedSize);
          const lines = wrapSegments(segs, colWidth - 2 * padX);
          wraps.push(lines);
          const contentH = usedSize + Math.max(0, lines.length - 1) * lineSpacing; // 1 line => usedSize
          cellHeights.push(contentH);
          rowHeight = Math.max(rowHeight, 2 * padY + contentH);
        }
        return { wraps, cellHeights, rowHeight, lineSpacing };
      };

      const renderMeasuredRow = (
        measured: { wraps: Seg[][][]; cellHeights: number[]; rowHeight: number; lineSpacing: number },
        usedFont: any,
        usedSize: number,
        shaded = false,
      ) => {
        const { wraps, cellHeights, rowHeight, lineSpacing } = measured;
        // Page break check; repeat header if a break occurs mid-table
        if (y - rowHeight <= margin) {
          page = addPage();
          y = pageHeight - margin;
          if (headers.length) {
            const mh = measureRow(headers, fontBold, headerSize);
            renderMeasuredRow(mh, fontBold, headerSize, true);
          }
        }
        const rowBottom = y - rowHeight;

        // draw background + borders per cell
        for (let c = 0; c < nCols; c++) {
          const x = margin + c * colWidth;
          const fillColor = shaded
            ? usedFont === fontBold
              ? rgb(0.94, 0.94, 0.98)
              : rgb(0.98, 0.98, 0.995)
            : undefined;
          page.drawRectangle({
            x,
            y: rowBottom,
            width: colWidth,
            height: rowHeight,
            color: fillColor,
            borderColor: rgb(0.85, 0.85, 0.88),
            borderWidth: 0.75,
          } as any);
        }

        // subtle accent line under header row for stronger separation
        if (shaded && usedFont === fontBold) {
          page.drawLine({
            start: { x: margin, y: rowBottom },
            end: { x: margin + nCols * colWidth, y: rowBottom },
            thickness: 1.2,
            color: rgb(0.7, 0.7, 0.8),
          });
        }

        // draw content segments (vertically center within each cell)
        for (let c = 0; c < nCols; c++) {
          const startX = margin + c * colWidth + padX;
          const contentH = cellHeights[c];
          const freeSpace = rowHeight - 2 * padY - contentH;
          const vOffset = Math.max(0, Math.floor(freeSpace / 2));
          let ty = y - padY - vOffset - usedSize; // baseline for first line

          for (const lineSegs of wraps[c]) {
            let xCursor = startX;
            for (const seg of lineSegs) {
              const segFont = seg.font || usedFont;
              const segSize = seg.size || usedSize;
              const raise = (seg as any).superscript ? Math.round(segSize * 0.35) : 0;
              const drawY = ty + raise;
              const text = seg.text || '';
              let advanceWidth = 0;
              try {
                advanceWidth = segFont.widthOfTextAtSize(text, segSize);
              } catch {
                advanceWidth = text.length * segSize * 0.5;
              }

              drawTextWithFallback(seg.text, xCursor, drawY, segSize, segFont, seg.color || rgb(0, 0, 0));

              if ((seg as any).href) {
                try {
                  const linkRef = pdfDoc.context.register(
                    pdfDoc.context.obj({
                      Type: 'Annot',
                      Subtype: 'Link',
                      Rect: [xCursor, drawY, xCursor + advanceWidth, drawY + segSize],
                      Border: [0, 0, 0],
                      A: { Type: 'Action', S: 'URI', URI: PDFString.of((seg as any).href) },
                    }),
                  );
                  const existingAnnots: any = page.node.get(PDFName.of('Annots'));
                  if (existingAnnots) (existingAnnots as any).push(linkRef);
                  else page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkRef]));
                } catch {}
              }

              xCursor += advanceWidth;
            }
            ty -= lineSpacing;
          }
        }

        y = rowBottom;
      };

      // Render header (avoid orphan header at page end)
      if (headers.length) {
        const mh = measureRow(headers, fontBold, headerSize);
        // If there are body rows, ensure header + first row fit; otherwise move to new page first
        if (rows.length) {
          const firstRowMeasure = measureRow(rows[0], font, cellSize);
          if (y - (mh.rowHeight + firstRowMeasure.rowHeight) <= margin) {
            page = addPage();
            y = pageHeight - margin;
          }
        } else if (y - mh.rowHeight <= margin) {
          page = addPage();
          y = pageHeight - margin;
        }
        renderMeasuredRow(mh, fontBold, headerSize, true);
      }
      // Render body rows with pagination and subtle zebra striping
      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const mr = measureRow(rows[rIdx], font, cellSize);
        const shadedRow = rIdx % 2 === 1; // shade odd rows for subtle zebra
        renderMeasuredRow(mr, font, cellSize, shadedRow);
      }

      // Post-gap handled by caller
    };

    // Parse markdown into tokens
    const tokens: any[] = Lexer.lex(content);
    let orderedCounter = 1;
    let lastWasParagraph = false;

    for (let idx = 0; idx < tokens.length; idx++) {
      const tk = tokens[idx];
      const nextTk = tokens[idx + 1];
      switch (tk.type) {
        case 'heading': {
          const sizeByLevel = [0, 20, 18, 16, 14, 13, 12];
          const depth = tk.depth ?? tk.level ?? 1;
          const size = sizeByLevel[Math.max(1, Math.min(6, depth))];

          // Keep heading with next block if near page bottom
          const minSpace = nextTk?.type === 'table' ? KEEP_WITH_NEXT_MIN_SPACE_TABLE : KEEP_WITH_NEXT_MIN_SPACE_GENERIC;
          if (y - (SPACE_BEFORE_HEADING + size + minSpace) <= margin) {
            page = addPage();
            y = pageHeight - margin;
          }

          // Consistent pre-gap before heading
          y -= SPACE_BEFORE_HEADING;
          if (y <= margin) {
            page = addPage();
            y = pageHeight - margin;
          }

          if (tk.tokens) {
            const segs = flattenInline(tk.tokens, fontBold, size);
            await drawInlineWrapped(segs, size);
            // normalize post-heading gap to our desired spacing
            if (SPACE_AFTER_HEADING > lineGap) {
              y -= SPACE_AFTER_HEADING - lineGap;
              if (y <= margin) {
                page = addPage();
                y = pageHeight - margin;
              }
            }
          } else {
            drawTextWithFallback(tk.text || '', margin, y, size, fontBold, rgb(0, 0, 0));
            y -= size + SPACE_AFTER_HEADING;
            if (y <= margin) {
              page = addPage();
              y = pageHeight - margin;
            }
          }
          lastWasParagraph = false;
          break;
        }
        case 'paragraph': {
          if (tk.tokens) {
            const segs = flattenInline(tk.tokens, font, fontSize);
            await drawInlineWrapped(segs, fontSize);
          } else {
            // Process paragraph text for math blocks before drawing
            const text = tk.text || '';
            const mathSegs = splitMathInline(text, font, fontSize);
            if (mathSegs.length > 1 || (mathSegs.length === 1 && mathSegs[0].center)) {
              // Contains math, use segment rendering
              await drawInlineWrapped(mathSegs, fontSize);
            } else {
              // Plain text, use simple wrapping
              drawWrapped(text, { font, size: fontSize });
            }
          }
          // Consistent gap after paragraph
          y -= SPACE_AFTER_PARAGRAPH;
          lastWasParagraph = true;
          break;
        }
        case 'blockquote': {
          drawWrapped(tk.text, { font: fontItalic, size: fontSize, indent: 12 });
          y -= SPACE_AFTER_BLOCKQUOTE;
          lastWasParagraph = false;
          break;
        }
        case 'code': {
          // Use IBM Plex Mono + sugar-high syntax highlighting, with a subtle background

          // Using pre-embedded IBM Plex Mono fontCode

          const padX = 10;
          const padY = 8;
          const codeSize = Math.max(9, fontSize - 1);
          const lineStep = codeSize + 4;
          const contentWidth = maxLineWidth - 2 * padX;

          // Wrap code to contentWidth while preserving characters
          const raw = String(tk.text || '');
          const rawLines = raw.split('\n');
          const wrappedLines: string[] = [];
          for (const ln of rawLines) {
            if (!ln.length) {
              wrappedLines.push('');
              continue;
            }
            let start = 0;
            while (start < ln.length) {
              let end = ln.length;
              while (
                end > start &&
                (() => {
                  try {
                    return fontCode.widthOfTextAtSize(ln.slice(start, end), codeSize);
                  } catch {
                    return 0;
                  }
                })() > contentWidth
              ) {
                end--;
              }
              if (end === start) end = Math.min(start + 1, ln.length);
              wrappedLines.push(ln.slice(start, end));
              start = end;
            }
          }

          // Measure and ensure space (background first)
          const blockHeight = wrappedLines.length * lineStep + 2 * padY;
          if (y - blockHeight <= margin) {
            page = addPage();
            y = pageHeight - margin;
          }
          const rectY = y - blockHeight + padY; // bottom of background
          page.drawRectangle({
            x: margin,
            y: rectY,
            width: maxLineWidth,
            height: blockHeight - padY,
            color: rgb(0.965, 0.97, 0.985),
            borderColor: rgb(0.88, 0.9, 0.94),
            borderWidth: 0.5,
          });

          // HTML entity decode
          const unescapeHtml = (s: string) =>
            s
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"');

          // Map sugar-high classes to colors
          const colorFor = (cls?: string) => {
            switch (cls) {
              case 'sh-keyword':
              case 'sh-k':
                return rgb(0.75, 0.25, 0.25);
              case 'sh-string':
              case 'sh-s':
                return rgb(0.2, 0.55, 0.3);
              case 'sh-number':
              case 'sh-n':
                return rgb(0.55, 0.35, 0.1);
              case 'sh-class':
              case 'sh-type':
                return rgb(0.35, 0.4, 0.75);
              case 'sh-property':
              case 'sh-p':
                return rgb(0.35, 0.45, 0.8);
              case 'sh-entity':
                return rgb(0.3, 0.4, 0.7);
              case 'sh-jsxliterals':
                return rgb(0.7, 0.35, 0.6);
              case 'sh-comment':
              case 'sh-c':
                return rgb(0.5, 0.55, 0.6);
              case 'sh-sign':
                return rgb(0.3, 0.3, 0.35);
              default:
                return rgb(0.2, 0.2, 0.25);
            }
          };

          // Draw wrapped lines - plain text without syntax highlighting for PDF
          let drawY = y - padY - codeSize;
          for (const lineText of wrappedLines) {
            const safeLineText = sanitizeForFont(lineText, fontCode);
            let x = margin + padX;
            const color = rgb(0.2, 0.2, 0.25);

            drawTextWithFallback(safeLineText, x, drawY, codeSize, fontCode, color);
            drawY -= lineStep;
          }

          // Advance past block
          y = rectY - SPACE_AFTER_CODE;
          lastWasParagraph = false;
          break;
        }
        case 'list': {
          orderedCounter = tk.ordered ? tk.start || 1 : 1;
          for (const item of tk.items || []) {
            await drawListItem(item, '•', tk.ordered ? orderedCounter : undefined);
            if (tk.ordered) orderedCounter++;
          }
          y -= SPACE_AFTER_LIST;
          lastWasParagraph = false;
          break;
        }
        case 'table': {
          // consistent spacing before table
          y -= SPACE_BEFORE_TABLE;
          if (y <= margin) {
            page = addPage();
            y = pageHeight - margin;
          }

          drawTable(tk);

          // consistent spacing after table
          y -= SPACE_AFTER_TABLE;
          if (y <= margin) {
            page = addPage();
            y = pageHeight - margin;
          }
          lastWasParagraph = false;
          break;
        }
        case 'hr': {
          // use a thin rectangle as divider
          const lineY = y - 4;
          page.drawRectangle({ x: margin, y: lineY, width: maxLineWidth, height: 1, color: rgb(0.6, 0.6, 0.6) });
          y = lineY - (fontSize + lineGap);
          if (y <= margin) {
            page = addPage();
            y = pageHeight - margin;
          }
          lastWasParagraph = false;
          break;
        }
        default: {
          if (tk.type === 'text') {
            drawWrapped(tk.text, { font, size: fontSize });
          }
          break;
        }
      }
    }

    // References section with proper margin handling
    const citations = Array.from(citationText.entries()); // [href, display]
    if (citations && citations.length > 0) {
      // Add some space before references
      y -= 20;
      if (y <= margin + 100) {
        // Ensure enough space for references header
        page = addPage();
        y = pageHeight - margin;
      }

      // References header
      const referencesTitle = 'References';
      const refTitleSize = 14;
      drawTextWithFallback(referencesTitle, margin, y, refTitleSize, fontBold, rgb(0, 0, 0));
      y -= refTitleSize + 12;

      // Draw separator line
      page.drawLine({
        start: { x: margin, y: y + 4 },
        end: { x: pageWidth - margin, y: y + 4 },
        thickness: 0.5,
        color: rgb(0.6, 0.6, 0.6),
      });
      y -= 8;

      // Update references rendering to clean clickable label + domain, with hanging indent
      // Sort references by citation number to match in-text order
      const refs = citations
        .map(([href, label]: [string, string]) => ({ href, label, num: citationIndex.get(href) || Infinity }))
        .filter((r) => r.num !== Infinity)
        .sort((a, b) => a.num - b.num);

      refs.forEach(({ href, label, num }) => {
        const refSize = fontSize - 1;
        let hostname = '';
        try {
          hostname = new URL(String(href)).hostname;
        } catch {
          hostname = String(href)
            .replace(/^https?:\/\/(www\.)?/, '')
            .split('/')[0];
        }
        const linkSegs = [
          { text: `[${num}] `, font, size: refSize },
          { text: String(label), font, size: refSize, href: String(href), color: rgb(0.2, 0.4, 0.8) },
          { text: ` (${hostname})`, font, size: refSize - 1, color: rgb(0.3, 0.3, 0.3) },
          { text: '', font, size: refSize, break: true },
        ];
        drawInlineWrappedHanging(linkSegs, refSize, 0, 20);
      });

      // Unreferenced links appended unsorted
      citations.forEach(([href, label]: [string, string]) => {
        if (citationIndex.get(href) != null) return;
        const refSize = fontSize - 1;
        let hostname = '';
        try {
          hostname = new URL(String(href)).hostname;
        } catch {
          hostname = String(href)
            .replace(/^https?:\/\/(www\.)?/, '')
            .split('/')[0];
        }
        const linkSegs = [
          { text: `[-] `, font, size: refSize },
          { text: String(label), font, size: refSize, href: String(href), color: rgb(0.2, 0.4, 0.8) },
          { text: ` (${hostname})`, font, size: refSize - 1, color: rgb(0.3, 0.3, 0.3) },
          { text: '', font, size: refSize, break: true },
        ];
        drawInlineWrappedHanging(linkSegs, refSize, 0, 20);
      });
    }

    const pdfBytes = await pdfDoc.save();

    // Create a plain ArrayBuffer from Uint8Array to satisfy BodyInit typing
    const ab = new ArrayBuffer(pdfBytes.byteLength);
    const view = new Uint8Array(ab);
    view.set(pdfBytes);

    const filename = `scira-export.pdf`;
    return new Response(ab, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    });
  } catch (e: any) {
    console.error('PDF export error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
