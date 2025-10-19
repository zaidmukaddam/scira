import { tool } from 'ai';
import { z } from 'zod';
import Supermemory from 'supermemory';
import { CONNECTOR_CONFIGS, type ConnectorProvider, type ConnectorConfig } from '@/lib/connectors';

// Type definitions for Supermemory documents
interface DocumentChunk {
    content: string;
    score?: number;
    metadata?: Record<string, unknown>;
}

interface DocumentMetadata {
    source?: string;
    containerTags?: string | string[];
    userId?: string;
    [key: string]: unknown;
}

interface SupermemoryDocument {
    documentId: string;
    title?: string;
    content?: string;
    summary?: string;
    chunks?: DocumentChunk[];
    score?: number;
    metadata?: DocumentMetadata;
}

interface SupermemorySearchResult {
    results: SupermemoryDocument[];
    total: number;
}

interface EnhancedDocument {
    documentId: string;
    title: string | null;
    content: string | null;
    summary: string | null;
    chunks: Array<{
        content: string;
        score: number;
        isRelevant: boolean;
    }>;
    score: number;
    metadata: Record<string, unknown> | null;
    provider: ConnectorProvider | null;
    providerConfig: ConnectorConfig | null;
    url: string;
    type: string | null;
    createdAt: string;
    updatedAt: string;
}

interface SearchSuccessResponse {
    success: true;
    results: EnhancedDocument[];
    count: number;
    query: string;
    provider: string;
}

interface SearchErrorResponse {
    success: false;
    error: string;
    provider: string;
}

type SearchResponse = SearchSuccessResponse | SearchErrorResponse;

const client = new Supermemory({
    apiKey: process.env.SUPERMEMORY_API_KEY!
});

export function createConnectorsSearchTool(userId: string, selectedConnectors?: ConnectorProvider[]) {
    // Create dynamic provider enum based on selected connectors
    const availableProviders = selectedConnectors && selectedConnectors.length > 0
        ? [...selectedConnectors, 'all']
        : [...Object.keys(CONNECTOR_CONFIGS) as ConnectorProvider[], 'all'];

    return tool({
        description: "Search for documents in the user's connected services (Google Drive, Notion, OneDrive)",
        inputSchema: z.object({
            query: z.string().describe('The search query to find relevant documents'),
            provider: z.enum(availableProviders as [ConnectorProvider | 'all', ...(ConnectorProvider | 'all')[]]).optional().describe('Specific provider to search in, or "all" for all connected services'),
        }),
        execute: async ({ query, provider = 'all' }: { query: string; provider?: ConnectorProvider | 'all' }): Promise<SearchResponse> => {
            console.log('🔍 [ConnectorsSearch] Starting search with params:', { query, provider, userId });
            try {
                let allResults: SupermemoryDocument[] = [];
                let totalCount = 0;

                if (provider === 'all') {
                    console.log('📋 [ConnectorsSearch] Searching all providers');
                    // Use selected connectors if available, otherwise search all
                    const providersToSearch = selectedConnectors && selectedConnectors.length > 0 
                        ? selectedConnectors 
                        : Object.keys(CONNECTOR_CONFIGS) as ConnectorProvider[];

                    console.log('🔌 [ConnectorsSearch] Providers to search:', providersToSearch);

                    // Search each provider separately and combine results
                    const searchPromises = providersToSearch.map(async (providerKey): Promise<SupermemorySearchResult> => {
                        try {
                            const config = CONNECTOR_CONFIGS[providerKey];
                            console.log(`🔎 [ConnectorsSearch] Searching ${providerKey} with tags:`, [userId, config.syncTag]);
                            const result = await client.search.documents({
                                q: query,
                                containerTags: [userId, config.syncTag],
                                limit: 15,
                                rerank: true,
                                includeSummary: true,
                            });
                            console.log(`✅ [ConnectorsSearch] ${providerKey} returned ${result.results?.length || 0} results`);
                            return result as SupermemorySearchResult;
                        } catch (error) {
                            console.error(`❌ [ConnectorsSearch] Error searching ${providerKey}:`, error);
                            return { results: [], total: 0 };
                        }
                    });

                    const searchResults = await Promise.all(searchPromises);
                    
                    // Combine all results
                    allResults = searchResults.flatMap(result => result.results || []);
                    totalCount = searchResults.reduce((sum, result) => sum + (result.total || 0), 0);
                    console.log(`📊 [ConnectorsSearch] Combined results: ${allResults.length} documents, total count: ${totalCount}`);
                } else {
                    console.log(`📋 [ConnectorsSearch] Searching single provider: ${provider}`);
                    // Search specific provider
                    const config = CONNECTOR_CONFIGS[provider as ConnectorProvider];
                    console.log(`🔎 [ConnectorsSearch] Searching ${provider} with tags:`, [userId, config.syncTag]);
                    const result = await client.search.documents({
                        q: query,
                        containerTags: [userId, config.syncTag],
                        limit: 15,
                        rerank: true,
                        includeSummary: true,
                        includeFullDocs: true,
                    }) as SupermemorySearchResult;
                    allResults = result.results || [];
                    totalCount = result.total || 0;
                    console.log(`✅ [ConnectorsSearch] ${provider} returned ${allResults.length} results`);
                }

                // Helper function to generate document URLs based on provider
                const generateDocumentUrl = (document: SupermemoryDocument, provider: ConnectorProvider | null): string => {
                    if (!provider) return '#';
                    
                    const providerLower = provider.toLowerCase();
                    
                    switch (providerLower) {
                        case 'google_drive':
                        case 'google-drive':
                            return `https://drive.google.com/file/d/${document.documentId}/view`;
                        case 'onedrive':
                            return `https://1drv.ms/b/s!${document.documentId}`;
                        case 'notion':
                            // Generate filename with hyphens followed by doc ID (without hyphens in doc ID)
                            const title = document.title || 'untitled';
                            const filenameWithHyphens = title
                                .toLowerCase()
                                .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
                                .replace(/\s+/g, '-') // Replace spaces with hyphens
                                .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
                                .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
                            const docIdWithoutHyphens = document.documentId.replace(/-/g, '');
                            return `https://notion.so/${filenameWithHyphens}-${docIdWithoutHyphens}`;
                        default:
                            return '#';
                    }
                };

                // Helper function to check if a document has meaningful content
                const hasValidContent = (doc: SupermemoryDocument): boolean => {
                    // Check if document has valid chunks with non-empty content
                    if (doc.chunks && Array.isArray(doc.chunks)) {
                        const hasValidChunks = doc.chunks.some((chunk: DocumentChunk) => 
                            chunk.content && 
                            chunk.content.trim() !== '' && 
                            chunk.content !== 'Empty Chunk'
                        );
                        if (hasValidChunks) return true;
                    }
                    
                    // Check if document has valid summary
                    if (doc.summary && doc.summary.trim() !== '' && doc.summary !== 'Empty Chunk') {
                        return true;
                    }
                    
                    // Check if document has valid content
                    if (doc.content && doc.content.trim() !== '' && doc.content !== 'Empty Chunk') {
                        return true;
                    }
                    
                    return false;
                };

                // Filter out documents with empty or invalid content
                console.log(`🔍 [ConnectorsSearch] Filtering results - before: ${allResults.length} documents`);
                const validResults = allResults.filter(hasValidContent);
                console.log(`✨ [ConnectorsSearch] After filtering - valid: ${validResults.length} documents`);

                // Add provider information and URLs to results
                console.log('🔗 [ConnectorsSearch] Enhancing results with provider info and URLs');
                const enhancedResults: EnhancedDocument[] = validResults.map((doc): EnhancedDocument => {
                    // Try to determine provider from metadata or document type
                    let detectedProvider: ConnectorProvider | null = null;

                    if (doc.metadata?.source) {
                        detectedProvider = doc.metadata.source as ConnectorProvider;
                        console.log(`📌 [ConnectorsSearch] Document "${doc.title}" - provider from metadata.source: ${detectedProvider}`);
                    } else if (doc.metadata?.containerTags) {
                        // Check container tags to determine provider
                        const docTags = Array.isArray(doc.metadata.containerTags) 
                            ? doc.metadata.containerTags 
                            : [doc.metadata.containerTags];
                        
                        console.log(`📌 [ConnectorsSearch] Document "${doc.title}" - checking tags:`, docTags);
                        for (const [providerKey, config] of Object.entries(CONNECTOR_CONFIGS)) {
                            if (docTags.includes(config.syncTag)) {
                                detectedProvider = providerKey as ConnectorProvider;
                                console.log(`📌 [ConnectorsSearch] Document "${doc.title}" - provider from tags: ${detectedProvider}`);
                                break;
                            }
                        }
                    } else {
                        console.log(`⚠️ [ConnectorsSearch] Document "${doc.title}" - no metadata source or container tags`);
                        // Fallback: try to detect from document characteristics
                        for (const [providerKey, config] of Object.entries(CONNECTOR_CONFIGS)) {
                            if (doc.metadata?.containerTags?.includes(config.syncTag)) {
                                detectedProvider = providerKey as ConnectorProvider;
                                break;
                            }
                        }
                    }

                    // Generate the document URL based on the provider
                    const documentUrl = generateDocumentUrl(doc, detectedProvider);
                    console.log(`🔗 [ConnectorsSearch] Document "${doc.title}" - generated URL: ${documentUrl}`);

                    // Get timestamps from metadata or use current date as fallback
                    const now = new Date().toISOString();
                    const createdAt = (doc.metadata?.createdAt as string) || now;
                    const updatedAt = (doc.metadata?.updatedAt as string) || now;
                    
                    // Get document type from metadata or infer from title/content
                    const type = (doc.metadata?.type as string) || (doc.metadata?.mimeType as string) || 'document';

                    // Transform chunks to match expected format with isRelevant field
                    const chunks = (doc.chunks || []).map((chunk) => ({
                        content: chunk.content,
                        score: chunk.score || 0,
                        isRelevant: (chunk.score || 0) > 0.5, // Consider chunks with score > 0.5 as relevant
                    }));

                    return {
                        documentId: doc.documentId,
                        title: doc.title || null,
                        content: doc.content || null,
                        summary: doc.summary || null,
                        chunks,
                        score: doc.score || 0,
                        metadata: doc.metadata || null,
                        provider: detectedProvider,
                        providerConfig: detectedProvider ? CONNECTOR_CONFIGS[detectedProvider] : null,
                        url: documentUrl,
                        type,
                        createdAt,
                        updatedAt,
                    };
                });

                // Sort results by score (accuracy) in descending order
                console.log('📊 [ConnectorsSearch] Sorting results by score');
                enhancedResults.sort((a, b) => (b.score || 0) - (a.score || 0));

                console.log('✅ [ConnectorsSearch] Enhanced results:', enhancedResults.map(r => ({
                    title: r.title,
                    provider: r.provider,
                    score: r.score,
                    url: r.url
                })));

                const response: SearchSuccessResponse = {
                    success: true,
                    results: enhancedResults,
                    count: enhancedResults.length,
                    query,
                    provider: provider === 'all' ? 'all connected services' : CONNECTOR_CONFIGS[provider as ConnectorProvider]?.name || provider,
                };
                
                console.log(`🎉 [ConnectorsSearch] Search complete! Returning ${enhancedResults.length} results for query: "${query}"`);
                return response;
            } catch (error) {
                console.error('❌ [ConnectorsSearch] Error searching connectors:', error);
                console.error('❌ [ConnectorsSearch] Error details:', {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    query,
                    provider,
                    userId
                });
                const errorResponse: SearchErrorResponse = {
                    success: false,
                    error: 'Failed to search your connected documents',
                    provider: provider === 'all' ? 'all connected services' : CONNECTOR_CONFIGS[provider as ConnectorProvider]?.name || provider,
                };
                return errorResponse;
            }
        },
    });
}