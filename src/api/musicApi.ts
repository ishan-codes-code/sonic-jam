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

export type Playlist = {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string[] | null;
  isPublic: boolean;
  createdAt: string;
  songCount?: number;
};

export type PlayListReqPayLoad = {
  name: string;
  description: string | null;
  isPublic: boolean;
};

export type PlayResponse =
  | { type: "ready"; streamUrl: string }
  | { type: "job"; jobId: string };

export type PlayJobResponse = {
  status: string;
  progress: number;
  streamUrl?: string;
  message?: string;
};

export type PlaylistSongs = {
  id: string;
  title: string;
  duration: number;
  youtubeId: string;
  position: number;
  channelName: string;
  channelId: string;
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

const normalizePlayResponse = (data: any): PlayResponse => {
  console.log("[musicApi.play] raw response:", data);

  if (data?.type === "ready" && typeof data?.streamUrl === "string") {
    return { type: "ready", streamUrl: data.streamUrl };
  }

  if (data?.type === "job" && typeof data?.jobId === "string") {
    return { type: "job", jobId: data.jobId };
  }

  if (typeof data?.streamUrl === "string") {
    return { type: "ready", streamUrl: data.streamUrl };
  }

  if (typeof data?.jobId === "string") {
    return { type: "job", jobId: data.jobId };
  }

  console.error("[musicApi.play] unexpected response shape:", data);
  throw new Error("Unexpected /songs/play response");
};

const normalizePlayJobResponse = (data: any): PlayJobResponse => {
  console.log("[musicApi.getPlayJob] raw response:", data);

  const rawStatus = String(data?.status ?? data?.type ?? "").toLowerCase();
  const progress =
    readNumericProgress(data?.progress) ??
    readNumericProgress(data?.data?.progress) ??
    0;

  const streamUrl = readStreamUrl(data);

  const message =
    data?.message ??
    data?.error ??
    data?.failedReason ??
    data?.data?.message ??
    data?.data?.error;

  if (rawStatus) {
    return {
      status: rawStatus,
      progress,
      ...(typeof streamUrl === "string" ? { streamUrl } : {}),
      ...(typeof message === "string" ? { message } : {}),
    };
  }

  if (typeof streamUrl === "string") {
    return { status: "completed", streamUrl, progress };
  }

  console.error("[musicApi.getPlayJob] unexpected response shape:", data);
  throw new Error("Unexpected /songs/job response");
};

export const musicApi = {
  addSong: async (payload: AddSongPayload): Promise<AddSongResponse> => {
    const { data } = await apiClient.post<AddSongResponse>(
      "/library/addSong",
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

  getAllSongs: async (): Promise<Song[]> => {
    const { data } = await apiClient.get<Song[]>("/songs/getAll");
    return data;
  },

  getStreamUrl: async (songId: string): Promise<StreamResponse> => {
    const { data } = await apiClient.get<StreamResponse>(
      `/songs/play/${songId}`,
    );
    return data;
  },

  play: async (payload: PlayPayload): Promise<PlayResponse> => {
    const { data } = await apiClient.post("/songs/play", payload);
    return normalizePlayResponse(data);
  },

  getPlayJob: async (jobId: string): Promise<PlayJobResponse> => {
    const { data } = await apiClient.get(`/songs/job/${jobId}`);
    return normalizePlayJobResponse(data);
  },
};
