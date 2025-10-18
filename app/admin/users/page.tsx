"use client";

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pusherClient } from '@/lib/pusher-client';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

async function fetchUsers() {
  const res = await fetch('/api/admin/users', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed');
  return res.json();
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-users'], queryFn: fetchUsers, refetchOnWindowFocus: true });

  useEffect(() => {
    if (!pusherClient) return;
    const channel = pusherClient.subscribe('private-admin-users');
    const onUpdate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });
    channel.bind('created', onUpdate);
    channel.bind('updated', onUpdate);
    return () => {
      try {
        channel.unbind('created', onUpdate);
        channel.unbind('updated', onUpdate);
        pusherClient.unsubscribe('private-admin-users');
      } catch {}
    };
  }, [qc]);

  const users = data?.users || [];

  return (
    <div className="px-4 lg:px-6">
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-base font-semibold">Utilisateurs</h2>
          <p className="text-xs text-muted-foreground">Gestion des comptes et accès</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>En ligne</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Dernière activité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => {
                const online = u.lastSeen && new Date(u.lastSeen).getTime() > Date.now() - 60_000;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'secondary' : u.status === 'suspended' ? 'outline' : 'destructive'}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {online ? <span className="text-green-600">En ligne</span> : <span className="text-muted-foreground">Hors ligne</span>}
                    </TableCell>
                    <TableCell>{u.ipAddress || '—'}</TableCell>
                    <TableCell>{u.lastSeen ? new Date(u.lastSeen).toLocaleString('fr-FR') : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
