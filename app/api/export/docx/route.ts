import { NextRequest, NextResponse } from 'next/server';
import { Lexer } from 'marked';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  ExternalHyperlink,
  LevelFormat,
  convertInchesToTwip,
  PageBreak,
  IStylesOptions,
  INumberingOptions,
} from 'docx';

interface DocxExportMeta {
  modelLabel?: string;
  createdAt?: string | number | Date;
}

interface DocxExportBody {
  title?: string | null;
  content: string;
  meta?: DocxExportMeta;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function parseDocxExportBody(value: unknown): DocxExportBody | null {
  if (!isRecord(value) || !isString(value.content) || !value.content.trim()) return null;

  const title = isString(value.title) ? value.title : value.title === null ? null : undefined;
  const meta = isRecord(value.meta) ? value.meta : undefined;

  return {
    title,
    content: value.content,
    meta: {
      modelLabel: isString(meta?.modelLabel) ? meta?.modelLabel : undefined,
      createdAt:
        typeof meta?.createdAt === 'string' || typeof meta?.createdAt === 'number' || meta?.createdAt instanceof Date
          ? meta?.createdAt
          : undefined,
    },
  };
}

// Preprocess markdown for citations and convert LaTeX to readable text
function preprocessMarkdown(md: string): string {
  if (!md) return '';

  // Convert display math \[...\] to readable text FIRST (before markdown parsing)
  md = md.replace(/\\\[([\s\S]*?)\\\]/g, (_m: string, latex: string) => {
    return simplifyLatex(latex);
  });

  // Convert display math $$...$$ to readable text
  md = md.replace(/\$\$([\s\S]*?)\$\$/g, (_m: string, latex: string) => {
    return simplifyLatex(latex);
  });

  // Convert inline math $...$ to readable text
  md = md.replace(/\$([^$\n]+)\$/g, (_m: string, latex: string) => {
    return simplifyLatex(latex);
  });

  // Convert inline math \(...\) to readable text
  md = md.replace(/\\\(([\s\S]*?)\\\)/g, (_m: string, latex: string) => {
    return simplifyLatex(latex);
  });

  // Normalize matrix environments
  md = md.replace(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g, (_m: string, content: string) => {
    const norm = content
      .replace(/(?:\\\\|\\cr|\\0|\\n)/g, '; ')
      .replace(/&/g, ', ')
      .replace(/\s+/g, ' ')
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

  // Append Notes section
  let appendix = '';
  if (footnoteOrder.length) {
    appendix += `\n\n## Notes`;
    footnoteOrder.forEach((label, i) => {
      const text = footnoteDefs[label] || label;
      appendix += `\n- [${i + 1}] ${text}`;
    });
  }

  return md + appendix;
}

// Simplify LaTeX to readable text
function simplifyLatex(lx: string): string {
  return (lx || '')
    // Spacing commands
    .replace(/\\,|\\;|\\:|\\quad|\\qquad/g, ' ')
    .replace(/\\displaystyle|\\textstyle|\\scriptstyle|\\left|\\right/g, '')
    // Text and formatting commands
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\textit\{([^}]*)\}/g, '$1')
    .replace(/\\mathrm\{([^}]*)\}/g, '$1')
    .replace(/\\mathbf\{([^}]*)\}/g, '$1')
    .replace(/\\mathit\{([^}]*)\}/g, '$1')
    .replace(/\\mathcal\{([^}]*)\}/g, '$1')
    .replace(/\\mathbb\{([^}]*)\}/g, '$1')
    .replace(/\\operatorname\{([^}]*)\}/g, '$1')
    .replace(/\\operatorname\*\{([^}]*)\}/g, '$1')
    // Fractions and roots
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\dfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\tfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\[([^\]]+)\]\{([^}]*)\}/g, '($2)^(1/$1)')
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
    // Greek letters (lowercase)
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\delta\b/g, 'δ')
    .replace(/\\epsilon\b/g, 'ε')
    .replace(/\\varepsilon\b/g, 'ε')
    .replace(/\\zeta\b/g, 'ζ')
    .replace(/\\eta\b/g, 'η')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\vartheta\b/g, 'θ')
    .replace(/\\iota\b/g, 'ι')
    .replace(/\\kappa\b/g, 'κ')
    .replace(/\\lambda\b/g, 'λ')
    .replace(/\\mu\b/g, 'μ')
    .replace(/\\nu\b/g, 'ν')
    .replace(/\\xi\b/g, 'ξ')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\rho\b/g, 'ρ')
    .replace(/\\sigma\b/g, 'σ')
    .replace(/\\tau\b/g, 'τ')
    .replace(/\\upsilon\b/g, 'υ')
    .replace(/\\phi\b/g, 'φ')
    .replace(/\\varphi\b/g, 'φ')
    .replace(/\\chi\b/g, 'χ')
    .replace(/\\psi\b/g, 'ψ')
    .replace(/\\omega\b/g, 'ω')
    // Greek letters (uppercase)
    .replace(/\\Gamma\b/g, 'Γ')
    .replace(/\\Delta\b/g, 'Δ')
    .replace(/\\Theta\b/g, 'Θ')
    .replace(/\\Lambda\b/g, 'Λ')
    .replace(/\\Xi\b/g, 'Ξ')
    .replace(/\\Pi\b/g, 'Π')
    .replace(/\\Sigma\b/g, 'Σ')
    .replace(/\\Phi\b/g, 'Φ')
    .replace(/\\Psi\b/g, 'Ψ')
    .replace(/\\Omega\b/g, 'Ω')
    // Math operators and symbols
    .replace(/\\infty\b/g, '∞')
    .replace(/\\sum\b/g, 'Σ')
    .replace(/\\prod\b/g, 'Π')
    .replace(/\\int\b/g, '∫')
    .replace(/\\partial\b/g, '∂')
    .replace(/\\nabla\b/g, '∇')
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\cdots\b/g, '···')
    .replace(/\\ldots\b/g, '...')
    .replace(/\\dots\b/g, '...')
    .replace(/\\vdots\b/g, '⋮')
    .replace(/\\ddots\b/g, '⋱')
    .replace(/\\leq\b/g, '≤')
    .replace(/\\le\b/g, '≤')
    .replace(/\\geq\b/g, '≥')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\ne\b/g, '≠')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\sim\b/g, '~')
    .replace(/\\equiv\b/g, '≡')
    .replace(/\\pm\b/g, '±')
    .replace(/\\mp\b/g, '∓')
    .replace(/\\div\b/g, '÷')
    .replace(/\\to\b/g, '→')
    .replace(/\\rightarrow\b/g, '→')
    .replace(/\\leftarrow\b/g, '←')
    .replace(/\\Rightarrow\b/g, '⇒')
    .replace(/\\Leftarrow\b/g, '⇐')
    .replace(/\\iff\b/g, '⟺')
    .replace(/\\forall\b/g, '∀')
    .replace(/\\exists\b/g, '∃')
    .replace(/\\in\b/g, '∈')
    .replace(/\\notin\b/g, '∉')
    .replace(/\\subset\b/g, '⊂')
    .replace(/\\subseteq\b/g, '⊆')
    .replace(/\\supset\b/g, '⊃')
    .replace(/\\supseteq\b/g, '⊇')
    .replace(/\\cup\b/g, '∪')
    .replace(/\\cap\b/g, '∩')
    .replace(/\\emptyset\b/g, '∅')
    .replace(/\\varnothing\b/g, '∅')
    .replace(/\\neg\b/g, '¬')
    .replace(/\\land\b/g, '∧')
    .replace(/\\lor\b/g, '∨')
    .replace(/\\oplus\b/g, '⊕')
    .replace(/\\otimes\b/g, '⊗')
    .replace(/\\perp\b/g, '⊥')
    .replace(/\\parallel\b/g, '∥')
    .replace(/\\angle\b/g, '∠')
    .replace(/\\circ\b/g, '°')
    .replace(/\\degree\b/g, '°')
    .replace(/\\prime\b/g, '′')
    // Brackets
    .replace(/\\langle\b/g, '⟨')
    .replace(/\\rangle\b/g, '⟩')
    .replace(/\\lfloor\b/g, '⌊')
    .replace(/\\rfloor\b/g, '⌋')
    .replace(/\\lceil\b/g, '⌈')
    .replace(/\\rceil\b/g, '⌉')
    .replace(/\\vert\b/g, '|')
    .replace(/\\mid\b/g, '|')
    .replace(/\\\\\|/g, '‖')
    // Superscripts
    .replace(/\^(\{[^}]+\}|\w)/g, (_m, exp) => {
      const e = exp.startsWith('{') ? exp.slice(1, -1) : exp;
      const superscriptMap: Record<string, string> = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        'n': 'ⁿ', 'i': 'ⁱ', '+': '⁺', '-': '⁻', 'T': 'ᵀ',
        'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
        'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'j': 'ʲ', 'k': 'ᵏ',
        'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ',
        's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ',
        'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
      };
      return e.split('').map((c: string) => superscriptMap[c] || `^${c}`).join('');
    })
    // Subscripts
    .replace(/_(\{[^}]+\}|\w)/g, (_m, sub) => {
      const s = sub.startsWith('{') ? sub.slice(1, -1) : sub;
      const subscriptMap: Record<string, string> = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
        'i': 'ᵢ', 'j': 'ⱼ', 'n': 'ₙ', '+': '₊', '-': '₋',
        'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'h': 'ₕ',
        'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'p': 'ₚ', 's': 'ₛ',
        't': 'ₜ', 'r': 'ᵣ', 'u': 'ᵤ', 'v': 'ᵥ',
      };
      return s.split('').map((c: string) => subscriptMap[c] || `_${c}`).join('');
    })
    // Clean up remaining backslash commands and braces
    .replace(/\\\\/g, ' ')
    .replace(/\\[a-zA-Z]+\*?/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Process inline text and return TextRun children
function processInlineText(
  text: string,
  bold = false,
  italic = false,
): (TextRun | ExternalHyperlink)[] {
  const runs: (TextRun | ExternalHyperlink)[] = [];

  // Process display math blocks \[...\] first
  let processed = text.replace(/\\\[([\s\S]*?)\\\]/g, (_m, latex) => simplifyLatex(latex));

  // Process display math blocks $$...$$
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_m, latex) => simplifyLatex(latex));

  // Process inline math ($...$)
  processed = processed.replace(/\$([^$]+)\$/g, (_m, latex) => simplifyLatex(latex));

  // Process inline math \(...\)
  processed = processed.replace(/\\\(([^\)]+)\\\)/g, (_m, latex) => simplifyLatex(latex));

  // Process markdown links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(processed)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      const beforeText = processed.slice(lastIndex, match.index);
      if (beforeText) {
        runs.push(new TextRun({ text: beforeText, bold, italics: italic }));
      }
    }

    // Add the hyperlink
    const linkText = match[1];
    const linkUrl = match[2];
    runs.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: linkText,
            style: 'Hyperlink',
            bold,
            italics: italic,
          }),
        ],
        link: linkUrl,
      }),
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last link
  if (lastIndex < processed.length) {
    const remainingText = processed.slice(lastIndex);
    if (remainingText) {
      runs.push(new TextRun({ text: remainingText, bold, italics: italic }));
    }
  }

  // If no links were found, just add the whole text
  if (runs.length === 0 && processed) {
    runs.push(new TextRun({ text: processed, bold, italics: italic }));
  }

  return runs;
}

// Flatten inline tokens to TextRun children
function flattenInlineTokens(
  tokens: any[] | undefined,
  bold = false,
  italic = false,
): (TextRun | ExternalHyperlink)[] {
  if (!tokens || !Array.isArray(tokens)) return [];
  const runs: (TextRun | ExternalHyperlink)[] = [];

  for (const t of tokens) {
    switch (t.type) {
      case 'text': {
        const txt = String(t.text ?? t.raw ?? '').replace(/\r?\n/g, ' ');
        if (txt) runs.push(...processInlineText(txt, bold, italic));
        break;
      }
      case 'strong': {
        const inner = t.tokens ?? [{ type: 'text', text: t.text }];
        runs.push(...flattenInlineTokens(inner, true, italic));
        break;
      }
      case 'em': {
        const inner = t.tokens ?? [{ type: 'text', text: t.text }];
        runs.push(...flattenInlineTokens(inner, bold, true));
        break;
      }
      case 'codespan': {
        const txt = String(t.text ?? '');
        if (txt) {
          runs.push(
            new TextRun({
              text: txt,
              font: 'Consolas',
              size: 20, // 10pt
              shading: { type: ShadingType.CLEAR, fill: 'F0F0F0' },
            }),
          );
        }
        break;
      }
      case 'link': {
        const linkText = String(t.text ?? t.href ?? t.raw ?? '');
        const href = String(t.href ?? '');
        if (linkText && href) {
          runs.push(
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: linkText,
                  style: 'Hyperlink',
                  bold,
                  italics: italic,
                }),
              ],
              link: href,
            }),
          );
        }
        break;
      }
      case 'escape': {
        const txt = String(t.text ?? '').trim() || String(t.raw ?? '').replace(/^\\/, '');
        if (txt) runs.push(new TextRun({ text: txt, bold, italics: italic }));
        break;
      }
      case 'space':
      case 'br': {
        runs.push(new TextRun({ text: ' ', bold, italics: italic }));
        break;
      }
      case 'paragraph': {
        // Recursively process paragraph's inner tokens
        const inner = t.tokens ?? [{ type: 'text', text: t.text }];
        runs.push(...flattenInlineTokens(inner, bold, italic));
        break;
      }
      case 'list_item': {
        // Handle list item tokens
        const inner = t.tokens ?? [{ type: 'text', text: t.text }];
        runs.push(...flattenInlineTokens(inner, bold, italic));
        break;
      }
      default: {
        const txt = String(t.text ?? t.raw ?? '').replace(/\r?\n/g, ' ');
        if (txt) runs.push(...processInlineText(txt, bold, italic));
        break;
      }
    }
  }

  return runs;
}

export async function POST(req: NextRequest) {
  try {
    const body = parseDocxExportBody(await req.json());
    if (!body) {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    const title = body.title ?? 'Scira AI';
    const rawContent = body.content;
    const meta = body.meta ?? {};

    // Preprocess markdown
    const content = preprocessMarkdown(rawContent);

    // Track citations for references section
    const citationIndex = new Map<string, number>();
    const citationText = new Map<string, string>();

    // Parse markdown into tokens
    const tokens: any[] = Lexer.lex(content);
    const children: (Paragraph | Table)[] = [];

    // Add title
    children.push(
      new Paragraph({
        children: [new TextRun({ text: title, bold: true, size: 32 })], // 16pt
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 },
      }),
    );

    // Add metadata
    const metaLines: string[] = [];
    if (meta.modelLabel) metaLines.push(`Model: ${meta.modelLabel}`);
    if (meta.createdAt) metaLines.push(`Date: ${new Date(meta.createdAt).toLocaleString()}`);

    if (metaLines.length) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: metaLines.join(' • '), color: '666666', size: 20 })], // 10pt
          spacing: { after: 400 },
        }),
      );
    }

    // Add separator line
    children.push(
      new Paragraph({
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
        },
        spacing: { after: 400 },
      }),
    );

    // Process markdown tokens
    for (const tk of tokens) {
      switch (tk.type) {
        case 'heading': {
          const depth = tk.depth ?? tk.level ?? 1;
          const headingLevels: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
            1: HeadingLevel.HEADING_1,
            2: HeadingLevel.HEADING_2,
            3: HeadingLevel.HEADING_3,
            4: HeadingLevel.HEADING_4,
            5: HeadingLevel.HEADING_5,
            6: HeadingLevel.HEADING_6,
          };
          const level = headingLevels[Math.max(1, Math.min(6, depth))] || HeadingLevel.HEADING_1;

          const inlineRuns = tk.tokens
            ? flattenInlineTokens(tk.tokens, true)
            : [new TextRun({ text: tk.text || '', bold: true })];

          children.push(
            new Paragraph({
              children: inlineRuns,
              heading: level,
              spacing: { before: 240, after: 120 },
            }),
          );
          break;
        }

        case 'paragraph': {
          const inlineRuns = tk.tokens
            ? flattenInlineTokens(tk.tokens)
            : processInlineText(tk.text || '');

          // Extract links for citations
          if (tk.tokens) {
            for (const t of tk.tokens) {
              if (t.type === 'link' && t.href) {
                let num = citationIndex.get(t.href);
                if (num == null) {
                  num = citationIndex.size + 1;
                  citationIndex.set(t.href, num);
                }
                if (t.text) citationText.set(t.href, t.text);
              }
            }
          }

          children.push(
            new Paragraph({
              children: inlineRuns,
              spacing: { after: 200 },
            }),
          );
          break;
        }

        case 'blockquote': {
          const text = tk.text || '';
          children.push(
            new Paragraph({
              children: [new TextRun({ text, italics: true, color: '666666' })],
              indent: { left: convertInchesToTwip(0.5) },
              border: {
                left: { style: BorderStyle.SINGLE, size: 24, color: 'CCCCCC' },
              },
              spacing: { after: 200 },
            }),
          );
          break;
        }

        case 'code': {
          const codeText = String(tk.text || '');
          const codeLines = codeText.split('\n');

          for (const line of codeLines) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: line || ' ',
                    font: 'Consolas',
                    size: 18, // 9pt
                  }),
                ],
                shading: { type: ShadingType.CLEAR, fill: 'F5F5F5' },
                indent: { left: convertInchesToTwip(0.25), right: convertInchesToTwip(0.25) },
                spacing: { before: line === codeLines[0] ? 100 : 0, after: line === codeLines[codeLines.length - 1] ? 100 : 0 },
              }),
            );
          }

          children.push(new Paragraph({ spacing: { after: 200 } }));
          break;
        }

        case 'list': {
          const isOrdered = tk.ordered;
          let counter = tk.start || 1;

          for (const item of tk.items || []) {
            const bulletText = isOrdered ? `${counter}.` : '•';
            
            // Get inline runs from the list item
            let inlineRuns: (TextRun | ExternalHyperlink)[] = [];
            
            if (item.tokens && item.tokens.length > 0) {
              // Process each token in the item
              for (const itemToken of item.tokens) {
                if (itemToken.type === 'text') {
                  // Parse the text for inline markdown
                  const inlineTokens = Lexer.lexInline(itemToken.text || '');
                  inlineRuns.push(...flattenInlineTokens(inlineTokens));
                } else if (itemToken.type === 'paragraph' && itemToken.tokens) {
                  inlineRuns.push(...flattenInlineTokens(itemToken.tokens));
                } else if (itemToken.tokens) {
                  inlineRuns.push(...flattenInlineTokens(itemToken.tokens));
                } else {
                  inlineRuns.push(...flattenInlineTokens([itemToken]));
                }
              }
            } else if (item.text) {
              // Fallback: parse the raw text for inline markdown
              const inlineTokens = Lexer.lexInline(item.text);
              inlineRuns.push(...flattenInlineTokens(inlineTokens));
            }

            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${bulletText} ` }),
                  ...inlineRuns,
                ],
                indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
                spacing: { after: 80 },
              }),
            );

            if (isOrdered) counter++;
          }

          children.push(new Paragraph({ spacing: { after: 120 } }));
          break;
        }

        case 'table': {
          const headers = Array.isArray(tk.header) ? tk.header : [];
          const rows = Array.isArray(tk.rows) ? tk.rows : [];
          const nCols = Math.max(headers.length, rows[0]?.length || 0);

          if (nCols === 0) break;

          const colWidth = Math.floor(9360 / nCols); // US Letter content width in DXA
          const columnWidths = Array(nCols).fill(colWidth);

          const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
          const borders = { top: border, bottom: border, left: border, right: border };

          const tableRows: TableRow[] = [];

          // Header row
          if (headers.length) {
            tableRows.push(
              new TableRow({
                children: headers.map((cell: any, i: number) => {
                  const cellText = typeof cell === 'string' ? cell : String(cell?.text ?? cell?.raw ?? '');
                  return new TableCell({
                    borders,
                    width: { size: columnWidths[i], type: WidthType.DXA },
                    shading: { fill: 'E8E8F0', type: ShadingType.CLEAR },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: cellText, bold: true })],
                      }),
                    ],
                  });
                }),
              }),
            );
          }

          // Body rows
          for (const row of rows) {
            tableRows.push(
              new TableRow({
                children: (row as any[]).map((cell: any, i: number) => {
                  const cellTokens = cell?.tokens;
                  const inlineRuns = cellTokens
                    ? flattenInlineTokens(cellTokens)
                    : processInlineText(typeof cell === 'string' ? cell : String(cell?.text ?? cell?.raw ?? ''));

                  return new TableCell({
                    borders,
                    width: { size: columnWidths[i], type: WidthType.DXA },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [new Paragraph({ children: inlineRuns })],
                  });
                }),
              }),
            );
          }

          children.push(
            new Table({
              width: { size: 9360, type: WidthType.DXA },
              columnWidths,
              rows: tableRows,
            }),
          );

          children.push(new Paragraph({ spacing: { after: 300 } }));
          break;
        }

        case 'hr': {
          children.push(
            new Paragraph({
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999' },
              },
              spacing: { before: 200, after: 200 },
            }),
          );
          break;
        }

        default: {
          if (tk.type === 'text' && tk.text) {
            children.push(
              new Paragraph({
                children: processInlineText(tk.text),
                spacing: { after: 200 },
              }),
            );
          }
          break;
        }
      }
    }

    // Add References section
    const citations = Array.from(citationText.entries());
    if (citations.length > 0) {
      children.push(new Paragraph({ spacing: { after: 400 } }));

      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'References', bold: true, size: 28 })], // 14pt
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        }),
      );

      const refs = citations
        .map(([href, label]) => ({ href, label, num: citationIndex.get(href) || Infinity }))
        .filter((r) => r.num !== Infinity)
        .sort((a, b) => a.num - b.num);

      for (const { href, label, num } of refs) {
        let hostname = '';
        try {
          hostname = new URL(String(href)).hostname;
        } catch {
          hostname = String(href).replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
        }

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `[${num}] `, size: 20 }),
              new ExternalHyperlink({
                children: [new TextRun({ text: label, style: 'Hyperlink', size: 20 })],
                link: href,
              }),
              new TextRun({ text: ` (${hostname})`, color: '666666', size: 18 }),
            ],
            spacing: { after: 80 },
          }),
        );
      }
    }

    // Define styles
    const styles: IStylesOptions = {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 24, // 12pt
          },
        },
        heading1: {
          run: {
            font: 'Arial',
            size: 32, // 16pt
            bold: true,
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
          },
        },
        heading2: {
          run: {
            font: 'Arial',
            size: 28, // 14pt
            bold: true,
          },
          paragraph: {
            spacing: { before: 200, after: 100 },
          },
        },
        heading3: {
          run: {
            font: 'Arial',
            size: 26, // 13pt
            bold: true,
          },
          paragraph: {
            spacing: { before: 160, after: 80 },
          },
        },
      },
      characterStyles: [
        {
          id: 'Hyperlink',
          name: 'Hyperlink',
          basedOn: 'DefaultParagraphFont',
          run: {
            color: '2563EB',
            underline: { type: 'single' },
          },
        },
      ],
    };

    // Create document
    const doc = new Document({
      styles,
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 12240, // 8.5 inches in DXA
                height: 15840, // 11 inches in DXA
              },
              margin: {
                top: 1440, // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children,
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Convert Buffer to ArrayBuffer for Response compatibility
    const arrayBuffer = new ArrayBuffer(buffer.byteLength);
    const view = new Uint8Array(arrayBuffer);
    view.set(new Uint8Array(buffer));

    const filename = 'scira-export.docx';
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    });
  } catch (e: any) {
    console.error('DOCX export error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to generate DOCX' }, { status: 500 });
  }
}
