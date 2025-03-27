import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy endpoint to bypass CORS restrictions when validating images
 * This works because CORS only affects browser-initiated requests, not server-to-server requests
 */
export async function GET(request: NextRequest) {
    // Extract the URL from the query parameters
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }
    
    try {
        // Attempt to fetch the image
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ImageValidator/1.0)',
                'Accept': 'image/*',
            },
            redirect: 'follow',
            // Don't follow all the redirects as we're just checking if it's valid
            next: { revalidate: 0 } // Don't cache the response
        });
        
        clearTimeout(timeout);
        
        // Capture the final URL after any redirects
        const finalUrl = response.redirected ? response.url : url;
        
        // If we only want to validate the image exists, we can return the headers
        if (request.headers.get('x-validate-only') === 'true') {
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
        
        // Otherwise, proxy the image data
        // Get the response data
        const blob = await response.blob();
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        
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
        
        // Return a 500 error
        return NextResponse.json(
            { error: 'Failed to fetch image', message: error instanceof Error ? error.message : String(error) },
            { status: 500 }
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