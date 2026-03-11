import zlib from 'zlib';

interface MermaidOptions {
  diagram: string;
  format?: 'svg' | 'png';
  theme?: string;
  width?: number;
  height?: number;
  title?: string;
}

export async function generateMermaidDiagram(options: MermaidOptions): Promise<{
  url?: string;
  svg?: string;
  error?: string;
  format?: string;
  title?: string;
  size?: number;
  cached?: boolean;
}> {
  const format = options.format || 'svg';

  try {
    // Encode diagram for Kroki API - compress with zlib then base64url encode
    console.log('[MERMAID] Encoding diagram, length:', options.diagram.length);
    const diagramBuffer = Buffer.from(options.diagram, 'utf-8');
    const compressed = zlib.deflateSync(diagramBuffer);
    const encoded = compressed.toString('base64url');
    console.log('[MERMAID] Encoded length:', encoded.length);

    // Call Kroki.io API
    const url = `https://kroki.io/mermaid/${format}/${encoded}`;
    console.log('[MERMAID] Calling Kroki:', url.substring(0, 100) + '...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: format === 'svg' ? 'image/svg+xml' : 'image/png',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MERMAID] Kroki API error response:', errorText);
      throw new Error(`Kroki API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const content = format === 'svg' ? await response.text() : Buffer.from(await response.arrayBuffer());

    // Calculate size
    const size = format === 'svg' ? new TextEncoder().encode(content as string).length : (content as Buffer).length;

    return {
      svg: format === 'svg' ? (content as string) : undefined,
      format,
      title: options.title,
      size,
      cached: false,
    };
  } catch (error) {
    console.error('[MERMAID] Generation error:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to generate diagram',
    };
  }
}
