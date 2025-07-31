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

  const handleCheckboxChange = (file: FileLibraryFile) => {
    onFileSelect(file);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 h-full overflow-auto">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No files found</p>
          <p className="text-sm">Upload files or adjust your search</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 h-full overflow-auto">
      {files.map((file) => {
        const IconComponent = getFileIcon(file.contentType);
        const selected = isFileSelected(file, selectedFiles);
        const isImage = isImageFile(file.contentType);

        return (
          <div
            key={file.id}
            className={cn(
              'group relative aspect-square border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md',
              selected && 'ring-2 ring-primary bg-primary/5',
            )}
            onClick={() => handleFileClick(file)}
          >
            {multiple && (
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => handleCheckboxChange(file)}
                  className="bg-background"
                />
              </div>
            )}

            <div className="flex flex-col h-full">
              <div className="flex-1 flex items-center justify-center mb-2">
                {isImage && file.thumbnailUrl ? (
                  <img
                    src={file.thumbnailUrl}
                    alt={file.originalName}
                    className="max-w-full max-h-full object-contain rounded"
                  />
                ) : isImage ? (
                  <img
                    src={file.url}
                    alt={file.originalName}
                    className="max-w-full max-h-full object-contain rounded"
                  />
                ) : (
                  <IconComponent className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium truncate" title={file.originalName}>
                  {file.originalName}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatFileSize(file.size)}</span>
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
