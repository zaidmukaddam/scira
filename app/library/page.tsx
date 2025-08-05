'use client';

import * as React from 'react';
import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Grid3X3, List, Upload, FolderPlus, X, Files, HardDrive } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUserData } from '@/hooks/use-user-data';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { FileGrid } from '@/components/file-library/FileGrid';
import { FileList } from '@/components/file-library/FileList';
import { FileUploadZone } from '@/components/file-library/FileUploadZone';
import { FileLibraryFile, FileLibraryFolder } from '@/components/file-library/FileLibraryDialog';

const FILES_PER_PAGE = 50;
const FILES_CACHE_TIME_MS = 300000;
const FOLDERS_CACHE_TIME_MS = 600000;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function LibraryPageContent() {
  const { data: user, isLoading: userLoading } = useUserData();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, userLoading, router]);

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
    enabled: !!user,
    staleTime: FILES_CACHE_TIME_MS,
  });

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: fetchFolders,
    enabled: !!user,
    staleTime: FOLDERS_CACHE_TIME_MS,
  });

  const files = filesData?.files || [];
  const folders = foldersData?.folders || [];

  const handleFileSelect = (file: FileLibraryFile) => {
    console.log('File selected:', file);
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

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  const clearFolderFilter = () => {
    setSelectedFolderId(null);
  };

  const getCurrentFolderName = () => {
    if (!selectedFolderId) return null;
    const folder = folders.find((f: FileLibraryFolder) => f.id === selectedFolderId);
    return folder?.name || null;
  };

  const getTotalFileSize = () => {
    return files.reduce((total: number, file: FileLibraryFile) => total + file.size, 0);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">File Library</h1>
              <p className="text-muted-foreground">
                Manage and organize your files
                {getCurrentFolderName() && (
                  <>
                    {' '}
                    in{' '}
                    <span className="font-medium">{getCurrentFolderName()}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFolderFilter}
                      className="ml-2 h-6 text-xs"
                    >
                      Clear filter
                    </Button>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleViewMode}>
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                <span className="ml-2 hidden sm:inline">
                  {viewMode === 'grid' ? 'List' : 'Grid'}
                </span>
              </Button>
              <Button onClick={toggleUploadZone} className={cn(showUpload && 'bg-accent')}>
                <Upload className="w-4 h-4" />
                <span className="ml-2">Upload</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Files</CardTitle>
                <Files className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{files.length}</div>
                <p className="text-xs text-muted-foreground">files in library</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatFileSize(getTotalFileSize())}</div>
                <p className="text-xs text-muted-foreground">across all files</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Folders</CardTitle>
                <FolderPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{folders.length}</div>
                <p className="text-xs text-muted-foreground">organized folders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent</CardTitle>
                <Files className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {files.filter((f: FileLibraryFile) => {
                    const fileDate = new Date(f.createdAt);
                    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    return fileDate > dayAgo;
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">files added today</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Upload Files</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <FileUploadZone folderId={selectedFolderId} onUploadComplete={handleUploadComplete} />
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-64 shrink-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Folders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant={selectedFolderId === null ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedFolderId(null)}
                  >
                    <Files className="w-4 h-4 mr-2" />
                    All Files
                  </Button>
                  {folders.map((folder: FileLibraryFolder) => (
                    <Button
                      key={folder.id}
                      variant={selectedFolderId === folder.id ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => handleFolderSelect(folder.id)}
                    >
                      <FolderPlus className="w-4 h-4 mr-2" />
                      <span className="truncate">{folder.name}</span>
                    </Button>
                  ))}
                  {foldersLoading && (
                    <div className="text-center py-4 text-sm text-muted-foreground">Loading folders...</div>
                  )}
                  {!foldersLoading && folders.length === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">No folders found</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex-1 min-w-0">
              <Card>
                <CardContent className="p-6">
                  <Tabs defaultValue="files" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="files">Files</TabsTrigger>
                      <TabsTrigger value="folders">Folder Grid</TabsTrigger>
                    </TabsList>

                    <TabsContent value="files" className="space-y-4">
                      <div className="min-h-[400px]">
                        {viewMode === 'grid' ? (
                          <FileGrid
                            files={files}
                            selectedFiles={[]}
                            onFileSelect={handleFileSelect}
                            loading={filesLoading}
                            multiple={false}
                            mode="manage"
                          />
                        ) : (
                          <FileList
                            files={files}
                            selectedFiles={[]}
                            onFileSelect={handleFileSelect}
                            loading={filesLoading}
                            multiple={false}
                            mode="manage"
                          />
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="folders" className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 min-h-[400px]">
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
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full">
          <LibraryPageContent />
        </SidebarInset>
      </SidebarProvider>
    </Suspense>
  );
}