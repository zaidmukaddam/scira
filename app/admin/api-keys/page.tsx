'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ApiKeyForm } from '@/components/admin/api-key-form';
import { ApiKeyAnalytics } from '@/components/admin/api-key-analytics';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClassicLoader } from '@/components/ui/loading';
import { toast } from 'sonner';
import { 
  Edit2Icon, 
  TrashIcon, 
  CheckCircleIcon, 
  AlertCircleIcon,
  PlusIcon,
  TestTubeIcon,
  RotateCcwIcon,
} from 'lucide-react';

interface ApiKey {
  id: string;
  displayName: string | null;
  isActive: boolean;
  isPrimary: boolean;
  enabled: boolean;
  priority: number;
  maskedKey: string;
  usageToday: {
    messageCount: number;
    apiCallCount: number;
    tokensUsed: number;
  };
  lastUsedAt: Date | null;
  lastErrorAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Stats {
  keys: ApiKey[];
  stats: {
    totalRequests: number;
    totalTokens: number;
    errorRate: number;
    activeKeyCount: number;
  };
}

export default function ApiKeysPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/api-keys');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this key?')) return;

    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Key deleted successfully');
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete key');
    }
  };

  const handleTestKey = async (id: string) => {
    setTestingKeyId(id);
    try {
      const res = await fetch(`/api/admin/api-keys/${id}/test`, { method: 'POST' });
      const data = await res.json();

      if (data.valid) {
        toast.success('API key is valid');
      } else {
        toast.error(`Key test failed: ${data.error}`);
      }
    } catch (error) {
      toast.error('Failed to test key');
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleActivateKey = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/api-keys/${id}/activate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to activate');
      toast.success('Key activated successfully');
      fetchStats();
    } catch (error) {
      toast.error('Failed to activate key');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingKey(null);
    fetchStats();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <ClassicLoader />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <p>Failed to load API keys</p>
      </div>
    );
  }

  const getUsagePercentage = (apiCallCount: number) => {
    return Math.min((apiCallCount / 250) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage < 60) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gemini API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and monitor your Gemini API keys and quotas
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingKey(null);
            setShowForm(true);
          }}
          className="gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Add Key
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stats.activeKeyCount}</div>
            <p className="text-xs text-muted-foreground">of {stats.keys.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">across all keys</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.stats.totalTokens / 1000).toFixed(1)}K
            </div>
            <p className="text-xs text-muted-foreground">today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stats.errorRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">last 100 events</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>API Keys Status</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(true)}
            >
              View Analytics
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys configured</p>
          ) : (
            stats.keys.map((key) => {
              const usagePercentage = getUsagePercentage(key.usageToday.apiCallCount);
              const statusColor = getUsageColor(usagePercentage);

              return (
                <div
                  key={key.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{key.displayName || 'Unnamed Key'}</h3>
                        <Badge variant={key.enabled ? 'default' : 'secondary'}>
                          {key.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {key.isActive && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircleIcon className="w-3 h-3 text-green-600" />
                            Active
                          </Badge>
                        )}
                        {key.lastErrorAt && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircleIcon className="w-3 h-3" />
                            Error
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Key: {key.maskedKey}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">Priority: {key.priority}</p>
                      <p className="text-xs text-muted-foreground">
                        {key.lastUsedAt
                          ? `Used: ${new Date(key.lastUsedAt).toLocaleTimeString()}`
                          : 'Never used'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium">
                        Requests: {key.usageToday.apiCallCount}/250
                      </span>
                      <span className="text-muted-foreground">
                        {usagePercentage.toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={usagePercentage}
                      className="h-2"
                      indicatorClassName={statusColor}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestKey(key.id)}
                      disabled={testingKeyId === key.id}
                      className="gap-1"
                    >
                      <TestTubeIcon className="w-3 h-3" />
                      Test
                    </Button>
                    {!key.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivateKey(key.id)}
                        className="gap-1"
                      >
                        <RotateCcwIcon className="w-3 h-3" />
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingKey(key);
                        setShowForm(true);
                      }}
                      className="gap-1"
                    >
                      <Edit2Icon className="w-3 h-3" />
                      Edit
                    </Button>
                    {!key.isPrimary && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteKey(key.id)}
                        className="gap-1 text-destructive"
                      >
                        <TrashIcon className="w-3 h-3" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingKey ? 'Edit API Key' : 'Add New API Key'}
            </DialogTitle>
          </DialogHeader>
          <ApiKeyForm
            initialData={editingKey}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      {showAnalytics && (
        <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>API Keys Analytics</DialogTitle>
            </DialogHeader>
            <ApiKeyAnalytics />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
