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

const readNumericProgress = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const candidate = (value as Record<string, unknown>).percent;
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return null;
};

const readStreamUrl = (data: any): string | null => {
  const candidates = [
    data?.streamUrl,
    data?.url,
    data?.data?.streamUrl,
    data?.data?.url,
    data?.result?.streamUrl,
    data?.result?.url,
    data?.returnvalue?.streamUrl,
    data?.returnvalue?.url,
    data?.returnValue?.streamUrl,
    data?.returnValue?.url,
    data?.data?.result?.streamUrl,
    data?.data?.result?.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  return null;
};

const toTitleCase = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .map((part) =>
      part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part,
    )
    .join(" ");

const formatDisplayName = (value?: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return toTitleCase(trimmed);
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
