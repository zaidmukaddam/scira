# Chart Sandbox Integration Guide

This document explains how the Chart Sandbox code execution and visualization toolkit is integrated into Hyper. It covers architecture, tool registration, UI wiring, validation steps, and troubleshooting tips.

## Directory Overview

```
lib/
├─ code-runner/
│  ├─ call-worker.ts          # Browser client orchestrating JS/Python workers
│  ├─ code-runner.interface.ts# Shared type definitions for the runners
│  ├─ safe-js-run.ts          # Hardened JavaScript sandbox
│  ├─ safe-python-run.ts      # Pyodide-based Python sandbox with stdout capture
│  └─ worker.ts               # Dedicated worker dispatching JS/Python execution
├─ tools/
│  ├─ js-run-tool.ts          # AI tool: execute JavaScript
│  ├─ python-run-tool.ts      # AI tool: execute Python
│  └─ visualization/
│     ├─ create-bar-chart.ts  # AI tool: build bar charts
│     ├─ create-line-chart.ts # AI tool: build line charts
│     ├─ create-pie-chart.ts  # AI tool: build pie charts
│     └─ create-table.ts      # AI tool: build interactive tables
└─ types/
   └─ chart-sandbox.ts        # Shared data contracts for sandbox results

components/
└─ tool-invocation/
   ├─ code-executor.tsx        # Renders JS/Python executions with logs & output tabs
   ├─ bar-chart-viewer.tsx     # Recharts-based bar chart renderer
   ├─ line-chart-viewer.tsx    # Recharts-based line chart renderer
   ├─ pie-chart-viewer.tsx     # Recharts-based pie chart renderer
   ├─ table-viewer.tsx         # Interactive table with CSV/Excel export
   └─ shared.tool-invocation.ts# Small helpers shared by the viewers

components/json-view-popup.tsx  # Dialog to inspect raw JSON payloads
lib/tools/__tests__/code-execution.test.ts # Schema regression tests
```

## Tool Registration

All tools are exported from `lib/tools/index.ts` and registered inside `app/api/search/route.ts`. The streaming handler exposes them under the following keys:

| Tool key         | Purpose                           |
|------------------|-----------------------------------|
| `js_run`         | Execute JavaScript in-browser      |
| `python_run`     | Execute Python via Pyodide         |
| `create_bar_chart` | Render multi-series bar charts  |
| `create_line_chart`| Render line charts               |
| `create_pie_chart` | Render pie charts               |
| `create_table`     | Render interactive data tables  |

Tool outputs are routed to the chat renderer (`components/message-parts/index.tsx`), which lazily loads the dedicated viewer components.

## Using the Sandbox in Chat

Each tool can be triggered naturally through chat prompts. A few examples:

- **JavaScript execution** – `Exécute ce code JavaScript : console.log('Hello Hyper');`
- **Python execution** – `Lance ce code Python pour calculer la suite de Fibonacci jusque 20.`
- **Bar chart** – `Génère un graphique en barres avec les ventes Q1/Q2 pour les régions Europe et US.`
- **Line chart** – `Trace un line chart de l'évolution quotidienne du trafic web (Desktop vs Mobile).`
- **Pie chart** – `Crée un pie chart montrant la répartition du budget marketing.`
- **Table** – `Crée un tableau interactif avec ces données et prépare un export Excel.`

The assistant automatically chooses the correct tool when the user request matches one of these patterns. The return payload contains both the formatted result and a JSON view accessible through the "JSON" button in each card.

## Architecture Notes

- **Workers & sandboxing**: `call-worker.ts` spins up a module worker (`lib/code-runner/worker.ts`) which routes execution to either `safeJsRun` or `safePythonRun`. Both runners include guardrails against infinite loops, prototype pollution, and forbidden APIs.
- **Pyodide**: `safe-python-run.ts` lazily loads Pyodide from `https://cdn.jsdelivr.net/pyodide/v0.23.4/full/`. The CSP allows this origin, and stdout/stderr are captured to stream logs (including base64-encoded Matplotlib images).
- **UI**: Viewer components rely on Hyper's design system (`components/ui/*`) and Recharts. JSON popups use a shared dialog to surface raw tool inputs/outputs.
- **Exports**: `TableViewer` exposes CSV/Excel download buttons powered by SheetJS (`xlsx`), loaded dynamically on demand.

## Adding New Visualizations

1. Create a new tool in `lib/tools/visualization/` with a Zod schema describing the payload. Keep the execute handler minimal (`return 'Success'`)—the UI renders the final result.
2. Add a corresponding viewer component under `components/tool-invocation/` making use of existing UI primitives.
3. Register the tool in `lib/tools/index.ts`, wire it up in `app/api/search/route.ts`, and extend the switch in `components/message-parts/index.tsx`.

## Validation Checklist

- [ ] JavaScript execution streams logs and results.
- [ ] Python execution (Pyodide) handles `print` output and Matplotlib charts.
- [ ] Bar, line, and pie charts render with the provided series.
- [ ] Interactive table supports search, sorting, column toggles, and CSV/Excel export.
- [ ] JSON popup surfaces raw tool payloads.
- [ ] Responsive layout verified on mobile & desktop.
- [ ] Dark/light mode tested.

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Pyodide fails to load | CSP or network blocks `cdn.jsdelivr.net` | Ensure `Content-Security-Policy` includes `https://cdn.jsdelivr.net` for `script-src` and `connect-src`. |
| Worker errors referencing `fs` | Node polyfills requested in browser | The webpack fallback disables `fs`, `net`, and `tls` in client bundles. |
| Long-running code never completes | Execution guard hit | Both sandboxes enforce timeouts (5s for JS, 30s for Python). Encourage users to optimise or chunk heavy tasks. |
| Logs truncated in chat history | Payload > 5 KB | The executor trims server-side storage while still streaming full logs to the UI. |

## Tests

The Vitest suite `lib/tools/__tests__/code-execution.test.ts` ensures tool schemas accept valid payloads and reject malformed inputs, guarding against accidental regressions in prompt bindings.

---

For questions or future extensions (e.g., scatter charts, pivot tables, or multi-step notebooks), follow the same pattern: define a tool schema, register it, and implement a viewer consistent with the Hyper UI.
