export interface ChartDataSeriesPoint {
  seriesName: string;
  value: number;
}

export interface ChartSeriesEntry {
  xAxisLabel: string;
  series: ChartDataSeriesPoint[];
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  description?: string | null;
  data: any[];
  xKey?: string;
  yKey?: string;
  config?: Record<string, any>;
}

export interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  logs?: string[];
  executionTime?: number;
  chart?: ChartData;
}

export interface TableColumnDefinition {
  key: string;
  label: string;
  type?: 'string' | 'number' | 'date' | 'boolean';
}

export interface TableMetadata {
  totalRows?: number;
  exportable?: boolean;
}

export interface TableData {
  columns: TableColumnDefinition[];
  rows: Array<Record<string, unknown>>;
  metadata?: TableMetadata;
}

export interface ToolResultPart<T = unknown> {
  type: 'tool-result';
  toolName: string;
  result: T;
  isError?: boolean;
}
