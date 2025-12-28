import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import Parallel from 'parallel-web';
import { Supadata } from '@supadata/js';

// Content type enum for different sources
const ContentType = z.enum(['general', 'twitter', 'youtube', 'tiktok', 'instagram']);

// Supadata transcript response types
interface TranscriptSegment {
  text?: string;
  content?: string;
  offset?: number;
  duration?: number;
  start?: number;
  end?: number;
}

interface TranscriptJobResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  content?: string;
  text?: string;
  segments?: TranscriptSegment[];
  error?: string;
}

interface TranscriptDirectResult {
  text?: string;
  content?: string;
  segments?: TranscriptSegment[];
}

interface TranscriptJobResponse {
  jobId: string;
}

// Helper function to detect platform from URL
function detectPlatform(url: string): 'twitter' | 'youtube' | 'tiktok' | 'instagram' | 'general' {
  const urlLower = url.toLowerCase();

  // Twitter/X detection
  if (urlLower.includes('twitter.com/') || urlLower.includes('x.com/')) {
    if (urlLower.includes('/status/')) {
      return 'twitter';
    }
  }

  // YouTube detection
  if (
    urlLower.includes('youtube.com/watch') ||
    urlLower.includes('youtu.be/') ||
    urlLower.includes('youtube.com/embed/') ||
    urlLower.includes('youtube.com/shorts/') ||
    urlLower.includes('youtube.com/live/')
  ) {
    return 'youtube';
  }

  // TikTok detection
  if (
    urlLower.includes('tiktok.com/@') ||
    urlLower.includes('vm.tiktok.com/') ||
    urlLower.includes('m.tiktok.com/v/')
  ) {
    return 'tiktok';
  }

  // Instagram detection
  if (
    urlLower.includes('instagram.com/reel/') ||
    urlLower.includes('instagram.com/p/') ||
    urlLower.includes('instagram.com/tv/')
  ) {
    return 'instagram';
  }

  return 'general';
}

// Supadata metadata types
interface SupadataAuthor {
  username: string;
  displayName: string;
  avatarUrl: string;
  verified: boolean;
}

interface SupadataStats {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
}

interface SupadataMedia {
  type?: string;
  duration?: number;
  thumbnailUrl?: string;
  url?: string;
}

interface SupadataMetadata {
  platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter';
  type: 'video' | 'image' | 'carousel' | 'post';
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  author: SupadataAuthor;
  stats: SupadataStats;
  media: SupadataMedia;
  tags: string[];
  createdAt: string;
  additionalData?: Record<string, unknown>;
}

// Derive a human-friendly title when Supadata doesn't provide one
function buildSupadataTitle(metadata: SupadataMetadata, transcript: string | null): string {
  const platformName = metadata.platform.charAt(0).toUpperCase() + metadata.platform.slice(1);

  if (metadata.title && metadata.title.trim()) {
    return metadata.title.trim();
  }

  const descriptionSource =
    metadata.description && metadata.description.trim()
      ? metadata.description
      : transcript && transcript.trim()
        ? transcript
        : null;

  if (descriptionSource) {
    const clean = descriptionSource.replace(/\s+/g, ' ').trim();
    const short = clean.length > 140 ? `${clean.slice(0, 137)}…` : clean;
    return `${metadata.author.displayName} on ${platformName}: ${short}`;
  }

  if (metadata.tags && metadata.tags.length > 0) {
    const tagsPreview = metadata.tags.slice(0, 3).join(', ');
    return `${platformName} ${metadata.type} - ${tagsPreview}`;
  }

  return `${platformName} ${metadata.type}`;
}

// Format Supadata response to match our schema
function formatSupadataResponse(metadata: SupadataMetadata, url: string, transcript: string | null, responseTime: number) {
  const title = buildSupadataTitle(metadata, transcript);

  const content = [
    `Title: ${title}`,
    `Author: ${metadata.author.displayName} (@${metadata.author.username})${metadata.author.verified ? ' ✓' : ''}`,
    `Platform: ${metadata.platform.charAt(0).toUpperCase() + metadata.platform.slice(1)}`,
    `Type: ${metadata.type}`,
    metadata.description ? `\nDescription: ${metadata.description}` : '',
    `\nStats:`,
    metadata.stats.views !== null ? `- Views: ${metadata.stats.views.toLocaleString()}` : '',
    metadata.stats.likes !== null ? `- Likes: ${metadata.stats.likes.toLocaleString()}` : '',
    metadata.stats.comments !== null ? `- Comments: ${metadata.stats.comments.toLocaleString()}` : '',
    metadata.stats.shares !== null ? `- Shares: ${metadata.stats.shares.toLocaleString()}` : '',
    metadata.tags.length > 0 ? `\nTags: ${metadata.tags.join(', ')}` : '',
    `\nPublished: ${new Date(metadata.createdAt).toLocaleDateString()}`,
    metadata.media.duration ? `\nDuration: ${metadata.media.duration} seconds` : '',
    transcript ? `\n\nTranscript:\n${transcript}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    base_url: url,
    results: [
      {
        url: url,
        content,
        title,
        description:
          metadata.description ||
          `${metadata.type} from ${metadata.author.displayName} on ${metadata.platform}`,
        author: metadata.author.displayName,
        publishedDate: metadata.createdAt,
        image: metadata.media.thumbnailUrl || metadata.author.avatarUrl,
        favicon: metadata.author.avatarUrl,
        language: 'en',
        metadata: {
          platform: metadata.platform,
          type: metadata.type,
          stats: metadata.stats,
          verified: metadata.author.verified,
          tags: metadata.tags,
          additionalData: metadata.additionalData,
          hasTranscript: !!transcript,
        },
      },
    ],
    response_time: responseTime,
    source: 'supadata',
  };
}


const supadata = new Supadata({ apiKey: serverEnv.SUPADATA_API_KEY });
const exa = new Exa(serverEnv.EXA_API_KEY as string);
const parallel = new Parallel({ apiKey: serverEnv.PARALLEL_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: serverEnv.FIRECRAWL_API_KEY });

// Helper function to retrieve content from a single URL
async function retrieveSingleUrl(
  url: string,
  content_type?: 'general' | 'twitter' | 'youtube' | 'tiktok' | 'instagram',
  include_summary: boolean = true,
  live_crawl: 'never' | 'auto' | 'preferred' = 'preferred'
): Promise<{
  url: string;
  result: any;
  error?: string;
  source: string;
  response_time: number;
}> {
  const start = Date.now();

  try {
    // Auto-detect content type if not specified
    const detectedType = content_type || detectPlatform(url);

    // Use Supadata for social media content
    if (detectedType !== 'general') {
      console.log(`Detected ${detectedType} content, using Supadata API for ${url}`);
      try {
        // Fetch metadata
        const metadata = await supadata.metadata({ url });
        console.log(`Successfully retrieved ${detectedType} metadata`);

        // Always fetch transcript for all social media content
        let transcript: string | null = null;
        try {
          console.log(`Fetching transcript for ${detectedType} content...`);
          const transcriptResult = await supadata.transcript({ url, mode: 'auto' });

          console.log('Transcript result type:', typeof transcriptResult, Array.isArray(transcriptResult) ? 'array' : 'object');
          console.log('Transcript result keys:', transcriptResult && typeof transcriptResult === 'object' ? Object.keys(transcriptResult) : 'N/A');

          // Handle if result is directly an array of segments
          if (Array.isArray(transcriptResult)) {
            transcript = transcriptResult
              .map((seg): string => {
                if (typeof seg === 'string') {
                  return seg;
                }
                if (typeof seg === 'object' && seg !== null) {
                  const segment = seg as TranscriptSegment;
                  return segment.text || segment.content || '';
                }
                return '';
              })
              .filter((text): text is string => Boolean(text))
              .join(' ');
          }
          // Check if we got a job ID (for large files) or direct result
          else if (transcriptResult && typeof transcriptResult === 'object' && 'jobId' in transcriptResult) {
            // For large files, poll for job completion
            const jobResponse = transcriptResult as TranscriptJobResponse;
            console.log(`Got job ID: ${jobResponse.jobId}, polling for completion...`);
            const maxAttempts = 30;
            let attempts = 0;

            while (attempts < maxAttempts) {
              const jobResult = await supadata.transcript.getJobStatus(jobResponse.jobId) as TranscriptJobResult;

              if (jobResult.status === 'completed') {
                console.log('Transcript job completed');
                if (jobResult.content) {
                  transcript = jobResult.content;
                } else if (jobResult.text) {
                  transcript = jobResult.text;
                } else if (Array.isArray(jobResult.segments)) {
                  transcript = jobResult.segments
                    .map((seg): string => seg.text || seg.content || '')
                    .filter((text): text is string => Boolean(text))
                    .join(' ');
                }
                break;
              } else if (jobResult.status === 'failed') {
                console.error('Transcript job failed:', jobResult.error);
                break;
              } else {
                console.log(`Job status: ${jobResult.status}, waiting...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
              }
            }

            if (attempts >= maxAttempts) {
              console.warn('Transcript job timed out after 30 attempts');
            }
          } else {
            // Direct result for smaller files or native transcripts
            const directResult = transcriptResult as TranscriptDirectResult | TranscriptSegment[] | Record<string, unknown>;

            if (directResult && typeof directResult === 'object' && 'segments' in directResult) {
              const segments = (directResult as { segments: unknown }).segments;
              if (Array.isArray(segments)) {
                transcript = segments
                  .map((seg): string => {
                    if (typeof seg === 'object' && seg !== null) {
                      return (seg as TranscriptSegment).text || (seg as TranscriptSegment).content || '';
                    }
                    return '';
                  })
                  .filter((text): text is string => Boolean(text))
                  .join(' ');
              }
            } else if (directResult && typeof directResult === 'object' && Array.isArray(directResult)) {
              transcript = (directResult as TranscriptSegment[])
                .map((seg): string => seg.text || seg.content || '')
                .filter((text): text is string => Boolean(text))
                .join(' ');
            } else if (directResult && typeof directResult === 'object' && 'text' in directResult) {
              transcript = (directResult as { text: string }).text;
            } else if (directResult && typeof directResult === 'object' && 'content' in directResult) {
              transcript = (directResult as { content: string }).content;
            } else if (typeof directResult === 'string') {
              transcript = directResult;
            }

            if (transcript) {
              console.log('Extracted transcript preview:', transcript.slice(0, 10));
            } else {
              console.log('No transcript extracted, raw result:', JSON.stringify(directResult).substring(0, 200));
            }
          }

          // Ensure transcript is always a string, not an array or object
          if (transcript) {
            if (Array.isArray(transcript)) {
              console.warn('Transcript is an array, extracting text...');
              transcript = transcript
                .map((seg): string => {
                  if (typeof seg === 'string') return seg;
                  if (typeof seg === 'object' && seg !== null) {
                    return (seg as TranscriptSegment).text || (seg as TranscriptSegment).content || '';
                  }
                  return '';
                })
                .filter((text): text is string => Boolean(text))
                .join(' ');
            } else if (typeof transcript !== 'string') {
              console.warn('Transcript is not a string, converting...');
              if (typeof transcript === 'object' && transcript !== null) {
                const transcriptObj = transcript as Record<string, unknown>;
                if ('text' in transcriptObj && typeof transcriptObj.text === 'string') {
                  transcript = transcriptObj.text;
                } else if ('content' in transcriptObj && typeof transcriptObj.content === 'string') {
                  transcript = transcriptObj.content;
                } else if (Array.isArray(transcriptObj.segments)) {
                  transcript = (transcriptObj.segments as TranscriptSegment[])
                    .map((seg): string => seg.text || seg.content || '')
                    .filter((text): text is string => Boolean(text))
                    .join(' ');
                } else {
                  transcript = JSON.stringify(transcript);
                }
              } else {
                transcript = String(transcript);
              }
            }

            console.log(`Transcript fetched successfully (length: ${transcript.length} chars)`);
            console.log('Transcript preview:', transcript.substring(0, 100));
          }
        } catch (transcriptError) {
          console.warn('Failed to fetch transcript:', transcriptError);
          transcript = null;
        }

        const responseTime = (Date.now() - start) / 1000;
        const formatted = formatSupadataResponse(metadata, url, transcript, responseTime);
        return {
          url,
          result: formatted.results[0],
          source: 'supadata',
          response_time: responseTime,
        };
      } catch (supadataError) {
        console.error('Supadata error:', supadataError);
        console.log('Falling back to general scraping methods');
        // Fall through to general scraping if Supadata fails
      }
    }

    // General web scraping with Exa/Parallel/Firecrawl
    console.log(`Retrieving content from ${url} with Exa AI, summary: ${include_summary}, livecrawl: ${live_crawl}`);
    let result;
    let usingParallel = false;
    let usingFirecrawl = false;
    let source = 'exa';

    try {
      result = await exa.getContents([url], {
        text: true,
        summary: include_summary ? true : undefined,
        livecrawl: live_crawl,
      });

      if (!result.results || result.results.length === 0 || !result.results[0].text) {
        console.log('Exa AI returned no content, falling back to Parallel');
        usingParallel = true;
      }
    } catch (exaError) {
      console.error('Exa AI error:', exaError);
      console.log('Falling back to Parallel');
      usingParallel = true;
    }

    if (usingParallel) {
      try {
        console.log(`Trying Parallel extract for ${url}`);
        const parallelResult = await parallel.beta.extract({
          urls: [url],
          excerpts: false,
          full_content: true,
        });

        if (parallelResult.results && parallelResult.results.length > 0) {
          const extractResult = parallelResult.results[0];
          if (extractResult.full_content) {
            console.log(`Parallel successfully extracted ${url}`);
            source = 'parallel';
            return {
              url,
              result: {
                url: url,
                content: extractResult.full_content,
                title: extractResult.title || url.split('/').pop() || 'Retrieved Content',
                description: extractResult.full_content.slice(0, 200) + '...',
                author: undefined,
                publishedDate: extractResult.publish_date || undefined,
                image: undefined,
                favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`,
                language: 'en',
              },
              source,
              response_time: (Date.now() - start) / 1000,
            };
          }
        }

        console.log('Parallel returned no content, falling back to Firecrawl');
        usingFirecrawl = true;
      } catch (parallelError) {
        console.error('Parallel error:', parallelError);
        console.log('Falling back to Firecrawl');
        usingFirecrawl = true;
      }
    }

    if (usingFirecrawl) {
      const urlWithoutHttps = url.replace(/^https?:\/\//, '');
      try {
        const scrapeResponse = await firecrawl.scrape(urlWithoutHttps, {
          parsers: ['pdf'],
          proxy: 'auto',
          storeInCache: true,
        });

        if (!scrapeResponse) {
          throw new Error(`Firecrawl failed: ${scrapeResponse}`);
        }

        console.log(`Firecrawl successfully scraped ${url}`);
        source = 'firecrawl';
        return {
          url,
          result: {
            url: url,
            content: scrapeResponse.markdown || scrapeResponse.html || '',
            title: scrapeResponse.metadata?.title || url.split('/').pop() || 'Retrieved Content',
            description: scrapeResponse.metadata?.description || `Content retrieved from ${url}`,
            author: scrapeResponse.metadata?.author || undefined,
            publishedDate: scrapeResponse.metadata?.publishedDate || undefined,
            image: scrapeResponse.metadata?.image || scrapeResponse.metadata?.ogImage || undefined,
            favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`,
            language: scrapeResponse.metadata?.language || 'en',
          },
          source,
          response_time: (Date.now() - start) / 1000,
        };
      } catch (firecrawlError) {
        console.error('Firecrawl error:', firecrawlError);
        return {
          url,
          result: null,
          error: 'All scraping methods failed to retrieve content',
          source: 'error',
          response_time: (Date.now() - start) / 1000,
        };
      }
    }

    // Return Exa results if successful
    const typedItem = result!.results[0] as any;
    return {
      url,
      result: {
        url: result!.results[0].url,
        content: typedItem.text || typedItem.summary || '',
        title: typedItem.title || result!.results[0].url.split('/').pop() || 'Retrieved Content',
        description: typedItem.summary || `Content retrieved from ${result!.results[0].url}`,
        author: typedItem.author || undefined,
        publishedDate: typedItem.publishedDate || undefined,
        image: typedItem.image || undefined,
        favicon: typedItem.favicon || undefined,
        language: 'en',
      },
      source,
      response_time: (Date.now() - start) / 1000,
    };
  } catch (error) {
    console.error('Error retrieving URL:', error);
    return {
      url,
      result: null,
      error: error instanceof Error ? error.message : 'Failed to retrieve content',
      source: 'error',
      response_time: (Date.now() - start) / 1000,
    };
  }
}


export const retrieveTool = tool({
  description:
    'Extract detailed content from one or multiple specific URLs that the user explicitly provides. ONLY use when user shares/pastes actual URLs. NEVER use for discovery, finding information, or after web_search. Automatically detects and fetches metadata and transcripts for YouTube videos, Twitter/X posts, TikTok videos, and Instagram posts using Supadata. For general URLs, uses Exa AI with Parallel and Firecrawl as fallbacks. Valid: user provides "https://example.com". Invalid: "latest news", "what\'s on website.com", or retrieving web_search results.',
  inputSchema: z.object({
    url: z.array(z.string()).describe('Array of URLs to retrieve information from.'),
    content_type: z.array(ContentType).optional().describe(
      'Array of content types, one per URL. Options: general, twitter, youtube, tiktok, instagram. Auto-detected from URL if not provided. Length must match url array length, or provide single value to apply to all.'
    ),
    include_summary: z.array(z.boolean()).optional().describe('Array of boolean values, one per URL. Default is true for all. Length must match url array length, or provide single value to apply to all. Only applies to general content.'),
    live_crawl: z.array(z.enum(['never', 'auto', 'preferred'])).optional().describe('Array of crawl preferences, one per URL. Options: never, auto, preferred. Default is "preferred" for all. Length must match url array length, or provide single value to apply to all. Only applies to general content.'),
  }),
  execute: async ({
    url,
    content_type,
    include_summary,
    live_crawl,
  }: {
    url: string[];
    content_type?: ('general' | 'twitter' | 'youtube' | 'tiktok' | 'instagram')[];
    include_summary?: boolean[];
    live_crawl?: ('never' | 'auto' | 'preferred')[];
  }) => {
    const startTime = Date.now();

    try {
      const urlCount = url.length;
      
      // Normalize parameters - if array length is 1, apply to all URLs; otherwise must match url length
      const content_types = content_type 
        ? (content_type.length === 1 ? Array(urlCount).fill(content_type[0]) : content_type)
        : Array(urlCount).fill(undefined);
      
      const include_summaries = include_summary
        ? (include_summary.length === 1 ? Array(urlCount).fill(include_summary[0]) : include_summary)
        : Array(urlCount).fill(true);
      
      const live_crawls = live_crawl
        ? (live_crawl.length === 1 ? Array(urlCount).fill(live_crawl[0]) : live_crawl)
        : Array(urlCount).fill('preferred');

      // Process all URLs in parallel with their respective parameters
      const urlPromises = url.map((singleUrl, index) =>
        retrieveSingleUrl(
          singleUrl, 
          content_types[index], 
          include_summaries[index], 
          live_crawls[index]
        )
      );

      const settledResults = await Promise.allSettled(urlPromises);

      // Aggregate results
      const successfulResults: any[] = [];
      const sources: string[] = [];
      const errors: string[] = [];

      settledResults.forEach((settled, index) => {
        if (settled.status === 'fulfilled') {
          const { result, error, source } = settled.value;
          if (result) {
            successfulResults.push(result);
            sources.push(source);
          } else if (error) {
            errors.push(`${url[index]}: ${error}`);
            sources.push('error');
          }
        } else {
          errors.push(`${url[index]}: ${settled.reason}`);
          sources.push('error');
        }
      });

      const totalResponseTime = (Date.now() - startTime) / 1000;

      // If all URLs failed, return error response
      if (successfulResults.length === 0) {
        return {
          urls: url,
          results: [],
          sources,
          response_time: totalResponseTime,
          error: errors.length > 0 ? errors.join('; ') : 'Failed to retrieve any content',
        };
      }

      // Return aggregated results
      return {
        urls: url,
        results: successfulResults,
        sources,
        response_time: totalResponseTime,
        ...(errors.length > 0 && { partial_errors: errors }),
      };
    } catch (error) {
      console.error('Error in retrieveTool:', error);
      return {
        urls: url,
        results: [],
        sources: [],
        response_time: (Date.now() - startTime) / 1000,
        error: error instanceof Error ? error.message : 'Failed to retrieve content',
      };
    }
  },
});

