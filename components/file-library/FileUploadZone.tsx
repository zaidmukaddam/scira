'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, X, Check, AlertCircle, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FileUploadZoneProps {
  folderId?: string | null;
  onUploadComplete?: () => void;
  maxFiles?: number;
  maxSizeBytes?: number;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const BYTES_PER_MB = 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < BYTES_PER_MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
};

const isFileTypeAllowed = (fileType: string): boolean => {
  return ALLOWED_FILE_TYPES.includes(fileType);
};

const validateFile = (file: File, maxSizeBytes: number) => {
  if (!isFileTypeAllowed(file.type)) {
    return `File type "${file.type}" is not supported`;
  }
  if (file.size > maxSizeBytes) {
    return `File size exceeds ${formatFileSize(maxSizeBytes)} limit`;
  }
  return null;
};

const uploadFile = async (file: File, folderId?: string | null): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) {
    formData.append('folderId', folderId);
  }

  const response = await fetch('/api/files', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Upload failed');
  }

  return response.json();
};

export function FileUploadZone({
  folderId,
  onUploadComplete,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadMutation = useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: string | null }) => uploadFile(file, folderId),
    onSuccess: (data, variables) => {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.file === variables.file ? { ...f, status: 'completed' as const, progress: 100 } : f)),
      );
    },
    onError: (error: Error, variables) => {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.file === variables.file ? { ...f, status: 'error' as const, error: error.message } : f)),
      );
    },
  });

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      if (fileArray.length > maxFiles) {
        alert(`You can only upload ${maxFiles} files at once`);
        return;
      }

      const validFiles: File[] = [];
      const errors: string[] = [];

      fileArray.forEach((file) => {
        const error = validateFile(file, maxSizeBytes);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        alert(`Upload errors:\n${errors.join('\n')}`);
      }

      if (validFiles.length === 0) return;

      const newUploadingFiles: UploadingFile[] = validFiles.map((file) => ({
        file,
        progress: 0,
        status: 'uploading',
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      validFiles.forEach((file) => {
        setUploadingFiles((prev) => prev.map((f) => (f.file === file ? { ...f, progress: 10 } : f)));

        uploadMutation.mutate({ file, folderId });
      });
    },
    [maxFiles, maxSizeBytes, folderId, uploadMutation],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      e.target.value = '';
    },
    [handleFiles],
  );

  const removeUploadingFile = (file: File) => {
    setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
  };

  const clearCompletedUploads = () => {
    setUploadingFiles((prev) => prev.filter((f) => f.status !== 'completed'));
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const hasCompletedUploads = uploadingFiles.some((f) => f.status === 'completed');
  const hasActiveUploads = uploadingFiles.some((f) => f.status === 'uploading');

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center transition-colors',
          isDragOver && 'border-primary bg-primary/5',
          hasActiveUploads && 'pointer-events-none opacity-50',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
        <div className="space-y-2">
          <p className="text-lg font-medium">Drag and drop files here</p>
          <p className="text-sm text-muted-foreground">
            or{' '}
            <label className="text-primary hover:underline cursor-pointer">
              browse files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
                accept={ALLOWED_FILE_TYPES.join(',')}
              />
            </label>
          </p>
          <p className="text-xs text-muted-foreground">
            Max {maxFiles} files, {formatFileSize(maxSizeBytes)} each
          </p>
        </div>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Uploading Files</h4>
            {hasCompletedUploads && (
              <Button variant="ghost" size="sm" onClick={clearCompletedUploads}>
                Clear Completed
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {uploadingFiles.map((uploadingFile, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <File className="w-4 h-4 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                    <div className="flex items-center gap-2">
                      {uploadingFile.status === 'completed' && <Check className="w-4 h-4 text-green-500" />}
                      {uploadingFile.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      <Button variant="ghost" size="sm" onClick={() => removeUploadingFile(uploadingFile.file)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(uploadingFile.file.size)}</span>
                    {uploadingFile.status === 'error' && uploadingFile.error && (
                      <span className="text-red-500">• {uploadingFile.error}</span>
                    )}
                  </div>

                  {uploadingFile.status === 'uploading' && (
                    <Progress value={uploadingFile.progress} className="mt-2 h-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
