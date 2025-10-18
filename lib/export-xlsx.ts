import * as XLSX from 'xlsx';

function sanitizeSheetName(name: string): string {
  let sanitized = name.replace(/[:\\\/?*\[\]]/g, ' ').trim();
  if (sanitized.length === 0) sanitized = 'Sheet';
  if (sanitized.length > 31) sanitized = sanitized.slice(0, 31).trim();
  return sanitized;
}

function dedupeSheetName(base: string, used: Set<string>): string {
  let name = sanitizeSheetName(base);
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  let i = 2;
  while (true) {
    let candidate = name;
    const suffix = `_${i}`;
    if (candidate.length + suffix.length > 31) {
      candidate = candidate.slice(0, 31 - suffix.length);
    }
    candidate = candidate + suffix;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    i++;
  }
}

function parseMarkdownTables(markdown: string): Array<{ name: string; headers: string[]; rows: string[][] }> {
  const lines = markdown.split(/\r?\n/);
  const tables: Array<{ name: string; headers: string[]; rows: string[][] }> = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const headingMatch = line.match(/^###\s*Table:\s*(.+)$/i);
    if (headingMatch) {
      const name = headingMatch[1].trim();
      i += 1;
      while (i < lines.length && lines[i].trim() === '') i += 1;
      const tableStart = i;
      const tableLines: string[] = [];
      while (i < lines.length) {
        const l = lines[i];
        if (/^\s*\|.*\|\s*$/.test(l)) {
          tableLines.push(l.trim());
          i += 1;
          continue;
        }
        break;
      }

      if (tableLines.length >= 2 && /\|\s*[-:]+/.test(tableLines[1])) {
        const header = tableLines[0]
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        const body = tableLines.slice(2).map((r) => r.slice(1, -1).split('|').map((c) => c.trim()));
        tables.push({ name, headers: header, rows: body });
      } else {
        // Not a valid GFM table, skip to next line after where we started looking
        i = tableStart + 1;
      }
      continue;
    }
    i += 1;
  }

  // Fallback: if no headings but a single table exists, use a default name
  if (tables.length === 0) {
    const simpleTableMatch = markdown.match(/(^|\n)\s*\|[^\n]+\|\s*\n\s*\|\s*[-:]+[^\n]*\|[\s\S]*?(?=\n\S|$)/);
    if (simpleTableMatch) {
      const block = simpleTableMatch[0].split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (block.length >= 2) {
        const headers = block[1].match(/\|\s*[-:]+/)
          ? block[0].slice(1, -1).split('|').map((c) => c.trim())
          : [];
        const rows = block.slice(2).map((r) => r.slice(1, -1).split('|').map((c) => c.trim()));
        if (headers.length > 0) tables.push({ name: 'Table', headers, rows });
      }
    }
  }

  return tables;
}

export function markdownTablesToXlsx(markdown: string, workbookName = 'pdf-to-excel'): Blob {
  const tables = parseMarkdownTables(markdown);
  if (tables.length === 0) {
    // Return an empty (but valid) workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Aucune table détectée"]]);
    XLSX.utils.book_append_sheet(wb, ws, 'Feuille1');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const t of tables) {
    const aoa: any[][] = [t.headers, ...t.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const sheetName = dedupeSheetName(t.name || 'Table', usedNames);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
