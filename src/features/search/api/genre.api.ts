import { apiClient } from '@/api/apiClient';
import { Song } from '@/playbackCore/types';

export const getGenreTracks = async (genre: string, limit: number = 20): Promise<Song[]> => {
    const { data } = await apiClient.get<Song[]>(`/discovery/genre?genre=${genre}&limit=${limit}`);
    return data;
};
