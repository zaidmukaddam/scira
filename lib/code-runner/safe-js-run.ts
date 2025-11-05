"use client";

import { safe } from 'ts-safe';

import {
  CodeRunnerOptions,
  CodeRunnerResult,
  LogEntry,
} from './code-runner.interface';

const FORBIDDEN_KEYWORDS = [
  'document.',
  'globalThis.',
  'self.',
  'window',
  'frames',
  'opener',
  'eval',
  'constructor',
  'prototype',
  '__proto__',
  'process.',
  'require',
  'exports',
  'Worker',
  'SharedWorker',
  'ServiceWorker',
  'MessageChannel',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
];

function validateCodeSafety(code: string): string | null {
  for (const keyword of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`);
    if (regex.test(code)) {
      return `Forbidden keyword: '${keyword}' - not allowed for security reasons`;
    }
  }

  const infiniteLoopPatterns = [
    {
      pattern: /while\s*\(\s*true\s*\)/,
      message: 'Infinite while loop detected',
    },
    {
      pattern: /for\s*\(\s*;\s*;\s*\)/,
      message: 'Infinite for loop detected',
    },
    {
      pattern: /while\s*\(\s*1\s*\)/,
      message: 'Infinite while loop detected',
    },
    {
      pattern: /for\s*\(\s*;\s*true\s*;\s*\)/,
      message: 'Infinite for loop detected',
    },
  ];

  for (const { pattern, message } of infiniteLoopPatterns) {
    if (pattern.test(code)) {
      return `Dangerous infinite loop pattern: ${message}`;
    }
  }

  const suspiciousPatterns = [
    {
      pattern: /['"`]\s*\+\s*['"`]/g,
      message: 'String concatenation to access globals',
    },
    {
      pattern: /\[['"`][a-zA-Z_$][a-zA-Z0-9_$]*['"`]\]/g,
      message: 'Dynamic property access',
    },
    { pattern: /eval\s*\(/, message: 'Dynamic code evaluation' },
    { pattern: /(new\s+)?Function\s*\(/, message: 'Function constructor' },
    { pattern: /constructor\s*\(/, message: 'Constructor access' },
    { pattern: /prototype\s*\[/, message: 'Prototype manipulation' },
    {
      pattern: /(__proto__|\.constructor)/,
      message: 'Prototype chain access',
    },
  ];

  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(code)) {
      return `Suspicious pattern detected: ${message}`;
    }
  }

  return null;
}

function createSafeEnvironment(
  logCapture: (type: LogEntry['type'], ...args: any[]) => void,
) {
  const safeConsole = {
    log: (...args: any[]) => logCapture('log', ...args),
    info: (...args: any[]) => logCapture('info', ...args),
    warn: (...args: any[]) => logCapture('warn', ...args),
    error: (...args: any[]) => logCapture('error', ...args),
    debug: (...args: any[]) => logCapture('debug', ...args),
    trace: (...args: any[]) => logCapture('trace', ...args),
  };

  const safeGlobals = {
    console: safeConsole,
    Math,
    JSON,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    ...(typeof self !== 'undefined' && {
      fetch: self.fetch,
      setTimeout: self.setTimeout,
      setInterval: self.setInterval,
      clearTimeout: self.clearTimeout,
      clearInterval: self.clearInterval,
      btoa: self.btoa,
      atob: self.atob,
    }),
    ...(typeof global !== 'undefined' &&
      typeof self === 'undefined' && {
        setTimeout: global.setTimeout.bind(global),
        setInterval: global.setInterval.bind(global),
        clearTimeout: global.clearTimeout.bind(global),
        clearInterval: global.clearInterval.bind(global),
      }),
  };

  return { safeGlobals };
}

function wrapCode(code: string): string {
  return `"use strict";\nreturn (async () => {\n${code}\n})()`;
}

async function execute({
  code,
  timeout = 5000,
  onLog,
}: CodeRunnerOptions): Promise<CodeRunnerResult> {
  const startTime = Date.now();
  const logs: LogEntry[] = [];
  let returnValue: any = undefined;

  const logCapture = (type: LogEntry['type'], ...args: any[]) => {
    const entry: LogEntry = {
      type,
      args: args.map((v) => ({
        type: 'data',
        value: v,
      })),
    };
    logs.push(entry);

    if (onLog) onLog(entry);
  };

  const securityError = validateCodeSafety(code);
  if (securityError) {
    return {
      success: false,
      error: securityError,
      logs,
      executionTimeMs: Date.now() - startTime,
    };
  }

  const { safeGlobals } = createSafeEnvironment(logCapture);
  const wrappedCode = wrapCode(code);

  try {
    await Promise.race([
      new Promise(async (resolve, reject) => {
        try {
          const func = new Function(...Object.keys(safeGlobals), wrappedCode);
          const result = func(...Object.values(safeGlobals));

          if (result && typeof result.then === 'function') {
            returnValue = await result;
          } else {
            returnValue = result;
          }

          resolve(undefined);
        } catch (error: any) {
          reject(error);
        }
      }),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Execution timeout: ${timeout}ms limit exceeded`));
        }, timeout);
      }),
    ]);

    return {
      success: true,
      logs,
      executionTimeMs: Date.now() - startTime,
      result: returnValue,
    };
  } catch (error: any) {
    logs.push({
      type: 'error',
      args: [{ type: 'data', value: error }],
    });
    return {
      success: false,
      error: error.message || 'Unknown execution error',
      logs,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

export async function safeJsRun({
  code,
  timeout = 5000,
  onLog,
}: CodeRunnerOptions): Promise<CodeRunnerResult> {
  return safe(async () => {
    const result = await execute({
      code,
      timeout,
      onLog,
    });

    if (!result.success) {
      throw new Error(result.error || 'Code execution failed');
    }

    return {
      logs: result.logs,
      executionTimeMs: result.executionTimeMs,
      result: result.result,
      success: true,
    };
  })
    .ifFail((err) => {
      return {
        success: false,
        error: err.message,
        logs: [],
        solution: `JavaScript execution failed. Common issues:
    • Syntax errors: Check for missing semicolons, brackets, or quotes
    • Forbidden operations: Avoid DOM access, eval(), or global object manipulation  
    • Infinite loops: Code execution times out after ${timeout}ms
    • API errors: Check network connectivity for fetch() calls
    • Type errors: Verify data types and object properties exist
    • Reference errors: Make sure all variables and functions are defined
    
    Available APIs: Math, JSON, Date, fetch, setTimeout, console.log
    Input data properties are available as variables in your code scope.
    Use console.log() to output results and debug information.`,
      };
    })
    .unwrap();
}
