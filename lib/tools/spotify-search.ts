import { tool, rerank } from 'ai';
import { z } from 'zod';
import { cohere } from '@ai-sdk/cohere';
import { serverEnv } from '@/env/server';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';

// Spotify API types
interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  external_urls: { spotify: string };
  images?: SpotifyImage[];
  followers?: { total: number };
  genres?: string[];
  popularity?: number;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
  external_urls: { spotify: string };
  album_type: string;
  total_tracks: number;
  artists: SpotifyArtist[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  preview_url: string | null;
  duration_ms: number;
  explicit: boolean;
  external_urls: { spotify: string };
  popularity: number;
  track_number: number;
}

interface SpotifyPlaylistOwner {
  id: string;
  display_name: string;
  external_urls: { spotify: string };
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  external_urls: { spotify: string };
  owner: SpotifyPlaylistOwner;
  tracks: { total: number };
  public: boolean;
}

interface SpotifySearchResponse {
  tracks?: {
    items: SpotifyTrack[];
    total: number;
    limit: number;
    offset: number;
  };
  artists?: {
    items: SpotifyArtist[];
    total: number;
    limit: number;
    offset: number;
  };
  albums?: {
    items: SpotifyAlbum[];
    total: number;
    limit: number;
    offset: number;
  };
  playlists?: {
    items: SpotifyPlaylist[];
    total: number;
    limit: number;
    offset: number;
  };
}

// Token cache for Client Credentials flow
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const clientId = serverEnv.SPOTIFY_CLIENT_ID;
  const clientSecret = serverEnv.SPOTIFY_CLIENT_SECRET;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Spotify auth error:', error);
    throw new Error(`Failed to authenticate with Spotify: ${response.status}`);
  }

  const data = await response.json();

  // Cache the token
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

type SearchType = 'track' | 'artist' | 'album' | 'playlist';

async function spotifySearch(
  query: string,
  types: SearchType[],
  limit: number = 10,
  market?: string,
): Promise<SpotifySearchResponse> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    q: query,
    type: types.join(','),
    limit: limit.toString(),
  });

  if (market) {
    params.set('market', market);
  }

  const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Handle rate limiting with exponential backoff
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
    console.warn(`Spotify rate limited. Retry after ${retryAfter}s`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return spotifySearch(query, types, limit, market);
  }

  if (!response.ok) {
    const error = await response.text();
    console.error('Spotify search error:', error);
    throw new Error(`Spotify search failed: ${response.status}`);
  }

  return response.json();
}

// Output types for the tool
export interface SpotifyTrackResult {
  id: string;
  name: string;
  artists: { id: string; name: string; url: string }[];
  album: {
    id: string;
    name: string;
    image: string | null;
    releaseDate: string;
    url: string;
  };
  previewUrl: string | null;
  durationMs: number;
  explicit: boolean;
  url: string;
  popularity: number;
}

export interface SpotifyArtistResult {
  id: string;
  name: string;
  image: string | null;
  url: string;
  followers: number;
  genres: string[];
  popularity: number;
}

export interface SpotifyAlbumResult {
  id: string;
  name: string;
  image: string | null;
  releaseDate: string;
  url: string;
  albumType: string;
  totalTracks: number;
  artists: { id: string; name: string; url: string }[];
}

export interface SpotifyPlaylistResult {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  url: string;
  owner: { id: string; name: string; url: string };
  totalTracks: number;
  isPublic: boolean;
}

export interface SpotifySearchResult {
  success: boolean;
  query: string;
  searchTypes: string[];
  tracks: SpotifyTrackResult[];
  artists: SpotifyArtistResult[];
  albums: SpotifyAlbumResult[];
  playlists: SpotifyPlaylistResult[];
  totals: {
    tracks: number;
    artists: number;
    albums: number;
    playlists: number;
  };
  error?: string;
}

// Helper to create a searchable document string for reranking
// Includes popularity signals to help Cohere understand relevance
function createTrackDocument(track: SpotifyTrackResult): string {
  const popularityLabel = track.popularity >= 70 ? 'very popular' : track.popularity >= 40 ? 'popular' : 'lesser known';
  return `${track.name} by ${track.artists.map((a) => a.name).join(', ')} from album ${track.album.name} (${popularityLabel} track, popularity: ${track.popularity}/100)`;
}

function createArtistDocument(artist: SpotifyArtistResult): string {
  const genreStr = artist.genres.length > 0 ? ` (${artist.genres.slice(0, 3).join(', ')})` : '';
  const popularityLabel = artist.popularity >= 70 ? 'very popular' : artist.popularity >= 40 ? 'popular' : 'lesser known';
  const followerStr = artist.followers >= 1000000 ? `${(artist.followers / 1000000).toFixed(1)}M` : artist.followers >= 1000 ? `${(artist.followers / 1000).toFixed(0)}K` : artist.followers;
  return `${artist.name}${genreStr} - ${followerStr} followers (${popularityLabel} artist, popularity: ${artist.popularity}/100)`;
}

function createAlbumDocument(album: SpotifyAlbumResult): string {
  return `${album.name} by ${album.artists.map((a) => a.name).join(', ')} (${album.albumType}, ${album.releaseDate.slice(0, 4)}, ${album.totalTracks} tracks)`;
}

function createPlaylistDocument(playlist: SpotifyPlaylistResult): string {
  const descStr = playlist.description ? ` - ${playlist.description.slice(0, 100)}` : '';
  return `${playlist.name} by ${playlist.owner.name}${descStr} (${playlist.totalTracks} tracks)`;
}

// Rerank results using Cohere
async function rerankResults<T>(
  items: T[],
  query: string,
  createDocument: (item: T) => string,
  topN?: number,
): Promise<T[]> {
  if (items.length === 0) return items;

  try {
    const documents = items.map(createDocument);
    const { ranking } = await rerank({
      model: cohere.reranking('rerank-v4.0-pro'),
      query,
      documents,
      topN: topN || items.length,
    });

    return ranking.map((r) => items[r.originalIndex]);
  } catch (error) {
    console.error('Reranking failed, returning original order:', error);
    return items;
  }
}

export const spotifySearchTool = tool({
  description:
    'Search Spotify for tracks, artists, albums, and playlists. Can search for one or multiple types at once. Returns detailed info including preview URLs for tracks. Results are reranked for relevance.',
  inputSchema: z.object({
    query: z.string().describe('The search query (e.g., "Bohemian Rhapsody", "Taylor Swift", "Chill Vibes playlist")'),
    types: z
      .array(z.enum(['track', 'artist', 'album', 'playlist']))
      .min(1)
      .max(4)
      .default(['track'])
      .describe('Types to search for. Can include: track, artist, album, playlist. Defaults to track only.'),
    limit: z.number().min(1).max(50).default(20).describe('Maximum number of results per type (1-50)'),
    market: z
      .string()
      .length(2)
      .optional()
      .describe('ISO 3166-1 alpha-2 country code for market-specific results (e.g., "US", "IN", "GB")'),
  }),
  execute: async ({
    query,
    types = ['track'],
    limit = 20,
    market,
  }: {
    query: string;
    types?: SearchType[];
    limit?: number;
    market?: string;
  }): Promise<SpotifySearchResult> => {
    try {
      console.log('🎵 Spotify search:', { query, types, limit, market });

      const response = await spotifySearch(query, types, limit, market);

      // Process tracks
      let tracks: SpotifyTrackResult[] = (response.tracks?.items || []).map((track) => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map((artist) => ({
          id: artist.id,
          name: artist.name,
          url: artist.external_urls.spotify,
        })),
        album: {
          id: track.album.id,
          name: track.album.name,
          image: track.album.images[0]?.url || null,
          releaseDate: track.album.release_date,
          url: track.album.external_urls.spotify,
        },
        previewUrl: track.preview_url,
        durationMs: track.duration_ms,
        explicit: track.explicit,
        url: track.external_urls.spotify,
        popularity: track.popularity,
      }));

      // Process artists
      let artists: SpotifyArtistResult[] = (response.artists?.items || []).map((artist) => ({
        id: artist.id,
        name: artist.name,
        image: artist.images?.[0]?.url || null,
        url: artist.external_urls.spotify,
        followers: artist.followers?.total || 0,
        genres: artist.genres || [],
        popularity: artist.popularity || 0,
      }));

      // Process albums
      let albums: SpotifyAlbumResult[] = (response.albums?.items || []).map((album) => ({
        id: album.id,
        name: album.name,
        image: album.images[0]?.url || null,
        releaseDate: album.release_date,
        url: album.external_urls.spotify,
        albumType: album.album_type,
        totalTracks: album.total_tracks,
        artists: album.artists.map((artist) => ({
          id: artist.id,
          name: artist.name,
          url: artist.external_urls.spotify,
        })),
      }));

      // Process playlists
      let playlists: SpotifyPlaylistResult[] = (response.playlists?.items || [])
        .filter((p) => p !== null)
        .map((playlist) => ({
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          image: playlist.images?.[0]?.url || null,
          url: playlist.external_urls.spotify,
          owner: {
            id: playlist.owner.id,
            name: playlist.owner.display_name,
            url: playlist.owner.external_urls.spotify,
          },
          totalTracks: playlist.tracks.total,
          isPublic: playlist.public,
        }));

      console.log(
        `🎵 Found: ${tracks.length} tracks, ${artists.length} artists, ${albums.length} albums, ${playlists.length} playlists`,
      );

      // Rerank all results in parallel for better relevance
      console.log('🎵 Reranking results with Cohere...');
      const { rerankedTracks, rerankedArtists, rerankedAlbums, rerankedPlaylists } = await all(
        {
          async rerankedTracks() {
            return tracks.length > 0 ? rerankResults(tracks, query, createTrackDocument) : [];
          },
          async rerankedArtists() {
            return artists.length > 0 ? rerankResults(artists, query, createArtistDocument) : [];
          },
          async rerankedAlbums() {
            return albums.length > 0 ? rerankResults(albums, query, createAlbumDocument) : [];
          },
          async rerankedPlaylists() {
            return playlists.length > 0 ? rerankResults(playlists, query, createPlaylistDocument) : [];
          },
        },
        getBetterAllOptions(),
      );

      console.log('🎵 Reranking complete');

      return {
        success: true,
        query,
        searchTypes: types,
        tracks: rerankedTracks,
        artists: rerankedArtists,
        albums: rerankedAlbums,
        playlists: rerankedPlaylists,
        totals: {
          tracks: response.tracks?.total || 0,
          artists: response.artists?.total || 0,
          albums: response.albums?.total || 0,
          playlists: response.playlists?.total || 0,
        },
      };
    } catch (error) {
      console.error('Spotify search error:', error);
      return {
        success: false,
        query,
        searchTypes: types,
        tracks: [],
        artists: [],
        albums: [],
        playlists: [],
        totals: { tracks: 0, artists: 0, albums: 0, playlists: 0 },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});
