import { CleanedSearchResult } from "@/features/search/types";

export type CollectionType = 'album' | 'playlist';

// ─── Unified track ────────────────────────────────────────────────────────────
// Both remote CleanedSearchResult and local Song are mapped into this shape.

export interface CollectionTrack {
    id: string;
    title: string;
    artist: string;
    album?: string;
    /** Square artwork URI; undefined → show placeholder */
    artwork?: string;
    /** Raw duration string (seconds). Empty string if unknown. */
    duration: string;
    previewUrl?: string;
    year?: string;
    genre?: string;
    /**
     * For local tracks only: the server Song id.
     * Pass via play({ songId }) instead of play({ externalId }).
     */
    songId?: string;
}

// ─── Unified Collection ───────────────────────────────────────────────────────
// The single shape consumed by all UI components.
// useCollection maps raw API responses into this.

export interface Collection {
    id: string;
    title: string;
    artist: string;
    artwork?: string | string[];
    type: CollectionType;
    isRemote: boolean;
    description?: string | null;
    tracks: CollectionTrack[];
    releaseDate?: string;
    genre?: string;
    user?: {
        id: string;
        name: string;
    };
    isPublic?: boolean;
    isSystem?: boolean;
}

// ─── Raw iTunes API shape (api layer only) ────────────────────────────────────

/** Shape returned by fetchRemoteAlbum — not used outside the hook */
export interface ItuneCollectionWithSongs {
    id: string;
    title: string;
    artist: string;
    artwork: string;
    type: CollectionType;
    isRemote: boolean;
    description?: string;
    tracks: CleanedSearchResult[];
    releaseDate?: string;
    genre?: string;
}

export interface ItunesLookupResult {
    wrapperType: 'collection' | 'track';
    collectionId: number;
    artistName: string;
    collectionName: string;
    artworkUrl100: string;
    primaryGenreName: string;
    releaseDate: string;
    // Track specific fields
    trackId?: number;
    trackName?: string;
    trackNumber?: number;
    previewUrl?: string;
}

export interface ItunesLookupResponse {
    resultCount: number;
    results: ItunesLookupResult[];
}