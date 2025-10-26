'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AgentAccessDialogProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function AgentAccessDialog({ userId, open, onClose }: AgentAccessDialogProps) {
  const { data: access, refetch } = useQuery({
    queryKey: ['user-agents', userId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}/agents`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch agents');
      return res.json();
    },
    enabled: open,
  });

  const handleToggle = async (agentId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/agents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ agents: { [agentId]: enabled } }),
      });
      if (!res.ok) throw new Error('Failed to update agent access');
      toast.success('Accès agent mis à jour');
      refetch();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestion Accès Agents</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 max-h-[500px] overflow-y-auto">
          {access?.map((a: any) => (
            <div key={a.agentId} className="flex items-center space-x-2 p-2 border rounded">
              <Checkbox
                checked={a.enabled}
                onCheckedChange={(checked) => handleToggle(a.agentId, !!checked)}
              />
              <Label className="cursor-pointer">{a.agentId}</Label>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
