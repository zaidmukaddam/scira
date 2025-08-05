'use client';

import * as React from 'react';
import { useState } from 'react';
import { FileText, Image, Video, Music, Archive, File, ChevronUp, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileLibraryFile } from './FileLibraryDialog';

interface FileListProps {
  files: FileLibraryFile[];
  selectedFiles: FileLibraryFile[];
  onFileSelect: (file: FileLibraryFile) => void;
  loading: boolean;
  multiple: boolean;
  mode: 'select' | 'manage';
}

type SortField = 'name' | 'size' | 'date' | 'type';
type SortDirection = 'asc' | 'desc';

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < BYTES_PER_KB) return `${bytes} B`;
  if (bytes < BYTES_PER_MB) return `${Math.round(bytes / BYTES_PER_KB)} KB`;
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
};

const getFileIcon = (contentType: string) => {
  if (contentType.startsWith('image/')) return Image;
  if (contentType.startsWith('video/')) return Video;
  if (contentType.startsWith('audio/')) return Music;
  if (contentType.includes('pdf') || contentType.includes('document')) return FileText;
  if (contentType.includes('zip') || contentType.includes('archive')) return Archive;
  return File;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getFileTypeLabel = (contentType: string): string => {
  if (contentType.startsWith('image/')) return 'Image';
  if (contentType.startsWith('video/')) return 'Video';
  if (contentType.startsWith('audio/')) return 'Audio';
  if (contentType.includes('pdf')) return 'PDF';
  if (contentType.includes('document')) return 'Document';
  if (contentType.includes('spreadsheet')) return 'Spreadsheet';
  if (contentType.includes('zip') || contentType.includes('archive')) return 'Archive';
  return 'File';
};

const isFileSelected = (file: FileLibraryFile, selectedFiles: FileLibraryFile[]): boolean => {
  return selectedFiles.some((f) => f.id === file.id);
};

const sortFiles = (files: FileLibraryFile[], field: SortField, direction: SortDirection): FileLibraryFile[] => {
  return [...files].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (field) {
      case 'name':
        aValue = a.originalName.toLowerCase();
        bValue = b.originalName.toLowerCase();
        break;
      case 'size':
        aValue = a.size;
        bValue = b.size;
        break;
      case 'date':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'type':
        aValue = getFileTypeLabel(a.contentType).toLowerCase();
        bValue = getFileTypeLabel(b.contentType).toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export function FileList({ files, selectedFiles, onFileSelect, loading, multiple, mode }: FileListProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFileClick = (file: FileLibraryFile) => {
    onFileSelect(file);
  };

  const handleCheckboxChange = (file: FileLibraryFile) => {
    onFileSelect(file);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const sortedFiles = sortFiles(files, sortField, sortDirection);

  if (loading) {
    return (
      <div className="h-full overflow-auto">
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted/30 animate-pulse rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center max-w-sm">
          <File className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">No files found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or upload new files to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-full">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border/50 bg-muted/30 backdrop-blur-sm sticky top-0 z-10">
          {multiple && <div className="col-span-1"></div>}
          <div className={cn('col-span-1', !multiple && 'col-span-2')}>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 font-medium text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => handleSort('type')}
            >
              Type
              {getSortIcon('type')}
            </Button>
          </div>
          <div className={cn('col-span-4', !multiple && 'col-span-5')}>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 font-medium text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => handleSort('name')}
            >
              Name
              {getSortIcon('name')}
            </Button>
          </div>
          <div className="col-span-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 font-medium text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => handleSort('size')}
            >
              Size
              {getSortIcon('size')}
            </Button>
          </div>
          <div className="col-span-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 font-medium text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => handleSort('date')}
            >
              Modified
              {getSortIcon('date')}
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border/30">
          {sortedFiles.map((file) => {
            const IconComponent = getFileIcon(file.contentType);
            const selected = isFileSelected(file, selectedFiles);

            return (
              <div
                key={file.id}
                className={cn(
                  'grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-all',
                  'group relative',
                  selected && 'bg-primary/5 hover:bg-primary/10',
                )}
                onClick={() => handleFileClick(file)}
              >
                {selected && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                )}
                {multiple && (
                  <div className="col-span-1 flex items-center">
                    <div
                      className={cn(
                        "w-4 h-4 rounded border-2 transition-all",
                        selected 
                          ? "border-primary bg-primary" 
                          : "border-border hover:border-foreground/50 bg-background"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckboxChange(file);
                      }}
                    >
                      {selected && (
                        <svg className="w-2.5 h-2.5 text-primary-foreground m-auto" viewBox="0 0 16 16">
                          <path
                            fill="currentColor"
                            d="M6.5 10.5L3.5 7.5L2 9L6.5 13.5L14 6L12.5 4.5L6.5 10.5Z"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
                <div className={cn('col-span-1 flex items-center', !multiple && 'col-span-2')}>
                  <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-muted">
                    <IconComponent className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className={cn('col-span-4 flex items-center min-w-0', !multiple && 'col-span-5')}>
                  <span className="truncate font-medium text-sm" title={file.originalName}>
                    {file.originalName}
                  </span>
                </div>
                <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                  {formatFileSize(file.size)}
                </div>
                <div className="col-span-4 flex items-center text-sm text-muted-foreground">
                  {formatDate(file.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
