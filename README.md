# Scira

![Scira](/app/opengraph-image.png)

A minimalistic AI-powered search engine that helps you find information on the internet.

🔗 **[Try Scira at scira.ai](https://scira.ai)**

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/zaidmukaddam/scira)

## Powered By

<div align="center">

|          [Vercel AI SDK](https://sdk.vercel.ai/docs)          |                [Exa AI](https://exa.ai)                |
| :-----------------------------------------------------------: | :----------------------------------------------------: |
| <img src="/public/one.svg" alt="Vercel AI SDK" height="40" /> | <img src="/public/exa.png" alt="Exa AI" height="40" /> |
|            For AI model integration and streaming             |          For web search and content retrieval          |

</div>

## Special Thanks

<div align="center" markdown="1">

[![Warp](https://github.com/user-attachments/assets/2bda420d-4211-4900-a37e-e3c7056d799c)](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)<br>

### **[Warp, the intelligent terminal](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)**<br>

[Available for MacOS, Linux, & Windows](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)<br>
[Visit warp.dev to learn more](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)

</div>

## Features

### Core Search & Information

- **AI-powered search**: Get answers to your questions using multiple AI models including xAI's Grok, Anthropic's Claude, Google's Gemini, and OpenAI's GPT models
- **Web search**: Search the web using Exa's API with support for multiple queries, search depths, and topics
- **URL content retrieval**: Extract and analyze content from any URL using Exa AI with live crawling capabilities
- **Reddit search**: Search Reddit content with time range filtering using Tavily API
- **X (Twitter) search**: Search X posts with date ranges and specific handle filtering using xAI Live Search
- **Extreme search**: Advanced multi-step search capability for complex queries

### Academic & Research

- **Academic search**: Search for academic papers and research using Exa AI with abstracts and summaries
- **YouTube search**: Find YouTube videos with detailed information, captions, and timestamps powered by Exa AI

### Entertainment & Media

- **Movie & TV show search**: Get detailed information about movies and TV shows using TMDB API
- **Trending movies**: Discover trending movies with cast, ratings, and detailed information
- **Trending TV shows**: Find popular TV shows with comprehensive metadata

### Financial & Data Analysis

- **Stock charts**: Generate interactive stock charts with news integration using yfinance and Tavily
- **Currency converter**: Convert between currencies with real-time exchange rates using yfinance
- **Code interpreter**: Write and execute Python code with chart generation capabilities using Daytona sandbox

### Location & Travel

- **Weather information**: Get current weather and forecasts for any location using OpenWeather API
- **Maps & geocoding**: Find places and get coordinates using Google Maps API
- **Nearby places search**: Discover nearby restaurants, attractions, and services with Google Places API
- **Flight tracking**: Track real-time flight information using Aviation Stack API

### Productivity & Utilities

- **Text translation**: Translate text between languages using AI models
- **Date & time**: Get current date and time in user's timezone with multiple format options
- **Memory management**: Add and search personal memories using Mem0 AI
- **MCP server search**: Search for Model Context Protocol servers using Smithery Registry

### Search Groups

- **Web**: Search across the entire internet powered by Tavily
- **Memory**: Your personal memory companion (requires authentication)
- **Analysis**: Code execution, stock charts, and currency conversion
- **Chat**: Direct conversation with AI models
- **X**: Search X (Twitter) posts
- **Reddit**: Search Reddit posts
- **Academic**: Search academic papers powered by Exa
- **YouTube**: Search YouTube videos powered by Exa
- **Extreme**: Deep research with multiple sources and analysis

## LLM Models Supported

- **xAI**: Grok 3, Grok 3 Mini, Grok 2 Vision
- **Google**: Gemini 2.5 Flash (Preview), Gemini 2.5 Pro (Preview)
- **Anthropic**: Claude 4 Sonnet
- **OpenAI**: GPT-4o, o4-mini, o3 (with reasoning capabilities)
- **Groq**: Qwen QwQ 32B, Qwen 3 32B, Meta's Llama 4 Maverick

## Built with

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vercel AI SDK](https://sdk.vercel.ai/docs) - AI model integration
- [Shadcn/UI](https://ui.shadcn.com/) - UI components
- [Exa.AI](https://exa.ai/) - Web search and content retrieval
- [Tavily](https://tavily.com/) - Search grounding for reddit search
- [OpenWeather](https://openweathermap.org/) - Weather data
- [Daytona](https://daytona.io/) - Code execution sandbox
- [Google Maps](https://developers.google.com/maps) - Location services
- [Aviation Stack](https://aviationstack.com/) - Flight tracking
- [TMDB](https://www.themoviedb.org/) - Movie and TV data
- [Mem0](https://mem0.ai/) - Memory management
- [Better Auth](https://github.com/better-auth/better-auth) - Authentication
- [Drizzle ORM](https://orm.drizzle.team/) - Database management

### Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzaidmukaddam%2Fscira&env=XAI_API_KEY,OPENAI_API_KEY,ANTHROPIC_API_KEY,GROQ_API_KEY,GOOGLE_GENERATIVE_AI_API_KEY,DAYTONA_API_KEY,DATABASE_URL,BETTER_AUTH_SECRET,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,TWITTER_CLIENT_ID,TWITTER_CLIENT_SECRET,REDIS_URL,ELEVENLABS_API_KEY,TAVILY_API_KEY,EXA_API_KEY,TMDB_API_KEY,YT_ENDPOINT,FIRECRAWL_API_KEY,OPENWEATHER_API_KEY,GOOGLE_MAPS_API_KEY,MAPBOX_ACCESS_TOKEN,AVIATION_STACK_API_KEY,CRON_SECRET,BLOB_READ_WRITE_TOKEN,MEM0_API_KEY,MEM0_ORG_ID,MEM0_PROJECT_ID,SMITHERY_API_KEY,NEXT_PUBLIC_MAPBOX_TOKEN,NEXT_PUBLIC_POSTHOG_KEY,NEXT_PUBLIC_POSTHOG_HOST,NEXT_PUBLIC_SCIRA_PUBLIC_API_KEY,SCIRA_API_KEY&envDescription=API%20keys%20and%20configuration%20required%20for%20Scira%20to%20function)

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
