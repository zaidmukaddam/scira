import { db } from '@/lib/db';
import { userFile, fileChunk } from '@/lib/db/schema';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import { scx } from '@/ai/providers';

const EMBEDDING_MODEL = 'text-embedding-3-small';

export interface RAGSearchParams {
  query: string;
  userId: string;
  maxResults?: number;
  searchType?: 'semantic' | 'keyword' | 'hybrid';
  fileIds?: string[]; // Optional: search only specific files
}

export interface RAGSearchResult {
  chunks: Array<{
    id: string;
    content: string;
    fileId: string;
    fileName: string;
    fileUrl: string;
    similarity?: number;
    chunkIndex: number;
  }>;
  formattedContext: string;
  citations: Array<{
    fileName: string;
    fileUrl: string;
    fileId: string;
  }>;
}

/**
 * RAG Search Service - Semantic search over user's documents
 * Pro feature for intelligent document search
 */
export class RAGSearchService {
  /**
   * Search user's documents
   * @param params - Search parameters
   * @returns Search results with chunks and citations
   */
  async search(params: RAGSearchParams): Promise<RAGSearchResult> {
    const { query, userId, maxResults = 5, searchType = 'semantic', fileIds } = params;

    console.log(`[RAG Search] Starting ${searchType} search for user ${userId}`);

    let chunks: any[] = [];

    if (searchType === 'semantic' || searchType === 'hybrid') {
      // Generate query embedding
      const embeddingModel = (scx as any).textEmbeddingModel?.(EMBEDDING_MODEL);
      if (!embeddingModel) throw new Error('Embedding model not available');
      const { embeddings } = await embeddingModel.doEmbed({ values: [query] });

      // Semantic search using cosine similarity
      chunks = await this.semanticSearch(userId, embeddings[0] ?? [], maxResults, fileIds);
    }

    if (searchType === 'keyword' || (searchType === 'hybrid' && chunks.length === 0)) {
      // Fallback to keyword search
      chunks = await this.keywordSearch(userId, query, maxResults, fileIds);
    }

    console.log(`[RAG Search] Found ${chunks.length} relevant chunks`);

    // Format results
    return this.formatResults(chunks);
  }

  /**
   * Semantic search using vector similarity
   */
  private async semanticSearch(
    userId: string,
    queryEmbedding: number[],
    maxResults: number,
    fileIds?: string[],
  ): Promise<any[]> {
    // Build query conditions
    const conditions = [eq(fileChunk.userId, userId)];

    // Filter by specific files if provided
    if (fileIds && fileIds.length > 0) {
      conditions.push(inArray(fileChunk.fileId, fileIds));
    }

    // Build query
    const results = await db
      .select({
        id: fileChunk.id,
        content: fileChunk.content,
        chunkIndex: fileChunk.chunkIndex,
        embedding: fileChunk.embedding,
        fileId: fileChunk.fileId,
        fileName: userFile.originalName,
        fileUrl: userFile.fileUrl,
      })
      .from(fileChunk)
      .innerJoin(userFile, eq(fileChunk.fileId, userFile.id))
      .where(and(...conditions));

    // Calculate cosine similarity in JavaScript
    // NOTE: For production with large datasets (10k+ chunks), consider:
    // 1. Install pgvector extension: CREATE EXTENSION vector;
    // 2. Change embedding column type to vector(1536)
    // 3. Add vector index: CREATE INDEX ON file_chunk USING ivfflat (embedding vector_cosine_ops);
    // 4. Use native vector similarity: ORDER BY embedding <=> query_embedding
    const resultsWithSimilarity = results
      .filter((r) => r.embedding && Array.isArray(r.embedding))
      .map((result) => {
        const similarity = this.cosineSimilarity(queryEmbedding, result.embedding as number[]);
        return { ...result, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);

    return resultsWithSimilarity;
  }

  /**
   * Keyword search using PostgreSQL ILIKE
   */
  private async keywordSearch(userId: string, query: string, maxResults: number, fileIds?: string[]): Promise<any[]> {
    // Build WHERE conditions
    const conditions = [eq(fileChunk.userId, userId), sql`${fileChunk.content} ILIKE ${`%${query}%`}`];

    if (fileIds && fileIds.length > 0) {
      conditions.push(inArray(fileChunk.fileId, fileIds));
    }

    // Keyword search using SQL ILIKE for better performance
    const results = await db
      .select({
        id: fileChunk.id,
        content: fileChunk.content,
        chunkIndex: fileChunk.chunkIndex,
        fileId: fileChunk.fileId,
        fileName: userFile.originalName,
        fileUrl: userFile.fileUrl,
      })
      .from(fileChunk)
      .innerJoin(userFile, eq(fileChunk.fileId, userFile.id))
      .where(and(...conditions))
      .limit(maxResults);

    return results;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Format search results
   */
  private formatResults(chunks: any[]): RAGSearchResult {
    // Group chunks by file
    const fileMap = new Map<string, { fileName: string; fileUrl: string; chunks: any[] }>();

    for (const chunk of chunks) {
      if (!fileMap.has(chunk.fileId)) {
        fileMap.set(chunk.fileId, {
          fileName: chunk.fileName,
          fileUrl: chunk.fileUrl,
          chunks: [],
        });
      }
      fileMap.get(chunk.fileId)!.chunks.push(chunk);
    }

    // Format context
    let formattedContext = '';
    const citations: Array<{ fileName: string; fileUrl: string; fileId: string }> = [];

    for (const [fileId, { fileName, fileUrl, chunks: fileChunks }] of fileMap) {
      formattedContext += `\n\n---\nFrom: ${fileName}\n---\n`;

      // Sort chunks by index for better readability
      const sortedChunks = fileChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

      for (const chunk of sortedChunks) {
        formattedContext += `${chunk.content}\n\n`;
      }

      citations.push({ fileName, fileUrl, fileId });
    }

    return {
      chunks,
      formattedContext,
      citations,
    };
  }

  /**
   * Get file by ID with all chunks
   */
  async getFileWithChunks(
    fileId: string,
    userId: string,
  ): Promise<{
    file: any;
    chunks: any[];
  } | null> {
    const files = await db
      .select()
      .from(userFile)
      .where(and(eq(userFile.id, fileId), eq(userFile.userId, userId)));

    if (files.length === 0) {
      return null;
    }

    const chunks = await db.select().from(fileChunk).where(eq(fileChunk.fileId, fileId)).orderBy(fileChunk.chunkIndex);

    return {
      file: files[0],
      chunks,
    };
  }
}

// Export singleton instance
export const ragSearchService = new RAGSearchService();
