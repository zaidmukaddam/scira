'use client';
import * as React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { ProfileSelector } from '@/components/ui/profile-selector';

const ChatInterface = dynamic(() => import('@/components/chat-interface').then((m) => m.ChatInterface), {
  ssr: true,
  loading: () => <div style={{ minHeight: 240 }} />,
});

import { InstallPrompt } from '@/components/InstallPrompt';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useUser();

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

  const profiles = [
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
  ];

  return (
    <ProfileSelector
      title="Bienvenue — sélectionnez un profil"
      profiles={profiles}
      onProfileSelect={() => router.push('/sign-in')}
    />
  );
}
