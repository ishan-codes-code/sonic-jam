import { useQuery } from '@tanstack/react-query';
import { fetchTopSongs, fetchTopAlbums } from '../api/feed.api';

// ─── Stale time: 10 min — charts don't change rapidly ─────────────────────────
const STALE_TIME = 1000 * 60 * 10;

export const useTopSongs = () =>
    useQuery({
        queryKey: ['home', 'top-songs'],
        queryFn: ({ signal }) => fetchTopSongs(signal),
        staleTime: STALE_TIME,
    });

export const useTopAlbums = () =>
    useQuery({
        queryKey: ['home', 'top-albums'],
        queryFn: ({ signal }) => fetchTopAlbums(signal),
        staleTime: STALE_TIME,
    });
