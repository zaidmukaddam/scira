"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pusherClient } from '@/lib/pusher-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';

async function fetchMetrics(id: string, range: string) {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}/metrics?range=${encodeURIComponent(range)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('failed');
  return res.json();
}
async function fetchMessages(id: string, offset: number) {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}/messages?limit=20&offset=${offset}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('failed');
  return res.json();
}

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const qc = useQueryClient();
  const [range, setRange] = useState<'24h' | '7d'>('24h');

  const { data: metrics } = useQuery({ queryKey: ['admin-user-metrics', id, range], queryFn: () => fetchMetrics(id, range), refetchInterval: 30000 });
  const { data: page1 } = useQuery({ queryKey: ['admin-user-messages', id, 0], queryFn: () => fetchMessages(id, 0), refetchInterval: 30000 });
  const [messages, setMessages] = useState<any[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (page1) {
      setMessages(page1.messages || []);
      setNextOffset(page1.nextOffset || 0);
      setHasMore(!!page1.hasMore);
    }
  }, [page1]);

  async function loadMore() {
    const res = await fetchMessages(id, nextOffset);
    setMessages((prev) => [...prev, ...(res.messages || [])]);
    setNextOffset(res.nextOffset || nextOffset);
    setHasMore(!!res.hasMore);
  }

  useEffect(() => {
    if (!pusherClient) return;
    const chEvents = pusherClient.subscribe('private-admin-events');
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['admin-user-metrics', id] });
      qc.invalidateQueries({ queryKey: ['admin-user-messages', id] });
    };
    chEvents.bind('new', invalidate);
    return () => {
      try {
        chEvents.unbind('new', invalidate);
        pusherClient.unsubscribe('private-admin-events');
      } catch {}
    };
  }, [qc, id]);

  const activityData = (metrics?.series?.activity || []).map((d: any) => ({ label: d.ts, value: d.count }));
  const modelsData = (metrics?.series?.models || []).map((d: any) => ({ name: d.name, value: d.count }));
  const rolesData = (metrics?.series?.roles || []).map((d: any) => ({ name: d.role, value: d.count }));

  return (
    <div className="px-4 lg:px-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold">Profil utilisateur</div>
          <div className="text-xs text-muted-foreground">ID: {id}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={range === '24h' ? 'default' : 'outline'} size="sm" onClick={() => setRange('24h')}>24h</Button>
          <Button variant={range === '7d' ? 'default' : 'outline'} size="sm" onClick={() => setRange('7d')}>7j</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total messages</div>
          <div className="text-2xl font-semibold">{metrics?.kpis?.totalMessages ?? '—'}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Messages (24h)</div>
          <div className="text-2xl font-semibold">{metrics?.kpis?.messages24h ?? '—'}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-4 xl:col-span-2">
          <div className="text-sm font-medium mb-2">Activité {range === '24h' ? 'par heure (24h)' : 'quotidienne (7j)'}</div>
          <ChartContainer config={{ value: { label: 'Messages', color: 'var(--primary)' } }} className="aspect-auto h-[300px] w-full">
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" hide />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="value" stroke="var(--primary)" dot={false} strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">Répartition par modèle</div>
          <ChartContainer config={{ value: { label: 'Messages', color: 'var(--primary)' } }} className="aspect-auto h-[300px] w-full">
            <BarChart data={modelsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={140} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--primary)" radius={[4,4,4,4]} />
            </BarChart>
          </ChartContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">Répartition par rôle</div>
          <ChartContainer config={{ value: { label: 'Messages', color: 'var(--primary)' } }} className="aspect-auto h-[260px] w-full">
            <BarChart data={rolesData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="var(--primary)" radius={[4,4,0,0]} />
            </BarChart>
          </ChartContainer>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">Historique des messages</div>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {messages.map((m: any) => (
              <div key={m.id} className="text-xs flex items-center justify-between">
                <div className="truncate mr-2">{new Date(m.createdAt).toLocaleString('fr-FR')}</div>
                <div className="text-muted-foreground mr-2">{m.role}</div>
                <div className="text-muted-foreground truncate max-w-[40%]">{m.model || '—'}</div>
              </div>
            ))}
            {messages.length === 0 && <div className="text-xs text-muted-foreground">Aucun message</div>}
          </div>
          {hasMore && (
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={loadMore}>Charger plus</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
