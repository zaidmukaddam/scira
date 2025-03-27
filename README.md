# Scira

![Scira](/app/opengraph-image.png)

A minimalistic AI-powered search engine that helps you find information on the internet.

## Powered By

<div align="center">
  <div style="display: flex; justify-content: center; align-items: center; gap: 80px; margin: 20px 0;">
    <a href="https://sdk.vercel.ai/docs">
      <img src="/public/one.svg" alt="Vercel AI SDK" height="40" />
    </a>
    <a href="https://tavily.com">
      <img src="/public/four.svg" alt="Tavily AI" height="40" />
    </a>
  </div>
</div>

- [Vercel AI SDK](https://sdk.vercel.ai/docs) - For AI model integration and streaming
- [Tavily AI](https://tavily.com) - For search grounding and web search capabilities

## Special Thanks

<div align="center" markdown="1">

  [![Warp](https://github.com/user-attachments/assets/2bda420d-4211-4900-a37e-e3c7056d799c)](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)<br>
  ### **[Warp, the intelligent terminal](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)**<br>
  [Available for MacOS, Linux, & Windows](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)<br>
  [Visit warp.dev to learn more](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)

  [![NinjaTools](https://bakrqvdfyriopfzffskk.supabase.co/storage/v1/object/sign/ads/Ninja%20Tools%20AD.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJhZHMvTmluamEgVG9vbHMgQUQucG5nIiwiaWF0IjoxNzQyNzExMTMwLCJleHAiOjEwMzgyNzExMTMwfQ.eTY4DXSEXe61I7-Jk0nK8rimSLAETqfp5mEO5MpsH00)](https://ninjatools.ai/?ref=scria)<br>
  ### **[NinjaTools, the All in one AI assistant and workspace](https://ninjatools.ai/?ref=scria)**<br>
  [Visit Ninjatools.ai to learn more](https://ninjatools.ai/?ref=scria)
  
</div>

## Features

- **AI-powered search**: Get answers to your questions using Anthropic's Models.
- **Web search**: Search the web using Tavily's API.
- **URL Specific search**: Get information from a specific URL.
- **Weather**: Get the current weather for any location using OpenWeather's API.
- **Programming**: Run code snippets in multiple languages using E2B's API.
- **Maps**: Get the location of any place using Google Maps API, Mapbox API, and TripAdvisor API.
- **YouTube Search**: Search for videos on YouTube and get timestamps and transcripts [powered by Exa.AI - the Web Search API](https://exa.ai/).
- **Academic Search**: Search for academic papers [powered by Exa.AI - the Web Search API](https://exa.ai/). 
- **X Posts Search**: Search for posts on X.com [powered by Exa.AI - the Web Search API](https://exa.ai/).
- **Flight Tracker**: Track flights using AviationStack's API.
- **Trending Movies and TV Shows**: Get information about trending movies and TV shows.
- **Movie or TV Show Search**: Get information about any movie or TV show.

## LLM used
- [xAI's Grok](https://x.ai/grok)
- [Anthropic's Claude 3.5 Sonnet](https://www.anthropic.com/news/claude-3-5-sonnet)
- [Meta's Llama 3.3 70B by Cerebras](https://inference-docs.cerebras.ai/introduction)
- [Deepseek R1 Distill by Groq Inc](https://console.groq.com/docs/model/deepseek-r1-distill-llama-70b)

## Built with
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Shadcn/UI](https://ui.shadcn.com/)
- [Exa.AI](https://exa.ai/)
- [Tavily](https://tavily.com/)
- [OpenWeather](https://openweathermap.org/)
- [E2B](https://e2b.dev/)
- [Google Maps](https://developers.google.com/maps)
- [Mapbox](https://www.mapbox.com/)
- [TripAdvisor](https://www.tripadvisor.com/)
- [AviationStack](https://aviationstack.com/)

### Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzaidmukaddam%2Fscira&env=XAI_API_KEY,MISTRAL_API_KEY,COHERE_API_KEY,E2B_API_KEY,ELEVENLABS_API_KEY,TAVILY_API_KEY,EXA_API_KEY,TMDB_API_KEY,YT_ENDPOINT,FIRECRAWL_API_KEY,OPENWEATHER_API_KEY,SANDBOX_TEMPLATE_ID,GOOGLE_MAPS_API_KEY,MAPBOX_ACCESS_TOKEN,TRIPADVISOR_API_KEY,AVIATION_STACK_API_KEY,CRON_SECRET,BLOB_READ_WRITE_TOKEN,NEXT_PUBLIC_MAPBOX_TOKEN,NEXT_PUBLIC_POSTHOG_KEY,NEXT_PUBLIC_POSTHOG_HOST,NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,MEM0_API_KEY,MEM0_ORG_ID,MEM0_PROJECT_ID&envDescription=API%20keys%20and%20configuration%20required%20for%20Scira%20to%20function)

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
   - Tavily (required for web search feature)
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

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.
