import { apiClient } from "./apiClient";

export interface Song {
  songId: string;
  title: string;
  duration: number;
  youtubeId: string;
}

export interface AddSongPayload {
  youtubeId: string;
  title: string;
  duration: number;
}

export interface AddSongResponse {
  success: boolean;
  songId: string;
}

export interface StreamResponse {
  streamUrl: string;
}

export interface PlayPayload {
  youtubeId: string;
  title: string;
  duration: number;
}

export interface PlayResponse {
  streamUrl: string;
}

export const musicApi = {
  addSong: async (payload: AddSongPayload): Promise<AddSongResponse> => {
    const { data } = await apiClient.post<AddSongResponse>(
      "/library/addSong",
      payload,
    );
    return data;
  },

  getLibrary: async (): Promise<Song[]> => {
    const { data } = await apiClient.get<Song[]>("/songs/getAll");
    return data;
  },

  getStreamUrl: async (songId: string): Promise<StreamResponse> => {
    const { data } = await apiClient.get<StreamResponse>(`/stream/${songId}`);
    return data;
  },

  /** Direct play — resolves a streamUrl without adding to library */
  play: async (payload: PlayPayload): Promise<PlayResponse> => {
    const { data } = await apiClient.post<PlayResponse>("/songs/play", payload);

    return data;
  },
};
