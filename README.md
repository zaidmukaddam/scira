# Scira

![Scira](/app/opengraph-image.png)

A minimalistic AI-powered search engine that helps you find information on the internet.

## Special Thanks

<div align="center" markdown="1">

  [![Warp](https://github.com/user-attachments/assets/2bda420d-4211-4900-a37e-e3c7056d799c)](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)<br>
  ### **[Warp, the intelligent terminal](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)**<br>
  [Available for MacOS and Linux](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)<br>
  [Visit warp.dev to learn more](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)

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
- [OpenAI's o3-mini](https://openai.com/index/openai-o3-mini/)

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

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzaidmukaddam%2Fscira&env=XAI_API_KEY,AZURE_RESOURCE_NAME,AZURE_API_KEY,OPENAI_API_KEY,ANTHROPIC_API_KEY,CEREBRAS_API_KEY,GROQ_API_KEY,E2B_API_KEY,UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN,ELEVENLABS_API_KEY,TAVILY_API_KEY,EXA_API_KEY,TMDB_API_KEY,YT_ENDPOINT,FIRECRAWL_API_KEY,OPENWEATHER_API_KEY,SANDBOX_TEMPLATE_ID,GOOGLE_MAPS_API_KEY,MAPBOX_ACCESS_TOKEN,TRIPADVISOR_API_KEY,AVIATION_STACK_API_KEY,CRON_SECRET,BLOB_READ_WRITE_TOKEN,NEXT_PUBLIC_MAPBOX_TOKEN,NEXT_PUBLIC_POSTHOG_KEY,NEXT_PUBLIC_POSTHOG_HOST,NEXT_PUBLIC_GOOGLE_MAPS_API_KEY&envDescription=API%20keys%20and%20configuration%20required%20for%20Scira%20to%20function)

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
   - Enter `https://scira.app?q=%s` in the "URL with %s in place of query" field.

6. **Set the search engine shortcut**:
   - Enter `sh` in the "Shortcut" field.

7. **Set Default**:
   - Click on the three dots next to the search engine you just added.
   - Select "Make default" from the dropdown menu.

After completing these steps, you should be able to use Scira as your default search engine in Chrome.

### Local development

To run the example locally you need to:

1. Sign up for accounts with the AI providers you want to use. OpenAI and Anthropic are required, Tavily is required for the web search feature.
2. Obtain API keys for each provider.
3. Set the required environment variables as shown in the `.env.example` file, but in a new file called `.env.local`.
4. `pnpm install` to install the required dependencies.
5. `pnpm dev` to launch the development server.

# License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
