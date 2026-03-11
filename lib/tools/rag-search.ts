import { tool } from 'ai';
import { z } from 'zod';
import { ragSearchService } from '@/lib/services/rag-search';
import { auth } from '@/lib/auth';

/**
 * RAG Search Tool - Semantic search over user's uploaded documents
 * Pro feature that allows AI to search through PDFs and images
 *
 * This tool automatically extracts file IDs from the conversation context
 * and searches across those documents.
 */
export const ragSearchTool = tool({
  description: `Search through the user's uploaded documents using semantic search. 
Use this when the user asks questions about their uploaded files (PDFs, images with text).
This tool will search through all attached documents in the conversation.
Examples:
- "What does the contract say about payment terms?"
- "Find the section about data privacy in the PDF"
- "Search my documents for information about X"`,
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant information in documents'),
    searchType: z
      .enum(['semantic', 'keyword', 'hybrid'])
      .default('semantic')
      .describe('Type of search: semantic (AI-powered), keyword (exact match), or hybrid (both)'),
    maxResults: z.number().min(1).max(10).default(5).describe('Maximum number of relevant chunks to return'),
  }),
  execute: async (
    {
      query,
      searchType,
      maxResults,
    }: {
      query: string;
      searchType: 'semantic' | 'keyword' | 'hybrid';
      maxResults: number;
    },
    { messages }: { messages: any[] },
  ) => {
    try {
      // Get authenticated user
      const session = await auth.api.getSession({
        headers: new Headers(),
      });

      if (!session?.user?.id) {
        return {
          success: false,
          message: 'Authentication required to search documents',
          context: '',
          citations: [],
        };
      }

      const userId = session.user.id;

      // Extract file IDs from conversation
      const fileIds = extractFileIdsFromMessages(messages);

      if (!fileIds || fileIds.length === 0) {
        return {
          success: false,
          message: 'No documents found in conversation. Please upload a file first.',
          context: '',
          citations: [],
        };
      }

      console.log(`[RAG Search] Searching ${fileIds.length} files for: "${query}"`);

      // Perform search
      const results = await ragSearchService.search({
        query,
        userId,
        maxResults,
        searchType,
        fileIds,
      });

      if (results.chunks.length === 0) {
        return {
          success: false,
          message: 'No relevant information found in the documents.',
          context: '',
          citations: [],
        };
      }

      console.log(`[RAG Search] Found ${results.chunks.length} relevant chunks`);

      return {
        success: true,
        context: results.formattedContext,
        citations: results.citations,
        chunksFound: results.chunks.length,
        filesSearched: fileIds.length,
      };
    } catch (error) {
      console.error('[RAG Search] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        context: '',
        citations: [],
      };
    }
  },
});

/**
 * Extract file IDs from conversation messages
 * Looks for attachments in user messages
 */
function extractFileIdsFromMessages(messages: any[]): string[] {
  const fileIds = new Set<string>();

  for (const message of messages) {
    // Check for experimental_attachments (Vercel AI SDK format)
    if (message.experimental_attachments && Array.isArray(message.experimental_attachments)) {
      for (const attachment of message.experimental_attachments) {
        if (attachment.fileId) {
          fileIds.add(attachment.fileId);
        }
      }
    }

    // Check for attachments in parts (alternative format)
    if (message.parts && Array.isArray(message.parts)) {
      for (const part of message.parts) {
        if (part.type === 'file' && part.fileId) {
          fileIds.add(part.fileId);
        }
      }
    }

    // Check for attachments array
    if (message.attachments && Array.isArray(message.attachments)) {
      for (const attachment of message.attachments) {
        if (attachment.fileId) {
          fileIds.add(attachment.fileId);
        }
      }
    }
  }

  return Array.from(fileIds);
}

/**
 * Helper function to check if RAG search should be auto-triggered
 * Returns true if the message seems to be asking about documents
 */
export function shouldAutoTriggerRAGSearch(message: string): boolean {
  const patterns = [
    /what does (the|this|that) (document|pdf|file|image|contract|report) (say|mention|state)/i,
    /find .* (in|from) (the|this|my) (document|pdf|file|files)/i,
    /search (the|my) (document|pdf|file|files) for/i,
    /according to (the|this) (document|pdf|file)/i,
    /based on (the|this) (document|pdf|file)/i,
    /(summarize|summary of) (the|this) (document|pdf|file)/i,
  ];

  return patterns.some((pattern) => pattern.test(message));
}
