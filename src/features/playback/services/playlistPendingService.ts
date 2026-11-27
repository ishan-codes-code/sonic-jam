import TrackPlayer from "@rntp/player";
import { resolveJob } from "./jobResolver";
import {
  isJobPollingCancelled,
  JobPollingCancelledError,
} from "./pollingResolver";
import { createPlaybackTrack } from "../utils/playbackHelpers";
import { countEnqueuedBefore } from "../utils/streamHelpers";
import { useJobStore } from "../store/useJobStore";
import { usePlaybackStore } from "../store/usePlaybackStore";
import type { PlaybackTrack, ResolvedStream } from "../types";

// --------------------------------------------------------------------------
// Playlist pending-track resolution (Local backend missing files).
//
// A playlist track with `streamUrl: ''` + `jobId` resolves through the SAME
// single-song job poller (`resolveJob`), then slots into the native queue at
// its playlist-order position. Module-level run state (not per-hook): a
// playPlaylist()/play()/stop() from ANY component — or a server switch —
// invalidates in-flight resolutions before they can touch a replaced queue.
// --------------------------------------------------------------------------

export type PlaylistEntryState = "resolving" | "ready" | "failed";

export interface PlaylistPendingEntry {
  playlistIndex: number;
  jobId: string;
  songId: string;
  state: PlaylistEntryState;
}

export interface PlaylistRun {
  runId: number;
  playlistId: string;
  /** Per playlist index: already in the native queue. */
  enqueued: boolean[];
  /** Pending entries by playlist index. */
  entries: Map<number, PlaylistPendingEntry>;
  /** In-flight polls by jobId — one poll per job, however many entries (or taps) share it. */
  jobs: Map<string, Promise<ResolvedStream>>;
}

export interface PlaylistPendingInput {
  playlistIndex: number;
  jobId: string;
  songId: string;
}

let playlistRunId = 0;
let activeRun: PlaylistRun | null = null;

/** Start tracking a playlist load, superseding any previous run. */
export function startPlaylistRun(
  playlistId: string,
  total: number,
  pending: PlaylistPendingInput[],
): PlaylistRun {
  const run: PlaylistRun = {
    runId: ++playlistRunId,
    playlistId,
    enqueued: new Array(total).fill(false),
    entries: new Map(
      pending.map((entry) => [
        entry.playlistIndex,
        { ...entry, state: "resolving" as const },
      ]),
    ),
    jobs: new Map(),
  };
  activeRun = run;
  return run;
}

export function getActivePlaylistRun(): PlaylistRun | null {
  return activeRun;
}

export function isPlaylistRunCurrent(
  run: PlaylistRun | null | undefined,
): boolean {
  return !!run && activeRun?.runId === run.runId;
}

/**
 * Invalidate the active run and stop every in-flight playlist poll. Runs
 * synchronously inside play()/playPlaylist()/stop() and the server-switch
 * session reset. Never throws.
 */
export function cancelPlaylistResolution(): void {
  playlistRunId++;
  activeRun = null;
}

export function getPlaylistEntryState(
  run: PlaylistRun,
  playlistIndex: number,
): PlaylistEntryState | null {
  if (!isPlaylistRunCurrent(run)) return null;
  return run.entries.get(playlistIndex)?.state ?? null;
}

/** Mark a playlist index enqueued without polling (ready tracks, resolved start track). */
export function markPlaylistEntryEnqueued(
  run: PlaylistRun,
  playlistIndex: number,
): void {
  if (!isPlaylistRunCurrent(run)) return;
  run.enqueued[playlistIndex] = true;
  const entry = run.entries.get(playlistIndex);
  if (entry) entry.state = "ready";
}

function getOrPollJob(
  run: PlaylistRun,
  entry: PlaylistPendingEntry,
): Promise<ResolvedStream> {
  const inFlight = run.jobs.get(entry.jobId);
  if (inFlight) return inFlight;
  // First poller registers the job (Processing tab shows progress via the
  // shared poller's store writes); joiners reuse the same promise.
  useJobStore
    .getState()
    .addJob(entry.jobId, { payload: { songId: entry.songId } });
  const created = resolveJob(entry.jobId, undefined, () =>
    !isPlaylistRunCurrent(run),
  );
  run.jobs.set(entry.jobId, created);
  const settle = () => {
    if (run.jobs.get(entry.jobId) === created) {
      run.jobs.delete(entry.jobId);
    }
  };
  void created.then(settle, settle);
  return created;
}

/**
 * Resolve one pending entry through the shared job poller (busy retries,
 * timeouts, and failure marking included). A failed entry retries on the
 * next call. Throws the poll error, or JobPollingCancelledError when the
 * run was superseded or the server switched. Touches no queue state — the
 * caller inserts the result.
 */
export async function resolvePlaylistEntry(
  run: PlaylistRun,
  playlistIndex: number,
): Promise<ResolvedStream> {
  const entry = run.entries.get(playlistIndex);
  if (!entry) {
    throw new Error("Unknown playlist entry");
  }
  if (!isPlaylistRunCurrent(run)) {
    throw new JobPollingCancelledError();
  }
  if (entry.state === "failed") {
    entry.state = "resolving";
  }
  try {
    return await getOrPollJob(run, entry);
  } catch (error) {
    if (!isPlaylistRunCurrent(run) || isJobPollingCancelled(error)) {
      throw error;
    }
    entry.state = "failed";
    throw error;
  }
}

/**
 * Claim-once insert of a resolved entry at its playlist-order position. The
 * claim is synchronous, so a background resolution racing a tap inserts
 * exactly once — the loser sees 'ready' and gets null. Returns the inserted
 * track, or null when stale, already claimed, or superseded mid-insert.
 * Insert failures mark the entry failed (taps retry) and rethrow.
 */
export async function insertResolvedPlaylistEntry(
  run: PlaylistRun,
  playlistIndex: number,
  resolved: ResolvedStream,
): Promise<PlaybackTrack | null> {
  const entry = run.entries.get(playlistIndex);
  if (!entry || !isPlaylistRunCurrent(run) || entry.state !== "resolving") {
    return null;
  }
  entry.state = "ready";
  try {
    const track = await createPlaybackTrack(
      resolved.song,
      resolved.playbackToken,
    );
    if (!isPlaylistRunCurrent(run)) return null;
    usePlaybackStore.getState().addTrackToMap(track);
    const queue = await TrackPlayer.getQueue();
    if (!isPlaylistRunCurrent(run)) return null;
    // Manual adds/removals shift the native queue after the load, so the
    // playlist-order position clamps to the live length.
    const position = Math.min(
      countEnqueuedBefore(run.enqueued, playlistIndex),
      queue.length,
    );
    await TrackPlayer.insertMediaItem(position, track as any);
    if (!isPlaylistRunCurrent(run)) return null;
    run.enqueued[playlistIndex] = true;
    usePlaybackStore.getState().notifyQueueUpdate();
    return track;
  } catch (error) {
    if (isPlaylistRunCurrent(run)) {
      entry.state = "failed";
    }
    throw error;
  }
}

/**
 * Fire-and-forget background resolution: poll, then insert. Silent on
 * failure and cancellation — the entry retries when tapped, and the
 * Processing tab shows the shared job state. Never throws, never touches a
 * superseded run's queue.
 */
export function resolvePlaylistEntryInBackground(
  run: PlaylistRun,
  playlistIndex: number,
): void {
  void (async () => {
    try {
      const resolved = await resolvePlaylistEntry(run, playlistIndex);
      await insertResolvedPlaylistEntry(run, playlistIndex, resolved);
    } catch (error) {
      if (!isPlaylistRunCurrent(run) || isJobPollingCancelled(error)) return;
      // Terminal failure is already recorded on the entry (resolve/insert
      // mark it failed); the track retries when tapped.
    }
  })();
}
