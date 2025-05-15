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


const daytona = new Daytona({
    apiKey: serverEnv.DAYTONA_API_KEY,
    target: SandboxTargetRegion.US,
});

const runCode = async (code: string) => {
    const sandbox = await daytona.create({
        language: 'python',
        resources: {
            cpu: 4,
            memory: 8,
            disk: 10,
        },
        autoStopInterval: 0
    })

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
    const { results } = await exa.searchAndContents(query, {
        numResults: 5,
        type: "keyword",
        ...(category ? {
            category: category as SearchCategory
        } : {}),
    });
    return results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.text,
        publishedDate: r.publishedDate,
        favicon: r.favicon,
    })) as SearchResult[];
};

const getContents = async (links: string[]) => {
    const result = await exa.getContents(
        links,
        {
            text: {
                maxCharacters: 3000,
                includeHtmlTags: false
            },
            livecrawl: "always",
        },
    )
    return result.results.map(r => ({
        title: r.title,
        url: r.url,
        content: r.text,
        publishedDate: r.publishedDate,
        favicon: r.favicon,
    }));
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


    // Create the autonomous research agent with tools
    const { text, toolResults } = await generateText({
        model: scira.languageModel("scira-default"),
        maxSteps: totalTodos + 2,
        system: `
You are an autonomous deep research analyst. Your goal is to research the given research plan thoroughly with the given tools.

Today is ${new Date().toISOString()}.

For searching:
- Make your search queries specific and concise
- Search queries should be concise and to the point, no more than 10 words
- Call the tool one time for each todo not all at once
- Vary your queries to explore different perspectives
- The search queries should be concise and to the point, no more than 10 words
- Include exact metrics, dates, or technical terms when relevant
- As you learn from results, make follow-up queries more specific
- Try to be a little technical and specific in your queries
- Do not use the same query twice to avoid duplicates
- Do not use the same category twice to avoid duplicates
- Use the category if it is relevant to the query

For code:
- Use the code runner tool to run code for any data analysis or calculations
- There are pre installed libraries in the sandbox like pandas, numpy, scipy, keras, seaborn and matplotlib.
- If the code is related to the research plan, use the code runner tool
- No need save the plot images or run any sort of file operations, just do a plt.show()
- The best charts to plot are line charts.
- the previous code is not in scope or imported, so you will have to reimpement the code and reimport the libraries

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
                    dataStream.writeMessageAnnotation({
                        status: { type: "code", title: title, code: code },
                    });
                    const response = await runCode(code);
                    console.log("Code result:", response);
                    console.log("Charts:", response.artifacts?.charts);
                    
                    // Extract chart data if present, and if so then map and remove the png with chart.png
                    const charts = response.artifacts?.charts?.map(chart => {
                        if (chart.png) {
                            const { png, ...chartWithoutPng } = chart;
                            return chartWithoutPng;
                        }
                        return chart;
                    }) || [];
                    
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

                            // Update results with full content, handling potential null values
                            // if the content is empty, use the original result
                            results = contentsResults.map(content => ({
                                title: content.title || "",
                                url: content.url,
                                content: content.content || results.find(r => r.url === content.url)?.content || "",
                                publishedDate: content.publishedDate || "",
                                favicon: content.favicon || ""
                            })) as SearchResult[];
                        } catch (error) {
                            console.error("Error fetching content:", error);
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
            console.log("Tool results:", step.toolResults);
        }
    });

    dataStream.writeMessageAnnotation({
        status: { title: "Research completed" },
    });

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
        charts: toolResults
            .filter(result => 
                result.toolName === "codeRunner" && 
                typeof result.result === 'object' && 
                result.result !== null &&
                'charts' in result.result
            )
            .flatMap(result => (result.result as any).charts || [])
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
                    charts: research.charts
                },
            };
        },
    }); 