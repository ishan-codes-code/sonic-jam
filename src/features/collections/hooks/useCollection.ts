import { useQuery } from '@tanstack/react-query';
import { fetchRemoteAlbum } from '../api/collections.api';
import { libraryApi } from '@/features/library/api/library.api';
import { Collection, CollectionTrack } from '../types';
import { PlaylistWithSongs } from '@/features/library/types';
import type { Song } from '@/features/playback';

// ─── Result shape ─────────────────────────────────────────────────────────────

interface CollectionResult {
    collection: Collection;
    /** Full Song objects for local playlists — used by playPlaylist. Undefined for remote albums. */
    rawSongs?: Song[];
    /** Playlist-scoped playback token returned by the API — pass straight to playPlaylist. */
    playbackToken?: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapRemoteToCollection(raw: Awaited<ReturnType<typeof fetchRemoteAlbum>>): CollectionResult {
    const tracks: CollectionTrack[] = raw.tracks.map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        artwork: t.artwork,
        duration: t.duration,
        previewUrl: t.preview,
        year: t.year,
        genre: t.genre,
    }));

    return {
        collection: {
            id: raw.id,
            title: raw.title,
            artist: raw.artist,
            artwork: raw.artwork,
            type: raw.type,
            isRemote: true,
            description: raw.description,
            tracks,
            releaseDate: raw.releaseDate,
            genre: raw.genre,
        },
        // No rawSongs / playbackToken for remote albums
    };
}

function mapPlaylistToCollection(playlist: PlaylistWithSongs): CollectionResult {
    const tracks: CollectionTrack[] = (playlist.tracks ?? []).map(song => ({
        id: song.id,
        title: song.trackName,
        artist: song.artists?.[0]?.name ?? 'Unknown Artist',
        album: song.albumName ?? undefined,
        artwork: song.image || undefined,
        duration: String(song.duration),
        year: song.createdAt ? new Date(song.createdAt).getFullYear().toString() : undefined,
        songId: song.id,
    }));

    return {
        collection: {
            id: playlist.id,
            title: playlist.name,
            artist: playlist.user?.name ?? 'Unknown User',
            artwork: playlist.thumbnailUrl ?? undefined,
            type: 'playlist',
            isRemote: false,
            description: playlist.description,
            tracks,
            releaseDate: playlist.createdAt,
            user: {
                id: playlist.user?.id ?? '',
                name: playlist.user?.name ?? 'Unknown User',
            },
            isPublic: playlist.isPublic,
            isSystem: playlist.isSystem,
        },
        rawSongs: playlist.tracks as Song[],
        playbackToken: playlist.playbackToken,
    };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCollection = (id: string, isRemote: boolean) => {
    const query = useQuery<CollectionResult, Error>({
        queryKey: ['collection', id, isRemote],
        queryFn: async () => {
            if (isRemote) {
                const raw = await fetchRemoteAlbum(id);
                return mapRemoteToCollection(raw);
            }
            const playlist = await libraryApi.getPlaylistWithSongs(id);
            return mapPlaylistToCollection(playlist);
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    return {
        data: query.data?.collection,
        rawSongs: query.data?.rawSongs,
        playbackToken: query.data?.playbackToken,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
};
