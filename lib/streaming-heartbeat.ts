/**
 * Wraps a stream with additional response headers for better firewall compatibility
 */
export function getStreamResponseHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Transfer-Encoding': 'chunked',
    'Keep-Alive': 'timeout=300, max=100',
    'Pragma': 'no-cache',
    'Expires': '0',
    // Important: Tell proxies and firewalls not to buffer
    'X-Content-Type-Options': 'nosniff',
    // Allow cross-origin if needed
    'Access-Control-Allow-Origin': '*',
  };
}

/**
 * Creates a response with optimized streaming headers
 * for firewall and timeout resilience
 */
export function createStreamResponse(
  body: ReadableStream<Uint8Array> | BodyInit,
  headers?: Record<string, string>
) {
  return new Response(body, {
    status: 200,
    headers: {
      ...getStreamResponseHeaders(),
      ...headers,
    },
  });
}
