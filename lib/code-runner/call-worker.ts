"use client";

import { v4 as uuidv4 } from 'uuid';

import {
  CodeRunnerOptions,
  CodeRunnerResult,
  CodeWorkerRequest,
  CodeWorkerResponse,
} from './code-runner.interface';

function createDebounce() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (callback: () => void, delay: number) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(callback, delay);
  };
}

export function callCodeRunWorker(
  type: 'javascript' | 'python',
  option: CodeRunnerOptions,
): Promise<CodeRunnerResult> {
  let timeoutToken: ReturnType<typeof setTimeout> | undefined;
  const debounceTerminate = createDebounce();
  let active = true;

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

  const terminate = () => {
    debounceTerminate(() => {
      worker.terminate();
    }, 5000);
  };

  const promise = new Promise<CodeRunnerResult>((resolve) => {
    const id = uuidv4();
    const request: CodeWorkerRequest = {
      id,
      type,
      code: option.code,
      timeout: option.timeout,
    };

    setTimeout(() => {
      worker.postMessage(request);
    }, 1000);

    worker.onmessage = (event) => {
      const response = event.data as CodeWorkerResponse;
      if (response.id !== id) return;

      if (response.type === 'log') {
        option.onLog?.(response.entry);
        if (!active) terminate();
      } else {
        resolve(response.result as CodeRunnerResult);
        if (timeoutToken) {
          clearTimeout(timeoutToken);
        }
        terminate();
      }
    };
  });

  const race = Promise.race([
    promise,
    new Promise<CodeRunnerResult>((resolve) => {
      timeoutToken = setTimeout(() => {
        const errorResult: CodeRunnerResult = {
          success: false,
          logs: [
            {
              type: 'error',
              args: [
                {
                  type: 'data',
                  value: JSON.stringify({
                    type: 'error',
                    message: 'Timeout',
                  }),
                },
              ],
            },
          ],
          error: 'Timeout',
        };
        resolve(errorResult);
        terminate();
      }, option.timeout || 40000);
    }),
  ]);

  return race.finally(() => {
    active = false;
  });
}
