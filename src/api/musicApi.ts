import { PlayJobResponse, PlayResponseDto, PlaySongDto, Song } from "../playbackCore/types";
import { apiClient } from "./apiClient";


export interface AddSongPayload {
  youtubeId: string;
  title: string;
  duration: number;
}

export interface AddSongResponse {
  success: boolean;
  songId: string;
}

export interface AddSongToPlaylistPayload {
  playlistId: string;
  songId: string;
}

export interface AddSongToPlaylistResponse {
  message: string;
}

export interface StreamResponse {
  streamUrl: string;
  song: Song;
}



export type Playlist = {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string[] | null;
  isPublic: boolean;
  createdAt: string;
  isSystem: boolean;
  songCount?: number;
};

export type PlayListReqPayLoad = {
  name: string;
  description: string | null;
  isPublic: boolean;
};


export type PlaylistSongs = Song & {
  position?: number;
};



export const musicApi = {

  addSongToPlaylist: async (
    payload: AddSongToPlaylistPayload,
  ): Promise<AddSongToPlaylistResponse> => {
    const { data } = await apiClient.post<AddSongToPlaylistResponse>(
      "/playlist/song/add",
      payload,
    );
    return data;
  },

  getUserPlaylists: async (): Promise<Playlist[]> => {
    const { data } = await apiClient.get("/playlist/getAll");
    return data;
  },

  addPlayList: async (payload: PlayListReqPayLoad) => {
    const { data } = await apiClient.post("/playlist/create", payload);
    return data;
  },

  getPlaylistSongs: async (playlistId: string): Promise<PlaylistSongs[]> => {
    const { data } = await apiClient.get(`/playlist/${playlistId}/songs`);
    return data;
  },

  deletePlaylist: async (playlistId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/playlist/${playlistId}`);
    return data;
  },

  removeSongFromPlaylist: async (
    playlistId: string,
    songId: string,
  ): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(
      `/playlist/${playlistId}/song/${songId}`,
    );
    return data;
  },





  play: async (payload: PlaySongDto): Promise<PlayResponseDto> => {
    const { data } = await apiClient.post("/songs/play", payload);
    return data;
  },

  getJob: async (jobId: string): Promise<PlayJobResponse> => {
    const { data } = await apiClient.get(`/songs/job/${jobId}`);
    return data;
  },

  getGenreTracks: async (genre: string, limit: number = 20): Promise<Song[]> => {
    const { data } = await apiClient.get<Song[]>(`/discovery/genre?genre=${genre}&limit=${limit}`);
    return data;
  },
};
