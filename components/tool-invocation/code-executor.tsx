"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToolUIPart } from 'ai';
import { Copy, Loader2, Play, Terminal, Bug, Check } from 'lucide-react';

import { callCodeRunWorker } from '@/lib/code-runner/call-worker';
import {
  CodeRunnerResult,
  LogEntry,
} from '@/lib/code-runner/code-runner.interface';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CodeExecutorProps {
  part: ToolUIPart;
  type: 'javascript' | 'python';
  onResult?: (result?: any) => void;
}

type DisplayLog = LogEntry & { timestamp?: number };

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

export function CodeExecutor({ part, type, onResult }: CodeExecutorProps) {
  const [localResult, setLocalResult] = useState<CodeRunnerResult | null>(null);
  const [realtimeLogs, setRealtimeLogs] = useState<DisplayLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoRunRef = useRef(false);

  const input = (part.input ?? {}) as { code?: string };
  const code = typeof input.code === 'string' ? input.code : '';

  const storedResult = useMemo(() => {
    if (typeof part.state === 'string' && part.state.startsWith('output')) {
      return (part.output as CodeRunnerResult | undefined) ?? null;
    }
    return null;
  }, [part.output, part.state]);

  useEffect(() => {
    if (storedResult) {
      setLocalResult(storedResult);
      setRealtimeLogs([]);
    }
  }, [storedResult]);

  const handleExecute = useCallback(async () => {
    if (!code || isExecuting) return;
    setIsExecuting(true);
    setRealtimeLogs([]);
    try {
      const result = await callCodeRunWorker(type, {
        code,
        timeout: 30000,
        onLog(entry) {
          setRealtimeLogs((prev) => [...prev, { ...entry, timestamp: Date.now() }]);
        },
      });

      setLocalResult(result);

      if (onResult) {
        const logsPayload = JSON.stringify(result.logs ?? []).length > 5000
          ? [
              {
                type: 'info',
                args: [
                  {
                    type: 'data',
                    value:
                      'Log output exceeded storage limit (10KB). Full output was displayed to the user but truncated for server storage.',
                  },
                ],
              } satisfies LogEntry,
            ]
          : result.logs;

        onResult({
          ...(result as any),
          logs: logsPayload,
          guide:
            "Execution finished. Provide: 1) Main results/outputs 2) Key insights or findings 3) Error explanations if any. Don't repeat code or raw logs - interpret and summarize for the user.",
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Execution failed';
      const fallback: CodeRunnerResult = {
        success: false,
        error: message,
        logs: [
          {
            type: 'error',
            args: [{ type: 'data', value: message }],
          },
        ],
      };
      setLocalResult(fallback);
    } finally {
      setIsExecuting(false);
    }
  }, [code, type, onResult, isExecuting]);

  useEffect(() => {
    if (
      !autoRunRef.current &&
      typeof part.state === 'string' &&
      part.state === 'input-available' &&
      code
    ) {
      autoRunRef.current = true;
      handleExecute();
    }
  }, [part.state, code, handleExecute]);

  const logsToDisplay = useMemo<DisplayLog[]>(() => {
    if (realtimeLogs.length) {
      return realtimeLogs;
    }
    if (localResult?.logs?.length) {
      return localResult.logs.map((entry) => ({ ...entry }));
    }
    return [];
  }, [realtimeLogs, localResult]);

  const isRunning = isExecuting || (typeof part.state === 'string' && part.state.startsWith('input'));
  const hasError = localResult?.success === false;
  const executionTime = localResult?.executionTimeMs;

  const statusBadge = (() => {
    if (isRunning) {
      return <Badge variant="secondary" className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Running</Badge>;
    }
    if (hasError) {
      return <Badge variant="destructive" className="flex items-center gap-1"><Bug className="h-3 w-3" />Error</Badge>;
    }
    if (localResult?.success) {
      return <Badge variant="green">Success</Badge>;
    }
    return <Badge variant="secondary">Ready</Badge>;
  })();

  const handleCopy = useCallback(async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const resultOutput = useMemo(() => {
    if (!localResult) return '';
    if (localResult.success === false && localResult.error) {
      return localResult.error;
    }
    return stringifyValue(localResult.result);
  }, [localResult]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-4 w-4" />
            {type === 'javascript' ? 'JavaScript Execution' : 'Python Execution'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {executionTime ? (
              <span className="text-xs text-muted-foreground">{executionTime} ms</span>
            ) : null}
            {statusBadge}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleExecute} disabled={isRunning || !code}>
            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Run
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!code}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="code" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="output">Output</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="code" className="mt-4">
            <ScrollArea className="h-64 border rounded-md bg-muted/30">
              <pre className="p-4 text-xs leading-6 font-mono whitespace-pre-wrap">
                {code || 'No code provided.'}
              </pre>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="output" className="mt-4">
            <ScrollArea className="h-64 border rounded-md bg-muted/30">
              <pre
                className={cn(
                  'p-4 text-sm whitespace-pre-wrap font-mono leading-6',
                  hasError ? 'text-destructive' : 'text-foreground',
                )}
              >
                {resultOutput || 'No output yet.'}
              </pre>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="logs" className="mt-4">
            <ScrollArea className="h-64 border rounded-md bg-muted/30">
              <div className="flex flex-col gap-3 p-4 text-xs">
                {logsToDisplay.length ? (
                  logsToDisplay.map((log, index) => (
                    <div
                      key={index}
                      className={cn(
                        'grid gap-2 rounded-md border p-3 bg-background/80',
                        log.type === 'error' ? 'border-destructive/40 text-destructive' : 'border-border/60',
                      )}
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="uppercase tracking-wide">{log.type}</span>
                        {log.timestamp ? (
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        {log.args.map((arg, argIndex) => {
                          if (arg.type === 'image') {
                            return (
                              <img
                                key={argIndex}
                                src={String(arg.value)}
                                alt="Code output"
                                className="rounded-md border bg-white"
                              />
                            );
                          }
                          return (
                            <pre key={argIndex} className="whitespace-pre-wrap font-mono text-[11px] leading-5">
                              {stringifyValue(arg.value)}
                            </pre>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-muted-foreground">No logs yet.</span>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
