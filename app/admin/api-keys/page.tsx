'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowsClockwise, 
  XCircle,
  Key,
  Copy,
  Trash,
  CheckCircle,
  Eye,
  EyeSlash,
  MagnifyingGlass
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart3, Loader2, TrendingUp } from 'lucide-react';
import { PRIMARY_ADMIN_EMAILS } from '@/lib/admin-constants';

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  rateLimitRpm: number;
  rateLimitTpd: number;
  allowedModels: string[];
  allowedTools: string[];
  totalRequests?: number;
  totalTokens?: number;
}

interface ApiKeyUsage {
  apiKeyId: string;
  overall: {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    avgResponseTime: number;
    firstRequest: string | null;
    lastRequest: string | null;
    errorCount: number;
  };
  today: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  thisMonth: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  lastHour: {
    requests: number;
    totalTokens: number;
  };
  lastMinute: {
    requests: number;
  };
  modelStats: Array<{
    model: string;
    requests: number;
    totalTokens: number;
  }>;
  toolStats: Array<{
    tool: string;
    count: number;
  }>;
  recentRequests: Array<{
    timestamp: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    responseTimeMs: number;
    statusCode: number;
    toolCalls: string[] | null;
    error: string | null;
  }>;
}

export default function AdminApiKeysPage() {
  const { data: session, isPending } = useSession();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  
  // Form state
  const [keyName, setKeyName] = useState('');
  const [expiresIn, setExpiresIn] = useState('never');
  const [rateLimitRpm, setRateLimitRpm] = useState('60');
  const [rateLimitTpd, setRateLimitTpd] = useState('1000000');

  // Usage tracking states
  const [usageDialog, setUsageDialog] = useState(false);
  const [selectedKeyUsage, setSelectedKeyUsage] = useState<ApiKeyUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  // Edit allowed models state
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editAllowedModels, setEditAllowedModels] = useState<string>('');
  const [isSavingModels, setIsSavingModels] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('createdAt_desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Check if user is admin using admin constants
  function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;

    // Check primary admins from constants
    if (PRIMARY_ADMIN_EMAILS.includes(email)) {
      return true;
    }

    // Check ADMIN_EMAIL env var
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail && email === adminEmail) {
      return true;
    }

    // Check ADMIN_EMAILS env var (comma-separated)
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    if (adminEmails.includes(email)) {
      return true;
    }

    return false;
  }

  const isAdmin = isAdminEmail(session?.user?.email);
  
  // Track if we've verified admin status at least once
  const [adminVerified, setAdminVerified] = useState(false);

  // Only redirect on initial load if not admin, not on API errors
  useEffect(() => {
    if (!isPending && session) {
      if (!isAdmin && !adminVerified) {
        // Only redirect if we've confirmed session exists but user is not admin
        window.location.href = '/new';
        return;
      }
      if (isAdmin) {
        setAdminVerified(true);
      }
    }
  }, [session, isPending, isAdmin, adminVerified]);

  // Separate effect for fetching API keys - doesn't affect redirect logic
  useEffect(() => {
    if (adminVerified) {
      fetchApiKeys();
    }
  }, [adminVerified, sortBy, filterStatus]);

  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      // Parse compound sortBy value (e.g., 'createdAt_desc' -> sortBy: 'createdAt', sortOrder: 'desc')
      const [sortField, sortOrder] = sortBy.split('_');
      const params = new URLSearchParams({
        all: 'true',
        sortBy: sortField,
        sortOrder: sortOrder,
        ...(filterStatus !== 'all' && { status: filterStatus }),
      });
      const response = await fetch(`/api/api-keys?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }

      const data = await response.json();
      setApiKeys(data.data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to fetch API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!keyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName,
          expiresIn,
          rateLimitRpm: parseInt(rateLimitRpm),
          rateLimitTpd: parseInt(rateLimitTpd),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }

      const data = await response.json();
      setNewKeyValue(data.key);
      setShowNewKey(true);
      
      // Reset form
      setKeyName('');
      setExpiresIn('never');
      setRateLimitRpm('60');
      setRateLimitTpd('1000000');
      
      // Refresh list
      fetchApiKeys();
      
      toast.success('API key created successfully');
    } catch (error: any) {
      console.error('Error creating API key:', error);
      toast.error(error.message || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/api-keys?id=${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke API key');
      }

      toast.success('API key revoked successfully');
      fetchApiKeys();
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast.error('Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const checkUsage = async (keyId: string, keyName: string) => {
    setLoadingUsage(true);
    setUsageDialog(true);
    setSelectedKeyUsage(null);

    try {
      const response = await fetch(`/api/api-keys/usage?keyId=${keyId}`);
      if (!response.ok) throw new Error('Failed to fetch usage statistics');
      const data: ApiKeyUsage = await response.json();
      setSelectedKeyUsage(data);
    } catch (error) {
      toast.error(`Failed to load usage for ${keyName}`);
      console.error(error);
      setUsageDialog(false);
    } finally {
      setLoadingUsage(false);
    }
  };

  const startEditModels = (key: ApiKey) => {
    setEditingKeyId(key.id);
    setEditAllowedModels((key.allowedModels || []).join(', '));
  };

  const cancelEditModels = () => {
    setEditingKeyId(null);
    setEditAllowedModels('');
  };

  const saveAllowedModels = async (keyId: string) => {
    try {
      setIsSavingModels(true);
      const models = Array.from(
        new Set(
          editAllowedModels
            .split(',')
            .map((m) => m.trim())
            .filter((m) => m.length > 0)
        )
      );

      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedModels: models }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update allowed models');
      }

      const data = await response.json();

      setApiKeys((prev) =>
        prev.map((k) =>
          k.id === keyId ? { ...k, allowedModels: data.allowedModels || models } : k
        )
      );

      toast.success('Allowed models updated');
      cancelEditModels();
    } catch (error: any) {
      console.error('Error updating allowed models:', error);
      toast.error(error.message || 'Failed to update allowed models');
    } finally {
      setIsSavingModels(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ArrowsClockwise className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert className="max-w-md">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. This page is only available to administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Key className="w-8 h-8" />
                Admin API Key Management
              </h1>
              <p className="text-muted-foreground mt-2">
                Create and manage API keys for external access
              </p>
            </div>
            <Button onClick={() => window.location.href = '/admin'} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New API Key</CardTitle>
            <CardDescription>
              Generate a new API key with custom rate limits and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Production API Key"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresIn">Expiration</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="90d">90 days</SelectItem>
                    <SelectItem value="1y">1 year</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rateLimitRpm">Requests per Minute</Label>
                <Input
                  id="rateLimitRpm"
                  type="number"
                  min="1"
                  max="10000"
                  value={rateLimitRpm}
                  onChange={(e) => setRateLimitRpm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rateLimitTpd">Tokens per Day</Label>
                <Input
                  id="rateLimitTpd"
                  type="number"
                  min="1000"
                  max="100000000"
                  value={rateLimitTpd}
                  onChange={(e) => setRateLimitTpd(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={createApiKey} 
              disabled={isCreating || !keyName.trim()}
              className="w-full md:w-auto"
            >
              {isCreating ? (
                <>
                  <ArrowsClockwise className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Create API Key
                </>
              )}
            </Button>

            {showNewKey && newKeyValue && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold text-green-800 dark:text-green-400">
                      API Key Created Successfully!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Make sure to copy your API key now. You won't be able to see it again!
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 p-2 bg-white dark:bg-gray-800 rounded border text-sm break-all">
                        {newKeyValue}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(newKeyValue)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowNewKey(false);
                        setNewKeyValue('');
                      }}
                      className="mt-2"
                    >
                      Dismiss
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Existing API Keys</CardTitle>
                <CardDescription>
                  Manage and monitor your API keys
                </CardDescription>
              </div>
              <Button onClick={fetchApiKeys} variant="outline" size="sm">
                <ArrowsClockwise className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              {/* Search on the left */}
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="search" className="text-xs text-muted-foreground mb-1 block">Search</Label>
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name or key prefix..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Filters on the right */}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="min-w-[200px]">
                  <Label htmlFor="sortBy" className="text-xs text-muted-foreground mb-1 block">Sort by</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger id="sortBy" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt_desc">Newest First</SelectItem>
                      <SelectItem value="createdAt_asc">Oldest First</SelectItem>
                      <SelectItem value="lastUsedAt_desc">Recently Used</SelectItem>
                      <SelectItem value="lastUsedAt_asc">Least Recently Used</SelectItem>
                      <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                      <SelectItem value="totalRequests_desc">Most Requests</SelectItem>
                      <SelectItem value="totalRequests_asc">Fewest Requests</SelectItem>
                      <SelectItem value="totalTokens_desc">Most Tokens</SelectItem>
                      <SelectItem value="totalTokens_asc">Fewest Tokens</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[130px]">
                  <Label htmlFor="filterStatus" className="text-xs text-muted-foreground mb-1 block">Status</Label>
                  <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as typeof filterStatus)}>
                    <SelectTrigger id="filterStatus" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Keys</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Revoked Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {isLoading ? (
              <div className="text-center py-8">
                <ArrowsClockwise className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading API keys...</p>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No API keys found. Create one above to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys
                  .filter((key) => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      key.name.toLowerCase().includes(query) ||
                      key.keyPreview?.toLowerCase().includes(query) ||
                      key.id.toLowerCase().includes(query)
                    );
                  })
                  .map((key) => (
                  <div
                    key={key.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{key.name}</h3>
                          {key.isActive ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Revoked</Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>
                            <span className="font-mono bg-muted px-2 py-0.5 rounded">
                              {key.keyPreview}
                            </span>
                          </p>
                          <p>
                            Rate limits: {key.rateLimitRpm} req/min • {key.rateLimitTpd.toLocaleString()} tokens/day
                          </p>
                          <p>Created: {new Date(key.createdAt).toLocaleString()}</p>
                          {key.lastUsedAt && (
                            <p>Last used: {new Date(key.lastUsedAt).toLocaleString()}</p>
                          )}
                          {key.expiresAt && (
                            <p>Expires: {new Date(key.expiresAt).toLocaleString()}</p>
                          )}
                          {(key.totalRequests !== undefined || key.totalTokens !== undefined) && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              Usage: {key.totalRequests?.toLocaleString() || 0} requests • {key.totalTokens?.toLocaleString() || 0} tokens
                            </p>
                          )}
                          <div className="pt-2">
                            <div className="text-xs font-medium text-foreground mb-1">Allowed models</div>
                            {editingKeyId === key.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editAllowedModels}
                                  onChange={(e) => setEditAllowedModels(e.target.value)}
                                  placeholder="Comma-separated models (e.g. llama-4, deepseek-v3)"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => saveAllowedModels(key.id)}
                                    disabled={isSavingModels}
                                  >
                                    {isSavingModels ? (
                                      <>
                                        <ArrowsClockwise className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                      </>
                                    ) : (
                                      'Save'
                                    )}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditModels}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {(key.allowedModels || []).slice(0, 10).map((m, idx) => (
                                  <Badge key={idx} variant="secondary">{m}</Badge>
                                ))}
                                {key.allowedModels && key.allowedModels.length > 10 && (
                                  <Badge variant="secondary">+{key.allowedModels.length - 10} more</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {editingKeyId === key.id ? null : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditModels(key)}
                          >
                            <Key className="w-4 h-4 mr-1" />
                            Edit Models
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => checkUsage(key.id, key.name)}
                        >
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Check Usage
                        </Button>
                        {key.isActive && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => revokeApiKey(key.id)}
                          >
                            <Trash className="w-4 h-4 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={usageDialog} onOpenChange={setUsageDialog}>
          <DialogContent className="max-w-[1800px] w-[95vw] sm:max-w-[1800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                API Key Usage Statistics
              </DialogTitle>
              <DialogDescription>
                Comprehensive usage metrics and analytics
              </DialogDescription>
            </DialogHeader>
            
            {loadingUsage ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : selectedKeyUsage ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-5 px-4">
                      <div className="text-lg font-bold break-words leading-tight">{selectedKeyUsage.overall.totalRequests.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground mt-1">Total Requests</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5 px-4">
                      <div className="text-lg font-bold break-words leading-tight">{selectedKeyUsage.overall.totalTokens.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground mt-1">Total Tokens</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5 px-4">
                      <div className="text-lg font-bold break-words leading-tight">{selectedKeyUsage.overall.avgResponseTime}ms</div>
                      <div className="text-xs text-muted-foreground mt-1">Avg Response Time</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5 px-4">
                      <div className="text-lg font-bold text-destructive break-words leading-tight">{selectedKeyUsage.overall.errorCount}</div>
                      <div className="text-xs text-muted-foreground mt-1">Errors</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Usage by Time Period</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Last Minute</span>
                        <Badge variant={selectedKeyUsage.lastMinute.requests > 50 ? "destructive" : "secondary"}>
                          {selectedKeyUsage.lastMinute.requests} requests
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Last Hour</span>
                        <div className="text-sm text-muted-foreground">
                          {selectedKeyUsage.lastHour.requests.toLocaleString()} requests • {selectedKeyUsage.lastHour.totalTokens.toLocaleString()} tokens
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Today</span>
                        <div className="text-sm text-muted-foreground">
                          {selectedKeyUsage.today.requests.toLocaleString()} requests • {selectedKeyUsage.today.totalTokens.toLocaleString()} tokens
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">This Month</span>
                        <div className="text-sm text-muted-foreground">
                          {selectedKeyUsage.thisMonth.requests.toLocaleString()} requests • {selectedKeyUsage.thisMonth.totalTokens.toLocaleString()} tokens
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedKeyUsage.modelStats.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Usage by Model</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedKeyUsage.modelStats.map((stat, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="font-mono text-xs">{stat.model}</span>
                            <div className="text-muted-foreground">
                              {stat.requests.toLocaleString()} requests • {stat.totalTokens.toLocaleString()} tokens
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedKeyUsage.toolStats.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Tool Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {selectedKeyUsage.toolStats.map((stat, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 border rounded text-sm">
                            <span className="font-medium">{stat.tool}</span>
                            <Badge variant="secondary">{stat.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedKeyUsage.recentRequests.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Recent Requests (Last 10)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedKeyUsage.recentRequests.map((request, idx) => (
                          <div key={idx} className="p-3 border rounded text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-mono">{request.model}</span>
                              <Badge variant={request.statusCode >= 400 ? "destructive" : "secondary"}>
                                {request.statusCode}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground">
                              {new Date(request.timestamp).toLocaleString()} • 
                              {(request.inputTokens + request.outputTokens).toLocaleString()} tokens • 
                              {request.responseTimeMs.toLocaleString()}ms
                            </div>
                            {request.toolCalls && request.toolCalls.length > 0 && (
                              <div className="text-muted-foreground">
                                Tools: {request.toolCalls.join(', ')}
                              </div>
                            )}
                            {request.error && (
                              <div className="text-destructive">
                                Error: {request.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedKeyUsage.overall.firstRequest && (
                  <div className="text-xs text-muted-foreground text-center space-y-1">
                    <div>First request: {new Date(selectedKeyUsage.overall.firstRequest).toLocaleString()}</div>
                    {selectedKeyUsage.overall.lastRequest && (
                      <div>Last request: {new Date(selectedKeyUsage.overall.lastRequest).toLocaleString()}</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No usage data available
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

