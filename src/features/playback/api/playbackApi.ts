import type { PlaySongDto, PlayResponseDto, ResolvedStream } from "../types";
import { resolveJob } from "../services/jobResolver";
import { playbackApi } from "./playback.api";

export async function resolveStream(
  payload: PlaySongDto,
  options?: { onJob?: (jobId: string) => void },
): Promise<ResolvedStream> {
  if (!payload || typeof payload !== "object") {
    throw new Error(
      "resolveStream: payload must be an object with songId or trackName + artistName",
    );
  }

  if ("songId" in payload) {
    if (!payload.songId || typeof payload.songId !== "string") {
      throw new Error(
        "resolveStream: songId is required when using songId payload",
      );
    }
  } else {
    if (!payload.trackName || !payload.artistName) {
      throw new Error(
        "resolveStream: payload must include trackName and artistName when songId is not provided",
      );
    }
  }
  const response: PlayResponseDto = await playbackApi.play(payload);

  if (response.type === "job") {
    options?.onJob?.(response.jobId);
    return resolveJob(response.jobId);
  }

  // response.type === 'ready'
  return {
    song: response.song,
    playbackToken: response.playbackToken,
  };
}

export { playbackApi };
