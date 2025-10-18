"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { pusherClient } from '@/lib/pusher-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function NewUserPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user'|'admin'>('user');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (!pusherClient) return;
    const ch = pusherClient.subscribe('private-admin-users');
    const onCreated = () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    };
    ch.bind('created', onCreated);
    return () => {
      try { ch.unbind('created', onCreated); pusherClient.unsubscribe('private-admin-users'); } catch{}
    }
  }, [qc]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de la création');
      toast.success('Utilisateur créé');
      router.push('/admin/users');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Nouveau compte utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="username">Nom d’utilisateur</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={3} />
            </div>
            <div className="grid gap-2">
              <Label>Rôle</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? 'Création…' : 'Créer'}</Button>
              <Button type="button" variant="outline" onClick={() => history.back()}>Annuler</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
