// extremeSearch(researchPrompt)
// --> Plan research using LLM to generate a structured research plan
// ----> Break research into components with discrete search queries
// ----> For each search query, search web and collect sources
// ----> Use structured source collection to provide comprehensive research results
// ----> Return all collected sources and research data to the user

import Exa from 'exa-js';
import { Daytona } from '@daytonaio/sdk';
import { generateObject, generateText, stepCountIs, tool } from 'ai';
import type { UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';
import { scira } from '@/ai/providers';
import { SNAPSHOT_NAME } from '@/lib/constants';
import { ChatMessage } from '../types';
import FirecrawlApp from '@mendable/firecrawl-js';

const pythonLibsAvailable = [
  'pandas',
  'numpy',
  'scipy',
  'keras',
  'seaborn',
  'matplotlib',
  'transformers',
  'scikit-learn',
];

const daytona = new Daytona({
  apiKey: serverEnv.DAYTONA_API_KEY,
  target: 'us',
});

const runCode = async (code: string, installLibs: string[] = []) => {
  const sandbox = await daytona.create({
    snapshot: SNAPSHOT_NAME,
  });

  if (installLibs.length > 0) {
    await sandbox.process.executeCommand(`pip install ${installLibs.join(' ')}`);
  }

  const result = await sandbox.process.codeRun(code);
  sandbox.delete();
  return result;
};

const exa = new Exa(serverEnv.EXA_API_KEY);
const firecrawl = new FirecrawlApp({ apiKey: serverEnv.FIRECRAWL_API_KEY });

type SearchResult = {
  title: string;
  url: string;
  content: string;
  publishedDate: string;
  favicon: string;
};

export type Research = {
  text: string;
  toolResults: any[];
  sources: SearchResult[];
  charts: any[];
};

enum SearchCategory {
  NEWS = 'news',
  COMPANY = 'company',
  RESEARCH_PAPER = 'research paper',
  GITHUB = 'github',
  FINANCIAL_REPORT = 'financial report',
}

const searchWeb = async (query: string, category?: SearchCategory) => {
  console.log(`searchWeb called with query: "${query}", category: ${category}`);
  try {
    const { results } = await exa.searchAndContents(query, {
      numResults: 5,
      type: 'hybrid',
      ...(category
        ? {
          category: category as SearchCategory,
        }
        : {}),
    });
    console.log(`searchWeb received ${results.length} results from Exa API`);

    const mappedResults = results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.text,
      publishedDate: r.publishedDate,
      favicon: r.favicon,
    })) as SearchResult[];

    console.log(`searchWeb returning ${mappedResults.length} results`);
    return mappedResults;
  } catch (error) {
    console.error('Error in searchWeb:', error);
    return [];
  }
};

const getContents = async (links: string[]) => {
  console.log(`getContents called with ${links.length} URLs:`, links);
  const results: SearchResult[] = [];
  const failedUrls: string[] = [];

  // First, try Exa for all URLs
  try {
    const result = await exa.getContents(links, {
      text: {
        maxCharacters: 3000,
        includeHtmlTags: false,
      },
      livecrawl: 'preferred',
    });
    console.log(`getContents received ${result.results.length} results from Exa API`);

    // Process Exa results
    for (const r of result.results) {
      if (r.text && r.text.trim()) {
        results.push({
          title: r.title || r.url.split('/').pop() || 'Retrieved Content',
          url: r.url,
          content: r.text,
          publishedDate: r.publishedDate || '',
          favicon: r.favicon || `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=128`,
        });
      } else {
        // Add URLs with no content to failed list for Firecrawl fallback
        failedUrls.push(r.url);
      }
    }

    // Add any URLs that weren't returned by Exa to the failed list
    const exaUrls = result.results.map(r => r.url);
    const missingUrls = links.filter(url => !exaUrls.includes(url));
    failedUrls.push(...missingUrls);

  } catch (error) {
    console.error('Exa API error:', error);
    console.log('Adding all URLs to Firecrawl fallback list');
    failedUrls.push(...links);
  }

  // Use Firecrawl as fallback for failed URLs
  if (failedUrls.length > 0) {
    console.log(`Using Firecrawl fallback for ${failedUrls.length} URLs:`, failedUrls);
    
    for (const url of failedUrls) {
      try {
        const scrapeResponse = await firecrawl.scrapeUrl(url, {
          formats: ['markdown'],
        });

        if (scrapeResponse.success && scrapeResponse.markdown) {
          console.log(`Firecrawl successfully scraped ${url}`);
          
          results.push({
            title: scrapeResponse.metadata?.title || url.split('/').pop() || 'Retrieved Content',
            url: url,
            content: scrapeResponse.markdown.slice(0, 3000), // Match maxCharacters from Exa
            publishedDate: scrapeResponse.metadata?.publishedDate || '',
            favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`,
          });
        } else {
          console.error(`Firecrawl failed for ${url}:`, scrapeResponse.error);
        }
      } catch (firecrawlError) {
        console.error(`Firecrawl error for ${url}:`, firecrawlError);
      }
    }
  }

  console.log(`getContents returning ${results.length} total results (${results.length - failedUrls.length + (results.filter(r => failedUrls.includes(r.url)).length)} from Exa, ${results.filter(r => failedUrls.includes(r.url)).length} from Firecrawl)`);
  return results;
};

async function extremeSearch(
  prompt: string,
  dataStream: UIMessageStreamWriter<ChatMessage> | undefined,
): Promise<Research> {
  const allSources: SearchResult[] = [];

  if (dataStream) {
    dataStream.write({
      type: 'data-extreme_search',
      data: {
        kind: 'plan',
        status: { title: 'Planning research' },
      },
    });
  }

  // plan out the research
  const { object: plan } = await generateObject({
    model: scira.languageModel('scira-x-fast'),
    schema: z.object({
      plan: z
        .array(
          z.object({
            title: z.string().min(10).max(70).describe('A title for the research topic'),
            todos: z.array(z.string()).min(3).max(5).describe('A list of what to research for the given title'),
          }),
        )
        .min(1)
        .max(5),
    }),
    prompt: `
Plan out the research for the following topic: ${prompt}.

Plan Guidelines:
- Break down the topic into key aspects to research
- Generate specific, diverse search queries for each aspect
- Search for relevant information using the web search tool
- Analyze the results and identify important facts and insights
- The plan is limited to 15 actions, do not exceed this limit!
- Follow up with more specific queries as you learn more
- Add todos for code execution if it is asked for by the user
- No need to synthesize your findings into a comprehensive response, just return the results
- The plan should be concise and to the point, no more than 10 items
- Keep the titles concise and to the point, no more than 70 characters
- Mention any need for visualizations in the plan
- Make the plan technical and specific to the topic`,
  });

  console.log(plan.plan);

  // calculate the total number of todos
  const totalTodos = plan.plan.reduce((acc, curr) => acc + curr.todos.length, 0);
  console.log(`Total todos: ${totalTodos}`);

  if (dataStream) {
    dataStream.write({
      type: 'data-extreme_search',
      data: {
        kind: 'plan',
        status: { title: 'Research plan ready, starting up research agent' },
        plan: plan.plan,
      },
    });
  }

  let toolResults: any[] = [];

  // Create the autonomous research agent with tools
  const { text } = await generateText({
    model: scira.languageModel('scira-x-fast-mini'),
    stopWhen: stepCountIs(totalTodos),
    system: `
You are an autonomous deep research analyst. Your goal is to research the given research plan thoroughly with the given tools.

Today is ${new Date().toISOString()}.

### PRIMARY FOCUS: SEARCH-DRIVEN RESEARCH (95% of your work)
Your main job is to SEARCH extensively and gather comprehensive information. Search should be your go-to approach for almost everything.

For searching:
- PRIORITIZE SEARCH OVER CODE - Search first, search often, search comprehensively
- Do not run all the queries at once, run them one by one, wait for the results before running the next query
- Make 3-5 targeted searches per research topic to get different angles and perspectives
- Search queries should be specific and focused, 5-15 words maximum
- Vary your search approaches: broad overview → specific details → recent developments → expert opinions
- Use different categories strategically: news, research papers, company info, financial reports, github
- Follow up initial searches with more targeted queries based on what you learn
- Cross-reference information by searching for the same topic from different angles
- Search for contradictory information to get balanced perspectives
- Include exact metrics, dates, technical terms, and proper nouns in queries
- Make searches progressively more specific as you gather context
- Search for recent developments, trends, and updates on topics
- Always verify information with multiple searches from different sources

### SEARCH STRATEGY EXAMPLES:
- Topic: "AI model performance" → Search: "GPT-4 benchmark results 2024", "LLM performance comparison studies", "AI model evaluation metrics research"
- Topic: "Company financials" → Search: "Tesla Q3 2024 earnings report", "Tesla revenue growth analysis", "electric vehicle market share 2024"
- Topic: "Technical implementation" → Search: "React Server Components best practices", "Next.js performance optimization techniques", "modern web development patterns"


Only use code when:
- You need to process or analyze data that was found through searches
- Mathematical calculations are required that cannot be found through search
- Creating visualizations of data trends that were discovered through research
- The research plan specifically requests data analysis or calculations

Code guidelines (when absolutely necessary):
- Keep code simple and focused on the specific calculation or analysis needed
- Always end with print() statements for any results
- Prefer data visualization (line charts, bar charts only) when showing trends or any comparisons or other visualizations
- Import required libraries: pandas, numpy, matplotlib, scipy as needed

### RESEARCH WORKFLOW:
1. Start with broad searches to understand the topic landscape
2. Identify key subtopics and drill down with specific searches
3. Look for recent developments and trends through targeted news/research searches
4. Cross-validate information with searches from different categories
5. Use code execution if mathematical analysis is needed on the gathered data or if you need or are asked to visualize the data
6. Continue searching to fill any gaps in understanding

For research:
- Carefully follow the plan, do not skip any steps
- Do not use the same query twice to avoid duplicates
- Plan is limited to ${totalTodos} actions with 2 extra actions in case of errors, do not exceed this limit but use to the fullest to get the most information!

Research Plan:
${JSON.stringify(plan.plan)}
`,
    prompt,
    temperature: 0,
    providerOptions: {
      xai: {
        parallel_function_calling: 'false',
      },
    },
    tools: {
      codeRunner: {
        description: 'Run Python code in a sandbox',
        inputSchema: z.object({
          title: z.string().describe('The title of what you are running the code for'),
          code: z.string().describe('The Python code to run with proper syntax and imports'),
        }),
        execute: async ({ title, code }) => {
          console.log('Running code:', code);
          // check if the code has any imports other than the pythonLibsAvailable
          // and then install the missing libraries
          const imports = code.match(/import\s+([\w\s,]+)/);
          const importLibs = imports ? imports[1].split(',').map((lib: string) => lib.trim()) : [];
          const missingLibs = importLibs.filter((lib: string) => !pythonLibsAvailable.includes(lib));

          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'code',
                codeId: `code-${Date.now()}`,
                title: title,
                code: code,
                status: 'running',
              },
            });
          }
          const response = await runCode(code, missingLibs);

          // Extract chart data if present, and if so then map and remove the png with chart.png
          const charts =
            response.artifacts?.charts?.map((chart) => {
              if (chart.png) {
                const { png, ...chartWithoutPng } = chart;
                return chartWithoutPng;
              }
              return chart;
            }) || [];

          console.log('Charts:', response.artifacts?.charts);

          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'code',
                codeId: `code-${Date.now()}`,
                title: title,
                code: code,
                status: 'completed',
                result: response.result,
                charts: charts,
              },
            });
          }

          return {
            result: response.result,
            charts: charts,
          };
        },
      },
      webSearch: {
        description: 'Search the web for information on a topic',
        inputSchema: z.object({
          query: z.string().describe('The search query to achieve the todo').max(150),
          category: z.nativeEnum(SearchCategory).optional().describe('The category of the search if relevant'),
        }),
        execute: async ({ query, category }, { toolCallId }) => {
          console.log('Web search query:', query);
          console.log('Category:', category);

          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'query',
                queryId: toolCallId,
                query: query,
                status: 'started',
              },
            });
          }
          // Query annotation already sent above
          let results = await searchWeb(query, category);
          console.log(`Found ${results.length} results for query "${query}"`);

          // Add these sources to our total collection
          allSources.push(...results);

          if (dataStream) {
            results.forEach(async (source) => {
              dataStream.write({
                type: 'data-extreme_search',
                data: {
                  kind: 'source',
                  queryId: toolCallId,
                  source: {
                    title: source.title,
                    url: source.url,
                    favicon: source.favicon,
                  },
                },
              });
            });
          }
          // Get full content for the top results
          if (results.length > 0) {
            try {
              if (dataStream) {
                dataStream.write({
                  type: 'data-extreme_search',
                  data: {
                    kind: 'query',
                    queryId: toolCallId,
                    query: query,
                    status: 'reading_content',
                  },
                });
              }

              // Get the URLs from the results
              const urls = results.map((r) => r.url);

              // Get the full content using getContents
              const contentsResults = await getContents(urls);

              // Only update results if we actually got content results
              if (contentsResults && contentsResults.length > 0) {
                // For each content result, add a content annotation
                if (dataStream) {
                  contentsResults.forEach((content) => {
                    dataStream.write({
                      type: 'data-extreme_search',
                      data: {
                        kind: 'content',
                        queryId: toolCallId,
                        content: {
                          title: content.title || '',
                          url: content.url,
                          text: (content.content || '').slice(0, 500) + '...', // Truncate for annotation
                          favicon: content.favicon || '',
                        },
                      },
                    });
                  });
                }
                // Update results with full content, but keep original results as fallback
                results = contentsResults.map((content) => {
                  const originalResult = results.find((r) => r.url === content.url);
                  return {
                    title: content.title || originalResult?.title || '',
                    url: content.url,
                    content: content.content || originalResult?.content || '',
                    publishedDate: content.publishedDate || originalResult?.publishedDate || '',
                    favicon: content.favicon || originalResult?.favicon || '',
                  };
                }) as SearchResult[];
              } else {
                console.log('getContents returned no results, using original search results');
              }
            } catch (error) {
              console.error('Error fetching content:', error);
              console.log('Using original search results due to error');
            }
          }

          // Mark query as completed
          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'query',
                queryId: toolCallId,
                query: query,
                status: 'completed',
              },
            });
          }

          return results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            publishedDate: r.publishedDate,
          }));
        },
      },
    },
    onStepFinish: (step) => {
      console.log('Step finished:', step.finishReason);
      console.log('Step:', step);
      if (step.toolResults) {
        console.log('Tool results:', step.toolResults);
        toolResults.push(...step.toolResults);
      }
    },
  });

  if (dataStream) {
    dataStream.write({
      type: 'data-extreme_search',
      data: {
        kind: 'plan',
        status: { title: 'Research completed' },
      },
    });
  }

  const chartResults = toolResults.filter(
    (result) =>
      result.toolName === 'codeRunner' &&
      typeof result.result === 'object' &&
      result.result !== null &&
      'charts' in result.result,
  );

  console.log('Chart results:', chartResults);

  const charts = chartResults.flatMap((result) => (result.result as any).charts || []);

  console.log('Tool results:', toolResults);
  console.log('Charts:', charts);
  console.log('Source 2:', allSources[2]);

  return {
    text,
    toolResults,
    sources: Array.from(
      new Map(allSources.map((s) => [s.url, { ...s, content: s.content.slice(0, 3000) + '...' }])).values(),
    ),
    charts,
  };
}

export function extremeSearchTool(dataStream: UIMessageStreamWriter<ChatMessage> | undefined) {
  return tool({
    description: 'Use this tool to conduct an extreme search on a given topic.',
    inputSchema: z.object({
      prompt: z
        .string()
        .describe(
          "This should take the user's exact prompt. Extract from the context but do not infer or change in any way.",
        ),
    }),
    execute: async ({ prompt }) => {
      console.log({ prompt });

      const research = await extremeSearch(prompt, dataStream);

      return {
        research: {
          text: research.text,
          toolResults: research.toolResults,
          sources: research.sources,
          charts: research.charts,
        },
      };
    },
  });
};
