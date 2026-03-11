'use client';

import { useState, useCallback } from 'react';
import type { TestReport, ModelTestResult, ToolTestResult, AutoGroupTestResult, TestStatus } from '@/app/api/test/route';

// ─── Status badge ─────────────────────────────────────────────────────────────

function Badge({ status }: { status: TestStatus }) {
  const map: Record<TestStatus, { label: string; cls: string }> = {
    pass: { label: '✓ Pass', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
    fail: { label: '✗ Fail', cls: 'bg-red-500/15 text-red-400 border border-red-500/30' },
    skip: { label: '— Skip', cls: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-700/60 bg-zinc-900 p-4">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

// ─── Model results table ──────────────────────────────────────────────────────

function ModelsTable({ results }: { results: ModelTestResult[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700/60">
      <table className="w-full text-sm">
        <thead className="bg-zinc-800/80">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Model</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Time</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Preview / Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {results.map((r) => (
            <tr key={r.model} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-white">{r.label}</div>
                <div className="text-xs text-zinc-500 font-mono">{r.model}</div>
              </td>
              <td className="px-4 py-3">
                <Badge status={r.status} />
              </td>
              <td className="px-4 py-3 text-zinc-400 tabular-nums">
                {r.responseMs > 0 ? `${r.responseMs.toLocaleString()}ms` : '—'}
              </td>
              <td className="px-4 py-3 max-w-xs">
                {r.status === 'fail' && r.error ? (
                  <span className="text-red-400 text-xs font-mono break-all">{r.error}</span>
                ) : r.preview ? (
                  <span className="text-zinc-400 text-xs truncate block">{r.preview}</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tool results table ───────────────────────────────────────────────────────

function ToolsTable({ results }: { results: ToolTestResult[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700/60">
      <table className="w-full text-sm">
        <thead className="bg-zinc-800/80">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Tool</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Time</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {results.map((r) => (
            <tr key={r.tool} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
              <td className="px-4 py-3">
                <span className="font-mono text-sm text-zinc-200">{r.tool}</span>
              </td>
              <td className="px-4 py-3">
                <Badge status={r.status} />
              </td>
              <td className="px-4 py-3 text-zinc-400 tabular-nums">
                {r.responseMs > 0 ? `${r.responseMs.toLocaleString()}ms` : '—'}
              </td>
              <td className="px-4 py-3 max-w-xs">
                {r.status === 'skip' && r.skipReason ? (
                  <span className="text-zinc-500 text-xs">{r.skipReason}</span>
                ) : r.status === 'fail' && r.error ? (
                  <span className="text-red-400 text-xs font-mono break-all">{r.error}</span>
                ) : r.preview ? (
                  <span className="text-zinc-500 text-xs truncate block font-mono">{r.preview}</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Auto group results table ─────────────────────────────────────────────────

function AutoGroupTable({ results }: { results: AutoGroupTestResult[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700/60">
      <table className="w-full text-sm">
        <thead className="bg-zinc-800/80">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Model</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Tool Called</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Time</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {results.map((r) => (
            <tr key={r.model} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-white">{r.label}</div>
                <div className="text-xs text-zinc-500 font-mono">{r.model}</div>
                {r.note && (
                  <div className="text-xs text-amber-500/80 mt-0.5">{r.note}</div>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge status={r.status} />
              </td>
              <td className="px-4 py-3">
                {r.toolCalled ? (
                  <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
                    {r.toolCalled}
                  </span>
                ) : (
                  <span className="text-zinc-600 text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-zinc-400 tabular-nums">
                {r.responseMs > 0 ? `${r.responseMs.toLocaleString()}ms` : '—'}
              </td>
              <td className="px-4 py-3 max-w-xs">
                {r.status === 'fail' && r.error ? (
                  <span className="text-red-400 text-xs font-mono break-all">{r.error}</span>
                ) : r.preview ? (
                  <span className="text-zinc-500 text-xs truncate block">{r.preview}</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Progress indicator during run ───────────────────────────────────────────

function RunningIndicator() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-4">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
      </span>
      <p className="text-sm text-blue-300">
        Running tests — models, tools, and auto-group checks are running in parallel. This may take up to 60 seconds…
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestPage() {
  const [report, setReport] = useState<TestReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = useCallback(async () => {
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/api/test');
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Server returned ${res.status}: ${body}`);
      }
      const data: TestReport = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error');
    } finally {
      setRunning(false);
    }
  }, []);

  const passRate = (pass: number, total: number) =>
    total === 0 ? 'N/A' : `${Math.round((pass / total) * 100)}%`;

  const modelsTotal = report ? report.models.length : 0;
  const toolsTotal = report ? report.tools.length : 0;
  const autoTotal = report ? report.autoGroup.length : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SCX.ai — System Health</h1>
            <p className="mt-1 text-sm text-zinc-400">
              End-to-end checks for all AI models, tools, and auto-group tool calling
            </p>
            {report && (
              <p className="mt-1 text-xs text-zinc-600 font-mono">
                Last run: {new Date(report.timestamp).toLocaleString('en-AU')} · {report.summary.totalMs.toLocaleString()}ms total
              </p>
            )}
          </div>
          <button
            onClick={runTests}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running…
              </>
            ) : 'Run All Tests'}
          </button>
        </div>

        {/* Running state */}
        {running && <RunningIndicator />}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4">
            <p className="text-sm font-semibold text-red-400">Test run failed</p>
            <p className="mt-1 text-xs text-red-300 font-mono">{error}</p>
          </div>
        )}

        {/* Summary cards */}
        {report && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
              <StatCard label="Models ✓" value={report.summary.modelsPass} sub={passRate(report.summary.modelsPass, modelsTotal)} />
              <StatCard label="Models ✗" value={report.summary.modelsFail} />
              <StatCard label="Models —" value={report.summary.modelsSkip} />
              <StatCard label="Tools ✓" value={report.summary.toolsPass} sub={passRate(report.summary.toolsPass, toolsTotal - report.summary.toolsSkip)} />
              <StatCard label="Tools ✗" value={report.summary.toolsFail} />
              <StatCard label="Tools —" value={report.summary.toolsSkip} sub="Missing env" />
              <StatCard label="Auto ✓" value={report.summary.autoPass} sub={passRate(report.summary.autoPass, autoTotal)} />
              <StatCard label="Auto ✗" value={report.summary.autoFail} />
              <StatCard label="Auto —" value={report.summary.autoSkip} />
            </div>

            {/* Models */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
                Models
                <span className="text-xs font-normal text-zinc-500">
                  ({report.summary.modelsPass}/{modelsTotal} responding)
                </span>
              </h2>
              <ModelsTable results={report.models} />
            </section>

            {/* Auto group */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                Auto Group — Tool Calling
                <span className="text-xs font-normal text-zinc-500">
                  ({report.summary.autoPass}/{autoTotal} models call tools correctly)
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Each model is asked to call the <code className="text-zinc-400">datetime</code> tool. Models that don&apos;t support function calling automatically fall back to deepseek-v3.
              </p>
              <AutoGroupTable results={report.autoGroup} />
            </section>

            {/* Tools */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 inline-block" />
                Tools
                <span className="text-xs font-normal text-zinc-500">
                  ({report.summary.toolsPass}/{toolsTotal - report.summary.toolsSkip} responding, {report.summary.toolsSkip} skipped)
                </span>
              </h2>
              <ToolsTable results={report.tools} />
            </section>
          </>
        )}

        {/* Empty state */}
        {!report && !running && !error && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 py-20 text-center">
            <p className="text-zinc-400 text-sm">Press <span className="font-semibold text-white">Run All Tests</span> to check every model and tool.</p>
            <p className="mt-1 text-xs text-zinc-600">Tests run in parallel — results appear when complete.</p>
          </div>
        )}
      </div>
    </div>
  );
}
