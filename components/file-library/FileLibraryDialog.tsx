'use client';

import * as React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Grid3X3, List, Upload, FolderPlus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { FileGrid } from './FileGrid';
import { FileList } from './FileList';
import { FileUploadZone } from './FileUploadZone';

export interface FileLibraryFile {
  id: string;
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  url: string;
  thumbnailUrl: string | null;
  folderId: string | null;
  tags: string[] | null;
  description: string | null;
  isPublic: boolean;
  publicId: string | null;
  createdAt: string;
  updatedAt: string;
  folderName?: string | null;
}

export interface FileLibraryFolder {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FileLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect?: (files: FileLibraryFile[]) => void;
  multiple?: boolean;
  mode?: 'select' | 'manage';
}

const FILES_PER_PAGE = 50;
const FILES_CACHE_TIME_MS = 300000;
const FOLDERS_CACHE_TIME_MS = 600000;

export function FileLibraryDialog({
  open,
  onOpenChange,
  onFileSelect,
  multiple = false,
  mode = 'select',
}: FileLibraryDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<FileLibraryFile[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  const buildFilesQueryParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (selectedFolderId) params.append('folderId', selectedFolderId);
    params.append('limit', FILES_PER_PAGE.toString());
    params.append('sortBy', 'createdAt');
    params.append('sortOrder', 'desc');
    return params;
  };

  const fetchFiles = async () => {
    const params = buildFilesQueryParams();
    const response = await fetch(`/api/files?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }
    return response.json();
  };

  const fetchFolders = async () => {
    const response = await fetch('/api/folders');
    if (!response.ok) {
      throw new Error('Failed to fetch folders');
    }
    return response.json();
  };

  const {
    data: filesData,
    isLoading: filesLoading,
    refetch: refetchFiles,
  } = useQuery({
    queryKey: ['files', searchQuery, selectedFolderId],
    queryFn: fetchFiles,
    enabled: open,
    staleTime: FILES_CACHE_TIME_MS,
  });

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: fetchFolders,
    enabled: open,
    staleTime: FOLDERS_CACHE_TIME_MS,
  });

  const files = filesData?.files || [];
  const folders = foldersData?.folders || [];

  const isFileSelected = (fileId: string) => {
    return selectedFiles.some((f) => f.id === fileId);
  };

  const toggleFileSelection = (file: FileLibraryFile) => {
    const isSelected = isFileSelected(file.id);
    if (isSelected) {
      setSelectedFiles((prev) => prev.filter((f) => f.id !== file.id));
    } else {
      setSelectedFiles((prev) => [...prev, file]);
    }
  };

  const selectSingleFileAndClose = (file: FileLibraryFile) => {
    setSelectedFiles([file]);
    if (onFileSelect && mode === 'select') {
      onFileSelect([file]);
      onOpenChange(false);
    }
  };

  const handleFileSelect = (file: FileLibraryFile) => {
    if (multiple) {
      toggleFileSelection(file);
    } else {
      selectSingleFileAndClose(file);
    }
  };

  const handleConfirmSelection = () => {
    if (onFileSelect && selectedFiles.length > 0) {
      onFileSelect(selectedFiles);
      onOpenChange(false);
    }
  };

  const handleUploadComplete = () => {
    refetchFiles();
    setShowUpload(false);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  const toggleUploadZone = () => {
    setShowUpload(!showUpload);
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
  };

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  const getSelectionStatusText = () => {
    const count = selectedFiles.length;
    return `${count} file${count !== 1 ? 's' : ''} selected`;
  };

  const getAttachButtonText = () => {
    const count = selectedFiles.length;
    return `Attach ${count} file${count !== 1 ? 's' : ''}`;
  };

  const shouldShowSelectionFooter = () => {
    return mode === 'select' && multiple && selectedFiles.length > 0;
  };

  const shouldShowUploadButton = () => {
    return mode === 'manage';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center justify-between">
            <span>File Library</span>
            <div className="flex items-center gap-2">
              {shouldShowUploadButton() && (
                <Button variant="ghost" size="sm" onClick={toggleUploadZone} className={cn(showUpload && 'bg-accent')}>
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={toggleViewMode}>
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {showUpload && (
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Upload Files</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <FileUploadZone folderId={selectedFolderId} onUploadComplete={handleUploadComplete} />
            </div>
          )}

          <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-fit">
              <TabsTrigger value="all">All Files</TabsTrigger>
              <TabsTrigger value="folders">Folders</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="flex-1 min-h-0 mt-4">
              <div className="h-full overflow-hidden">
                {viewMode === 'grid' ? (
                  <FileGrid
                    files={files}
                    selectedFiles={selectedFiles}
                    onFileSelect={handleFileSelect}
                    loading={filesLoading}
                    multiple={multiple}
                    mode={mode}
                  />
                ) : (
                  <FileList
                    files={files}
                    selectedFiles={selectedFiles}
                    onFileSelect={handleFileSelect}
                    loading={filesLoading}
                    multiple={multiple}
                    mode={mode}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="folders" className="flex-1 min-h-0 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {folders.map((folder: FileLibraryFolder) => (
                  <Button
                    key={folder.id}
                    variant="outline"
                    className="h-20 flex flex-col gap-2 p-4"
                    onClick={() => handleFolderSelect(folder.id)}
                  >
                    <FolderPlus className="w-6 h-6" />
                    <span className="text-xs truncate w-full">{folder.name}</span>
                  </Button>
                ))}
                {foldersLoading && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">Loading folders...</div>
                )}
                {!foldersLoading && folders.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">No folders found</div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {shouldShowSelectionFooter() && (
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-muted-foreground">{getSelectionStatusText()}</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearSelectedFiles}>
                  Clear
                </Button>
                <Button onClick={handleConfirmSelection}>{getAttachButtonText()}</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
