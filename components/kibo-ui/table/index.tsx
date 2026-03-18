import type {
  Cell,
  Column,
  ColumnDef,
  Header,
  HeaderGroup,
  Row,
  SortingState,
  Table,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { atom, useAtom } from "jotai";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { createContext, memo, useCallback, useContext } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TableBody as TableBodyRaw,
  TableCell as TableCellRaw,
  TableHeader as TableHeaderRaw,
  TableHead as TableHeadRaw,
  Table as TableRaw,
  TableRow as TableRowRaw,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type { ColumnDef } from "@tanstack/react-table";

const sortingAtom = atom<SortingState>([]);

export const TableContext = createContext<{
  data: unknown[];
  columns: ColumnDef<unknown, unknown>[];
  table: Table<unknown> | null;
}>({
  data: [],
  columns: [],
  table: null,
});

export type TableProviderProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  children: ReactNode;
  className?: string;
};

export function TableProvider<TData, TValue>({
  columns,
  data,
  children,
  className,
}: TableProviderProps<TData, TValue>) {
  const [sorting, setSorting] = useAtom(sortingAtom);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      // @ts-expect-error updater is a function that returns a sorting object
      const newSorting = updater(sorting);

      setSorting(newSorting);
    },
    state: {
      sorting,
    },
  });

  return (
    <TableContext.Provider
      value={{
        data,
        columns: columns as never,
        table: table as never,
      }}
    >
      <TableRaw className={className}>{children}</TableRaw>
    </TableContext.Provider>
  );
}

export type TableHeadProps = {
  header: Header<unknown, unknown>;
  className?: string;
};

export const TableHead = memo(({ header, className }: TableHeadProps) => (
  <TableHeadRaw className={className} key={header.id}>
    {header.isPlaceholder
      ? null
      : flexRender(header.column.columnDef.header, header.getContext())}
  </TableHeadRaw>
));

TableHead.displayName = "TableHead";

export type TableHeaderGroupProps = {
  headerGroup: HeaderGroup<unknown>;
  children: (props: { header: Header<unknown, unknown> }) => ReactNode;
};

export const TableHeaderGroup = ({
  headerGroup,
  children,
}: TableHeaderGroupProps) => (
  <TableRowRaw key={headerGroup.id}>
    {headerGroup.headers.map((header) => children({ header }))}
  </TableRowRaw>
);

export type TableHeaderProps = {
  className?: string;
  children: (props: { headerGroup: HeaderGroup<unknown> }) => ReactNode;
};

export const TableHeader = ({ className, children }: TableHeaderProps) => {
  const { table } = useContext(TableContext);

  return (
    <TableHeaderRaw className={className}>
      {table?.getHeaderGroups().map((headerGroup) => children({ headerGroup }))}
    </TableHeaderRaw>
  );
};

export interface TableColumnHeaderProps<TData, TValue>
  extends HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function TableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: TableColumnHeaderProps<TData, TValue>) {
  // Extract inline event handlers to prevent unnecessary re-renders
  const handleSortAsc = useCallback(() => {
    column.toggleSorting(false);
  }, [column]);

  const handleSortDesc = useCallback(() => {
    column.toggleSorting(true);
  }, [column]);

  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            size="sm"
            variant="ghost"
          >
            <span>{title}</span>
            {column.getIsSorted() === "desc" ? (
              <ArrowDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUpIcon className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleSortAsc}>
            <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSortDesc}>
            <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export type TableCellProps = {
  cell: Cell<unknown, unknown>;
  className?: string;
};

export const TableCell = ({ cell, className }: TableCellProps) => (
  <TableCellRaw className={className}>
    {flexRender(cell.column.columnDef.cell, cell.getContext())}
  </TableCellRaw>
);

export type TableRowProps = {
  row: Row<unknown>;
  children: (props: { cell: Cell<unknown, unknown> }) => ReactNode;
  className?: string;
};

export const TableRow = ({ row, children, className }: TableRowProps) => (
  <TableRowRaw
    className={className}
    data-state={row.getIsSelected() && "selected"}
    key={row.id}
  >
    {row.getVisibleCells().map((cell) => children({ cell }))}
  </TableRowRaw>
);

export type TableBodyProps = {
  children: (props: { row: Row<unknown> }) => ReactNode;
  className?: string;
};

export const TableBody = ({ children, className }: TableBodyProps) => {
  const { columns, table } = useContext(TableContext);
  const rows = table?.getRowModel().rows;

  return (
    <TableBodyRaw className={className}>
      {rows?.length ? (
        rows.map((row) => children({ row }))
      ) : (
        <TableRowRaw>
          <TableCellRaw className="h-24 text-center" colSpan={columns.length}>
            No results.
          </TableCellRaw>
        </TableRowRaw>
      )}
    </TableBodyRaw>
  );
};
