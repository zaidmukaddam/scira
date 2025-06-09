// extremeSearch(researchPrompt)
// --> Plan research using LLM to generate a structured research plan
// ----> Break research into components with discrete search queries
// ----> For each search query, search web and collect sources
// ----> Use structured source collection to provide comprehensive research results
// ----> Return all collected sources and research data to the user

import Exa from "exa-js";
import { Daytona, SandboxTargetRegion } from '@daytonaio/sdk';
import { DataStreamWriter, generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { serverEnv } from "@/env/server";
import { scira } from "@/ai/providers";

export const SYSTEM_PROMPT = `You are an expert researcher. Today is ${new Date().toISOString()}. Follow these instructions when responding:
  - You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.
  - The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.
  - Be highly organized.
  - Suggest solutions that I didn't think about.
  - Be proactive and anticipate my needs.
  - Treat me as an expert in all subject matter.
  - Mistakes erode my trust, so be accurate and thorough.
  - Provide detailed explanations, I'm comfortable with lots of detail.
  - Value good arguments over authorities, the source is irrelevant.
  - Consider new technologies and contrarian ideas, not just the conventional wisdom.
  - You may use high levels of speculation or prediction, just flag it for me.
  - You must provide links to sources used. Ideally these are inline e.g. [this documentation](https://documentation.com/this)
  `;

const pythonLibsAvailable = [
    "pandas",
    "numpy",
    "scipy",
    "keras",
    "seaborn",
    "matplotlib",
    "transformers",
    "scikit-learn"
]

const daytona = new Daytona({
    apiKey: serverEnv.DAYTONA_API_KEY,
    target: SandboxTargetRegion.US,
});

const runCode = async (code: string, installLibs: string[] = []) => {
    const sandbox = await daytona.create({
        language: 'python',
        resources: {
            cpu: 2,
            memory: 4,
            disk: 5,
        },
        autoStopInterval: 0
    })

    if (installLibs.length > 0) {
        await sandbox.process.executeCommand(`pip install ${installLibs.join(" ")}`);
    }

    const result = await sandbox.process.codeRun(code, undefined, 0);
    sandbox.delete();
    return result;
}

export const exa = new Exa(serverEnv.EXA_API_KEY);

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
    NEWS = "news",
    COMPANY = "company",
    RESEARCH_PAPER = "research paper",
    GITHUB = "github",
    FINANCIAL_REPORT = "financial report",
}

const searchWeb = async (
    query: string,
    category?: SearchCategory
) => {
    console.log(`searchWeb called with query: "${query}", category: ${category}`);
    try {
        const { results } = await exa.searchAndContents(query, {
            numResults: 5,
            type: "keyword",
            ...(category ? {
                category: category as SearchCategory
            } : {}),
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
        console.error("Error in searchWeb:", error);
        return [];
    }
};

const getContents = async (links: string[]) => {
    console.log(`getContents called with ${links.length} URLs:`, links);
    try {
        const result = await exa.getContents(
            links,
            {
                text: {
                    maxCharacters: 3000,
                    includeHtmlTags: false
                },
                livecrawl: "preferred",
            },
        );
        console.log(`getContents received ${result.results.length} results from Exa API`);
        
        const mappedResults = result.results.map(r => ({
            title: r.title,
            url: r.url,
            content: r.text,
            publishedDate: r.publishedDate,
            favicon: r.favicon,
        }));
        
        console.log(`getContents returning ${mappedResults.length} mapped results`);
        return mappedResults;
    } catch (error) {
        console.error("Error in getContents:", error);
        return [];
    }
}


const extremeSearch = async (
    prompt: string,
    dataStream: DataStreamWriter,
): Promise<Research> => {
    dataStream.writeMessageAnnotation({
        status: { title: "Beginning autonomous research" },
    });

    // add sleep for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Track all sources we've found
    const allSources: SearchResult[] = [];

    dataStream.writeMessageAnnotation({
        status: { title: "Planning research" },
    });

    // plan out the research
    const { object: plan } = await generateObject({
        model: scira.languageModel("scira-grok-3"),
        schema: z.object({
            plan: z.array(
                z.object({
                    title: z.string().min(10).max(70).describe("A title for the research topic"),
                    todos: z.array(z.string()).min(3).max(5).describe("A list of what to research for the given title"),
                })
            ).min(1).max(5),
        }),
        prompt: `
Plan out the research for the following topic: ${prompt}. 

Plan Guidelines:
- Break down the topic into key aspects to research
- Generate specific, diverse search queries for each aspect
- Search for relevant information using the web search tool
- Analyze the results and identify important facts and insights
- The plan is limited to 15 actions, do not exceed this limit
- Follow up with more specific queries as you learn more
- No need to synthesize your findings into a comprehensive response, just return the results
- The plan should be concise and to the point, no more than 10 items
- Keep the titles concise and to the point, no more than 70 characters
- Add todos for code execution if it is relevant to the user's prompt
- Mention any need for visualizations in the plan
- Make the plan technical and specific to the topic`,
    });

    console.log(plan.plan);

    // calculate the total number of todos
    const totalTodos = plan.plan.reduce((acc, curr) => acc + curr.todos.length, 0);
    console.log(`Total todos: ${totalTodos}`);

    dataStream.writeMessageAnnotation({
        status: { title: "Research plan ready, starting up research agent" },
        plan: plan.plan
    });

    let toolResults: any[] = [];

    // Create the autonomous research agent with tools
    const { text } = await generateText({
        model: scira.languageModel("scira-default"),
        maxSteps: totalTodos + 2,
        system: `
You are an autonomous deep research analyst. Your goal is to research the given research plan thoroughly with the given tools.

Today is ${new Date().toISOString()}.

### PRIMARY FOCUS: SEARCH-DRIVEN RESEARCH (95% of your work)
Your main job is to SEARCH extensively and gather comprehensive information. Search should be your go-to approach for almost everything.

For searching:
- PRIORITIZE SEARCH OVER CODE - Search first, search often, search comprehensively
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

### MINIMAL CODE USAGE (5% of your work - USE SPARINGLY):
Only use code when:
- You need to process or analyze data that was found through searches
- Mathematical calculations are required that cannot be found through search
- Creating visualizations of data trends that were discovered through research
- The research plan specifically requests data analysis or calculations

Code guidelines (when absolutely necessary):
- Keep code simple and focused on the specific calculation or analysis needed
- Always end with print() statements for any results
- Prefer data visualization (line charts, bar charts) when showing trends
- Import required libraries: pandas, numpy, matplotlib, scipy as needed

### RESEARCH WORKFLOW:
1. Start with broad searches to understand the topic landscape
2. Identify key subtopics and drill down with specific searches
3. Look for recent developments and trends through targeted news/research searches
4. Cross-validate information with searches from different categories
5. Only use code if mathematical analysis is needed on the gathered data
6. Continue searching to fill any gaps in understanding

For research:
- Carefully follow the plan, do not skip any steps
- Do not use the same query twice to avoid duplicates
- Plan is limited to ${totalTodos} actions with 2 extra actions in case of errors, do not exceed this limit

Research Plan:
${JSON.stringify(plan.plan)}
`,
        prompt,
        temperature: 0,
        tools: {
            codeRunner: {
                description: 'Run Python code in a sandbox',
                parameters: z.object({
                    title: z.string().describe('The title of what you are running the code for'),
                    code: z.string().describe('The Python code to run with proper syntax and imports'),
                }),
                execute: async ({ title, code }) => {
                    console.log("Running code:", code);
                    // check if the code has any imports other than the pythonLibsAvailable
                    // and then install the missing libraries
                    const imports = code.match(/import\s+([\w\s,]+)/);
                    const importLibs = imports ? imports[1].split(',').map((lib: string) => lib.trim()) : [];
                    const missingLibs = importLibs.filter((lib: string) => !pythonLibsAvailable.includes(lib));

                    dataStream.writeMessageAnnotation({
                        status: { type: "code", title: title, code: code },
                    });
                    const response = await runCode(code, missingLibs);

                    // Extract chart data if present, and if so then map and remove the png with chart.png
                    const charts = response.artifacts?.charts?.map(chart => {
                        if (chart.png) {
                            const { png, ...chartWithoutPng } = chart;
                            return chartWithoutPng;
                        }
                        return chart;
                    }) || [];

                    console.log("Charts:", response.artifacts?.charts);

                    dataStream.writeMessageAnnotation({
                        status: {
                            type: "result",
                            title: title,
                            code: code,
                            result: response.result,
                            charts: charts
                        },
                    });

                    return {
                        result: response.result,
                        charts: charts
                    };
                },
            },
            webSearch: {
                description: 'Search the web for information on a topic',
                parameters: z.object({
                    query: z.string().describe('The search query to achieve the todo').max(100),
                    category: z.nativeEnum(SearchCategory).optional().describe('The category of the search if relevant'),
                }),
                execute: async ({ query, category }, { toolCallId }) => {
                    console.log("Web search query:", query);
                    console.log("Category:", category);

                    dataStream.writeMessageAnnotation({
                        status: { title: `Searching the web for "${query}"` },
                    });

                    // Add a query annotation to display in the UI
                    // Use a consistent format for query annotations
                    dataStream.writeMessageAnnotation({
                        type: "search_query",
                        queryId: toolCallId,
                        query: query,
                    });

                    let results = await searchWeb(query, category);
                    console.log(`Found ${results.length} results for query "${query}"`);

                    // Add these sources to our total collection
                    allSources.push(...results);

                    results.forEach(async (source) => {
                        dataStream.writeMessageAnnotation({
                            type: "source",
                            queryId: toolCallId,
                            source: { title: source.title, url: source.url },
                        });
                    });

                    // Get full content for the top results
                    if (results.length > 0) {
                        try {
                            dataStream.writeMessageAnnotation({
                                status: { title: `Reading content from search results for "${query}"` },
                            });

                            // Get the URLs from the results
                            const urls = results.map(r => r.url);

                            // Get the full content using getContents
                            const contentsResults = await getContents(urls);

                            // Only update results if we actually got content results
                            if (contentsResults && contentsResults.length > 0) {
                                // For each content result, add a content annotation
                                contentsResults.forEach((content) => {
                                    dataStream.writeMessageAnnotation({
                                        type: "content",
                                        queryId: toolCallId,
                                        content: {
                                            title: content.title,
                                            url: content.url,
                                            text: content.content.slice(0, 300) + "...", // Truncate for annotation
                                            full: content.content
                                        }
                                    });
                                });

                                // Update results with full content, but keep original results as fallback
                                results = contentsResults.map(content => {
                                    const originalResult = results.find(r => r.url === content.url);
                                    return {
                                        title: content.title || originalResult?.title || "",
                                        url: content.url,
                                        content: content.content || originalResult?.content || "",
                                        publishedDate: content.publishedDate || originalResult?.publishedDate || "",
                                        favicon: content.favicon || originalResult?.favicon || ""
                                    };
                                }) as SearchResult[];
                            } else {
                                console.log("getContents returned no results, using original search results");
                            }
                        } catch (error) {
                            console.error("Error fetching content:", error);
                            console.log("Using original search results due to error");
                        }
                    }

                    return results.map(r => ({
                        title: r.title,
                        url: r.url,
                        content: r.content,
                        publishedDate: r.publishedDate
                    }));
                },
            },
        },
        onStepFinish: (step) => {
            console.log("Step finished:", step.finishReason);
            console.log("Step:", step.stepType);
            if (step.toolResults) {
                console.log("Tool results:", step.toolResults);
                toolResults.push(...step.toolResults);
            }
        },
    });

    dataStream.writeMessageAnnotation({
        status: { title: "Research completed" },
    });

    const chartResults = toolResults.filter(result =>
        result.toolName === "codeRunner" &&
        typeof result.result === 'object' &&
        result.result !== null &&
        'charts' in result.result
    );

    console.log("Chart results:", chartResults);

    const charts = chartResults.flatMap(result => (result.result as any).charts || []);

    console.log("Tool results:", toolResults);
    console.log("Charts:", charts);
    console.log("Sources:", allSources[2]);

    return {
        text,
        toolResults,
        sources: Array.from(
            new Map(
                allSources.map((s) => [
                    s.url,
                    { ...s, content: s.content.slice(0, 3000) + "..." },
                ]),
            ).values(),
        ),
        charts,
    };
};

export const extremeSearchTool = (dataStream: DataStreamWriter) =>
    tool({
        description: "Use this tool to conduct an extreme search on a given topic.",
        parameters: z.object({
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