import { db } from '@/lib/db';
import { userFile, fileChunk } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateText } from 'ai';
import { scx, doEmbed } from '@/ai/providers';
import { parsePDF } from './pdf-parser';

const CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200;
const BATCH_SIZE = 20;

/**
 * RAG Processor - Handles file processing for semantic search
 * Uses SCX E5-Mistral-7B-Instruct for embeddings and Llama-4 for image OCR
 */
export class RAGProcessor {
  /**
   * Process a file for RAG (Pro feature)
   */
  async processFile(fileId: string): Promise<void> {
    console.log(`[RAG] Starting processing for file ${fileId}`);

    try {
      const files = await db.select().from(userFile).where(eq(userFile.id, fileId));

      if (!files || files.length === 0) {
        throw new Error('File not found');
      }

      const file = files[0];

      await db.update(userFile).set({ ragStatus: 'processing' }).where(eq(userFile.id, fileId));

      let text = '';
      if (file.fileType.includes('pdf')) {
        text = await this.extractPDFText(file.fileUrl);
      } else if (file.fileType.includes('image')) {
        text = await this.extractImageText(file.fileUrl);
      } else if (file.fileType.includes('text')) {
        text = await this.extractTextFile(file.fileUrl);
      } else {
        throw new Error(`Unsupported file type: ${file.fileType}`);
      }

      if (!text || text.trim().length === 0) {
        throw new Error('No text content extracted from file');
      }

      console.log(`[RAG] Extracted ${text.length} characters from file`);

      await db
        .update(userFile)
        .set({ extractedText: text, extractedTextLength: text.length })
        .where(eq(userFile.id, fileId));

      const chunks = this.createChunks(text);
      console.log(`[RAG] Created ${chunks.length} chunks`);

      const embeddings = await this.generateEmbeddings(chunks);

      await this.storeChunks(fileId, file.userId, chunks, embeddings);

      await db
        .update(userFile)
        .set({ ragStatus: 'completed', ragProcessedAt: new Date(), chunkCount: chunks.length })
        .where(eq(userFile.id, fileId));

      console.log(`[RAG] Successfully processed file ${fileId}`);
    } catch (error) {
      console.error(`[RAG] Error processing file ${fileId}:`, error);

      await db
        .update(userFile)
        .set({
          ragStatus: 'failed',
          ragError: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(userFile.id, fileId));

      throw error;
    }
  }

  private async extractPDFText(fileUrl: string): Promise<string> {
    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const pdfResult = await parsePDF(buffer);
    if (pdfResult?.text) {
      return pdfResult.text;
    }

    // Fall back to vision OCR if no text extracted
    return await this.extractImageText(fileUrl);
  }

  /**
   * Extract text from image using Llama-4 vision model via SCX
   */
  private async extractImageText(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = await response.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');

      console.log(`[RAG] Extracting text from image using Llama-4 vision model`);

      const { text } = await generateText({
        model: scx.languageModel('llama-4'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this image. Return only the extracted text without any additional comments or descriptions. If there is no text, return "No text found".',
              },
              {
                type: 'image',
                image: base64Image,
                mimeType: contentType as any,
              },
            ],
          },
        ],
        maxTokens: 2000,
      });

      return text || 'No text found';
    } catch (error) {
      console.error('[RAG] Image OCR error:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  private async extractTextFile(fileUrl: string): Promise<string> {
    const response = await fetch(fileUrl);
    return await response.text();
  }

  /**
   * Create text chunks with overlap (sentence-based)
   */
  private createChunks(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = '';
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.length;

      if (currentLength + sentenceLength > CHUNK_SIZE && currentChunk) {
        chunks.push(currentChunk.trim());
        const overlap = currentChunk.slice(-CHUNK_OVERLAP);
        currentChunk = overlap + sentence;
        currentLength = overlap.length + sentenceLength;
      } else {
        currentChunk += sentence;
        currentLength += sentenceLength;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Generate embeddings using SCX E5-Mistral-7B-Instruct
   */
  private async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      try {
        const result = await doEmbed({ values: batch });
        embeddings.push(...result.embeddings);
        console.log(`[RAG] Generated ${result.embeddings.length} embeddings (batch ${Math.floor(i / BATCH_SIZE) + 1})`);
      } catch (error) {
        console.error('[RAG] Embedding generation error:', error);
        throw error;
      }

      if (i + BATCH_SIZE < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return embeddings;
  }

  /**
   * Store chunks with embeddings in database
   */
  private async storeChunks(fileId: string, userId: string, chunks: string[], embeddings: number[][]): Promise<void> {
    const chunkRecords = chunks
      .map((content, index) => ({
        fileId,
        userId,
        chunkIndex: index,
        content,
        contentLength: content.length,
        embedding: embeddings[index]?.length > 0 ? embeddings[index] : null,
        metadata: {
          startChar: index * (CHUNK_SIZE - CHUNK_OVERLAP),
          endChar: Math.min(index * (CHUNK_SIZE - CHUNK_OVERLAP) + CHUNK_SIZE, content.length),
        },
      }))
      .filter((record) => record.embedding !== null || record.content.trim().length > 0);

    if (chunkRecords.length === 0) {
      console.warn('[RAG] No valid chunks to store');
      return;
    }

    const batchSize = 50;
    for (let i = 0; i < chunkRecords.length; i += batchSize) {
      const batch = chunkRecords.slice(i, i + batchSize);
      try {
        await db.insert(fileChunk).values(batch);
        console.log(`[RAG] Stored batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunkRecords.length / batchSize)}`);
      } catch (error) {
        console.error(`[RAG] Error storing batch:`, error);
        throw error;
      }
    }

    console.log(`[RAG] Successfully stored ${chunkRecords.length} chunks`);
  }

  async deleteFileChunks(fileId: string): Promise<void> {
    await db.delete(fileChunk).where(eq(fileChunk.fileId, fileId));
    console.log(`[RAG] Deleted chunks for file ${fileId}`);
  }
}

let _ragProcessor: RAGProcessor | null = null;

export function getRagProcessor(): RAGProcessor {
  if (!_ragProcessor) {
    _ragProcessor = new RAGProcessor();
  }
  return _ragProcessor;
}

export const ragProcessor = {
  processFile: async (fileId: string) => getRagProcessor().processFile(fileId),
  deleteFileChunks: async (fileId: string) => getRagProcessor().deleteFileChunks(fileId),
};
