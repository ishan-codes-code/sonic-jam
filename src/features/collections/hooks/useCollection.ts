import { useQuery } from '@tanstack/react-query';
import { fetchRemoteAlbum } from '../api/collections.api';

export const useCollection = (id: string, isRemote: boolean) => {
    return useQuery({
        queryKey: ['collection', id, isRemote],
        queryFn: ({ signal }) => {
            if (isRemote) {
                return fetchRemoteAlbum(id, signal);
            }
            // Local DB fetch will go here later
            throw new Error('Local collections not implemented yet');
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 60, // 1 hour for albums
    });
};
