import { xai } from '@ai-sdk/xai';
import { generateObject } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export interface TrendingQuery {
    icon: string;
    text: string;
    category: string;
}

interface RedditPost {
    data: {
        title: string;
    };
}

async function fetchGoogleTrends(): Promise<TrendingQuery[]> {
    const fetchTrends = async (geo: string): Promise<TrendingQuery[]> => {
        try {
            const response = await fetch(`https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo}`, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch from Google Trends RSS for geo: ${geo}`);
            }

            const xmlText = await response.text();
            const items = xmlText.match(/<title>(?!Daily Search Trends)(.*?)<\/title>/g) || [];

            const categories = [
                'trending',
                'community',
                'science',
                'tech',
                'travel',
                'politics',
                'health',
                'sports',
                'finance',
                'football',
            ] as const;

            const schema = z.object({
                category: z.enum(categories),
            });

            const itemsWithCategoryAndIcon = await Promise.all(
                items.map(async (item) => {
                    const { object } = await generateObject({
                        model: xai('grok-beta'),
                        prompt: `Give the category for the topic from the existing values only in lowercase only: ${item.replace(
                            /<\/?title>/g,
                            '',
                        )}

          - if the topic category isn't present in the list, please select 'trending' only!`,
                        schema,
                        temperature: 0,
                    });

                    return {
                        icon: object.category,
                        text: item.replace(/<\/?title>/g, ''),
                        category: object.category,
                    };
                }),
            );

            return itemsWithCategoryAndIcon;
        } catch (error) {
            console.error(`Failed to fetch Google Trends for geo: ${geo}`, error);
            return [];
        }
    };

    const trends = await fetchTrends('US');

    return [...trends];
}

async function fetchRedditQuestions(): Promise<TrendingQuery[]> {
    try {
        const response = await fetch('https://www.reddit.com/r/askreddit/hot.json?limit=100', {
            headers: {
                'User-Agent': 'Scira/1.0',
            },
        });

        const data = await response.json();
        const maxLength = 50;

        return data.data.children
            .map((post: RedditPost) => ({
                icon: 'question',
                text: post.data.title,
                category: 'community',
            }))
            .filter((query: TrendingQuery) => query.text.length <= maxLength)
            .slice(0, 15);
    } catch (error) {
        console.error('Failed to fetch Reddit questions:', error);
        return [];
    }
}

async function fetchFromMultipleSources() {
    const [
        googleTrends,
        // redditQuestions
    ] = await Promise.all([
        fetchGoogleTrends(),
        // fetchRedditQuestions(),
    ]);

    const allQueries = [
        ...googleTrends,
        // ...redditQuestions
    ];
    return allQueries.sort(() => Math.random() - 0.5);
}

export async function GET(req: Request) {
    try {
        const trends = await fetchFromMultipleSources();

        if (trends.length === 0) {
            // Fallback queries if both sources fail
            console.error('Both sources failed to fetch trends, returning fallback queries');
            return NextResponse.json([
                {
                    icon: 'sparkles',
                    text: 'What causes the Northern Lights?',
                    category: 'science',
                },
                {
                    icon: 'code',
                    text: 'Explain quantum computing',
                    category: 'tech',
                },
                {
                    icon: 'globe',
                    text: 'Most beautiful places in Japan',
                    category: 'travel',
                },
            ]);
        }

        return NextResponse.json(trends);
    } catch (error) {
        console.error('Failed to fetch trends:', error);
        return NextResponse.error();
    }
}
