// PDF parser wrapper for pdf-parse v2.x (class-based PDFParse API)
// v2 exports PDFParse class — not a callable function like v1 did.

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
    // pdf-parse v2 exports a named PDFParse class, not a default function
    const pdfParseMod = await import('pdf-parse');
    // Handle both ESM default-wrapping and direct named export
    const PDFParse: any =
      (pdfParseMod as any).PDFParse ??
      (pdfParseMod as any).default?.PDFParse ??
      (pdfParseMod as any).default;

    if (typeof PDFParse !== 'function') {
      throw new Error(
        `[PDFParser] PDFParse is not a constructor — got ${typeof PDFParse}. Check pdf-parse version/API.`,
      );
    }

    const parser = new PDFParse({ data: buffer });

    const [textResult, infoResult] = await Promise.all([
      parser.getText(),
      parser.getInfo().catch(() => null),
    ]);

    return {
      numpages: textResult.total,
      numrender: textResult.total,
      info: infoResult?.info ?? {},
      metadata: infoResult?.metadata ?? null,
      text: textResult.text ?? '',
      version: '2.x',
    };
  } catch (error) {
    console.error('[PDFParser] Error parsing PDF:', error);
    return null;
  }
}
