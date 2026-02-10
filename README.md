# Scira

Research at the speed of thought. The agentic research platform that plans, retrieves, and cites — so you can think faster.

<a href="https://vercel.com/oss">
  <img alt="Vercel OSS Program" src="https://vercel.com/oss/program-badge.svg" />
</a>

<br />

![Scira](/app/opengraph-image.png)

<br />

🔗 **[Try Scira at scira.ai](https://scira.ai)**

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/zaidmukaddam/scira)

## Powered By

<div align="center">

|          [Vercel AI SDK](https://sdk.vercel.ai/docs)          |                [Exa AI](https://exa.ai)                |             [Upstash](https://upstash.com)              |
| :-----------------------------------------------------------: | :----------------------------------------------------: | :-----------------------------------------------------: |
| <img src="/public/one.svg" alt="Vercel AI SDK" height="40" /> | <img src="/public/exa.png" alt="Exa AI" height="40" /> | <img src="/public/upstash.svg" alt="Upstash" height="40" /> |
|            For AI model integration and streaming             |          For web search and content retrieval          |        For serverless Redis and rate limiting           |

</div>

## Special Thanks

<div align="center" markdown="1">

[![Warp](https://github.com/user-attachments/assets/2bda420d-4211-4900-a37e-e3c7056d799c)](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)<br>

### **[Warp, the intelligent terminal](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)**<br>

[Available for MacOS, Linux, & Windows](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)<br>
[Visit warp.dev to learn more](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)

</div>

## How It Works

1. **Ask anything** — Type a question, upload a PDF, or paste a URL. Pick a mode or let Scira decide for you.
2. **Scira plans & retrieves** — The agent breaks your question into sub-tasks, searches live sources, and cross-checks the evidence.
3. **Get cited answers** — Receive a grounded answer with inline citations. Click any source to verify it yourself.

## Features

### Core Capabilities

- **Agentic Planning** — Breaks complex questions into steps, selects the right models and tools, then executes multi-step workflows end to end
- **Grounded Retrieval** — Every answer comes with inline citations you can click to audit the evidence yourself
- **Extensible & Open** — AGPL-3.0 licensed. Self-host, bring your own models, connect custom tools, and tailor everything to your workflow
- **Lookouts** — Schedule recurring research agents that monitor topics, track changes, and email you updates

### Search Modes (17 modes)

| Mode | Description |
|---|---|
| **Web** | Search the entire web with AI-powered analysis |
| **Chat** | Talk to the model directly, no search |
| **X** | Real-time posts, trends, and conversations |
| **Stocks** | Market data, charts, and financial analysis |
| **Code** | Get context about languages and frameworks |
| **Academic** | Research papers, citations, and scholarly sources |
| **Extreme** | Deep research with multiple sources and analysis |
| **Reddit** | Discussions, opinions, and community insights |
| **GitHub** | Repositories, code, and developer discussions |
| **Crypto** | Cryptocurrency research powered by CoinGecko |
| **Prediction** | Prediction markets from Polymarket and Kalshi |
| **YouTube** | Video summaries, transcripts, and analysis |
| **Spotify** | Search songs, artists, and albums |
| **Connectors** | Search Google Drive, Notion & OneDrive *(Pro)* |
| **Memory** | Your personal memory companion *(Pro)* |
| **Voice** | Conversational AI with real-time voice *(Pro)* |
| **XQL** | Advanced X query language for tweet analysis *(Pro)* |

### Tools (28 tools)

#### Search & Retrieval
- **Web search** — Multi-query parallel web search with deduplication using Exa, Firecrawl, Parallel, and Tavily
- **Extreme search** — LLM-driven deep research agent with multi-step planning, code execution, and R2 artifact storage
- **Academic search** — Search academic papers and research using Exa and Firecrawl
- **Reddit search** — Search Reddit with configurable time ranges using Parallel
- **X search** — Search X posts with date range filtering and handle inclusion/exclusion using xAI Grok
- **YouTube search** — Search videos, channels, playlists with transcript extraction using Supadata
- **GitHub search** — Search repositories with structured metadata extraction using Firecrawl
- **Spotify search** — Search tracks, artists, albums, and playlists via Spotify Web API
- **URL content retrieval** — Extract content from any URL including tweets, YouTube, TikTok, and Instagram

#### Financial & Market Data
- **Stock charts** — Interactive stock charts with OHLC data, earnings, and news using Valyu, Tavily, and Exa
- **Currency converter** — Forex and crypto conversion with real-time rates using Valyu
- **Crypto tools** — Cryptocurrency data, contract lookups, and OHLC charts using CoinGecko
- **Prediction markets** — Query Polymarket and Kalshi data with Cohere reranking using Valyu

#### Location & Travel
- **Weather** — Current weather, 5-day forecast, air quality, and 16-day extended forecast using OpenWeatherMap and Open-Meteo
- **Maps & geocoding** — Forward/reverse geocoding and nearby place discovery using Google Maps API
- **Flight tracking** — Real-time flight status with departure/arrival details

#### Media & Entertainment
- **Movie/TV search** — Search movies and TV shows with detailed cast, ratings, and metadata using TMDB
- **Trending movies** — Today's trending movies from TMDB
- **Trending TV shows** — Today's trending TV shows from TMDB

#### Productivity & Utilities
- **Code interpreter** — Write and execute Python code in a sandboxed Daytona environment with chart generation
- **Code context** — Get contextual information about programming topics using Exa Context API
- **Text translation** — Translate text (and text within images) between languages using AI models
- **File query search** — Semantic search over uploaded files (PDF, CSV, DOCX, Excel) with Cohere embeddings and reranking
- **Connectors search** — Search connected Google Drive, Notion, and OneDrive using Supermemory
- **Memory tools** — Save and search personal memories using Supermemory
- **Date & time** — Current date/time in multiple formats with timezone support
- **Greeting** — Personalized time-of-day-aware greetings

## LLM Models Supported

- **xAI**: Grok 3, Grok 3 Mini, Grok 4, Grok 4 Fast, Grok 4.1 Fast, Grok Code
- **OpenAI**: GPT 4.1 (Nano/Mini/Standard), GPT 5 (Nano/Mini/Medium/Standard), GPT 5.1 (Instant/Thinking/Codex), GPT 5.2 (Instant/Thinking/Codex), o3, o4 mini, GPT OSS 20B/120B
- **Anthropic**: Claude Haiku 4.5, Claude Sonnet 4.5, Claude 4.5 Opus, Claude 4.6 Opus
- **Google**: Gemini 2.5 Flash (Lite/Standard), Gemini 2.5 Pro, Gemini 3 Flash, Gemini 3 Pro
- **Alibaba (Qwen)**: Qwen 3 (4B/32B/235B), Qwen 3 VL, Qwen 3 Max, Qwen 3 Coder (Small/Standard/Plus/Next), Qwen 3 Next 80B
- **Mistral**: Ministral 3 (3B/8B/14B), Mistral Large 3, Mistral Medium, Magistral (Small/Medium), Devstral 2 (Small/Standard)
- **DeepSeek**: DeepSeek v3, v3.1 Terminus, v3.2, R1, R1 0528
- **Zhipu (GLM)**: GLM 4.5, GLM 4.5 Air, GLM 4.6, GLM 4.6V, GLM 4.7, GLM 4.7 Flash
- **Cohere**: Command A, Command A Thinking
- **MoonShot**: Kimi K2, Kimi K2.5
- **Minimax**: M1 80K, M2, M2.1, M2.1 Lightning
- **ByteDance**: Seed 1.6, Seed 1.6 Flash, Seed 1.8
- **Arcee**: Trinity Mini, Trinity Large
- **Others**: Vercel v0 (1.0/1.5), Amazon Nova 2 Lite, Xiaomi Mimo V2 Flash, StepFun Step 3.5 Flash, Kwaipilot KAT-Coder-Pro V1

## Built with

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vercel AI SDK](https://sdk.vercel.ai/docs) - AI model integration and streaming
- [Shadcn/UI](https://ui.shadcn.com/) - UI components
- [Exa.AI](https://exa.ai/) - Web search, academic search, and content retrieval
- [Firecrawl](https://firecrawl.dev/) - Web scraping with structured extraction
- [Parallel](https://parallel.ai/) - Web and Reddit search
- [Tavily](https://tavily.com/) - Web search and financial news
- [Valyu](https://valyu.network/) - Financial data, forex, and prediction markets
- [Supadata](https://supadata.ai/) - YouTube search, transcripts, and social media
- [CoinGecko](https://www.coingecko.com/) - Cryptocurrency market data
- [Spotify](https://developer.spotify.com/) - Music search
- [OpenWeatherMap](https://openweathermap.org/) - Weather data
- [Open-Meteo](https://open-meteo.com/) - Extended forecasts and geocoding
- [Daytona](https://daytona.io/) - Code execution sandbox
- [Google Maps](https://developers.google.com/maps) - Geocoding and places
- [TMDB](https://www.themoviedb.org/) - Movie and TV data
- [Cohere](https://cohere.com/) - Embeddings and reranking
- [Supermemory](https://supermemory.ai/) - Memory management and connector search
- [Upstash](https://upstash.com/) - Serverless Redis and rate limiting
- [Cloudflare R2](https://www.cloudflare.com/r2/) - Object storage for artifacts
- [ElevenLabs](https://elevenlabs.io/) - Voice synthesis
- [Better Auth](https://github.com/better-auth/better-auth) - Authentication
- [Drizzle ORM](https://orm.drizzle.team/) - Database management
- [Novita AI](https://novita.ai) - AI Inference

### Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzaidmukaddam%2Fscira&env=XAI_API_KEY,OPENAI_API_KEY,ANTHROPIC_API_KEY,GROQ_API_KEY,GOOGLE_GENERATIVE_AI_API_KEY,DAYTONA_API_KEY,DATABASE_URL,BETTER_AUTH_SECRET,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,TWITTER_CLIENT_ID,TWITTER_CLIENT_SECRET,REDIS_URL,ELEVENLABS_API_KEY,TAVILY_API_KEY,EXA_API_KEY,SUPADATA_API_KEY,TMDB_API_KEY,YT_ENDPOINT,FIRECRAWL_API_KEY,OPENWEATHER_API_KEY,GOOGLE_MAPS_API_KEY,MAPBOX_ACCESS_TOKEN,AVIATION_STACK_API_KEY,CRON_SECRET,BLOB_READ_WRITE_TOKEN,MEM0_API_KEY,MEM0_ORG_ID,MEM0_PROJECT_ID,SMITHERY_API_KEY,NEXT_PUBLIC_MAPBOX_TOKEN,NEXT_PUBLIC_POSTHOG_KEY,NEXT_PUBLIC_POSTHOG_HOST,NEXT_PUBLIC_SCIRA_PUBLIC_API_KEY,SCIRA_API_KEY&envDescription=API%20keys%20and%20configuration%20required%20for%20Scira%20to%20function)

## Set Scira as your default search engine

1. **Open the Chrome browser settings**:
   - Click on the three vertical dots in the upper right corner of the browser.
   - Select "Settings" from the dropdown menu.

2. **Go to the search engine settings**:
   - In the left sidebar, click on "Search engine."
   - Then select "Manage search engines and site search."

3. **Add a new search engine**:
   - Click on "Add" next to "Site search."

4. **Set the search engine name**:
   - Enter `Scira` in the "Search engine" field.

5. **Set the search engine URL**:
   - Enter `https://scira.ai?q=%s` in the "URL with %s in place of query" field.

6. **Set the search engine shortcut**:
   - Enter `sh` in the "Shortcut" field.

7. **Set Default**:
   - Click on the three dots next to the search engine you just added.
   - Select "Make default" from the dropdown menu.

After completing these steps, you should be able to use Scira as your default search engine in Chrome.

### Local development

#### Run via Docker

The application can be run using Docker in two ways:

##### Using Docker Compose (Recommended)

1. Make sure you have Docker and Docker Compose installed on your system
2. Create a `.env` file based on `.env.example` with your API keys
3. Run the following command in the project root:
   ```bash
   docker compose up
   ```
4. The application will be available at `http://localhost:3000`

##### Using Docker Directly

1. Create a `.env` file based on `.env.example` with your API keys
2. Build the Docker image:
   ```bash
   docker build -t scira.app .
   ```
3. Run the container:
   ```bash
   docker run --env-file .env -p 3000:3000 scira.app
   ```

The application uses a multi-stage build process to minimize the final image size and implements security best practices. The production image runs on Node.js LTS with Alpine Linux for a minimal footprint.

#### Run with Node.js

To run the application locally without Docker:

1. Sign up for accounts with the required AI providers:
   - OpenAI (required)
   - Anthropic (required)
   - Exa (required for web search feature)
2. Copy `.env.example` to `.env.local` and fill in your API keys
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Start the development server:
   ```bash
   pnpm dev
   ```
5. Open `http://localhost:3000` in your browser

# License

This project is licensed under the AGPLv3 License - see the [LICENSE](LICENSE) file for details.
