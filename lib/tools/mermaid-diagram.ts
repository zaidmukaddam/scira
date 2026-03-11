import { tool } from 'ai';
import { z } from 'zod';
import { generateMermaidDiagram } from '@/lib/services/mermaid-service-kroki';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const mermaidDiagramTool = tool({
  description:
    'Generate diagrams using Mermaid syntax. Supports flowcharts, sequence diagrams, Gantt charts, class diagrams, state diagrams, ER diagrams, and more. Use this when users want to create visual diagrams or charts.',
  inputSchema: z.object({
    diagram: z.string().describe('The Mermaid diagram definition in DSL format (e.g., "graph TD; A-->B; B-->C;")'),
    format: z
      .enum(['svg', 'png'])
      .default('svg')
      .describe('Output format for the diagram. SVG is vector-based and scalable, PNG is raster image.'),
    theme: z.enum(['default', 'dark', 'forest', 'neutral']).default('default').describe('Visual theme for the diagram'),
    width: z.number().min(100).max(4000).optional().describe('Width of the diagram in pixels (100-4000)'),
    height: z.number().min(100).max(4000).optional().describe('Height of the diagram in pixels (100-4000)'),
    title: z.string().optional().describe('Title or description of the diagram for accessibility'),
  }),
  execute: async ({
    diagram,
    format,
    theme,
    width,
    height,
    title,
  }: {
    diagram: string;
    format: 'svg' | 'png';
    theme: 'default' | 'dark' | 'forest' | 'neutral';
    width?: number;
    height?: number;
    title?: string;
  }) => {
    try {
      console.log('Generating Mermaid diagram:', { format, theme, width, height, diagramLength: diagram.length });

      const result = await generateMermaidDiagram({
        diagram,
        format,
        theme,
        width,
        height,
        title,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error,
          message: `Error: ${result.error}`,
        };
      }

      return {
        success: true,
        svg: result.svg,
        format: result.format || format,
        size: result.size,
        sizeFormatted: result.size ? formatFileSize(result.size) : 'Unknown',
        cached: result.cached || false,
        title: title || 'Mermaid Diagram',
        message: `Diagram rendered inline${title ? ` - "${title}"` : ''}. The diagram is displayed directly in the chat interface.`,
      };
    } catch (error) {
      console.error('Mermaid diagram generation error:', error);

      // Provide helpful error messages
      let errorMessage = 'Failed to generate diagram';
      if (error instanceof Error) {
        if (error.message.includes('syntax')) {
          errorMessage = 'Invalid Mermaid syntax. Please check your diagram definition.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Diagram generation timed out. Try a simpler diagram.';
        } else if (error.message.includes('size')) {
          errorMessage = 'Diagram is too large. Please reduce complexity.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        message: `Error: ${errorMessage}`,
      };
    }
  },
});
