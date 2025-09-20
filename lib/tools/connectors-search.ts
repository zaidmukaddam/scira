import { tool } from 'ai';
import { z } from 'zod';
import Supermemory from 'supermemory';
import { CONNECTOR_CONFIGS, type ConnectorProvider } from '@/lib/connectors';

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
        execute: async ({ query, provider = 'all' }: { query: string; provider?: ConnectorProvider | 'all' }) => {
            try {
                let allResults: any[] = [];
                let totalCount = 0;

                if (provider === 'all') {
                    // Use selected connectors if available, otherwise search all
                    const providersToSearch = selectedConnectors && selectedConnectors.length > 0 
                        ? selectedConnectors 
                        : Object.keys(CONNECTOR_CONFIGS) as ConnectorProvider[];

                    // Search each provider separately and combine results
                    const searchPromises = providersToSearch.map(async (providerKey) => {
                        try {
                            const config = CONNECTOR_CONFIGS[providerKey];
                            const result = await client.search.documents({
                                q: query,
                                containerTags: [userId, config.syncTag],
                                limit: 15,
                                rerank: true,
                                includeSummary: true,
                            });
                            return result;
                        } catch (error) {
                            console.error(`Error searching ${providerKey}:`, error);
                            return { results: [], total: 0 };
                        }
                    });

                    const searchResults = await Promise.all(searchPromises);
                    
                    // Combine all results
                    allResults = searchResults.flatMap(result => result.results || []);
                    totalCount = searchResults.reduce((sum, result) => sum + (result.total || 0), 0);
                } else {
                    // Search specific provider
                    const config = CONNECTOR_CONFIGS[provider as ConnectorProvider];
                    const result = await client.search.documents({
                        q: query,
                        containerTags: [userId, config.syncTag],
                        limit: 15,
                        rerank: true,
                        includeSummary: true,
                    });
                    allResults = result.results || [];
                    totalCount = result.total || 0;
                }

                // Helper function to generate document URLs based on provider
                const generateDocumentUrl = (document: any, provider: ConnectorProvider | null): string => {
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

                // Add provider information and URLs to results
                const enhancedResults = allResults.map(doc => {
                    // Try to determine provider from metadata or document type
                    let detectedProvider: ConnectorProvider | null = null;

                    if (doc.metadata?.source) {
                        detectedProvider = doc.metadata.source as ConnectorProvider;
                    } else if (doc.metadata?.containerTags) {
                        // Check container tags to determine provider
                        const docTags = Array.isArray(doc.metadata.containerTags) 
                            ? doc.metadata.containerTags 
                            : [doc.metadata.containerTags];
                        
                        for (const [providerKey, config] of Object.entries(CONNECTOR_CONFIGS)) {
                            if (docTags.includes(config.syncTag)) {
                                detectedProvider = providerKey as ConnectorProvider;
                                break;
                            }
                        }
                    } else {
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

                    return {
                        ...doc,
                        provider: detectedProvider,
                        providerConfig: detectedProvider ? CONNECTOR_CONFIGS[detectedProvider] : null,
                        url: documentUrl,
                    };
                });

                return {
                    success: true,
                    results: enhancedResults,
                    count: totalCount,
                    query,
                    provider: provider === 'all' ? 'all connected services' : CONNECTOR_CONFIGS[provider as ConnectorProvider]?.name || provider,
                };
            } catch (error) {
                console.error('Error searching connectors:', error);
                return {
                    success: false,
                    error: 'Failed to search your connected documents',
                    provider: provider === 'all' ? 'all connected services' : CONNECTOR_CONFIGS[provider as ConnectorProvider]?.name || provider,
                };
            }
        },
    });
}