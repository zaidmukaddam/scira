'use client';

import * as React from 'react';
import { FileText, Image, Video, Music, Archive, File } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { FileLibraryFile } from './FileLibraryDialog';

interface FileGridProps {
  files: FileLibraryFile[];
  selectedFiles: FileLibraryFile[];
  onFileSelect: (file: FileLibraryFile) => void;
  loading: boolean;
  multiple: boolean;
  mode: 'select' | 'manage';
}

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

const isImageFile = (contentType: string): boolean => {
  return contentType.startsWith('image/');
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

const isFileSelected = (file: FileLibraryFile, selectedFiles: FileLibraryFile[]): boolean => {
  return selectedFiles.some((f) => f.id === file.id);
};

export function FileGrid({ files, selectedFiles, onFileSelect, loading, multiple, mode }: FileGridProps) {
  const handleFileClick = (file: FileLibraryFile) => {
    onFileSelect(file);
  };

  const handleCheckboxChange = (file: FileLibraryFile, e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(file);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 h-full overflow-auto">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/3] bg-muted/50 animate-pulse rounded-lg" />
            <div className="space-y-2">
              <div className="h-4 bg-muted/50 animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted/30 animate-pulse rounded w-1/2" />
            </div>
          </div>
        ))}
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 h-full overflow-auto pr-1">
      {files.map((file) => {
        const IconComponent = getFileIcon(file.contentType);
        const selected = isFileSelected(file, selectedFiles);
        const isImage = isImageFile(file.contentType);

        return (
          <div
            key={file.id}
            className={cn(
              'group relative cursor-pointer transition-all duration-200',
              'hover:scale-[1.02] active:scale-[0.98]',
            )}
            onClick={() => handleFileClick(file)}
          >
            <div
              className={cn(
                'relative overflow-hidden rounded-lg border border-border/50 bg-card',
                'hover:border-border hover:shadow-lg',
                'transition-all duration-200',
                selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary',
              )}
            >
              {multiple && (
                <div 
                  className="absolute top-2 left-2 z-10"
                  onClick={(e) => handleCheckboxChange(file, e)}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 bg-background/90 backdrop-blur-sm transition-all",
                    "hover:scale-110",
                    selected 
                      ? "border-primary bg-primary" 
                      : "border-border hover:border-foreground/50"
                  )}>
                    {selected && (
                      <svg className="w-3 h-3 text-primary-foreground m-auto" viewBox="0 0 16 16">
                        <path
                          fill="currentColor"
                          d="M6.5 10.5L3.5 7.5L2 9L6.5 13.5L14 6L12.5 4.5L6.5 10.5Z"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              )}

              <div className="aspect-[4/3] bg-muted/30 overflow-hidden">
                {isImage && (file.thumbnailUrl || file.url) ? (
                  <img
                    src={file.thumbnailUrl || file.url}
                    alt={file.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/50">
                    <IconComponent className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              <div className="p-3 space-y-1.5 bg-card">
                <p className="text-sm font-medium truncate" title={file.originalName}>
                  {file.originalName}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">{formatFileSize(file.size)}</span>
                  <span>{formatDate(file.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
