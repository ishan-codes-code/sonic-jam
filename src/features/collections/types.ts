import { CleanedSearchResult } from "@/features/search/types";

export type CollectionType = 'album' | 'playlist';

export interface Collection {
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

// iTunes API specific types
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