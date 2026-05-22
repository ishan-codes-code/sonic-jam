import { apiClient } from '@/api/apiClient';
import type { PlaySongDto, PlayResponseDto, PlayJobResponse } from '../types';

export const playbackApi = {
    play: async (payload: PlaySongDto): Promise<PlayResponseDto> => {
        const { data } = await apiClient.post("/song/play", payload);
        return data;
    },

    getJob: async (jobId: string): Promise<PlayJobResponse> => {
        const { data } = await apiClient.get(`/song/job/${jobId}`);
        return data;
    },

    recordListeningEvent: async (payload: {
        id?: string;
        songId?: string;
        durationListenedSeconds?: number;
        completed?: boolean;
        isManualAdd?: boolean;
    }) => {
        const { data } = await apiClient.post("/listening/event", payload);
        return data;
    },
};
