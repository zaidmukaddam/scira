import { promises as fs } from 'node:fs';
import { join } from 'node:path';

import { appendCentralResponseStructure } from '@/ai/prompts/response-structure';
import { CYRUS_PROMPT } from '@/ai/prompts/classification-cyrus';
import { LIBELLER_PROMPT } from '@/ai/prompts/correction-libeller';
import { NOMENCLATURE_DOUANIERE_PROMPT } from '@/ai/prompts/nomenclature-douaniere';
import { SMART_PDF_TO_EXCEL_PROMPT } from '@/ai/prompts/pdf-to-excel';

async function ensureActionsTemplateIncludesCharter() {
  const actionsPath = join(process.cwd(), 'app', 'actions.ts');
  const source = await fs.readFile(actionsPath, 'utf8');

  if (!source.includes('appendCentralResponseStructure(value)')) {
    throw new Error('appendCentralResponseStructure is not applied on group instructions in app/actions.ts');
  }

  const requiredGroups = ['web', 'academic', 'youtube', 'code', 'reddit', 'stocks', 'crypto', 'chat', 'cyrus', 'libeller', 'nomenclature', 'pdfExcel', 'extreme', 'x', 'memory', 'connectors', 'buddy'];
  for (const group of requiredGroups) {
    const pattern = new RegExp(`\\b${group}\\s*:`);
    if (!pattern.test(source)) {
      throw new Error(`Group instruction entry "${group}" is missing from app/actions.ts`);
    }
  }
}

function expectCharter(label: string, value: string) {
  if (appendCentralResponseStructure(value) !== value) {
    throw new Error(`${label} does not already contain the central response structure marker`);
  }
}

(async () => {
  await ensureActionsTemplateIncludesCharter();

  const promptChecks = [
    ['prompt:CYRUS_PROMPT', CYRUS_PROMPT],
    ['prompt:LIBELLER_PROMPT', LIBELLER_PROMPT],
    ['prompt:NOMENCLATURE_DOUANIERE_PROMPT', NOMENCLATURE_DOUANIERE_PROMPT],
    ['prompt:SMART_PDF_TO_EXCEL_PROMPT', SMART_PDF_TO_EXCEL_PROMPT],
  ] as const;

  for (const [label, value] of promptChecks) {
    expectCharter(label, value);
  }

  console.log(`✅ Central response structure detected across ${promptChecks.length} specialized prompts and group template configuration.`);
})();
