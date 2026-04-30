import axios from 'axios';
import { CleanedSearchResult, ItunesV2ItemResult, ItunesV2Feed } from '../types';
import { upgradeArtwork } from '@/features/search/utils/itunesHelpers';

// ─── Endpoints ────────────────────────────────────────────────────────────────

const V2_BASE = 'https://rss.marketingtools.apple.com/api/v2/in/music';
const TOP_SONGS_URL = `${V2_BASE}/most-played/100/songs.json`;
const TOP_ALBUMS_URL = `${V2_BASE}/most-played/100/albums.json`;

// ─── Mappers ──────────────────────────────────────────────────────────────────

const mapEntryV2 = (entry: ItunesV2ItemResult): CleanedSearchResult => ({
    id: entry.id,
    title: entry.name,
    artist: entry.artistName,
    album: entry.kind === 'albums' ? entry.name : '',
    artwork: upgradeArtwork(entry.artworkUrl100),
    preview: '',
    duration: '',
    year: entry.releaseDate ? new Date(entry.releaseDate).getFullYear().toString() : '',
    genre: entry.genres?.[0]?.name ?? 'Music',
    type: entry.kind === 'albums' ? 'album' : 'song',
});

// ─── Fetchers ─────────────────────────────────────────────────────────────────

export const fetchTopSongs = async (signal?: AbortSignal): Promise<CleanedSearchResult[]> => {
    const { data } = await axios.get<ItunesV2Feed>(TOP_SONGS_URL, { signal });
    return (data.feed.results ?? []).map(mapEntryV2);
};

export const fetchTopAlbums = async (signal?: AbortSignal): Promise<CleanedSearchResult[]> => {
    const { data } = await axios.get<ItunesV2Feed>(TOP_ALBUMS_URL, { signal });
    return (data.feed.results ?? []).map(mapEntryV2);
};
