import { serverEnv } from '@/env/server';

const NOTTE_SCRAPE_URL = 'https://api.notte.cc/scrape';

export interface NotteSessionProfile {
  id: string;
  persist?: boolean;
}

export interface NotteProxyConfig {
  type: 'notte' | 'external';
  [key: string]: unknown;
}

export interface NotteScrapeRequest {
  url: string;
  headless?: boolean;
  solveCaptchas?: boolean;
  maxDurationMinutes?: number;
  idleTimeoutMinutes?: number;
  proxies?: boolean | NotteProxyConfig[];
  browserType?: 'chromium' | 'chrome' | 'firefox' | 'chrome-nightly' | 'chrome-turbo';
  userAgent?: string | null;
  chromeArgs?: string[] | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  cdpUrl?: string | null;
  useFileStorage?: boolean;
  screenshotType?: 'raw' | 'full' | 'last_action';
  profile?: NotteSessionProfile | null;
  webBotAuth?: boolean;
  selector?: string | null;
  scrapeLinks?: boolean;
  scrapeImages?: boolean;
  ignoredTags?: string[] | null;
  onlyMainContent?: boolean;
  onlyImages?: boolean;
  responseFormat?: unknown;
  instructions?: string | null;
  useLinkPlaceholders?: boolean;
}

export interface NotteImageData {
  url?: string | null;
  category?: string | null;
  description?: string | null;
}

export interface NotteStructuredData<T = unknown> {
  success?: boolean;
  error?: string | null;
  data?: T | Record<string, unknown> | Array<Record<string, unknown>> | null;
}

export interface NotteScrapeResponse<T = unknown> {
  markdown: string;
  images?: NotteImageData[] | null;
  structured?: NotteStructuredData<T> | null;
}

export interface NotteClient {
  scrapeWebpage<T = unknown>(request: NotteScrapeRequest): Promise<NotteScrapeResponse<T>>;
}

export class NotteApiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'NotteApiError';
    this.status = status;
    this.body = body;
  }
}

function getNotteApiKey(providedApiKey?: string) {
  const apiKey = providedApiKey ?? serverEnv.NOTTE_API_KEY;
  if (!apiKey) throw new Error('NOTTE_API_KEY is not configured');
  return apiKey;
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function buildScrapePayload(request: NotteScrapeRequest) {
  return compactObject({
    url: request.url,
    headless: request.headless ?? true,
    solve_captchas: request.solveCaptchas ?? false,
    max_duration_minutes: request.maxDurationMinutes ?? 3,
    idle_timeout_minutes: request.idleTimeoutMinutes ?? 3,
    proxies: request.proxies ?? false,
    browser_type: request.browserType ?? 'chromium',
    user_agent: request.userAgent ?? null,
    chrome_args: request.chromeArgs ?? null,
    viewport_width: request.viewportWidth ?? null,
    viewport_height: request.viewportHeight ?? null,
    cdp_url: request.cdpUrl ?? null,
    use_file_storage: request.useFileStorage ?? false,
    screenshot_type: request.screenshotType ?? 'last_action',
    profile: request.profile ?? null,
    web_bot_auth: request.webBotAuth ?? false,
    selector: request.selector ?? null,
    scrape_links: request.scrapeLinks ?? true,
    scrape_images: request.scrapeImages ?? false,
    ignored_tags: request.ignoredTags ?? null,
    only_main_content: request.onlyMainContent ?? true,
    only_images: request.onlyImages ?? false,
    response_format: request.responseFormat ?? null,
    instructions: request.instructions ?? null,
    use_link_placeholders: request.useLinkPlaceholders ?? false,
  });
}

export function createNotteClient(providedApiKey?: string): NotteClient {
  const apiKey = getNotteApiKey(providedApiKey);

  return {
    async scrapeWebpage<T = unknown>(request: NotteScrapeRequest): Promise<NotteScrapeResponse<T>> {
      const response = await fetch(NOTTE_SCRAPE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildScrapePayload(request)),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new NotteApiError(
          `Notte scrape failed with ${response.status} ${response.statusText}`,
          response.status,
          errorBody,
        );
      }

      return response.json() as Promise<NotteScrapeResponse<T>>;
    },
  };
}

export async function scrapeWebpageWithNotte<T = unknown>(
  request: NotteScrapeRequest,
  providedApiKey?: string,
) {
  return createNotteClient(providedApiKey).scrapeWebpage<T>(request);
}
