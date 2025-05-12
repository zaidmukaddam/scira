// extremeSearch(researchPrompt)
// --> Plan research using LLM to generate a structured research plan
// ----> Break research into components with discrete search queries
// ----> For each search query, search web and collect sources
// ----> Use structured source collection to provide comprehensive research results
// ----> Return all collected sources and research data to the user

import Exa from "exa-js";
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
};

const searchWeb = async (query: string, category?: "news" | "company" | "research paper" | "github" | "financial report") => {
    const { results } = await exa.searchAndContents(query, {
        numResults: 5,
        type: "keyword",
        ...(category ? { category: category as "news" | "company" | "research paper" | "github"| "financial report" } : {}),
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

    // Track all sources we've found
    const allSources: SearchResult[] = [];

    dataStream.writeMessageAnnotation({
        status: { title: "Planning research" },
    });

    // plan out the research
    const { object: plan } = await generateObject({
        model: scira.languageModel("scira-grok-3"),
        schema: z.object({
            plan: z.array(z.object({
                title: z.string().min(50).max(100).describe("A title for the research topic"),
                todos: z.array(z.string()).min(5).max(10).describe("A list of what to research for the given title"),
            })),
        }),
        prompt: `
Plan out the research for the following topic: ${prompt}. 

Plan Guidelines:
- Break down the topic into key aspects to research
- Generate specific, diverse search queries for each aspect
- Search for relevant information using the web search tool
- Analyze the results and identify important facts and insights
- Follow up with more specific queries as you learn more
- No need to synthesize your findings into a comprehensive response, just return the results
- The plan should be concise and to the point, no more than 10 items
- Make the plan technical and specific to the topic`,
    });

    console.log(plan.plan);

    dataStream.writeMessageAnnotation({
        status: { title: "Research plan ready, starting up research agent" },
        plan: plan.plan
    });


    // Create the autonomous research agent with tools
    const { text, toolResults } = await generateText({
        model: scira.languageModel("scira-default"),
        maxSteps: 15,
        system: `
You are an autonomous research agent. Your goal is to research the given research plan thoroughly.

Today is ${new Date().toISOString()}.

For searching:
- Make your search queries specific and concise
- Call the tool one time for each todo not all at once
- Vary your queries to explore different perspectives
- The search queries should be concise and to the point, no more than 10 words
- Include exact metrics, dates, or technical terms when relevant
- As you learn from results, make follow-up queries more specific
- Try to be a little technical and specific in your queries
- Carefully follow the plan, do not skip any steps
- Do not use the same query twice to avoid duplicates
- Do not use the same category twice to avoid duplicates
- Use the category if it is relevant to the query

Research Plan:
${JSON.stringify(plan.plan)}
`,
        prompt,
        temperature: 0,
        tools: {
            webSearch: {
                description: 'Search the web for information on a topic',
                parameters: z.object({
                    query: z.string().describe('The search query to achieve the todo'),
                    category: z.enum(["news", "company", "research paper", "github", "financial report"]).optional().describe('The category of the search if relevant'),
                }),
                execute: async ({ query, category }) => {
                    console.log("Web search query:", query);

                    dataStream.writeMessageAnnotation({
                        status: { title: `Searching the web for "${query}"` },
                    });

                    // Add a query annotation to display in the UI
                    // Use a consistent format for query annotations
                    dataStream.writeMessageAnnotation({
                        type: "search_query",
                        query: query,
                    });

                    let results = await searchWeb(query, category);
                    console.log(`Found ${results.length} results for query "${query}"`);

                    // Add these sources to our total collection
                    allSources.push(...results);

                    results.forEach(async (source) => {
                        dataStream.writeMessageAnnotation({
                            type: "source",
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
        },
        providerOptions: {
            google: {
                thinkingConfig: {
                    thinkingBudget: 10000,
                },
            },
        },
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
                    { ...s, content: s.content.slice(0, 50) + "..." },
                ]),
            ).values(),
        ),
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
                    sources: research.sources
                },
            };
        },
    }); 