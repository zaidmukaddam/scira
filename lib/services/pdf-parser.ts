// Safe wrapper for pdf-parse to avoid the test file loading issue
// This works around a bug in pdf-parse where it tries to load a test PDF on import

export interface PDFParseResult {
  numpages: number;
  numrender: number;
  info: any;
  metadata: any;
  text: string;
  version: string;
}

export async function parsePDF(buffer: Buffer): Promise<PDFParseResult | null> {
  try {
    // Create a minimal mock fs module to prevent the test file loading
    const mockFs = {
      readFileSync: (path: string) => {
        // If it's trying to read the test file, return empty buffer
        if (path.includes('test/data')) {
          return Buffer.alloc(0);
        }
        // Otherwise throw to maintain normal behavior
        throw new Error(`Mock fs: file not found: ${path}`);
      },
    };

    // Temporarily override require cache for fs
    const originalFs = require.cache[require.resolve('fs')];
    require.cache[require.resolve('fs')] = {
      id: require.resolve('fs'),
      filename: require.resolve('fs'),
      loaded: true,
      exports: { ...require('fs'), ...mockFs },
    } as any;

    try {
      // Clear the module cache for pdf-parse
      delete require.cache[require.resolve('pdf-parse')];

      // Now require pdf-parse
      const pdfParse = require('pdf-parse');

      // Parse the PDF
      const result = await pdfParse(buffer);

      return result;
    } finally {
      // Restore original fs
      if (originalFs) {
        require.cache[require.resolve('fs')] = originalFs;
      }
    }
  } catch (error) {
    console.error('[PDFParser] Error parsing PDF:', error);
    return null;
  }
}
