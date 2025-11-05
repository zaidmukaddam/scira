import { describe, it, expect } from 'vitest';

import { jsRunTool } from '@/lib/tools/js-run-tool';
import { pythonRunTool } from '@/lib/tools/python-run-tool';
import { createBarChartTool } from '@/lib/tools/visualization/create-bar-chart';
import { createLineChartTool } from '@/lib/tools/visualization/create-line-chart';
import { createPieChartTool } from '@/lib/tools/visualization/create-pie-chart';
import { createTableTool } from '@/lib/tools/visualization/create-table';
import { createMermaidDiagramTool } from '@/lib/tools/visualization/create-mermaid-diagram';

describe('Code execution tool schemas', () => {
  it('accepts valid JavaScript code payloads', () => {
    expect(() => jsRunTool.inputSchema.parse({ code: "console.log('Hello World');" })).not.toThrow();
  });

  it('rejects invalid JavaScript payloads', () => {
    expect(() => jsRunTool.inputSchema.parse({} as any)).toThrow();
  });

  it('accepts valid Python code payloads', () => {
    expect(() => pythonRunTool.inputSchema.parse({ code: "print('Hello World')" })).not.toThrow();
  });

  it('rejects invalid Python payloads', () => {
    expect(() => pythonRunTool.inputSchema.parse({} as any)).toThrow();
  });
});

describe('Visualization tool schemas', () => {
  it('parses bar chart configuration', () => {
    const payload = {
      title: 'Sales by Quarter',
      description: 'Synthetic sample data',
      yAxisLabel: 'Revenue',
      data: [
        {
          xAxisLabel: 'Q1',
          series: [
            { seriesName: 'North', value: 120 },
            { seriesName: 'South', value: 95 },
          ],
        },
        {
          xAxisLabel: 'Q2',
          series: [
            { seriesName: 'North', value: 150 },
            { seriesName: 'South', value: 110 },
          ],
        },
      ],
    };

    expect(() => createBarChartTool.inputSchema.parse(payload)).not.toThrow();
  });

  it('parses line chart configuration', () => {
    const payload = {
      title: 'Active users',
      description: null,
      yAxisLabel: 'Users',
      data: [
        {
          xAxisLabel: 'Jan',
          series: [
            { seriesName: 'Web', value: 200 },
            { seriesName: 'Mobile', value: 180 },
          ],
        },
      ],
    };

    expect(() => createLineChartTool.inputSchema.parse(payload)).not.toThrow();
  });

  it('parses pie chart configuration', () => {
    const payload = {
      title: 'Market share',
      description: 'Top vendors',
      unit: 'users',
      data: [
        { label: 'Alpha', value: 42 },
        { label: 'Beta', value: 33 },
        { label: 'Gamma', value: 25 },
      ],
    };

    expect(() => createPieChartTool.inputSchema.parse(payload)).not.toThrow();
  });

  it('parses table configuration', () => {
    const payload = {
      title: 'Quarterly summary',
      description: null,
      columns: [
        { key: 'quarter', label: 'Quarter', type: 'string' },
        { key: 'revenue', label: 'Revenue', type: 'number' },
      ],
      data: [
        { quarter: 'Q1', revenue: 120_000 },
        { quarter: 'Q2', revenue: 150_500 },
      ],
    };

    expect(() => createTableTool.inputSchema.parse(payload)).not.toThrow();
  });

  it('parses mermaid diagram definitions', () => {
    const payload = {
      chart: `flowchart TD\n  A[Start] --> B{Is it working?}\n  B -- Yes --> C[Celebrate]\n  B -- No --> D[Fix it] --> B`,
      description: 'Simple flowchart',
    };

    expect(() => createMermaidDiagramTool.inputSchema.parse(payload)).not.toThrow();
    expect(() => createMermaidDiagramTool.inputSchema.parse({ chart: '' })).toThrow();
  });
});
