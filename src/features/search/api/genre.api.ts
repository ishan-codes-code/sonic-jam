import { apiClient } from '@/api/apiClient';
import type { Song } from '@/features/playback';

export const getGenreTracks = async (genre: string, limit: number = 20): Promise<Song[]> => {
    const { data } = await apiClient.get<Song[]>(`/discovery/genre?genre=${genre}&limit=${limit}`);
    return data;
};
