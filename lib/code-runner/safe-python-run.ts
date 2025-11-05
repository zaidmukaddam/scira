"use client";

import { safe } from 'ts-safe';

import {
  CodeRunnerOptions,
  CodeRunnerResult,
  LogEntry,
} from './code-runner.interface';

function validateCodeSafety(code: string): string | null {
  if (code.includes('os.system')) return 'Forbidden: os.system';
  return null;
}

export const OUTPUT_HANDLERS = {
  matplotlib: `
    import io
    import base64
    from matplotlib import pyplot as plt

    plt.clf()
    plt.close('all')
    plt.switch_backend('agg')

    def setup_matplotlib_output():
        def custom_show():
            if plt.gcf().get_size_inches().prod() * plt.gcf().dpi ** 2 > 25_000_000:
                print("Warning: Plot size too large, reducing quality")
                plt.gcf().set_dpi(100)

            png_buf = io.BytesIO()
            plt.savefig(png_buf, format='png')
            png_buf.seek(0)
            png_base64 = base64.b64encode(png_buf.read()).decode('utf-8')
            print(f'data:image/png;base64,{png_base64}')
            png_buf.close()

            plt.clf()
            plt.close('all')

        plt.show = custom_show
  `,
  basic: ``,
};

async function ensurePyodideLoaded(): Promise<any> {
  if ((globalThis as any).loadPyodide) {
    return (globalThis as any).loadPyodide;
  }

  const isWorker = typeof (globalThis as any).importScripts !== 'undefined';

  if (isWorker) {
    try {
      (globalThis as any).importScripts(
        'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js',
      );
      return (globalThis as any).loadPyodide;
    } catch {
      throw new Error('Failed to load Pyodide script in worker');
    }
  } else {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"]',
    );

    if (existingScript) {
      if ((globalThis as any).loadPyodide) {
        return (globalThis as any).loadPyodide;
      }
      await new Promise<void>((resolve, reject) => {
        existingScript.addEventListener('load', () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Failed to load Pyodide script')),
          { once: true },
        );
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error('Failed to load Pyodide script'));
        document.head.appendChild(script);
      });
    }
  }

  return (globalThis as any).loadPyodide;
}

function detectRequiredHandlers(code: string): string[] {
  const handlers: string[] = ['basic'];
  if (code.includes('matplotlib') || code.includes('plt.')) {
    handlers.push('matplotlib');
  }
  return handlers;
}

export async function safePythonRun({
  code,
  timeout = 30000,
  onLog,
}: CodeRunnerOptions): Promise<CodeRunnerResult> {
  return safe(async () => {
    const startTime = Date.now();
    const logs: LogEntry[] = [];

    const securityError = validateCodeSafety(code);
    if (securityError) throw new Error(securityError);

    const loadPyodide = await ensurePyodideLoaded();

    const pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
    });

    pyodide.setStdout({
      batched: (output: string) => {
        const type = output.startsWith('data:image/png;base64')
          ? 'image'
          : 'data';
        logs.push({ type: 'log', args: [{ type, value: output }] });
        onLog?.({ type: 'log', args: [{ type, value: output }] });
      },
    });
    pyodide.setStderr({
      batched: (output: string) => {
        logs.push({ type: 'error', args: [{ type: 'data', value: output }] });
        onLog?.({ type: 'error', args: [{ type: 'data', value: output }] });
      },
    });

    await pyodide.loadPackagesFromImports(code);
    const requiredHandlers = detectRequiredHandlers(code);
    for (const handler of requiredHandlers) {
      await pyodide.runPythonAsync(
        OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS],
      );
      if (handler === 'matplotlib') {
        await pyodide.runPythonAsync('setup_matplotlib_output()');
      }
    }

    const execution = pyodide.runPythonAsync(code);
    const timer = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout),
    );
    const returnValue = await Promise.race([execution, timer]);

    return {
      success: true,
      logs,
      executionTimeMs: Date.now() - startTime,
      result: returnValue,
    } as CodeRunnerResult;
  })
    .ifFail((err) => ({
      success: false,
      error: err.message,
      logs: [],
      solution: 'Python execution failed. Check syntax, imports, or timeout.',
    }))
    .unwrap();
}
