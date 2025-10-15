'use client';
import * as React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { ProfileSelector } from '@/components/ui/profile-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

const ChatInterface = dynamic(() => import('@/components/chat-interface').then((m) => m.ChatInterface), {
  ssr: true,
  loading: () => <div style={{ minHeight: 240 }} />,
});

import { InstallPrompt } from '@/components/InstallPrompt';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  const initialProfiles = React.useMemo(
    () => [
      {
        id: 'arka',
        label: 'Arka',
        icon:
          'https://vucvdpamtrjkzmubwlts.supabase.co/storage/v1/object/public/users/user_2zMtrqo9RMaaIn4f8F2z3oeY497/avatar.png',
      },
      {
        id: 'abanalka',
        label: 'Abanalka',
        icon:
          'https://plus.unsplash.com/premium_photo-1739163838574-27c663e8a22b?auto=format&fit=crop&q=60&w=900',
      },
      {
        id: 'solupapa',
        label: 'SoluPaPa+',
        icon:
          'https://plus.unsplash.com/premium_photo-1739206781762-6b28bac44141?auto=format&fit=crop&q=60&w=900',
      },
    ],
    [],
  );

  const [profiles, setProfiles] = React.useState(initialProfiles);

  const [addOpen, setAddOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newIcon, setNewIcon] = React.useState('');

  if (isLoading) {
    return <div className="min-h-[240px]" />;
  }

  if (user) {
    return (
      <React.Fragment>
        <ChatInterface />
        <InstallPrompt />
      </React.Fragment>
    );
  }

  const handleAddProfile = () => {
    setAddOpen(true);
  };

  const handleCreateProfile = () => {
    const label = newName.trim();
    if (!label) return;
    const id = `${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const icon = newIcon.trim() || 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=900&auto=format&fit=crop';
    setProfiles((p) => [{ id, label, icon }, ...p]);
    setNewName('');
    setNewIcon('');
    setAddOpen(false);
  };

  const handleDeleteProfile = (id: string) => {
    setProfiles((p) => p.filter((x) => x.id !== id));
  };

  const handleSelect = (id: string) => {
    const p = profiles.find((x) => x.id === id);
    try {
      if (p?.label) {
        localStorage.setItem('scira:selected-profile', JSON.stringify({ label: p.label, t: Date.now() }));
      }
    } catch {}
    toast('Connexion…', {
      description: p?.label ? `Profil: ${p.label}` : undefined,
      icon: <Spinner className="size-3.5" />,
      duration: 900,
    });
    setTimeout(() => {
      router.push('/sign-in');
    }, 700);
  };

  return (
    <div className="relative">
      <div className="fixed top-6 right-6 z-50">
        <Button variant="secondary" size="lg" onClick={handleAddProfile}>
          Ajouter un profil
        </Button>
      </div>

      <ProfileSelector
        title="Bienvenue — sélectionnez un profil"
        profiles={profiles}
        onProfileSelect={handleSelect}
        onAddProfile={handleAddProfile}
        onDeleteProfile={handleDeleteProfile}
        showAddTile
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un profil</DialogTitle>
            <DialogDescription>Définissez un nom et une image optionnelle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nom du profil" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input
              placeholder="URL de l’image (optionnel)"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateProfile}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
