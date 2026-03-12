'use client';

import { useState, useCallback } from 'react';
import { models } from '@/ai/models';
import type { TestReport, ModelTestResult, ToolTestResult, AutoGroupTestResult, StreamTestResult, TestStatus } from '@/app/api/test/route';

// ─── Retry button ──────────────────────────────────────────────────────────────

function RetryBtn({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title="Retry this test"
      className="ml-2 inline-flex items-center justify-center rounded-md w-6 h-6 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
    >
      {loading ? (
        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )}
    </button>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────

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

// ─── Capability pill ───────────────────────────────────────────────────────────

function CapPill({ yes, label }: { yes: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${
      yes
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
        : 'bg-zinc-800 text-zinc-600 border-zinc-700/50'
    }`}>
      <span>{yes ? '✓' : '✗'}</span>
      {label}
    </span>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, variant }: { label: string; value: number; sub?: string; variant?: 'pass' | 'fail' | 'skip' | 'neutral' }) {
  const color = variant === 'fail' && value > 0
    ? 'text-red-400'
    : variant === 'pass'
    ? 'text-emerald-400'
    : 'text-white';
  return (
    <div className="rounded-xl border border-zinc-700/60 bg-zinc-900 p-4">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ dot, title, sub }: { dot: string; title: string; sub?: string }) {
  return (
    <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
      <span className={`h-1.5 w-1.5 rounded-full inline-block ${dot}`} />
      {title}
      {sub && <span className="text-xs font-normal text-zinc-500">({sub})</span>}
    </h2>
  );
}

// ─── Models table ──────────────────────────────────────────────────────────────

function ModelsTable({ results, retrying, onRetry }: {
  results: ModelTestResult[];
  retrying: Set<string>;
  onRetry: (scope: string, id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-700/60">
      <table className="w-full text-sm">
        <thead className="bg-zinc-800/80">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Model</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Time</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Preview / Error</th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {results.map((r) => (
            <tr key={r.model} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-white">{r.label}</div>
                <div className="text-xs text-zinc-500 font-mono">{r.model}</div>
              </td>
              <td className="px-4 py-3"><Badge status={r.status} /></td>
              <td className="px-4 py-3 text-zinc-400 tabular-nums">
                {r.responseMs > 0 ? `${r.responseMs.toLocaleString()}ms` : '—'}
              </td>
              <td className="px-4 py-3 max-w-sm">
                {r.status === 'fail' && r.error
                  ? <span className="text-red-400 text-xs font-mono break-all">{r.error}</span>
                  : r.preview
                  ? <span className="text-zinc-400 text-xs truncate block">{r.preview}</span>
                  : null}
              </td>
              <td className="px-2 py-3">
                <RetryBtn
                  loading={retrying.has(`model:${r.model}`)}
                  onClick={() => onRetry('model', r.model)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Stream table ──────────────────────────────────────────────────────────────

function StreamTable({ results, retrying, onRetry }: {
  results: StreamTestResult[];
  retrying: Set<string>;
  onRetry: (scope: string, id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-700/60">
      <table className="w-full text-sm">
        <thead className="bg-zinc-800/80">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Model</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 whitespace-nowrap">TTFT</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 whitespace-nowrap">Total</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Chars</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Preview / Error</th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {results.map((r) => (
            <tr key={r.model} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-white">{r.label}</div>
                <div className="text-xs text-zinc-500 font-mono">{r.model}</div>
              </td>
              <td className="px-4 py-3"><Badge status={r.status} /></td>
              <td className="px-4 py-3 tabular-nums">
                {r.ttftMs >= 0
                  ? <span className={`text-sm font-medium ${r.ttftMs < 1000 ? 'text-emerald-400' : r.ttftMs < 3000 ? 'text-amber-400' : 'text-red-400'}`}>
                      {r.ttftMs.toLocaleString()}ms
                    </span>
                  : <span className="text-zinc-600">—</span>}
              </td>
              <td className="px-4 py-3 text-zinc-400 tabular-nums">
                {r.totalMs > 0 ? `${r.totalMs.toLocaleString()}ms` : '—'}
              </td>
              <td className="px-4 py-3 text-zinc-400 tabular-nums">{r.charCount > 0 ? r.charCount : '—'}</td>
              <td className="px-4 py-3 max-w-sm">
                {r.status === 'fail' && r.error
                  ? <span className="text-red-400 text-xs font-mono break-all">{r.error}</span>
                  : r.preview
                  ? <span className="text-zinc-400 text-xs truncate block font-mono">{r.preview}</span>
                  : null}
              </td>
              <td className="px-2 py-3">
                <RetryBtn
                  loading={retrying.has(`stream:${r.model}`)}
                  onClick={() => onRetry('stream', r.model)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Auto group table ──────────────────────────────────────────────────────────

function AutoGroupTable({ results, retrying, onRetry }: {
  results: AutoGroupTestResult[];
  retrying: Set<string>;
  onRetry: (scope: string, id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-700/60">
      <table className="w-full text-sm">
        <thead className="bg-zinc-800/80">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Model</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Tool Called</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Time</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Details</th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {results.map((r) => (
            <tr key={r.model} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-white">{r.label}</div>
                <div className="text-xs text-zinc-500 font-mono">{r.model}</div>
                {r.note && <div className="text-xs text-amber-500/80 mt-0.5">{r.note}</div>}
              </td>
              <td className="px-4 py-3"><Badge status={r.status} /></td>
              <td className="px-4 py-3">
                {r.toolCalled
                  ? <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">{r.toolCalled}</span>
                  : <span className="text-zinc-600 text-xs">—</span>}
              </td>
              <td className="px-4 py-3 text-zinc-400 tabular-nums">
                {r.responseMs > 0 ? `${r.responseMs.toLocaleString()}ms` : '—'}
              </td>
              <td className="px-4 py-3 max-w-sm">
                {r.status === 'fail' && r.error
                  ? <span className="text-red-400 text-xs font-mono break-all">{r.error}</span>
                  : r.preview
                  ? <span className="text-zinc-500 text-xs truncate block">{r.preview}</span>
                  : null}
              </td>
              <td className="px-2 py-3">
                <RetryBtn
                  loading={retrying.has(`auto:${r.model}`)}
                  onClick={() => onRetry('auto', r.model)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tools table ───────────────────────────────────────────────────────────────

function ToolsTable({ results, retrying, onRetry }: {
  results: ToolTestResult[];
  retrying: Set<string>;
  onRetry: (scope: string, id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-700/60">
      <table className="w-full text-sm">
        <thead className="bg-zinc-800/80">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Tool</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Time</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Details</th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {results.map((r) => (
            <tr key={r.tool} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
              <td className="px-4 py-3">
                <span className="font-mono text-sm text-zinc-200">{r.tool}</span>
              </td>
              <td className="px-4 py-3"><Badge status={r.status} /></td>
              <td className="px-4 py-3 text-zinc-400 tabular-nums">
                {r.responseMs > 0 ? `${r.responseMs.toLocaleString()}ms` : '—'}
              </td>
              <td className="px-4 py-3 max-w-sm">
                {r.status === 'skip' && r.skipReason
                  ? <span className="text-zinc-500 text-xs">{r.skipReason}</span>
                  : r.status === 'fail' && r.error
                  ? <span className="text-red-400 text-xs font-mono break-all">{r.error}</span>
                  : r.preview
                  ? <span className="text-zinc-500 text-xs truncate block font-mono">{r.preview}</span>
                  : null}
              </td>
              <td className="px-2 py-3">
                <RetryBtn
                  loading={retrying.has(`tool:${r.tool}`)}
                  onClick={() => onRetry('tool', r.tool)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Capabilities matrix ───────────────────────────────────────────────────────

function CapabilitiesMatrix() {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-700/60">
      <table className="w-full text-sm">
        <thead className="bg-zinc-800/80">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Model</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Tool Calling</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Parallel Tools</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Vision</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Reasoning</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Tier</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Max Tokens</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Docs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {models.map((m) => (
            <tr key={m.value} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-white">{m.label}</div>
                <div className="text-xs text-zinc-500 font-mono">{m.value}</div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {m.fast && <span className="text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full px-2 py-0.5">fast</span>}
                  {m.experimental && <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">experimental</span>}
                  {m.freeUnlimited && <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">free</span>}
                </div>
              </td>
              <td className="px-4 py-3"><CapPill yes={m.supportsFunctionCalling ?? false} label="tools" /></td>
              <td className="px-4 py-3"><CapPill yes={m.supportsParallelToolCalling ?? false} label="parallel" /></td>
              <td className="px-4 py-3"><CapPill yes={m.vision} label="vision" /></td>
              <td className="px-4 py-3"><CapPill yes={m.reasoning} label="reasoning" /></td>
              <td className="px-4 py-3">
                {m.pro
                  ? <span className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full px-2 py-0.5">Pro</span>
                  : <span className="text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-full px-2 py-0.5">Free</span>}
              </td>
              <td className="px-4 py-3 text-zinc-400 tabular-nums text-xs">
                {m.maxOutputTokens.toLocaleString()}
                {m.maxContextTokens && <span className="text-zinc-600"> / {(m.maxContextTokens / 1000).toFixed(0)}K ctx</span>}
              </td>
              <td className="px-4 py-3"><CapPill yes={m.documentSupport ?? false} label="docs" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Progress indicator ────────────────────────────────────────────────────────

function RunningIndicator() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-4">
      <span className="relative flex h-3 w-3 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
      </span>
      <p className="text-sm text-blue-300">
        Running tests — models, streaming, tools, and auto-group checks running in parallel. This may take up to 60 seconds…
      </p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TestPage() {
  const [report, setReport] = useState<TestReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

  const runTests = useCallback(async () => {
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/api/test');
      if (!res.ok) throw new Error(`Server returned ${res.status}: ${await res.text()}`);
      setReport(await res.json());
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error');
    } finally {
      setRunning(false);
    }
  }, []);

  const retryItem = useCallback(async (scope: string, id: string) => {
    const key = `${scope}:${id}`;
    setRetrying((prev) => new Set([...prev, key]));
    try {
      const res = await fetch(`/api/test?scope=${scope}&id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();

      setReport((prev) => {
        if (!prev) return prev;
        if (data.type === 'model') return { ...prev, models: prev.models.map((m) => m.model === id ? data.result : m) };
        if (data.type === 'stream') return { ...prev, streams: prev.streams.map((s) => s.model === id ? data.result : s) };
        if (data.type === 'auto') return { ...prev, autoGroup: prev.autoGroup.map((a) => a.model === id ? data.result : a) };
        if (data.type === 'tool') return { ...prev, tools: prev.tools.map((t) => t.tool === id ? data.result : t) };
        return prev;
      });
    } catch {
      // Silently ignore — the row keeps its previous state
    } finally {
      setRetrying((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  }, []);

  const passRate = (pass: number, total: number) =>
    total === 0 ? 'N/A' : `${Math.round((pass / total) * 100)}%`;

  const modelsTotal = report?.models.length ?? 0;
  const toolsTotal = report?.tools.length ?? 0;
  const autoTotal = report?.autoGroup.length ?? 0;
  const streamsTotal = report?.streams.length ?? 0;
  const toolsTested = toolsTotal - (report?.summary.toolsSkip ?? 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="w-full px-4 sm:px-6 lg:px-10 py-10 space-y-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SCX.ai — System Health</h1>
            <p className="mt-1 text-sm text-zinc-400">
              End-to-end checks for all AI models, streaming, tools, and auto-group tool calling
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

        {running && <RunningIndicator />}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4">
            <p className="text-sm font-semibold text-red-400">Test run failed</p>
            <p className="mt-1 text-xs text-red-300 font-mono">{error}</p>
          </div>
        )}

        {/* Summary cards */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-11 gap-3">
            <StatCard label="Models ✓" value={report.summary.modelsPass} variant="pass" sub={passRate(report.summary.modelsPass, modelsTotal)} />
            <StatCard label="Models ✗" value={report.summary.modelsFail} variant="fail" />
            <StatCard label="Stream ✓" value={report.summary.streamsPass} variant="pass" sub={passRate(report.summary.streamsPass, streamsTotal)} />
            <StatCard label="Stream ✗" value={report.summary.streamsFail} variant="fail" />
            <StatCard label="Auto ✓" value={report.summary.autoPass} variant="pass" sub={passRate(report.summary.autoPass, autoTotal - report.summary.autoSkip)} />
            <StatCard label="Auto ✗" value={report.summary.autoFail} variant="fail" />
            <StatCard label="Auto —" value={report.summary.autoSkip} variant="skip" sub="No tool calling" />
            <StatCard label="Tools ✓" value={report.summary.toolsPass} variant="pass" sub={passRate(report.summary.toolsPass, toolsTested)} />
            <StatCard label="Tools ✗" value={report.summary.toolsFail} variant="fail" />
            <StatCard label="Tools —" value={report.summary.toolsSkip} variant="skip" sub="Missing env" />
            <StatCard label="Total" value={report.summary.totalMs} sub="ms elapsed" />
          </div>
        )}

        {/* Capabilities matrix — always visible, static data */}
        <section className="space-y-3">
          <SectionHeader dot="bg-zinc-400" title="Model Capabilities" sub="static — from model config" />
          <p className="text-xs text-zinc-500">
            Derived from model definitions. No LLM calls involved.
          </p>
          <CapabilitiesMatrix />
        </section>

        {/* Dynamic results — only shown after a test run */}
        {report && (
          <>
            <section className="space-y-3">
              <SectionHeader
                dot="bg-blue-400"
                title="Models — Basic Response"
                sub={`${report.summary.modelsPass}/${modelsTotal} responding`}
              />
              <ModelsTable results={report.models} retrying={retrying} onRetry={retryItem} />
            </section>

            <section className="space-y-3">
              <SectionHeader
                dot="bg-cyan-400"
                title="Models — Streaming (TTFT)"
                sub={`${report.summary.streamsPass}/${streamsTotal} streaming`}
              />
              <p className="text-xs text-zinc-500">
                Time to first token (TTFT) measures latency from request to first streamed byte.
                Green &lt; 1 s · Amber &lt; 3 s · Red ≥ 3 s.
              </p>
              <StreamTable results={report.streams} retrying={retrying} onRetry={retryItem} />
            </section>

            <section className="space-y-3">
              <SectionHeader
                dot="bg-amber-400"
                title="Auto Group — Tool Calling"
                sub={`${report.summary.autoPass}/${autoTotal - report.summary.autoSkip} models call tools correctly`}
              />
              <p className="text-xs text-zinc-500">
                Each model with function-calling support is asked to call the <code className="text-zinc-400">datetime</code> tool.
                Models without function calling are skipped — <code className="text-zinc-400">llama-4</code> handles tool repair in production via{' '}
                <code className="text-zinc-400">experimental_repairToolCall</code>.
              </p>
              <AutoGroupTable results={report.autoGroup} retrying={retrying} onRetry={retryItem} />
            </section>

            <section className="space-y-3">
              <SectionHeader
                dot="bg-purple-400"
                title="Tools — Direct Execution"
                sub={`${report.summary.toolsPass}/${toolsTested} responding, ${report.summary.toolsSkip} skipped`}
              />
              <ToolsTable results={report.tools} retrying={retrying} onRetry={retryItem} />
            </section>
          </>
        )}

        {/* Empty state */}
        {!report && !running && !error && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 py-20 text-center">
            <p className="text-zinc-400 text-sm">
              Press <span className="font-semibold text-white">Run All Tests</span> to check every model, stream, and tool.
            </p>
            <p className="mt-1 text-xs text-zinc-600">Tests run in parallel — results appear when complete.</p>
          </div>
        )}
      </div>
    </div>
  );
}
