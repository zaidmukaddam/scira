import { tool } from 'ai';
import { z } from 'zod';

/**
 * generate_document — produces a richly-formatted Markdown document.
 *
 * The model calls this tool when the user asks for a document, report, essay,
 * or PDF. The frontend renders the markdown and provides a browser Print-to-PDF
 * download so the user gets a proper, searchable PDF with no server overhead.
 */
export const generateDocumentTool = tool({
  description:
    'Generate a well-structured, comprehensive document or report in Markdown format. ' +
    'Use this when the user asks to create, write, or generate a document, report, essay, article, or PDF. ' +
    'The document will be displayed with a Download as PDF button. ' +
    'Always produce rich, detailed content with proper headings, lists, and sections.',
  inputSchema: z.object({
    title: z.string().describe('The document title (e.g. "History of Australia")'),
    description: z
      .string()
      .optional()
      .describe('A one-sentence summary of what the document covers'),
    content: z
      .string()
      .describe(
        'The full document content in Markdown. Use ## for sections, ### for subsections, ' +
          'bullet lists, numbered lists, bold/italic text, and tables where appropriate. ' +
          'Be comprehensive and detailed — aim for 500-2000 words depending on the topic.',
      ),
    documentType: z
      .enum(['report', 'essay', 'article', 'guide', 'summary', 'analysis', 'other'])
      .default('report')
      .describe('The type of document being generated'),
  }),
  execute: async ({
    title,
    description,
    content,
    documentType,
  }: {
    title: string;
    description?: string;
    content: string;
    documentType?: string;
  }) => {
    const wordCount = content.trim().split(/\s+/).length;

    return {
      title,
      description: description ?? '',
      content,
      documentType: documentType ?? 'report',
      wordCount,
      generatedAt: new Date().toISOString(),
    };
  },
});
