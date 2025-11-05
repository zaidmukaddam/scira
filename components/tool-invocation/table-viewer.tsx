"use client";

import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';

import { JsonViewPopup } from '@/components/json-view-popup';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

export interface TableViewerColumn {
  key: string;
  label: string;
  type?: 'string' | 'number' | 'date' | 'boolean';
}

export interface TableViewerProps {
  title: string;
  description?: string | null;
  columns: TableViewerColumn[];
  data: Array<Record<string, unknown>>;
}

type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 20;

function formatCell(value: unknown, type: TableViewerColumn['type']) {
  if (value === null || value === undefined) {
    return '';
  }
  switch (type) {
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : Number(value).toLocaleString();
    case 'date':
      try {
        return new Date(value as string | number).toLocaleString();
      } catch (error) {
        return String(value);
      }
    case 'boolean':
      return Boolean(value);
    default:
      return String(value);
  }
}

function compareValues(a: unknown, b: unknown, type: TableViewerColumn['type'], direction: SortDirection) {
  const factor = direction === 'asc' ? 1 : -1;
  if (type === 'number') {
    const left = Number(a ?? 0);
    const right = Number(b ?? 0);
    return (left - right) * factor;
  }
  if (type === 'date') {
    const left = new Date(a as any).getTime();
    const right = new Date(b as any).getTime();
    return (left - right) * factor;
  }
  if (type === 'boolean') {
    const left = a ? 1 : 0;
    const right = b ? 1 : 0;
    return (left - right) * factor;
  }
  const left = String(a ?? '');
  const right = String(b ?? '');
  return left.localeCompare(right) * factor;
}

async function exportToExcel(columns: TableViewerColumn[], rows: Record<string, unknown>[], title: string) {
  const XLSX = await import('xlsx');
  const visibleKeys = columns.map((column) => column.key);
  const sheetData = [
    columns.map((column) => column.label),
    ...rows.map((row) => visibleKeys.map((key) => row[key])),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}.xlsx`);
}

function exportToCsv(columns: TableViewerColumn[], rows: Record<string, unknown>[], title: string) {
  const visibleKeys = columns.map((column) => column.key);
  const header = columns.map((column) => column.label).join(',');
  const content = rows
    .map((row) =>
      visibleKeys
        .map((key) => {
          const value = row[key];
          if (value === null || value === undefined) return '""';
          const formatted = String(value).replace(/"/g, '""');
          return `"${formatted}"`;
        })
        .join(','),
    )
    .join('\n');
  const csv = `${header}\n${content}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function TableViewer({ title, description, columns, data }: TableViewerProps) {
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map((column) => column.key)),
  );

  const processedData = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const filtered = data.filter((row) => {
      if (!searchValue) return true;
      return columns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(searchValue));
    });

    if (!sortColumn) {
      return filtered;
    }

    const columnDefinition = columns.find((column) => column.key === sortColumn);
    if (!columnDefinition) {
      return filtered;
    }

    const sorted = [...filtered].sort((a, b) =>
      compareValues(a[sortColumn], b[sortColumn], columnDefinition.type, sortDirection),
    );
    return sorted;
  }, [columns, data, search, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return processedData.slice(start, start + PAGE_SIZE);
  }, [processedData, currentPage]);

  const visibleColumnsArray = columns.filter((column) => visibleColumns.has(column.key));

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) {
          next.delete(key);
        }
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSort = (key: string) => {
    if (sortColumn !== key) {
      setSortColumn(key);
      setSortDirection('asc');
      return;
    }
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <Card className="bg-card">
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              Interactive Table · {title}
              <Badge variant="secondary" className="uppercase text-[10px] tracking-wide">Table</Badge>
            </CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          <JsonViewPopup data={{ title, description, columns, data }} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search across all columns"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="min-w-[120px] justify-start">
                <Eye className="mr-2 h-4 w-4" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={visibleColumns.has(column.key)}
                  onCheckedChange={() => toggleColumn(column.key)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="min-w-[120px] justify-start">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => exportToCsv(visibleColumnsArray, processedData, title)}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToExcel(visibleColumnsArray, processedData, title)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {visibleColumnsArray.map((column) => {
                  const isSortable = true;
                  const isActive = sortColumn === column.key;
                  return (
                    <TableHead key={column.key} className="whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => (isSortable ? handleSort(column.key) : undefined)}
                        className="-ml-3 h-8 px-2 flex items-center gap-2"
                      >
                        {column.label}
                        <ArrowUpDown
                          className={cn(
                            'h-3.5 w-3.5 text-muted-foreground',
                            isActive ? 'opacity-100' : 'opacity-30',
                          )}
                        />
                      </Button>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnsArray.length} className="text-center py-10 text-muted-foreground">
                    No data found
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-muted/30">
                    {visibleColumnsArray.map((column) => {
                      const formatted = formatCell(row[column.key], column.type);
                      if (column.type === 'boolean') {
                        return (
                          <TableCell key={column.key} className="text-center">
                            <Checkbox checked={Boolean(formatted)} disabled className="pointer-events-none" />
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={column.key} className="whitespace-pre-wrap text-sm">
                          {formatted as string}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {pageData.length} of {processedData.length} rows
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
