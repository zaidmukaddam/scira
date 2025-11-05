import { tool as createTool } from 'ai';
import { z } from 'zod';

const codeDescription = `Execute Python code in the user's browser via Pyodide.

Network access: use pyodide.http.open_url for HTTP/HTTPS, not urllib/request/requests. CORS must allow the app origin.
Example (CSV):
from pyodide.http import open_url
import pandas as pd
url = 'https://example.com/data.csv'
df = pd.read_csv(open_url(url))
print(df.head())

Output capture:
pyodide.setStdout({
  batched: (output: string) => {
    const type = output.startsWith('data:image/png;base64') ? 'image' : 'data'
    logs.push({ type: 'log', args: [{ type, value: output }] })
  },
})
pyodide.setStderr({
  batched: (output: string) => {
    logs.push({ type: 'error', args: [{ type: 'data', value: output }] })
  },
})`;

const inputSchema = z.object({
  code: z.string().describe(codeDescription),
});

export const pythonRunTool = createTool({
  description:
    "Execute Python code in the user's browser via Pyodide. Use pyodide.http.open_url for HTTP(S) downloads; CORS must allow the app origin.",
  inputSchema,
});
