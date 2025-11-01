import { promises as fs } from 'node:fs';
import { join } from 'node:path';

import { appendCentralResponseStructure, CENTRAL_RESPONSE_STRUCTURE_MARKER } from '@/ai/prompts/response-structure';
import { CYRUS_PROMPT } from '@/ai/prompts/classification-cyrus';
import { LIBELLER_PROMPT } from '@/ai/prompts/correction-libeller';
import { NOMENCLATURE_DOUANIERE_PROMPT } from '@/ai/prompts/nomenclature-douaniere';
import { SMART_PDF_TO_EXCEL_PROMPT } from '@/ai/prompts/pdf-to-excel';

type CharteredPrompt = readonly [label: string, value: string];

const charteredPrompts: CharteredPrompt[] = [
  ['prompt:CYRUS_PROMPT', CYRUS_PROMPT],
  ['prompt:LIBELLER_PROMPT', LIBELLER_PROMPT],
  ['prompt:NOMENCLATURE_DOUANIERE_PROMPT', NOMENCLATURE_DOUANIERE_PROMPT],
  ['prompt:SMART_PDF_TO_EXCEL_PROMPT', SMART_PDF_TO_EXCEL_PROMPT],
];

const expectedCharteredGroups = ['cyrus', 'libeller', 'nomenclature', 'pdfExcel'] as const;

function expectContainsCharter({ label, value }: { label: string; value: string }) {
  if (!value.includes(CENTRAL_RESPONSE_STRUCTURE_MARKER)) {
    throw new Error(`${label} is missing the central response structure marker`);
  }

  if (appendCentralResponseStructure(value) !== value) {
    throw new Error(`${label} should already contain the central response structure`);
  }
}

function parseCharteredGroups(source: string): string[] {
  const match = source.match(/const\s+charteredGroups\s*=\s*\[(.*?)\]\s*as\s+const;/s);
  if (!match) {
    throw new Error('charteredGroups definition not found in app/actions.ts');
  }

  return match[1]
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.replace(/['"`]/g, ''))
    .filter(Boolean);
}

function expectCharteredGroups(source: string) {
  const groups = parseCharteredGroups(source);
  const expected = new Set(expectedCharteredGroups);

  if (groups.length !== expected.size || groups.some((group) => !expected.has(group))) {
    throw new Error(`charteredGroups must equal [${expectedCharteredGroups.join(', ')}]`);
  }

  if (!source.includes('appendCentralResponseStructure(value)')) {
    throw new Error('appendCentralResponseStructure must be applied within group instructions mapping');
  }
}

(async () => {
  for (const [label, value] of charteredPrompts) {
    expectContainsCharter({ label, value });
  }

  const actionsPath = join(process.cwd(), 'app', 'actions.ts');
  const actionsSource = await fs.readFile(actionsPath, 'utf8');

  expectCharteredGroups(actionsSource);

  console.log(`✅ Central response structure enforced for ${charteredPrompts.length} specialized prompts and selected group instructions.`);
})();
