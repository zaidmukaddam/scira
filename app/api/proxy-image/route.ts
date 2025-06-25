import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy endpoint to bypass CORS restrictions when validating images
 * This works because CORS only affects browser-initiated requests, not server-to-server requests
 */

// Multiple user agents to rotate through
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

async function fetchWithRetry(url: string, validateOnly: boolean, maxRetries = 3): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // Increased to 10 seconds

            // Rotate user agents and add more realistic headers
            const userAgent = USER_AGENTS[attempt % USER_AGENTS.length];

            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Fetch-Dest': 'image',
                    'Sec-Fetch-Mode': 'no-cors',
                    'Sec-Fetch-Site': 'cross-site',
                    'Referer': 'https://www.google.com/',
                },
                redirect: 'follow',
                next: { revalidate: 0 } // Don't cache the response
            });

            clearTimeout(timeout);

            // If we get a successful response, return it
            if (response.ok) {
                return response;
            }

            // If we get a client error (4xx), don't retry
            if (response.status >= 400 && response.status < 500) {
                return response;
            }

            // For server errors (5xx), retry with next user agent
            throw new Error(`Server error: ${response.status} ${response.statusText}`);

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // If it's an AbortError, don't retry
            if (lastError.name === 'AbortError') {
                throw new Error('Request timeout');
            }

            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    throw lastError || new Error('All retry attempts failed');
}

export async function GET(request: NextRequest) {
    // Extract the URL from the query parameters
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Validate URL format
    try {
        new URL(url);
    } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    try {
        const validateOnly = request.headers.get('x-validate-only') === 'true';
        const response = await fetchWithRetry(url, validateOnly);

        // Capture the final URL after any redirects
        const finalUrl = response.redirected ? response.url : url;

        // If we only want to validate the image exists, we can return the headers
        if (validateOnly) {
            const contentType = response.headers.get('content-type');
            const status = response.status;

            return NextResponse.json({
                valid: response.ok && contentType?.startsWith('image/'),
                status,
                contentType,
                redirected: response.redirected,
                finalUrl
            }, {
                headers: {
                    'x-final-url': finalUrl,
                    'x-redirected': response.redirected ? 'true' : 'false'
                }
            });
        }

        // Check if the response is actually an image
        const contentType = response.headers.get('content-type');
        if (!contentType?.startsWith('image/')) {
            return NextResponse.json(
                { error: 'URL does not point to an image', contentType },
                { status: 400 }
            );
        }

        // Otherwise, proxy the image data
        // Get the response data
        const blob = await response.blob();

        // Return the response with the appropriate content type
        return new NextResponse(blob, {
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*', // Allow access from any origin
                'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
                'x-final-url': finalUrl,
                'x-redirected': response.redirected ? 'true' : 'false'
            }
        });
    } catch (error) {
        console.error('Proxy image error:', error);

        // Determine appropriate status code based on error type
        let status = 500;
        let errorMessage = 'Failed to fetch image';

        if (error instanceof Error) {
            if (error.message.includes('timeout')) {
                status = 408;
                errorMessage = 'Request timeout';
            } else if (error.message.includes('Invalid URL')) {
                status = 400;
                errorMessage = 'Invalid URL';
            } else if (error.message.includes('Network error') || error.message.includes('fetch failed')) {
                status = 502;
                errorMessage = 'Network error';
            }
        }

        // Return appropriate error response
        return NextResponse.json(
            {
                error: errorMessage,
                message: error instanceof Error ? error.message : String(error),
                url: url
            },
            { status }
        );
    }
}

// Support HEAD requests for quick validation
export async function HEAD(request: NextRequest) {
    // Set validate-only to true and delegate to GET handler
    const headers = new Headers(request.headers);
    headers.set('x-validate-only', 'true');

    const modifiedRequest = new Request(request.url, {
        method: 'GET',
        headers,
    });

    return GET(modifiedRequest as NextRequest);
} 