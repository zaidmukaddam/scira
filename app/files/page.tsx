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
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Sign in Required</h2>
            <p className="text-muted-foreground mb-6">Please sign in to access your files.</p>
            <Button asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not Pro
  if (user && !isProUser && !proStatusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <HugeiconsIcon icon={Crown02Icon} size={48} className="mx-auto mb-4 text-yellow-500" />
            <h2 className="text-2xl font-semibold mb-2">Pro Feature</h2>
            <p className="text-muted-foreground mb-6">
              File management is a Pro feature. Upgrade to upload, manage, and search your files with AI.
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/pricing">
                  <HugeiconsIcon icon={Crown02Icon} size={16} className="mr-2" />
                  Upgrade to Pro
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/new">Back to Chat</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (proStatusLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/new')} className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">My Files</h1>
        </div>

        <Card
          className={`relative ${dragActive ? 'border-primary' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {dragActive && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
              <div className="text-center p-8">
                <Upload className="mx-auto h-12 w-12 text-primary mb-4" />
                <p className="text-lg font-medium">Drop files here to upload</p>
                <p className="text-sm text-muted-foreground mt-2">Images (JPEG, PNG, GIF) and PDFs up to 20MB</p>
              </div>
            </div>
          )}

          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText size={24} />
                File Manager
              </CardTitle>

              <div className="flex flex-wrap gap-2">
                {selectedFiles.size === 0 ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPTED_UPLOAD_TYPES.join(',')}
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? (
                        <>
                          <span className="mr-2 animate-spin">⏳</span>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus size={16} className="mr-2" />
                          Add Files
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={bulkAddToChat}>
                      <ChatCircle size={16} className="mr-2" />
                      Add {selectedFiles.size} to Chat
                    </Button>
                    <Button variant="outline" size="sm" onClick={bulkDownload}>
                      <Download size={16} className="mr-2" />
                      Download {selectedFiles.size}
                    </Button>
                    <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash size={16} className="mr-2" />
                          Delete {selectedFiles.size}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {selectedFiles.size} file(s)?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. These files will be permanently deleted from your account.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={bulkDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Files
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <MagnifyingGlass
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Files</SelectItem>
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
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uploadedAt-desc">Newest First</SelectItem>
                  <SelectItem value="uploadedAt-asc">Oldest First</SelectItem>
                  <SelectItem value="fileSize-desc">Largest First</SelectItem>
                  <SelectItem value="fileSize-asc">Smallest First</SelectItem>
                  <SelectItem value="originalName-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="originalName-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File List */}
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12">
                <Files className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No files match your search' : 'No files uploaded yet'}
                </p>
                {!searchQuery && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Click &quot;Add Files&quot; or drag and drop files here to upload
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={selectedFiles.size === files.length && files.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedFiles.size === files.length && files.length > 0
                      ? 'All files selected'
                      : `Select all (${files.length} files)`}
                  </span>
                </div>

                {/* File Items */}
                <div className="space-y-2">
                  {files.map((file) => (
                    <FileItem
                      key={file.id}
                      file={file}
                      isSelected={selectedFiles.has(file.id)}
                      onToggleSelect={() => toggleFileSelection(file.id)}
                      onDelete={() => {
                        setFileToDelete(file);
                        setDeleteDialogOpen(true);
                      }}
                      onPreview={() => setPreviewFile(file)}
                      onStartChat={() => startChatWithFile(file)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 pt-4">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                      Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm">
                      Page {page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.hasMore}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete file?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{fileToDelete?.originalName}&quot;? This action cannot be undone.
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

        {/* File Preview Dialog */}
        <FilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
      </div>
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
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />

      {/* File Icon/Thumbnail */}
      <div
        className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center cursor-pointer"
        onClick={onPreview}
      >
        {isImage ? (
          <ImageIcon size={20} className="text-blue-500" />
        ) : isPdf ? (
          <FileText size={20} className="text-red-500" />
        ) : (
          <FileText size={20} className="text-muted-foreground" />
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate cursor-pointer hover:text-primary" onClick={onPreview}>
          {file.originalName}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.fileSize)} • {formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}
          {file.ragStatus === 'completed' && ' • ✓ Indexed'}
          {file.source === 'chat_attachment' && ' • From chat'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onPreview} className="h-8 w-8 p-0" title="Preview file">
          <Eye size={16} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStartChat}
          className="h-8 w-8 p-0"
          title="Start new chat with file"
        >
          <ChatCircle size={16} />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleDownload} title="Download file">
          <Download size={16} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          title="Delete file"
        >
          <Trash size={16} />
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
