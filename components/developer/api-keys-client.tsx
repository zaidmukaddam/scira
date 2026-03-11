'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Trash2, Key, Building2, AlertCircle, BarChart3, Loader2, TrendingUp } from 'lucide-react';
import CommercialAccountModal from '@/components/api-docs/commercial-account-modal';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ApiKey {
  id: string;
  name: string;
  userId?: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  rateLimitRpm: number;
  rateLimitTpd: number;
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

export function ApiKeysClient() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);
  const [keyName, setKeyName] = useState('');
  const [expiresIn, setExpiresIn] = useState('never');
  const [showCommercialModal, setShowCommercialModal] = useState(false);

  const [formError, setFormError] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  const [usageDialog, setUsageDialog] = useState(false);
  const [selectedKeyUsage, setSelectedKeyUsage] = useState<ApiKeyUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const validateKeyName = (name: string): string => {
    if (!name.trim()) {
      return 'API key name is required';
    }
    if (name.trim().length < 3) {
      return 'API key name must be at least 3 characters';
    }
    if (name.trim().length > 50) {
      return 'API key name must be less than 50 characters';
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
      return 'API key name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    return '';
  };

  const handleKeyNameChange = (value: string) => {
    setKeyName(value);
    setFormError('');
    if (value) {
      const error = validateKeyName(value);
      setValidationError(error);
    } else {
      setValidationError('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !creating && keyName.trim() && !validationError) {
      e.preventDefault();
      createApiKey();
    }
  };

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (!response.ok) throw new Error('Failed to fetch API keys');
      const data = await response.json();
      setApiKeys(data.data);
    } catch (error) {
      toast.error('Failed to load API keys');
      console.error(error);
    } finally {
      setLoading(false);
    }
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

  const createApiKey = async () => {
    setFormError('');
    setValidationError('');

    const validationErr = validateKeyName(keyName);
    if (validationErr) {
      setValidationError(validationErr);
      toast.error(validationErr);
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName.trim(),
          expiresIn,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = 'Failed to create API key';

        if (response.status === 400) {
          errorMessage = data.error || 'Invalid request. Please check your input.';
        } else if (response.status === 401) {
          errorMessage = 'You must be logged in to create an API key.';
        } else if (response.status === 403) {
          errorMessage = data.error || 'You do not have permission to create API keys.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (data.error) {
          errorMessage = data.error;
        }

        setFormError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      setNewKey({ key: data.key, name: data.name });
      setNewKeyDialog(true);
      setKeyName('');
      setValidationError('');
      toast.success('API key created successfully!');
      fetchApiKeys();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Network error: ${error.message}`
          : 'Failed to create API key. Please check your connection.';

      setFormError(errorMessage);
      toast.error(errorMessage);
      console.error('API key creation error:', error);
    } finally {
      setCreating(false);
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

      if (!response.ok) throw new Error('Failed to revoke API key');

      toast.success('API key revoked successfully');
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to revoke API key');
      console.error(error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">API Keys</h1>
          <Badge variant="secondary">Early Access</Badge>
        </div>
        <p className="text-muted-foreground">Manage API keys for external access to SCX.ai models and tools.</p>
      </div>

      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200">
        <CardHeader>
          <CardTitle>🚀 Early Access API Keys</CardTitle>
          <CardDescription>
            SCX.ai API is currently in early access. Apply for a commercial account to get API access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Early Access Program</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                We&apos;re currently in early access with limited availability. API keys are provided through our
                commercial account application process.
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Server-side tool execution with 30+ tools</li>
                <li>• Advanced models from OpenAI, Google, Meta and DeepSeek</li>
                <li>• 60 requests/minute, 100K tokens/day</li>
                <li>• Priority support and dedicated assistance</li>
              </ul>
            </div>

            <Button onClick={() => setShowCommercialModal(true)} className="w-full" size="lg">
              <Building2 className="mr-2 h-5 w-5" />
              Apply for Early Access API Key
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Applications are typically reviewed within 24-48 hours
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>Active API keys for your account. Keep these secure and do not share them.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Early access - key creation disabled */}
          {/* Creation form kept for future enablement */}
          {/* <div className="mb-6 p-4 border rounded-lg bg-muted/50">
            ...
          </div> */}

          {loading ? (
            <p>Loading...</p>
          ) : apiKeys.length === 0 ? (
            <p className="text-muted-foreground">No API keys yet. Apply for a commercial account to get API access.</p>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${!key.isActive ? 'opacity-60 bg-muted/30' : ''}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`font-medium ${!key.isActive ? 'text-muted-foreground line-through' : ''}`}>
                        {key.name}
                      </div>
                      {!key.isActive && (
                        <Badge
                          variant="secondary"
                          className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        >
                          Revoked
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && ` • Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                      {key.expiresAt && ` • Expires: ${new Date(key.expiresAt).toLocaleDateString()}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Rate limits: {key.rateLimitRpm} req/min • {key.rateLimitTpd.toLocaleString()} tokens/day
                    </div>
                    {!key.isActive && (
                      <div className="text-xs text-muted-foreground mt-1 italic">
                        This API key is no longer accessible and cannot be used
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => checkUsage(key.id, key.name)}
                      className="text-primary"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Check Usage
                    </Button>
                    {key.isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => revokeApiKey(key.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created Successfully</DialogTitle>
            <DialogDescription>Please copy your API key now. You won&apos;t be able to see it again.</DialogDescription>
          </DialogHeader>
          {newKey && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">{newKey.key}</div>
              <Button
                className="w-full"
                onClick={() => {
                  copyToClipboard(newKey.key);
                  setNewKeyDialog(false);
                  setNewKey(null);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy API Key
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={usageDialog} onOpenChange={setUsageDialog}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              API Key Usage Statistics
            </DialogTitle>
            <DialogDescription>Comprehensive usage metrics and analytics</DialogDescription>
          </DialogHeader>

          {loadingUsage ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedKeyUsage ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 px-3">
                    <div className="text-xl md:text-2xl font-bold break-words">
                      {selectedKeyUsage.overall.totalRequests.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Requests</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 px-3">
                    <div className="text-xl md:text-2xl font-bold break-words">
                      {selectedKeyUsage.overall.totalTokens.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Tokens</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 px-3">
                    <div className="text-xl md:text-2xl font-bold break-words">
                      {selectedKeyUsage.overall.avgResponseTime}ms
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Response Time</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 px-3">
                    <div className="text-xl md:text-2xl font-bold text-destructive break-words">
                      {selectedKeyUsage.overall.errorCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Errors</div>
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
                      <Badge variant={selectedKeyUsage.lastMinute.requests > 50 ? 'destructive' : 'secondary'}>
                        {selectedKeyUsage.lastMinute.requests} requests
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Last Hour</span>
                      <div className="text-sm text-muted-foreground">
                        {selectedKeyUsage.lastHour.requests} requests •{' '}
                        {selectedKeyUsage.lastHour.totalTokens.toLocaleString()} tokens
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Today</span>
                      <div className="text-sm text-muted-foreground">
                        {selectedKeyUsage.today.requests} requests •{' '}
                        {selectedKeyUsage.today.totalTokens.toLocaleString()} tokens
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">This Month</span>
                      <div className="text-sm text-muted-foreground">
                        {selectedKeyUsage.thisMonth.requests} requests •{' '}
                        {selectedKeyUsage.thisMonth.totalTokens.toLocaleString()} tokens
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
                            {stat.requests} requests • {stat.totalTokens.toLocaleString()} tokens
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
                            <Badge variant={request.statusCode >= 400 ? 'destructive' : 'secondary'}>
                              {request.statusCode}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground">
                            {new Date(request.timestamp).toLocaleString()} •{' '}
                            {request.inputTokens + request.outputTokens} tokens • {request.responseTimeMs}ms
                          </div>
                          {request.toolCalls && request.toolCalls.length > 0 && (
                            <div className="text-muted-foreground">Tools: {request.toolCalls.join(', ')}</div>
                          )}
                          {request.error && <div className="text-destructive">Error: {request.error}</div>}
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
            <div className="text-center py-12 text-muted-foreground">No usage data available</div>
          )}
        </DialogContent>
      </Dialog>

      <CommercialAccountModal open={showCommercialModal} onOpenChange={setShowCommercialModal} />
    </div>
  );
}
