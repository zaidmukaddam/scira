'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  label: string;
  icon: string | React.ReactNode;
}

interface ProfileSelectorProps {
  title?: string;
  profiles: Profile[];
  onProfileSelect: (id: string) => void;
  className?: string;
}

export const ProfileSelector = ({
  title = 'Bienvenue — sélectionnez un profil',
  profiles,
  onProfileSelect,
  className,
}: ProfileSelectorProps) => {
  return (
    <div className={cn('flex min-h-screen w-full flex-col items-center justify-center bg-background p-4', className)}>
      <div className="flex flex-col items-center">
        <h1 className="mb-10 text-3xl font-medium text-foreground md:text-5xl">{title}</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
          {profiles.map((profile) => (
            <div key={profile.id} className="group flex flex-col items-center gap-3">
              <button
                onClick={() => onProfileSelect(profile.id)}
                aria-label={`Sélectionner le profil: ${profile.label}`}
                className="group relative h-28 w-28 rounded-full transition-transform duration-300 ease-in-out hover:-translate-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-36 md:w-36"
              >
                <div className="absolute inset-0 rounded-full bg-muted transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20" />
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full">
                  {typeof profile.icon === 'string' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.icon} alt={`${profile.label} profile`} className="h-full w-full object-cover" />
                  ) : (
                    profile.icon
                  )}
                </div>
              </button>
              <p className="text-lg text-muted-foreground transition-colors group-hover:text-foreground">{profile.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ProfileIcon = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('flex h-full w-full items-center justify-center text-4xl text-foreground/80 md:text-5xl', className)}>
    {children}
  </div>
);
