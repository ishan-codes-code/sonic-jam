import { useQuery } from '@tanstack/react-query';
import { getGenreTracks } from '../api/genre.api';

export function useGenreTracks(genre: string | null) {
    return useQuery({
        queryKey: ['genreSongs', genre],
        queryFn: () => getGenreTracks(genre as string),
        enabled: !!genre,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}
