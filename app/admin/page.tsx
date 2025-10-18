"use client";

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pusherClient } from '@/lib/pusher-client';
import { Card } from '@/components/ui/card';
import { TopModelsChart, TopUsersActivityChart, TopUsersCostChart } from '@/components/admin/dashboard-charts';

async function fetchMetrics() {
  const res = await fetch('/api/admin/metrics', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed');
  return res.json();
}
async function fetchHealth() {
  const res = await fetch('/api/admin/health', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed');
  return res.json();
}
async function fetchOnline() {
  const res = await fetch('/api/admin/online', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed');
  return res.json();
}
async function fetchEvents() {
  const res = await fetch('/api/admin/events/recent', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed');
  return res.json();
}

export default function AdminHomePage() {
  const qc = useQueryClient();
  const { data: metrics } = useQuery({ queryKey: ['admin-metrics'], queryFn: fetchMetrics, refetchInterval: 30000 });
  const { data: health } = useQuery({ queryKey: ['admin-health'], queryFn: fetchHealth, refetchInterval: 30000 });
  const { data: online } = useQuery({ queryKey: ['admin-online'], queryFn: fetchOnline, refetchInterval: 15000 });
  const { data: events } = useQuery({ queryKey: ['admin-events'], queryFn: fetchEvents, refetchInterval: 30000 });

  useEffect(() => {
    if (!pusherClient) return;
    const chUsers = pusherClient.subscribe('private-admin-users');
    const chEvents = pusherClient.subscribe('private-admin-events');
    const chOnline = pusherClient.subscribe('presence-online');
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['admin-metrics'] });
      qc.invalidateQueries({ queryKey: ['admin-online'] });
      qc.invalidateQueries({ queryKey: ['admin-events'] });
    };
    chUsers.bind('created', invalidate);
    chUsers.bind('updated', invalidate);
    chEvents.bind('new', invalidate);
    chOnline.bind('heartbeat', () => qc.invalidateQueries({ queryKey: ['admin-online'] }));

    const interval = setInterval(() => { fetch('/api/admin/heartbeat', { method: 'POST' }); }, 35000);

    return () => {
      clearInterval(interval);
      try {
        chUsers.unbind('created', invalidate);
        chUsers.unbind('updated', invalidate);
        chEvents.unbind('new', invalidate);
        chOnline.unbind('heartbeat');
        pusherClient.unsubscribe('private-admin-users');
        pusherClient.unsubscribe('private-admin-events');
        pusherClient.unsubscribe('presence-online');
      } catch {}
    };
  }, [qc]);

  const kpis = metrics?.kpis;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Utilisateurs actifs (≤60s)</div>
                <div className="text-2xl font-semibold">{kpis?.activeUsers ?? '—'}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Suspendus</div>
                <div className="text-2xl font-semibold">{kpis ? `${kpis.suspended.count} (${kpis.suspended.pct.toFixed(1)}%)` : '—'}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Supprimés</div>
                <div className="text-2xl font-semibold">{kpis ? `${kpis.deleted.count} (${kpis.deleted.pct.toFixed(1)}%)` : '—'}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Messages (24h)</div>
                <div className="text-2xl font-semibold">{kpis?.messages24hTotal ?? '—'}</div>
              </Card>
            </div>
          </div>
          <div className="px-4 lg:px-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
            <TopModelsChart data={metrics?.charts?.models || []} />
            <TopUsersActivityChart data={metrics?.charts?.usersActivity || []} />
            <TopUsersCostChart data={metrics?.charts?.usersCost || []} />
          </div>
          <div className="px-4 lg:px-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="p-4 xl:col-span-1">
              <div className="text-sm font-medium mb-2">En ligne (≤60s)</div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {(online?.users || []).map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between text-sm">
                    <div className="truncate mr-2">{u.name}</div>
                    <div className="text-muted-foreground text-xs">{u.ipAddress || '—'}</div>
                  </div>
                ))}
                {(online?.users || []).length === 0 && <div className="text-xs text-muted-foreground">Aucun utilisateur en ligne</div>}
              </div>
            </Card>
            <Card className="p-4 xl:col-span-1">
              <div className="text-sm font-medium mb-2">Santé Système</div>
              <div className="space-y-2">
                {(health?.providers || []).map((p: any) => (
                  <div key={p.provider} className="flex items-center justify-between text-sm">
                    <div className="truncate mr-2">{p.provider}</div>
                    <div className="text-muted-foreground text-xs">avg {p.avgLatency}ms · p95 {p.p95}ms · {p.status === 'ok' ? '🟢' : p.status === 'warn' ? '🟡' : '🔴'}</div>
                  </div>
                ))}
                {(health?.providers || []).length === 0 && <div className="text-xs text-muted-foreground">Aucune donnée</div>}
              </div>
            </Card>
            <Card className="p-4 xl:col-span-1">
              <div className="text-sm font-medium mb-2">Événements récents</div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {(events?.events || []).map((e: any) => (
                  <div key={e.id} className="text-xs">
                    <div className="font-medium">[{e.category}] {e.type}</div>
                    <div className="text-muted-foreground truncate">{e.message}</div>
                  </div>
                ))}
                {(events?.events || []).length === 0 && <div className="text-xs text-muted-foreground">Aucun événement</div>}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
