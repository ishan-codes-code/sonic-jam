import { apiClient } from "@/api/apiClient";
import type {
  Playlist,
  PlayListReqPayload,
  PlaylistSong,
  AddSongToPlaylistPayload,
  AddSongToPlaylistResponse,
  PlaylistWithSongs
} from "../types";

export const libraryApi = {
  getUserPlaylists: async (): Promise<Playlist[]> => {
    const { data } = await apiClient.get("/playlist/getAll");
    return data;
  },

  getPlaylistById: async (playlistId: string): Promise<Playlist> => {
    const { data } = await apiClient.get(`/playlist/${playlistId}`);
    return data;
  },

  createPlaylist: async (payload: PlayListReqPayload): Promise<Playlist> => {
    const { data } = await apiClient.post("/playlist/create", payload);
    return data;
  },

  updatePlaylist: async (playlistId: string, payload: Partial<PlayListReqPayload>): Promise<Playlist> => {
    const { data } = await apiClient.patch(`/playlist/${playlistId}`, payload);
    return data;
  },

  deletePlaylist: async (playlistId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/playlist/${playlistId}`);
    return data;
  },

  getPlaylistWithSongs: async (playlistId: string): Promise<PlaylistWithSongs> => {
    const { data } = await apiClient.get(`/playlist/${playlistId}/songs`);
    return data;
  },

  addSongToPlaylist: async (payload: AddSongToPlaylistPayload): Promise<AddSongToPlaylistResponse> => {
    const { data } = await apiClient.post<AddSongToPlaylistResponse>("/playlist/song/add", payload);
    return data;
  },

  removeSongFromPlaylist: async (playlistId: string, songId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/playlist/${playlistId}/song/${songId}`);
    return data;
  },
};
