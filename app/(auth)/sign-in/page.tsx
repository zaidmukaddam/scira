'use client';

import AuthCard from '@/components/auth-card';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function SignInPage() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem('scira:selected-profile');
      if (raw) {
        const data = JSON.parse(raw) as { label?: string } | null;
        if (data?.label) {
          toast.success('Profil sélectionné', { description: data.label, duration: 3000 });
        } else {
          toast.success('Profil sélectionné', { duration: 3000 });
        }
        localStorage.removeItem('scira:selected-profile');
      }
    } catch {}
  }, []);

  return <AuthCard title="Bon retour" description="Connectez-vous pour continuer vers Hyper AI" />;
}
