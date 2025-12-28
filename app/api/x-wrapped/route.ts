import { NextRequest, NextResponse } from 'next/server';
import { xai } from '@ai-sdk/xai';
import { generateText, Output, stepCountIs } from 'ai';
import { z } from 'zod';
import { getTweet } from 'react-tweet/api';
import { Redis } from '@upstash/redis';

interface CitationSource {
  sourceType?: string;
  url?: string;
}

interface XWrappedData {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  followersCount?: number;
  verified?: boolean;
  totalPosts: number;
  topTopics: string[];
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  mostActiveMonth: string;
  engagementScore: number;
  writingStyle: string;
  yearSummary: string;
  topPosts: Array<{
    text: string;
    url: string;
    date: string;
  }>;
  // Debug/UX: what we searched for (fixed 16-step plan)
  searchSteps?: Array<{
    step: number;
    title: string;
    query: string;
    purpose: string;
  }>;
}

function extractTweetId(url?: string | null): string | null {
  if (!url) return null;
  return url.match(/\/status\/(\d+)/)?.[1] ?? null;
}

function toMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long' });
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

const redis = Redis.fromEnv();
const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const bodySchema = z.object({
      username: z.string().min(1),
      year: z.number().int().min(2006).max(2100).optional(),
    });

    const parsedBody = bodySchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsedBody.error.flatten() }, { status: 400 });
    }

    const year = parsedBody.data.year ?? 2025;
    const cleanUsername = parsedBody.data.username.replace(/^@+/, '').trim();
    if (!cleanUsername) return NextResponse.json({ error: 'Username is required' }, { status: 400 });

    // Check cache
    const cacheKey = `x-wrapped:${cleanUsername}:${year}`;
    const cached = await redis.get<XWrappedData>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // IMPORTANT: Use the same x_search tool wiring as lib/tools/x-search.ts (lines ~120-122).
    const xSearchToolConfig: Parameters<typeof xai.tools.xSearch>[0] = {
      fromDate: startDate,
      toDate: endDate,
      allowedXHandles: [cleanUsername],
    };

    const searchSteps = [
      {
        step: 1,
        title: 'User profile',
        query: `[x_user_search] Find the user profile for @${cleanUsername} (bio, name, avatar, location, exactfollowers count, verified status, pinned post if available)`,
        purpose: 'Get basic user info and context.',
      },
      {
        step: 2,
        title: 'Top posts (keyword)',
        query: `[x_keyword_search] Find top/most engaged ORIGINAL posts (not replies) by @${cleanUsername} in ${year}. Exclude replies to others.`,
        purpose: 'Collect representative/high-signal posts.',
      },
      {
        step: 3,
        title: 'Top themes (semantic)',
        query: `[x_semantic_search] What topics does @${cleanUsername} discuss most in ${year}? Return ORIGINAL posts only (exclude replies to others).`,
        purpose: 'Capture the main topics with supporting posts.',
      },
      {
        step: 4,
        title: 'Q1 activity (Jan-Mar)',
        query: `[x_keyword_search] Find original posts (not replies) by @${cleanUsername} from January, February, March ${year}`,
        purpose: 'Capture Q1 activity for month distribution.',
      },
      {
        step: 5,
        title: 'Q2 activity (Apr-Jun)',
        query: `[x_keyword_search] Find original posts (not replies) by @${cleanUsername} from April, May, June ${year}`,
        purpose: 'Capture Q2 activity for month distribution.',
      },
      {
        step: 6,
        title: 'Q3 activity (Jul-Sep)',
        query: `[x_keyword_search] Find original posts (not replies) by @${cleanUsername} from July, August, September ${year}`,
        purpose: 'Capture Q3 activity for month distribution.',
      },
      {
        step: 7,
        title: 'Q4 activity (Oct-Dec)',
        query: `[x_keyword_search] Find original posts (not replies) by @${cleanUsername} from October, November, December ${year}`,
        purpose: 'Capture Q4 activity for month distribution.',
      },
      {
        step: 8,
        title: 'Threads discovery',
        query: `[x_keyword_search] Find threads started by @${cleanUsername} in ${year} (replies-to-self are OK, but not replies to others)`,
        purpose: 'Find candidate threads worth fetching fully.',
      },
      {
        step: 9,
        title: 'Thread fetch (deep)',
        query: `[x_thread_fetch] Pick the best thread started by @${cleanUsername} and fetch the full thread`,
        purpose: 'Get full context for a standout thread.',
      },
      {
        step: 10,
        title: 'Announcements / launches',
        query: `[x_keyword_search] Find launch/ship/release/announce original posts by @${cleanUsername} in ${year} (exclude replies)`,
        purpose: 'Find key milestones and launches.',
      },
      {
        step: 11,
        title: 'Opinions / takes',
        query: `[x_semantic_search] Find opinionated original posts by @${cleanUsername} in ${year} (strong statements, predictions). Exclude replies.`,
        purpose: 'Understand voice and point of view.',
      },
      {
        step: 12,
        title: 'Shoutouts & mentions',
        query: `[x_keyword_search] Find original posts by @${cleanUsername} in ${year} where they mention or shoutout others (not replies to others)`,
        purpose: 'Capture social graph + community energy.',
      },
      {
        step: 13,
        title: 'Learning & curiosity',
        query: `[x_semantic_search] Find original posts by @${cleanUsername} in ${year} about learning, curiosity, questions (exclude replies)`,
        purpose: 'Identify what they were learning and asking about.',
      },
      {
        step: 14,
        title: 'Year-end reflection',
        query: `[x_keyword_search] Find year-end reflection or recap original posts by @${cleanUsername} in ${year}`,
        purpose: 'Find explicit reflection/recap posts.',
      },
      {
        step: 15,
        title: 'Style sampling',
        query: `[x_keyword_search] Collect a diverse sample of original posts by @${cleanUsername} in ${year} (short, long, technical, casual). No replies.`,
        purpose: 'Better writing-style classification (grounded in examples).',
      },
      {
        step: 16,
        title: 'Edge cases / contradictions',
        query: `[x_semantic_search] Find original posts by @${cleanUsername} in ${year} that show a different side or contradict earlier themes. Exclude replies.`,
        purpose: 'Avoid one-note summaries; capture range.',
      },
    ] as const;

    const analysisSchema = z.object({
      topTopics: z.array(z.string().min(1)).min(1).max(5),
      sentiment: z.object({
        positive: z.number().min(0).max(100),
        neutral: z.number().min(0).max(100),
        negative: z.number().min(0).max(100),
      }),
      writingStyle: z.string().min(1),
      yearSummary: z.string().min(1),
      followersCount: z.number().int().min(0).optional(),
      verified: z.boolean().optional(),
    });

    // generateText #1:
    // - Runs 16 x_search calls (one per step) using xai.tools.xSearch (same wiring as x-search.ts)
    // - Includes quarterly searches (Q1-Q4) to get month distribution
    // - Returns citations/sources only (NO structured output here)
    const { text, sources } = await generateText({
      model: xai.responses('grok-4-fast'),
      system: `You are generating an \"X Wrapped\" for @${cleanUsername} for ${year}.

Hard rules:
- Use ONLY the x_search tool to gather posts.
- Focus on ORIGINAL posts by @${cleanUsername} only. Exclude replies to other users.
- Replies-to-self (threads) are OK, but NOT replies to others.
- Do NOT include posts where @${cleanUsername} is just mentioned by someone else.
- Do NOT invent posts, stats, topics, or user attributes.
- Your analysis must be grounded in what you found through x_search.
- You MUST perform exactly ${searchSteps.length} searches, in order, using the provided queries verbatim.
- After the searches, Summarize the results but first mention the user's follower count and verified status if available.`,
      messages: [
        {
          role: 'user',

          content: `Run the following searches in order. For each item, call x_search with the exact query text.

  ${searchSteps.map((s) => `${s.step}. ${s.query} (purpose: ${s.purpose})`).join('\n')}

  After completing all ${searchSteps.length} searches, stop.`
        },
      ],
      tools: {
        x_search: xai.tools.xSearch(xSearchToolConfig),
      },
      onStepFinish: (step) => {
        console.log('Step: ', step);
      },
      // Allow enough tool-call steps for all searches.
      stopWhen: stepCountIs(searchSteps.length),
    });

    console.log('Text for X Wrapped: ', text);

    const citations = (Array.isArray(sources) ? sources : []) as CitationSource[];
    const tweetUrls = citations
      .filter((c) => c.sourceType === 'url' && typeof c.url === 'string' && c.url.length > 0)
      .map((c) => c.url as string);

    const seenTweetIds = new Set<string>();
    const tweetIds = tweetUrls
      .map((u) => extractTweetId(u))
      .filter((id): id is string => !!id)
      .filter((id) => {
        if (seenTweetIds.has(id)) return false;
        seenTweetIds.add(id);
        return true;
      })
      .slice(0, 60);

    const tweetResults = await Promise.all(
      tweetIds.map(async (id) => {
        try {
          const tweet = await getTweet(id);
          if (!tweet?.text) return null;

          const createdAtRaw = (tweet as any).created_at as string | undefined;
          const createdAt = createdAtRaw ? new Date(createdAtRaw) : null;
          const dateIso = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString() : '';

          const tweetUser = (tweet as any).user as
            | {
              name?: string;
              screen_name?: string;
              profile_image_url_https?: string;
              profile_image_url?: string;
              followers_count?: number;
              friends_count?: number;
              verified?: boolean;
              verified_type?: string | null;
            }
            | undefined;

          const favoriteCount = (tweet as any).favorite_count as number | undefined;

          return {
            id,
            text: tweet.text as string,
            url: `https://x.com/i/status/${id}`,
            date: dateIso,
            user: tweetUser,
            screenName: tweetUser?.screen_name?.toLowerCase() ?? '',
            favoriteCount: typeof favoriteCount === 'number' ? favoriteCount : 0,
          };
        } catch {
          return null;
        }
      }),
    );

    // Filter to only include posts BY the target user (not mentions or replies from others)
    const authorPosts = tweetResults.filter(
      (t): t is NonNullable<typeof t> =>
        !!t && t.screenName === cleanUsername.toLowerCase()
    );

    // Sort by favorite_count (likes) descending and take top 5
    const topPosts = authorPosts
      .sort((a, b) => (b.favoriteCount ?? 0) - (a.favoriteCount ?? 0))
      .slice(0, 5);
    const totalPosts = authorPosts.length;

    const monthCounts = new Map<string, number>();
    for (const t of authorPosts) {
      if (!t.date) continue;
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) continue;
      const month = toMonthName(d);
      monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
    }
    const mostActiveMonth =
      Array.from(monthCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';

    const firstUser = authorPosts.find((t) => t.user)?.user;
    const displayName = typeof firstUser?.name === 'string' && firstUser.name.length > 0 ? firstUser.name : undefined;
    const avatarUrlRaw =
      firstUser?.profile_image_url_https || firstUser?.profile_image_url || undefined;
    // Replace _normal with _400x400 for higher resolution avatar
    const avatarUrl =
      typeof avatarUrlRaw === 'string' && avatarUrlRaw.length > 0
        ? avatarUrlRaw.replace('_normal.', '_400x400.')
        : undefined;

    if (totalPosts === 0) {
      const wrappedData: XWrappedData = {
        username: cleanUsername,
        displayName,
        avatarUrl,
        totalPosts: 0,
        topTopics: [],
        sentiment: { positive: 0, neutral: 0, negative: 0 },
        mostActiveMonth: 'Unknown',
        engagementScore: 0,
        writingStyle: 'Unknown',
        yearSummary: `No posts found for @${cleanUsername} in ${year} (based on the X search results available).`,
        topPosts: [],
        searchSteps: [...searchSteps],
      };
      // Cache empty result too
      await redis.set(cacheKey, wrappedData, { ex: CACHE_TTL_SECONDS });
      return NextResponse.json(wrappedData);
    }

    const tweetTexts = authorPosts.map((t) => t.text).slice(0, 30);

    // generateText #2:
    // - NO tools
    // - Uses Zod output
    // - Must be grounded ONLY in tweet texts we fetched (no invention)
    // - Uses text from first generateText call for additional context
    const { output } = await generateText({
      model: xai('grok-4-fast-non-reasoning'),
      system: `You are writing an \"X Wrapped\" summary based strictly on provided X post texts and search context.

Rules:
- Use ONLY the provided post texts (these are original posts by the user, not replies to others).
- Focus on what the user posted, not what others said to/about them.
- Use the search context to better understand patterns, themes, and user activity.
- Extract follower count and verified status from the search context if available.
- Do not invent topics or events not present in the text or context.
- If evidence is weak, reflect uncertainty concisely.
- The Interesting Posts should be the actual posts by the user, not replies or non author posts.
- Keep it fun and crisp; no filler.
- Derive sentiment directly from the posts: imagine each post as positive, neutral, or negative based on its language and then compute the overall percentages from that distribution.
- Avoid defaulting to \"round\" or generic splits (like 33/33/33 or 50/50/0) unless the posts are truly that balanced; let the evidence drive the exact numbers.
- It is OK if one sentiment clearly dominates the others when the posts support it, but do not exaggerate beyond what the texts justify.

Output must match the schema exactly.`,
      messages: [
        {
          role: 'user',

          content: `User: @${cleanUsername}\nYear: ${year}\n\nSearch Context (from X search results for details about users verified status and follower count):\n${text || 'No additional context available.'}\n\nPost texts (sample):\n${tweetTexts
            .map((t, i) => `(${i + 1}) ${t}`)
            .join('\n')}`
        },
      ],
      // Lower temperature so sentiment percentages are more stable and less random.
      temperature: 0.2,
      output: Output.object({ schema: analysisSchema }),
    });

    const sentiment = {
      positive: clampPercent(output.sentiment.positive),
      neutral: clampPercent(output.sentiment.neutral),
      negative: clampPercent(output.sentiment.negative),
    };

    const sum = sentiment.positive + sentiment.neutral + sentiment.negative;
    if (sum !== 100 && sum > 0) {
      // Normalize to 100 to avoid weird totals from the model.
      sentiment.positive = clampPercent((sentiment.positive / sum) * 100);
      sentiment.neutral = clampPercent((sentiment.neutral / sum) * 100);
      sentiment.negative = clampPercent(100 - sentiment.positive - sentiment.neutral);
    }

    const engagementScore = Math.max(1, Math.min(100, Math.round((totalPosts / 30) * 100)));

    const wrappedData: XWrappedData = {
      username: cleanUsername,
      displayName,
      avatarUrl,
      followersCount: output.followersCount,
      verified: output.verified,
      totalPosts,
      topTopics: output.topTopics,
      sentiment,
      mostActiveMonth,
      engagementScore,
      writingStyle: output.writingStyle,
      yearSummary: output.yearSummary,
      topPosts,
      searchSteps: [...searchSteps],
    };

    await redis.set(cacheKey, wrappedData, { ex: CACHE_TTL_SECONDS });

    return NextResponse.json(wrappedData);
  } catch (error) {
    console.error('X Wrapped API error:', error);
    return NextResponse.json({ error: 'Failed to generate X Wrapped', details: String(error) }, { status: 500 });
  }
}

