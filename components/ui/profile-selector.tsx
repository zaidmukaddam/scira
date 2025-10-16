'use client';
import * as React from 'react';
import { Plus, X } from 'lucide-react';
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
  onAddProfile?: () => void;
  onDeleteProfile?: (id: string) => void;
  showAddTile?: boolean;
}

export const ProfileSelector = ({
  title = 'Bienvenue — sélectionnez un profil',
  profiles,
  onProfileSelect,
  className,
  onAddProfile,
  onDeleteProfile,
  showAddTile = false,
}: ProfileSelectorProps) => {
  return (
    <div
      className={cn(
        'relative flex min-h-screen w-full flex-col items-center justify-center bg-background p-6',
        'bg-[radial-gradient(ellipse_at_top,transparent_40%,theme(colors.primary/10))] dark:bg-[radial-gradient(ellipse_at_top,transparent_40%,theme(colors.primary/15))]',
        className,
      )}
    >
      <div className="flex flex-col items-center">
        <h1 className="mb-10 text-center text-3xl font-medium text-foreground md:text-5xl">
          <span className="bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
            {title}
          </span>
        </h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
          {showAddTile && onAddProfile && (
            <div className="group flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={onAddProfile}
                aria-label="Ajouter un nouveau profil"
                className="group relative h-28 w-28 rounded-full border border-dashed border-border transition-all duration-300 ease-in-out hover:-translate-y-2 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-36 md:w-36"
              >
                <div className="absolute inset-0 rounded-full bg-muted/40 transition-all duration-300" />
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full text-muted-foreground group-hover:text-foreground">
                  <Plus className="size-10 md:size-12" />
                </div>
              </button>
              <p className="text-lg text-muted-foreground transition-colors group-hover:text-foreground">Ajouter</p>
            </div>
          )}

          {profiles.map((profile) => (
            <div key={profile.id} className="group relative flex flex-col items-center gap-3">
              {onDeleteProfile && (
                <button
                  type="button"
                  aria-label={`Supprimer le profil ${profile.label}`}
                  onClick={() => onDeleteProfile(profile.id)}
                  className="absolute -top-1.5 -right-1.5 z-10 size-7 rounded-full border border-border bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onProfileSelect(profile.id)}
                aria-label={`Sélectionner le profil: ${profile.label}`}
                className="group relative h-28 w-28 rounded-full transition-transform duration-300 ease-in-out hover:-translate-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-36 md:w-36"
              >
                <div className="absolute inset-0 rounded-full bg-muted ring-1 ring-border transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-primary/25 group-hover:ring-2 group-hover:ring-primary/40 group-hover:ring-offset-2 group-hover:ring-offset-background" />
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
