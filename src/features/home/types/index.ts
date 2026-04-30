import { CleanedSearchResult } from '@/features/search';

export { CleanedSearchResult } from '@/features/search/types';

// ─── Apple Music API V2 (New) ───────────────────────────────────────────────

export interface ItunesV2Genre {
    genreId: string;
    name: string;
    url: string;
}

export interface ItunesV2ItemResult {
    artistName: string;
    id: string;
    name: string;
    releaseDate: string;
    kind: string;
    artworkUrl100: string;
    genres: ItunesV2Genre[];
    url: string;
}

export interface ItunesV2Feed {
    feed: {
        title: string;
        id: string;
        author: { name: string; url: string };
        links: Array<{ self: string } | { alternate: string }>;
        copyright: string;
        country: string;
        icon: string;
        updated: string;
        results: ItunesV2ItemResult[];
    };
}

// ─── Home Feed Section ────────────────────────────────────────────────────────

export type FeedSectionId = 'top-songs' | 'top-albums' | 'suggested-songs' | 'trending-albums';

export interface FeedSection {
    id: FeedSectionId;
    title: string;
    subtitle: string;
    songs: CleanedSearchResult[];
}
