import type { PlaySongDto, PlayResponseDto, ResolvedStream } from "../types";
import { resolveJob } from "../services/jobResolver";
import {
  getPollingGeneration,
  JobPollingCancelledError,
} from "../services/pollingResolver";
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
  // Capture before the initial network request: a server switch that lands
  // while `/songs/play` is in flight must invalidate this whole operation.
  const generation = getPollingGeneration();
  const response: PlayResponseDto = await playbackApi.play(payload);

  // Stale Server A response: reject before it can start polling, register a
  // job, or hand a foreign stream to the new session. Callers already let
  // JobPollingCancelledError through silently (see usePlayer).
  if (generation !== getPollingGeneration()) {
    throw new JobPollingCancelledError();
  }

  if (response.type === "job") {
    options?.onJob?.(response.jobId);
    return resolveJob(response.jobId, generation);
  }

  // response.type === 'ready'
  return {
    song: response.song,
    playbackToken: response.playbackToken,
  };
}

export { playbackApi };
