"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface FilterOption {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  searchKey?: string;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  pagination?: boolean;
  pageSize?: number;
  onExport?: () => void;
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  searchKey,
  searchPlaceholder = "Rechercher...",
  filters,
  onRowClick,
  rowActions,
  pagination = true,
  pageSize = 10,
  onExport,
  emptyMessage = "Aucune donnée",
  emptyDescription = "Aucun élément ne correspond à vos critères",
  className,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    {}
  );
  const [showFilters, setShowFilters] = useState(false);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    if (searchQuery && searchKey) {
      result = result.filter((item) =>
        String(item[searchKey])
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        result = result.filter((item) => String(item[key]) === value);
      }
    });

    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (sortDirection === "asc") {
          return aStr.localeCompare(bStr);
        }
        return bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [data, searchQuery, searchKey, sortKey, sortDirection, activeFilters]);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredAndSortedData;
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredAndSortedData.slice(start, end);
  }, [filteredAndSortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setActiveFilters({});
    setSearchQuery("");
    setCurrentPage(1);
  };

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {searchKey && (
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 w-full sm:w-[300px]"
              />
            </div>
          )}

          {filters && filters.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="size-4" />
              {activeFilterCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 size-5 flex items-center justify-center p-0 text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs"
            >
              Réinitialiser
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
              <Download className="size-4" />
              <span className="hidden sm:inline">Exporter</span>
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFilters && filters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg border"
          >
            {filters.map((filter) => (
              <div key={filter.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {filter.label}
                </label>
                <Select
                  value={activeFilters[filter.key] || ""}
                  onValueChange={(value) =>
                    handleFilterChange(filter.key, value)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {paginatedData.length === 0 ? (
        <div className="rounded-lg border p-8">
          <EmptyState
            title={emptyMessage}
            description={emptyDescription}
          />
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {columns.map((column) => (
                    <TableHead
                      key={column.key}
                      style={{ width: column.width }}
                      className={cn(
                        column.sortable && "cursor-pointer select-none hover:bg-muted/80 transition-colors"
                      )}
                      onClick={() =>
                        column.sortable && handleSort(column.key)
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{column.label}</span>
                        {column.sortable && (
                          <div className="size-4">
                            {sortKey === column.key ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="size-4" />
                              ) : (
                                <ArrowDown className="size-4" />
                              )
                            ) : (
                              <ArrowUpDown className="size-4 opacity-50" />
                            )}
                          </div>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  {rowActions && (
                    <TableHead className="w-[100px]">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {paginatedData.map((item, index) => (
                    <motion.tr
                      key={item.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "group hover:bg-muted/50 transition-colors",
                        onRowClick && "cursor-pointer"
                      )}
                      onClick={() => onRowClick?.(item)}
                    >
                      {columns.map((column) => (
                        <TableCell key={column.key}>
                          {column.render
                            ? column.render(item)
                            : item[column.key]}
                        </TableCell>
                      ))}
                      {rowActions && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {rowActions(item)}
                        </TableCell>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {pagination && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
              <div className="text-sm text-muted-foreground">
                Affichage de{" "}
                <span className="font-medium">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                à{" "}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, filteredAndSortedData.length)}
                </span>{" "}
                sur{" "}
                <span className="font-medium">
                  {filteredAndSortedData.length}
                </span>{" "}
                résultats
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <div className="flex items-center gap-1 px-3 py-1.5 text-sm">
                  <span className="font-medium">{currentPage}</span>
                  <span className="text-muted-foreground">sur</span>
                  <span className="font-medium">{totalPages}</span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
