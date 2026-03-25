'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trash,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  ArrowLeft,
  MagnifyingGlass,
  Upload,
  ChatCircle,
  Plus,
  Files,
  ArrowUpRight,
  X,
} from '@phosphor-icons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Crown02Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useUserData } from '@/hooks/use-user-data';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface FileRecord {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  fileUrl: string;
  uploadedAt: string;
  ragStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  chunkCount?: number;
  source?: string;
  chatId?: string;
  messageId?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function FilesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isProUser, isLoading: proStatusLoading } = useUserData();

  const [searchQuery, setSearchQuery] = useState('');
  const [fileType, setFileType] = useState('all');
  const [sortBy, setSortBy] = useState('uploadedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch files
  const { data, isLoading, error } = useQuery({
    queryKey: ['files', page, fileType, sortBy, sortOrder, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        type: fileType,
        sort: sortBy,
        order: sortOrder,
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/files/list?${params}`);
      if (!response.ok) throw new Error('Failed to load files');
      return response.json();
    },
    enabled: !!user && isProUser,
  });

  const files: FileRecord[] = data?.files || [];
  const pagination: PaginationInfo = data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete file');
      return response.json();
    },
    onSuccess: (_data, fileId) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setSelectedFiles((prev) => {
        if (!prev.size) return prev;
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      setDeleteDialogOpen(false);
      setFileToDelete(null);
      toast.success('File deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete file');
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB
  const ACCEPTED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

  const processUploads = useCallback(
    async (incoming: FileList | File[]) => {
      const incomingFiles = Array.from(incoming as FileList | File[]);
      if (!incomingFiles.length) return;

      setUploading(true);
      let successCount = 0;

      for (const file of incomingFiles) {
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(`${file.name} exceeds the 20MB limit`);
          continue;
        }

        if (!ACCEPTED_UPLOAD_TYPES.includes(file.type)) {
          toast.error(`${file.name} is not a supported file type`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            successCount++;
          } else {
            const errorBody = await response.json().catch(() => null);
            toast.error(`Failed to upload ${file.name}${errorBody?.error ? `: ${errorBody.error}` : ''}`);
          }
        } catch (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      setUploading(false);

      if (successCount > 0) {
        toast.success(`Uploaded ${successCount} file${successCount > 1 ? 's' : ''}`);
        queryClient.invalidateQueries({ queryKey: ['files'] });
      }
    },
    [queryClient],
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files?.length) return;
      await processUploads(files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processUploads],
  );

  const handleDrag = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);

      const { files } = event.dataTransfer;
      if (files && files.length > 0) {
        await processUploads(files);
      }
    },
    [processUploads],
  );

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedFiles((prev) => {
      if (prev.size === files.length && files.length > 0) {
        return new Set();
      }
      return new Set(files.map((file) => file.id));
    });
  }, [files]);

  const bulkAddToChat = useCallback(() => {
    const filesToAdd = files.filter((file) => selectedFiles.has(file.id));
    if (!filesToAdd.length) {
      toast.error('Select at least one file to add to chat.');
      return;
    }

    const attachments = filesToAdd.map((file) => ({
      name: file.originalName,
      contentType: file.fileType,
      url: file.fileUrl,
      size: file.fileSize,
      fileId: file.id,
      ragStatus: file.ragStatus ?? 'pending',
    }));

    localStorage.setItem('initial-attachments', JSON.stringify(attachments));
    router.push('/new');

    const ragReadyCount = filesToAdd.filter((file) => file.ragStatus === 'completed').length;
    if (ragReadyCount > 0) {
      toast.success(
        `Starting chat with ${filesToAdd.length} file${filesToAdd.length > 1 ? 's' : ''} (${ragReadyCount} indexed)`,
      );
    } else {
      toast.success(`Starting chat with ${filesToAdd.length} file${filesToAdd.length > 1 ? 's' : ''}`);
    }

    setSelectedFiles(new Set());
  }, [files, selectedFiles, router]);

  const bulkDownload = useCallback(async () => {
    const filesToDownload = files.filter((file) => selectedFiles.has(file.id));
    if (!filesToDownload.length) {
      toast.error('Select files to download.');
      return;
    }

    toast.info(`Starting download of ${filesToDownload.length} file${filesToDownload.length > 1 ? 's' : ''}...`);

    for (const file of filesToDownload) {
      try {
        const response = await fetch(file.fileUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Download error:', error);
        toast.error(`Failed to download ${file.originalName}`);
      }
    }

    toast.success(`Downloaded ${filesToDownload.length} file${filesToDownload.length > 1 ? 's' : ''}`);
  }, [files, selectedFiles]);

  const bulkDelete = useCallback(async () => {
    const filesToDelete = files.filter((file) => selectedFiles.has(file.id));
    if (!filesToDelete.length) {
      toast.error('Select files to delete.');
      return;
    }

    let successCount = 0;

    for (const file of filesToDelete) {
      try {
        const response = await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
        if (response.ok) {
          successCount++;
        }
      } catch (error) {
        console.error('Error deleting file:', file.originalName, error);
      }
    }

    if (successCount > 0) {
      toast.success(`Deleted ${successCount} file${successCount > 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: ['files'] });
    } else {
      toast.error('Failed to delete selected files');
    }

    setSelectedFiles(new Set());
    setBulkDeleteDialogOpen(false);
  }, [files, selectedFiles, queryClient]);

  const startChatWithFile = useCallback(
    (file: FileRecord) => {
      const attachment = {
        name: file.originalName,
        contentType: file.fileType,
        url: file.fileUrl,
        size: file.fileSize,
        fileId: file.id,
        ragStatus: file.ragStatus ?? 'pending',
      };
      localStorage.setItem('initial-attachments', JSON.stringify([attachment]));
      localStorage.setItem('initial-attachment', JSON.stringify(attachment));
      router.push('/new');
      toast.success('Starting new chat with file');
    },
    [router],
  );

  // Not authenticated
  if (!user && !proStatusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full border border-border bg-background p-8 text-center">
          <div className="size-12 rounded-md border border-border bg-muted flex items-center justify-center mx-auto mb-5">
            <FileText size={20} className="text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium mb-2">Sign in Required</h2>
          <p className="text-sm text-muted-foreground mb-6">Please sign in to access your files.</p>
          <Button asChild className="w-full h-10 rounded-sm">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Not Pro
  if (user && !isProUser && !proStatusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full border border-primary/20 bg-primary/[0.03] p-8 text-center relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-primary/40" />
          <div className="size-12 rounded-md border border-primary/30 bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <HugeiconsIcon icon={Crown02Icon} size={20} className="text-primary" />
          </div>
          <h2 className="text-lg font-medium mb-2">Pro Feature</h2>
          <p className="text-sm text-muted-foreground mb-6">
            File management is a Pro feature. Upgrade to upload, manage, and search your files with AI.
          </p>
          <div className="space-y-2.5">
            <Button asChild className="w-full h-10 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150">
              <Link href="/pricing">
                <HugeiconsIcon icon={Crown02Icon} size={16} className="mr-2" />
                Upgrade to Pro
              </Link>
            </Button>
            <Button variant="ghost" asChild className="w-full h-10 rounded-sm text-sm">
              <Link href="/new">Back to Chat</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (proStatusLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-3 w-full max-w-2xl px-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm border-2 border-dashed border-primary/50">
          <div className="text-center">
            <div className="size-16 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Upload size={24} className="text-primary" />
            </div>
            <p className="text-base font-medium text-foreground">Drop to upload</p>
            <p className="text-sm text-muted-foreground mt-1">Images (JPEG, PNG, GIF) and PDFs · max 20MB</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/new')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-sm font-medium text-foreground">My Files</h1>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_UPLOAD_TYPES.join(',')}
              className="hidden"
              onChange={handleFileUpload}
            />
            {selectedFiles.size > 0 ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={bulkAddToChat}
                  className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                >
                  <ChatCircle size={13} />
                  Chat ({selectedFiles.size})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={bulkDownload}
                  className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  Download
                </Button>
                <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1.5 text-destructive hover:text-destructive cursor-pointer">
                      <Trash size={13} />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. These files will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-8 px-3 text-xs gap-1.5 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 cursor-pointer"
              >
                {uploading ? (
                  <><span className="size-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />Uploading…</>
                ) : (
                  <><Plus size={13} />Upload</>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              placeholder="Search files…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm rounded-sm border-border focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_15%,transparent)] transition-all duration-200"
            />
          </div>
          <Select value={fileType} onValueChange={setFileType}>
            <SelectTrigger className="w-[130px] h-9 text-sm rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="pdf">PDFs</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [newSortBy, newSortOrder] = value.split('-');
              setSortBy(newSortBy);
              setSortOrder(newSortOrder as 'asc' | 'desc');
            }}
          >
            <SelectTrigger className="w-[150px] h-9 text-sm rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uploadedAt-desc">Newest first</SelectItem>
              <SelectItem value="uploadedAt-asc">Oldest first</SelectItem>
              <SelectItem value="fileSize-desc">Largest first</SelectItem>
              <SelectItem value="fileSize-asc">Smallest first</SelectItem>
              <SelectItem value="originalName-asc">Name A–Z</SelectItem>
              <SelectItem value="originalName-desc">Name Z–A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-px border border-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 bg-background">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="size-8 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-7 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="border border-dashed border-border rounded-sm py-20 text-center">
            <div className="size-12 rounded-md border border-border bg-muted flex items-center justify-center mx-auto mb-4">
              <Files size={18} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {searchQuery ? 'No results' : 'No files yet'}
            </p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? `No files match "${searchQuery}"` : 'Upload images or PDFs to get started'}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-5 h-8 px-4 text-xs rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150"
              >
                <Upload size={13} className="mr-1.5" />
                Upload files
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Select all row */}
            <div className="flex items-center gap-3 px-4 py-2.5 border border-b-0 border-border bg-muted/30">
              <Checkbox
                checked={selectedFiles.size === files.length && files.length > 0}
                onCheckedChange={toggleSelectAll}
                className="rounded-sm"
              />
              <span className="text-xs text-muted-foreground">
                {selectedFiles.size > 0
                  ? `${selectedFiles.size} of ${files.length} selected`
                  : `${files.length} file${files.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* File rows */}
            <div className="border border-border divide-y divide-border">
              {files.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  isSelected={selectedFiles.has(file.id)}
                  onToggleSelect={() => toggleFileSelection(file.id)}
                  onDelete={() => { setFileToDelete(file); setDeleteDialogOpen(true); }}
                  onPreview={() => setPreviewFile(file)}
                  onStartChat={() => startChatWithFile(file)}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-5">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {pagination.totalPages} · {pagination.total} files
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="h-8 px-3 text-xs rounded-sm"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.hasMore}
                    className="h-8 px-3 text-xs rounded-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{fileToDelete?.originalName}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fileToDelete && deleteMutation.mutate(fileToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}

// File item component
function FileItem({
  file,
  isSelected,
  onToggleSelect,
  onDelete,
  onPreview,
  onStartChat,
}: {
  file: FileRecord;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onStartChat: () => void;
}) {
  const isImage = file.fileType.startsWith('image/');
  const isPdf = file.fileType === 'application/pdf';

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleDownload = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      const response = await fetch(file.fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleStartChat = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onStartChat();
  };

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/30 transition-colors duration-100 ${isSelected ? 'bg-primary/[0.03]' : ''}`}>
      <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="rounded-sm shrink-0" />

      {/* File icon */}
      <button
        onClick={onPreview}
        className="size-8 rounded-sm border border-border bg-muted flex items-center justify-center shrink-0 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors duration-150"
      >
        {isImage ? (
          <ImageIcon size={14} className="text-primary/70" />
        ) : isPdf ? (
          <FileText size={14} className="text-primary/70" />
        ) : (
          <FileText size={14} className="text-muted-foreground" />
        )}
      </button>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <button
          onClick={onPreview}
          className="text-sm font-medium truncate block w-full text-left cursor-pointer hover:text-primary transition-colors duration-150"
        >
          {file.originalName}
        </button>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span>{formatFileSize(file.fileSize)}</span>
              <span className="size-0.5 rounded-full bg-muted-foreground/50" />
              <span>{formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}</span>
              {file.ragStatus === 'completed' && (
                <>
                  <span className="size-0.5 rounded-full bg-muted-foreground/50" />
                  <span className="text-primary/70">✓ Indexed</span>
                </>
              )}
              {file.source === 'chat_attachment' && (
                <>
                  <span className="size-0.5 rounded-full bg-muted-foreground/50" />
                  <span>From chat</span>
                </>
              )}
            </p>
      </div>

      {/* Action buttons — visible on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <Button variant="ghost" size="sm" onClick={onPreview} className="size-7 p-0 rounded-sm cursor-pointer" title="Preview">
          <Eye size={13} />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleStartChat} className="size-7 p-0 rounded-sm cursor-pointer" title="Chat">
          <ChatCircle size={13} />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload} className="size-7 p-0 rounded-sm cursor-pointer" title="Download">
          <Download size={13} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          className="size-7 p-0 rounded-sm text-destructive/70 hover:text-destructive cursor-pointer"
          title="Delete"
        >
          <Trash size={13} />
        </Button>
      </div>
    </div>
  );
}

// File preview dialog component
function FilePreviewDialog({ file, onClose }: { file: FileRecord | null; onClose: () => void }) {
  if (!file) return null;

  const isImage = file.fileType.startsWith('image/');
  const isPdf = file.fileType === 'application/pdf';

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(file.fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] h-[85vh] p-0 flex flex-col" showCloseButton={false}>
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl pr-8">{file.originalName}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatFileSize(file.fileSize)} • Uploaded{' '}
                {formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleDownload} className="h-9 w-9 p-0" title="Download file">
                <Download size={18} />
              </Button>
              {isPdf && (
                <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <ArrowUpRight size={18} />
                  </Button>
                </a>
              )}
              <Button variant="ghost" size="sm" onClick={() => onClose()} className="h-9 w-9 p-0" title="Close">
                <X size={18} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6">
          {isImage ? (
            <div className="h-full flex items-center justify-center">
              <img src={file.fileUrl} alt={file.originalName} className="max-w-full max-h-full object-contain" />
            </div>
          ) : isPdf ? (
            <div className="w-full h-full bg-white rounded-lg">
              <object data={file.fileUrl} type="application/pdf" className="w-full h-full">
                <div className="flex flex-col items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800">
                  <FileText className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-300 text-sm mb-2">
                    PDF cannot be displayed directly
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors"
                    >
                      Open PDF
                    </a>
                    <Button onClick={handleDownload} size="sm" variant="outline">
                      Download
                    </Button>
                  </div>
                </div>
              </object>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground mb-2">Preview not available for this file type</p>
                <p className="text-sm text-muted-foreground mb-6">{file.fileType}</p>
                <Button size="default" onClick={handleDownload}>
                  <Download size={16} className="mr-2" />
                  Download File
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
