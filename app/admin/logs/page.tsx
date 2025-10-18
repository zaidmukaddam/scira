"use client";

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pusherClient } from '@/lib/pusher-client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

async function fetchEvents(filter?: string) {
  const url = filter ? `/api/admin/events/recent?filter=${encodeURIComponent(filter)}` : '/api/admin/events/recent';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('failed');
  return res.json();
}

export default function AdminLogsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { data } = useQuery({ queryKey: ['admin-events', filter], queryFn: () => fetchEvents(filter) });

  useEffect(() => {
    if (!pusherClient) return;
    const ch = pusherClient.subscribe('private-admin-events');
    const onNew = () => qc.invalidateQueries({ queryKey: ['admin-events'] });
    ch.bind('new', onNew);
    return () => { try { ch.unbind('new', onNew); pusherClient.unsubscribe('private-admin-events'); } catch {} };
  }, [qc]);

  const events = data?.events || [];

  return (
    <div className="px-4 lg:px-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Journaux récents</h2>
        <Select value={filter} onValueChange={(v) => setFilter(v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tous" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous</SelectItem>
            <SelectItem value="security">Sécurité</SelectItem>
            <SelectItem value="user">Utilisateur</SelectItem>
            <SelectItem value="system">Système</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="p-4">
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {events.map((e: any) => (
            <div key={e.id} className="text-xs">
              <div className="font-medium">[{e.category}] {e.type} · {new Date(e.createdAt).toLocaleString('fr-FR')}</div>
              <div className="text-muted-foreground">{e.message}</div>
            </div>
          ))}
          {events.length === 0 && <div className="text-xs text-muted-foreground">Aucun événement</div>}
        </div>
      </Card>
    </div>
  );
}
