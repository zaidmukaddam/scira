export type LogEntry = {
  type: 'log' | 'error' | (string & {});
  args: ({ type: 'data'; value: any } | { type: 'image'; value: string })[];
};

export type CodeRunnerResult = {
  success: boolean;
  logs: LogEntry[];
  error?: string;
  executionTimeMs?: number;
  result?: any;
};

export type CodeRunnerOptions = {
  code: string;
  timeout?: number;
  onLog?: (entry: LogEntry) => void;
};

export type CodeWorkerRequest = {
  code: string;
  type: 'javascript' | 'python';
  timeout?: number;
  id: string;
};

export type CodeWorkerEvent = {
  id: string;
  type: 'log';
  entry: LogEntry;
};

export type CodeWorkerResult = {
  id: string;
  type: 'result';
  result: CodeRunnerResult;
};

export type CodeWorkerResponse = CodeWorkerEvent | CodeWorkerResult;
