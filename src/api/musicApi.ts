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

export type PlayResponse =
  | { type: "ready"; streamUrl: string }
  | { type: "job"; jobId: string };

export type PlayJobResponse =
  | { status: "processing"; progress: number }
  | { status: "done"; streamUrl: string; progress?: number }
  | { status: "error"; progress?: number; message?: string };

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
    typeof data?.progress === "number"
      ? data.progress
      : typeof data?.data?.progress === "number"
        ? data.data.progress
        : 0;

  const streamUrl =
    data?.streamUrl ??
    data?.url ??
    data?.data?.streamUrl ??
    data?.result?.streamUrl;

  const message =
    data?.message ?? data?.error ?? data?.data?.message ?? data?.data?.error;

  if (["processing", "queued", "pending", "in_progress"].includes(rawStatus)) {
    return { status: "processing", progress };
  }

  if (
    ["done", "completed", "ready", "success"].includes(rawStatus) &&
    typeof streamUrl === "string"
  ) {
    return { status: "done", streamUrl, progress };
  }

  if (["error", "failed", "failure"].includes(rawStatus)) {
    return { status: "error", progress, message };
  }

  if (typeof streamUrl === "string") {
    return { status: "done", streamUrl, progress };
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

  getLibrary: async (): Promise<Song[]> => {
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
