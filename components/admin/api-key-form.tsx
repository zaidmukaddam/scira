'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ClassicLoader } from '@/components/ui/loading';

interface ApiKeyFormProps {
  initialData?: {
    id: string;
    displayName: string | null;
    priority: number;
    enabled: boolean;
  } | null;
  onSuccess: () => void;
}

export function ApiKeyForm({ initialData, onSuccess }: ApiKeyFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    displayName: initialData?.displayName || '',
    priority: String(initialData?.priority || 1),
    enabled: initialData?.enabled ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = initialData
        ? `/api/admin/api-keys/${initialData.id}`
        : '/api/admin/api-keys';

      const method = initialData ? 'PUT' : 'POST';

      const body = initialData
        ? {
            displayName: formData.displayName,
            priority: parseInt(formData.priority),
            enabled: formData.enabled,
          }
        : {
            key: formData.key,
            displayName: formData.displayName,
            priority: parseInt(formData.priority),
            enabled: formData.enabled,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save key');
      }

      toast.success(
        initialData
          ? 'API key updated successfully'
          : 'API key added successfully',
      );
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initialData && (
        <div className="space-y-2">
          <Label htmlFor="key">API Key *</Label>
          <Input
            id="key"
            placeholder="Paste your Gemini API key here"
            type="password"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            required
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Your key will be encrypted before storage
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          placeholder="e.g. Production Key 1"
          value={formData.displayName}
          onChange={(e) =>
            setFormData({ ...formData, displayName: e.target.value })
          }
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={formData.priority}
          onValueChange={(value) =>
            setFormData({ ...formData, priority: value })
          }
        >
          <SelectTrigger id="priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 (Highest)</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="5">5 (Lowest)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Lower priority keys are used first for rotation
        </p>
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="enabled">Enabled</Label>
        <Switch
          id="enabled"
          checked={formData.enabled}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, enabled: checked })
          }
          disabled={loading}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={loading || (!initialData && !formData.key)}
          className="flex-1"
        >
          {loading ? (
            <>
              <ClassicLoader size="sm" className="w-4 h-4 mr-2" />
              Saving...
            </>
          ) : (
            initialData ? 'Update Key' : 'Add Key'
          )}
        </Button>
      </div>
    </form>
  );
}
