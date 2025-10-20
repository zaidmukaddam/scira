'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { UserProfileDialog } from '@/components/admin/user-profile-dialog';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TopProfilePage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: topUsers, isLoading } = useQuery({
    queryKey: ['top-users-ranking'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users/ranking');
      if (!res.ok) throw new Error('Failed to fetch ranking');
      return res.json();
    },
    refetchInterval: 30000,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">🏆 Top Profil Utilisateurs</h1>

      <Card>
        <CardHeader>
          <CardTitle>Classement Activité (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[400px]">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={(topUsers?.ranking || []).slice(0, 20)} layout="horizontal">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={150} />
                <Tooltip />
                <Bar dataKey="messageCount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détails Utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rang</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Messages Totaux</TableHead>
                <TableHead>Messages 24h</TableHead>
                <TableHead>Agent Préféré</TableHead>
                <TableHead>Dernière Activité</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : (
                topUsers?.details?.map((user: any, idx: number) => (
                  <TableRow key={user.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{user.totalMessages}</TableCell>
                    <TableCell>{user.messages24h}</TableCell>
                    <TableCell>
                      <Badge>{user.favoriteAgent}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastSeen
                        ? formatDistanceToNow(new Date(user.lastSeen), {
                            addSuffix: true,
                            locale: fr,
                          })
                        : 'Jamais'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => setSelectedUserId(user.id)}>
                        Voir Profil Complet
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedUserId && (
        <UserProfileDialog
          userId={selectedUserId}
          open={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
