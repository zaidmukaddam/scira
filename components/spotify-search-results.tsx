'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import type {
  SpotifySearchResult,
  SpotifyTrackResult,
  SpotifyArtistResult,
  SpotifyAlbumResult,
  SpotifyPlaylistResult,
} from '@/lib/tools/spotify-search';

// Icons
const Icons = {
  Spotify: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  ),
  Play: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  Pause: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  User: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  ),
  Disc: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  ListMusic: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15V6M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12 12H3M16 6H3M12 18H3" />
    </svg>
  ),
  Music: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  Explicit: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.436 7.184C5 8.04 5 9.16 5 11.4v1.2c0 2.24 0 3.36.436 4.216a4 4 0 0 0 1.748 1.748C8.04 19 9.16 19 11.4 19h1.2c2.24 0 3.36 0 4.216-.436a4 4 0 0 0 1.748-1.748C19 15.96 19 14.84 19 12.6v-1.2c0-2.24 0-3.36-.436-4.216a4 4 0 0 0-1.748-1.748C15.96 5 14.84 5 12.6 5h-1.2c-2.24 0-3.36 0-4.216.436a4 4 0 0 0-1.748 1.748m8.064.566a.75.75 0 0 1 0 1.5c-.826 0-2.496.011-2.496.011c-.152.013-.23.08-.243.243c-.033.403-.025.813-.018 1.22q.006.265.007.526h1.75a.75.75 0 0 1 0 1.5h-1.75q0 .261-.007.526c-.007.407-.015.817.018 1.22c.014.163.09.23.243.243c0 0 1.67.011 2.496.011a.75.75 0 0 1 0 1.5h-1.926c-.258 0-.494 0-.692-.016c-.615-.05-1.156-.38-1.441-.94c-.195-.382-.193-.824-.191-1.246v-3.974c0-.258 0-.494.016-.692a1.74 1.74 0 0 1 1.616-1.616c.198-.016.434-.016.692-.016z" />
    </svg>
  ),
};

// Format duration from milliseconds to mm:ss
const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Format follower count
const formatFollowers = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

// Audio Player Context - ensures only one track plays at a time
interface AudioPlayerState {
  currentTrackId: string | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
}

type TabType = 'tracks' | 'artists' | 'albums' | 'playlists';

// Track Card Component
const SpotifyTrackCard: React.FC<{
  track: SpotifyTrackResult;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  progress: number;
  onPlay: () => void;
  onPause: () => void;
}> = ({ track, isCurrentTrack, isPlaying, progress, onPlay, onPause }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const progressPercent = isCurrentTrack ? (progress / track.durationMs) * 100 : 0;

  return (
    <div
      className={cn(
        'group relative',
        'py-2 px-4 transition-all duration-150',
        'hover:bg-accent/40',
        isCurrentTrack && isPlaying && 'bg-[#1DB954]/5',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 shrink-0 rounded-md overflow-hidden bg-muted shadow-sm">
          {!imageLoaded && track.album.image && <div className="absolute inset-0 animate-pulse bg-muted" />}
          {track.album.image ? (
            <img
              src={track.album.image}
              alt={track.album.name}
              className={cn('w-full h-full object-cover', !imageLoaded && 'opacity-0')}
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icons.Spotify className="h-5 w-5 text-muted-foreground/30" />
            </div>
          )}

          {track.previewUrl && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isCurrentTrack && isPlaying) onPause();
                else onPlay();
              }}
              className={cn(
                'absolute inset-0 flex items-center justify-center',
                'bg-black/0 hover:bg-black/50 transition-all duration-200',
                isCurrentTrack && isPlaying ? 'bg-black/40' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              {isCurrentTrack && isPlaying ? (
                <Icons.Pause className="h-4 w-4 text-white drop-shadow-md" />
              ) : (
                <Icons.Play className="h-4 w-4 text-white drop-shadow-md ml-0.5" />
              )}
            </button>
          )}

          {isCurrentTrack && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20">
              <div className="h-full bg-[#1DB954] transition-all duration-100" style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <a
              href={track.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'font-medium text-[13px] truncate hover:underline transition-colors',
                isCurrentTrack && isPlaying ? 'text-[#1DB954]' : 'text-foreground',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {track.name}
            </a>
            {track.explicit && (
              <Icons.Explicit className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
            )}
          </div>
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
            {track.artists.map((a) => a.name).join(', ')}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-muted-foreground/70 tabular-nums">{formatDuration(track.durationMs)}</span>
          <a
            href={track.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-full hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
            title="Open in Spotify"
          >
            <Icons.ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        </div>
      </div>
    </div>
  );
};

// Artist Card Component
const SpotifyArtistCard: React.FC<{ artist: SpotifyArtistResult }> = ({ artist }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <a
      href={artist.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 py-2 px-4 hover:bg-accent/40 transition-all duration-150"
    >
      <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden bg-muted shadow-sm">
        {!imageLoaded && artist.image && <div className="absolute inset-0 animate-pulse bg-muted" />}
        {artist.image ? (
          <img
            src={artist.image}
            alt={artist.name}
            className={cn('w-full h-full object-cover', !imageLoaded && 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icons.User className="h-6 w-6 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-[13px] text-foreground truncate group-hover:underline">{artist.name}</div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
          {formatFollowers(artist.followers)} followers
          {artist.genres.length > 0 && ` · ${artist.genres.slice(0, 2).join(', ')}`}
        </div>
      </div>

      <Icons.ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
};

// Album Card Component
const SpotifyAlbumCard: React.FC<{ album: SpotifyAlbumResult }> = ({ album }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <a
      href={album.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 py-2 px-4 hover:bg-accent/40 transition-all duration-150"
    >
      <div className="relative w-10 h-10 shrink-0 rounded-md overflow-hidden bg-muted shadow-sm">
        {!imageLoaded && album.image && <div className="absolute inset-0 animate-pulse bg-muted" />}
        {album.image ? (
          <img
            src={album.image}
            alt={album.name}
            className={cn('w-full h-full object-cover', !imageLoaded && 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icons.Disc className="h-5 w-5 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-[13px] text-foreground truncate group-hover:underline">{album.name}</div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
          {album.artists.map((a) => a.name).join(', ')} · {album.releaseDate.slice(0, 4)} ·{' '}
          <span className="capitalize">{album.albumType}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-muted-foreground/70">{album.totalTracks} tracks</span>
        <Icons.ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
};

// Playlist Card Component
const SpotifyPlaylistCard: React.FC<{ playlist: SpotifyPlaylistResult }> = ({ playlist }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <a
      href={playlist.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 py-2 px-4 hover:bg-accent/40 transition-all duration-150"
    >
      <div className="relative w-10 h-10 shrink-0 rounded-md overflow-hidden bg-muted shadow-sm">
        {!imageLoaded && playlist.image && <div className="absolute inset-0 animate-pulse bg-muted" />}
        {playlist.image ? (
          <img
            src={playlist.image}
            alt={playlist.name}
            className={cn('w-full h-full object-cover', !imageLoaded && 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icons.ListMusic className="h-5 w-5 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-[13px] text-foreground truncate group-hover:underline">{playlist.name}</div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
          By {playlist.owner.name} · {playlist.totalTracks} tracks
        </div>
      </div>

      <Icons.ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
};

// Featured Artist Card
const FeaturedArtistCard: React.FC<{ artist: SpotifyArtistResult }> = ({ artist }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden">
      {artist.image && (
        <div className="absolute inset-0 -z-10">
          <img src={artist.image} alt="" className="w-full h-full object-cover scale-110 blur-2xl opacity-20 dark:opacity-15" />
          <div className="absolute inset-0 bg-linear-to-r from-card/80 to-card/60" />
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-4">
          <div className="relative w-24 h-24 shrink-0 rounded-full overflow-hidden shadow-lg ring-1 ring-black/5">
            {!imageLoaded && artist.image && <div className="absolute inset-0 animate-pulse bg-muted" />}
            {artist.image ? (
              <img
                src={artist.image}
                alt={artist.name}
                className={cn('w-full h-full object-cover', !imageLoaded && 'opacity-0')}
                onLoad={() => setImageLoaded(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Icons.User className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
            <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Artist</div>
            <a
              href={artist.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[15px] text-foreground truncate hover:underline transition-colors leading-tight mt-1"
            >
              {artist.name}
            </a>

            <div className="text-[13px] text-muted-foreground truncate mt-1">
              {formatFollowers(artist.followers)} followers
            </div>

            {artist.genres.length > 0 && (
              <div className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
                {artist.genres.slice(0, 3).join(', ')}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <a
                href={artist.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-semibold bg-foreground text-background hover:scale-105 hover:shadow-md transition-all duration-200"
              >
                <Icons.Spotify className="w-3.5 h-3.5" />
                <span>Open in Spotify</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Featured Album Card
const FeaturedAlbumCard: React.FC<{ album: SpotifyAlbumResult }> = ({ album }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden">
      {album.image && (
        <div className="absolute inset-0 -z-10">
          <img src={album.image} alt="" className="w-full h-full object-cover scale-110 blur-2xl opacity-20 dark:opacity-15" />
          <div className="absolute inset-0 bg-linear-to-r from-card/80 to-card/60" />
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-4">
          <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden shadow-lg ring-1 ring-black/5">
            {!imageLoaded && album.image && <div className="absolute inset-0 animate-pulse bg-muted" />}
            {album.image ? (
              <img
                src={album.image}
                alt={album.name}
                className={cn('w-full h-full object-cover', !imageLoaded && 'opacity-0')}
                onLoad={() => setImageLoaded(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Icons.Disc className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
            <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{album.albumType}</div>
            <a
              href={album.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[15px] text-foreground truncate hover:underline transition-colors leading-tight mt-1"
            >
              {album.name}
            </a>

            <div className="text-[13px] text-muted-foreground truncate mt-1">
              {album.artists.map((a) => a.name).join(', ')}
            </div>

            <div className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
              {album.releaseDate.slice(0, 4)} · {album.totalTracks} tracks
            </div>

            <div className="flex items-center gap-2 mt-3">
              <a
                href={album.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-semibold bg-foreground text-background hover:scale-105 hover:shadow-md transition-all duration-200"
              >
                <Icons.Spotify className="w-3.5 h-3.5" />
                <span>Open in Spotify</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Featured Playlist Card
const FeaturedPlaylistCard: React.FC<{ playlist: SpotifyPlaylistResult }> = ({ playlist }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden">
      {playlist.image && (
        <div className="absolute inset-0 -z-10">
          <img src={playlist.image} alt="" className="w-full h-full object-cover scale-110 blur-2xl opacity-20 dark:opacity-15" />
          <div className="absolute inset-0 bg-linear-to-r from-card/80 to-card/60" />
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-4">
          <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden shadow-lg ring-1 ring-black/5">
            {!imageLoaded && playlist.image && <div className="absolute inset-0 animate-pulse bg-muted" />}
            {playlist.image ? (
              <img
                src={playlist.image}
                alt={playlist.name}
                className={cn('w-full h-full object-cover', !imageLoaded && 'opacity-0')}
                onLoad={() => setImageLoaded(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Icons.ListMusic className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
            <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Playlist</div>
            <a
              href={playlist.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[15px] text-foreground truncate hover:underline transition-colors leading-tight mt-1"
            >
              {playlist.name}
            </a>

            <div className="text-[13px] text-muted-foreground truncate mt-1">
              By {playlist.owner.name}
            </div>

            <div className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
              {playlist.totalTracks} tracks
              {playlist.description && ` · ${playlist.description.slice(0, 50)}${playlist.description.length > 50 ? '...' : ''}`}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <a
                href={playlist.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-semibold bg-foreground text-background hover:scale-105 hover:shadow-md transition-all duration-200"
              >
                <Icons.Spotify className="w-3.5 h-3.5" />
                <span>Open in Spotify</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Featured Track Card
const FeaturedTrackCard: React.FC<{
  track: SpotifyTrackResult;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  progress: number;
  onPlay: () => void;
  onPause: () => void;
}> = ({ track, isCurrentTrack, isPlaying, progress, onPlay, onPause }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const progressPercent = isCurrentTrack ? (progress / track.durationMs) * 100 : 0;

  return (
    <div className="relative overflow-hidden">
      {track.album.image && (
        <div className="absolute inset-0 -z-10">
          <img src={track.album.image} alt="" className="w-full h-full object-cover scale-110 blur-2xl opacity-20 dark:opacity-15" />
          <div className="absolute inset-0 bg-linear-to-r from-card/80 to-card/60" />
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-4">
          <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden shadow-lg ring-1 ring-black/5">
            {!imageLoaded && track.album.image && <div className="absolute inset-0 animate-pulse bg-muted" />}
            {track.album.image ? (
              <img
                src={track.album.image}
                alt={track.album.name}
                className={cn('w-full h-full object-cover', !imageLoaded && 'opacity-0')}
                onLoad={() => setImageLoaded(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Icons.Spotify className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}

            {track.previewUrl && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isCurrentTrack && isPlaying) onPause();
                  else onPlay();
                }}
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  'bg-black/0 hover:bg-black/40 transition-all duration-200',
                  isCurrentTrack && isPlaying ? 'bg-black/30' : 'opacity-0 hover:opacity-100',
                )}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90 shadow-lg backdrop-blur-sm transform transition-transform hover:scale-105">
                  {isCurrentTrack && isPlaying ? (
                    <Icons.Pause className="h-5 w-5 text-neutral-900" />
                  ) : (
                    <Icons.Play className="h-5 w-5 text-neutral-900 ml-0.5" />
                  )}
                </div>
              </button>
            )}

            {isCurrentTrack && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                <div className="h-full bg-[#1DB954] transition-all duration-100" style={{ width: `${progressPercent}%` }} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
            <a
              href={track.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[15px] text-foreground truncate hover:underline transition-colors leading-tight"
            >
              {track.name}
              {track.explicit && (
                <Icons.Explicit className="ml-1.5 w-4 h-4 text-muted-foreground/70 inline align-middle" />
              )}
            </a>

            <div className="text-[13px] text-muted-foreground truncate mt-1">
              {track.artists.map((a) => a.name).join(', ')}
            </div>

            <div className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
              {track.album.name} · {formatDuration(track.durationMs)}
            </div>

            <div className="flex items-center gap-2 mt-3">
              {track.previewUrl && (
                <button
                  onClick={() => (isCurrentTrack && isPlaying ? onPause() : onPlay())}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-semibold transition-all duration-200',
                    isCurrentTrack && isPlaying
                      ? 'bg-[#1DB954] text-white shadow-md shadow-green-500/20'
                      : 'bg-foreground text-background hover:scale-105 hover:shadow-md',
                  )}
                >
                  {isCurrentTrack && isPlaying ? (
                    <>
                      <Icons.Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Icons.Play className="w-3.5 h-3.5 ml-0.5" />
                      <span>Preview</span>
                    </>
                  )}
                </button>
              )}

              <a
                href={track.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-semibold border border-border bg-background hover:bg-accent transition-all duration-200"
              >
                <Icons.Spotify className="w-3.5 h-3.5 text-[#1DB954]" />
                <span>Open in Spotify</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading state component
const SpotifyLoadingState: React.FC = () => {
  return (
    <div className="w-full my-3">
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icons.Spotify className="h-5 w-5 text-[#1DB954]" />
            <span className="text-sm font-semibold text-foreground">Spotify</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Spinner className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Searching...</span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1 flex flex-col justify-center gap-2">
              <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-2.5 bg-muted rounded animate-pulse w-1/3" />
              <div className="flex gap-2 mt-2">
                <div className="h-8 bg-muted rounded-full animate-pulse w-24" />
                <div className="h-8 bg-muted rounded-full animate-pulse w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
interface SpotifySearchResultsProps {
  result: SpotifySearchResult;
  isLoading?: boolean;
}

export const SpotifySearchResults: React.FC<SpotifySearchResultsProps> = ({ result, isLoading = false }) => {
  const [activeTab, setActiveTab] = useState<TabType>('tracks');
  const [isExpanded, setIsExpanded] = useState(false);
  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    currentTrackId: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determine which tabs have content
  const hasTracks = result?.tracks?.length > 0;
  const hasArtists = result?.artists?.length > 0;
  const hasAlbums = result?.albums?.length > 0;
  const hasPlaylists = result?.playlists?.length > 0;

  // Set initial tab based on what content is available
  useEffect(() => {
    if (hasTracks) setActiveTab('tracks');
    else if (hasArtists) setActiveTab('artists');
    else if (hasAlbums) setActiveTab('albums');
    else if (hasPlaylists) setActiveTab('playlists');
  }, [hasTracks, hasArtists, hasAlbums, hasPlaylists]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const playTrack = useCallback((track: SpotifyTrackResult) => {
    if (!track.previewUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }

    const audio = new Audio(track.previewUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setPlayerState((prev) => ({ ...prev, duration: audio.duration * 1000 }));
    });

    audio.addEventListener('ended', () => {
      setPlayerState((prev) => ({ ...prev, isPlaying: false, progress: 0 }));
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    });

    audio.play().then(() => {
      setPlayerState({ currentTrackId: track.id, isPlaying: true, progress: 0, duration: track.durationMs });
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setPlayerState((prev) => ({ ...prev, progress: audioRef.current!.currentTime * 1000 }));
        }
      }, 100);
    }).catch(console.error);
  }, []);

  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayerState((prev) => ({ ...prev, isPlaying: false }));
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  }, []);

  if (isLoading) return <SpotifyLoadingState />;

  if (!result || !result.success) {
    if (result?.error) {
      return (
        <div className="w-full my-3 p-4 border border-border rounded-xl bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icons.Spotify className="h-4 w-4 text-[#1DB954]" />
            <span>Spotify search failed: {result.error}</span>
          </div>
        </div>
      );
    }
    return null;
  }

  const { tracks, artists, albums, playlists } = result;
  const hasAnyResults = hasTracks || hasArtists || hasAlbums || hasPlaylists;

  if (!hasAnyResults) return null;

  const topTrack = tracks[0];
  const remainingTracks = tracks.slice(1);

  // Tab counts
  const tabs = [
    { id: 'tracks' as const, label: 'Tracks', count: tracks.length, icon: Icons.Music, show: hasTracks },
    { id: 'artists' as const, label: 'Artists', count: artists.length, icon: Icons.User, show: hasArtists },
    { id: 'albums' as const, label: 'Albums', count: albums.length, icon: Icons.Disc, show: hasAlbums },
    { id: 'playlists' as const, label: 'Playlists', count: playlists.length, icon: Icons.ListMusic, show: hasPlaylists },
  ].filter((t) => t.show);

  const showTabs = tabs.length > 1;

  return (
    <div className="w-full my-3">
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icons.Spotify className="h-5 w-5 text-[#1DB954]" />
            <span className="text-sm font-semibold text-foreground">Spotify</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {tracks.length + artists.length + albums.length + playlists.length} results
          </span>
        </div>

        {/* Tabs */}
        {showTabs && (
          <div className="px-4 pb-2 flex gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsExpanded(false); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0',
                    activeTab === tab.id
                      ? 'bg-foreground text-background'
                      : 'bg-accent/50 text-muted-foreground hover:bg-accent',
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                  <span className="text-[10px] opacity-70">{tab.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Now Playing indicator */}
        {playerState.currentTrackId && playerState.isPlaying && (
          <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-[#1DB954]/10 flex items-center gap-2">
            <div className="flex items-end gap-0.5 h-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-[#1DB954] rounded-full animate-pulse"
                  style={{ height: '100%', animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-[11px] text-[#1DB954] font-medium">Playing preview</span>
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'tracks' && hasTracks && (
          <>
            {topTrack && (
              <FeaturedTrackCard
                track={topTrack}
                isCurrentTrack={playerState.currentTrackId === topTrack.id}
                isPlaying={playerState.currentTrackId === topTrack.id && playerState.isPlaying}
                progress={playerState.currentTrackId === topTrack.id ? playerState.progress : 0}
                onPlay={() => playTrack(topTrack)}
                onPause={pauseTrack}
              />
            )}

            {remainingTracks.length > 0 && (
              <>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 group"
                >
                  <span>{isExpanded ? 'Show less' : `Show ${remainingTracks.length} more tracks`}</span>
                  <Icons.ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform duration-200', !isExpanded && 'group-hover:translate-y-0.5', isExpanded && 'rotate-180')}
                  />
                </button>

                {isExpanded && (
                  <div className="max-h-[280px] overflow-y-auto border-t border-border">
                    {remainingTracks.map((track) => (
                      <SpotifyTrackCard
                        key={track.id}
                        track={track}
                        isCurrentTrack={playerState.currentTrackId === track.id}
                        isPlaying={playerState.currentTrackId === track.id && playerState.isPlaying}
                        progress={playerState.currentTrackId === track.id ? playerState.progress : 0}
                        onPlay={() => playTrack(track)}
                        onPause={pauseTrack}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'artists' && hasArtists && (
          <>
            {artists[0] && <FeaturedArtistCard artist={artists[0]} />}
            {artists.length > 1 && (
              <>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 group"
                >
                  <span>{isExpanded ? 'Show less' : `Show ${artists.length - 1} more artists`}</span>
                  <Icons.ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform duration-200', !isExpanded && 'group-hover:translate-y-0.5', isExpanded && 'rotate-180')}
                  />
                </button>
                {isExpanded && (
                  <div className="max-h-[280px] overflow-y-auto border-t border-border">
                    {artists.slice(1).map((artist) => (
                      <SpotifyArtistCard key={artist.id} artist={artist} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'albums' && hasAlbums && (
          <>
            {albums[0] && <FeaturedAlbumCard album={albums[0]} />}
            {albums.length > 1 && (
              <>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 group"
                >
                  <span>{isExpanded ? 'Show less' : `Show ${albums.length - 1} more albums`}</span>
                  <Icons.ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform duration-200', !isExpanded && 'group-hover:translate-y-0.5', isExpanded && 'rotate-180')}
                  />
                </button>
                {isExpanded && (
                  <div className="max-h-[280px] overflow-y-auto border-t border-border">
                    {albums.slice(1).map((album) => (
                      <SpotifyAlbumCard key={album.id} album={album} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'playlists' && hasPlaylists && (
          <>
            {playlists[0] && <FeaturedPlaylistCard playlist={playlists[0]} />}
            {playlists.length > 1 && (
              <>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 group"
                >
                  <span>{isExpanded ? 'Show less' : `Show ${playlists.length - 1} more playlists`}</span>
                  <Icons.ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform duration-200', !isExpanded && 'group-hover:translate-y-0.5', isExpanded && 'rotate-180')}
                  />
                </button>
                {isExpanded && (
                  <div className="max-h-[280px] overflow-y-auto border-t border-border">
                    {playlists.slice(1).map((playlist) => (
                      <SpotifyPlaylistCard key={playlist.id} playlist={playlist} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SpotifySearchResults;
