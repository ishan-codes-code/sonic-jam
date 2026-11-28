import { countEnqueuedBefore } from "../utils/streamHelpers";
import {
  isJobPollingCancelled,
  JobPollingCancelledError,
} from "./jobCancellation";

// --------------------------------------------------------------------------
// Playlist pending-track resolution (Local backend missing files).
//
// A playlist track with `streamUrl: ''` + `jobId` resolves through the SAME
// single-song job poller (`resolveJob`), then slots into the native queue at
// its playlist-order position. Module-level run state (not per-hook): a
// playPlaylist()/play()/stop() from ANY component — or a server switch —
// invalidates in-flight resolutions before they can touch a replaced queue.
//
// Entry lifecycle: pending → resolving → inserting → ready, with failed for
// terminal resolution/insertion failures. An entry reads ready ONLY after its
// native insertion succeeds. Each entry owns at most one in-flight pipeline
// promise: a tap racing a background resolution joins the same pipeline —
// one poll per job, one insertion per entry — instead of inserting twice or
// rebuilding the playlist. Terminal failure releases ownership so a retry
// starts fresh.
//
// Background entries resolve one at a time in playlist order (taps still
// start immediately and join/share in-flight work). Native insertions are
// additionally serialized per run: positions derive from the live enqueued
// flags, so a tap racing the background queue cannot compute from a stale
// snapshot and misorder the queue.
//
// This module stays dependency-light (relative-only imports, no native
// modules, no stores, no song/track types) so node:test executes this EXACT
// orchestration code. All heavy effects arrive through injected deps (see
// PlaylistPendingDeps): production wires the real poller, stores, track
// builder, and RNTP calls once in usePlayer.ts.
// --------------------------------------------------------------------------

export type PlaylistEntryState =
  | "pending"
  | "resolving"
  | "inserting"
  | "ready"
  | "failed";

export interface PlaylistPendingEntry<T = unknown> {
  playlistIndex: number;
  jobId: string;
  songId: string;
  state: PlaylistEntryState;
  /**
   * Owned resolve→insert pipeline. Claimed synchronously: joiners await it
   * instead of starting their own. Cleared on terminal failure so a retry
   * starts fresh; kept once fulfilled so late joiners reuse the track.
   */
  pipeline: Promise<T> | null;
}

export interface PlaylistPendingResolved<S = unknown> {
  song: S;
  playbackToken: string;
}

/**
 * Heavy side effects behind the entry pipeline. `S` is the resolved song
 * shape, `T` the native track shape (production: `Song`/`PlaybackTrack`).
 */
export interface PlaylistPendingDeps<S = unknown, T = unknown> {
  pollJob(
    jobId: string,
    shouldAbort: () => boolean,
  ): Promise<PlaylistPendingResolved<S>>;
  registerJob(jobId: string, songId: string): void;
  createTrack(song: S, playbackToken: string): Promise<T>;
  addTrackToMap(track: T): void;
  getNativeQueueLength(): Promise<number>;
  insertNativeTrack(position: number, track: T): Promise<void>;
  notifyQueueUpdate(): void;
}

export interface PlaylistRun<S = unknown, T = unknown> {
  runId: number;
  playlistId: string;
  /** Per playlist index: already in the native queue. */
  enqueued: boolean[];
  /** Pending entries by playlist index. */
  entries: Map<number, PlaylistPendingEntry<T>>;
  /** In-flight polls by jobId — one poll per job, however many entries (or taps) share it. */
  jobs: Map<string, Promise<PlaylistPendingResolved<S>>>;
  deps: PlaylistPendingDeps<S, T>;
  /**
   * True once the initial queue has settled (loaded, or definitively
   * unloadable with background work kicked off). Taps join entry pipelines
   * only on joinable runs; anything earlier rebuilds the playlist instead of
   * inserting into a queue that is about to be replaced.
   */
  joinable: boolean;
  /**
   * Tail of the per-run insertion chain. Each insert phase awaits the
   * previous one, so positions always derive from up-to-date enqueued flags
   * and concurrent completions (a tap racing the background queue) cannot
   * misorder the queue.
   */
  insertChain: Promise<void>;
}

export interface PlaylistPendingInput {
  playlistIndex: number;
  jobId: string;
  songId: string;
}

let playlistRunId = 0;
// The live run, tracked by identity only: currency checks compare runId, so
// the registry never needs the run's generic payload types.
let activeRun: { runId: number } | null = null;

/**
 * Start tracking a playlist load, superseding any previous run. The run
 * starts non-joinable: taps rebuild until markPlaylistRunJoinable publishes
 * the settled queue.
 */
export function startPlaylistRun<S, T>(
  playlistId: string,
  total: number,
  pending: PlaylistPendingInput[],
  deps: PlaylistPendingDeps<S, T>,
): PlaylistRun<S, T> {
  const run: PlaylistRun<S, T> = {
    runId: ++playlistRunId,
    playlistId,
    enqueued: new Array(total).fill(false),
    entries: new Map(
      pending.map((entry) => [
        entry.playlistIndex,
        { ...entry, state: "pending" as const, pipeline: null },
      ]),
    ),
    jobs: new Map(),
    deps,
    joinable: false,
    insertChain: Promise.resolve(),
  };
  activeRun = run;
  return run;
}

/**
 * The live run, if any. Callers instantiate `S`/`T` with their own song and
 * track shapes (exactly one production instantiation exists).
 */
export function getActivePlaylistRun<S, T>(): PlaylistRun<S, T> | null {
  return activeRun as PlaylistRun<S, T> | null;
}

export function isPlaylistRunCurrent<S, T>(
  run: PlaylistRun<S, T> | null | undefined,
): boolean {
  return !!run && activeRun?.runId === run.runId;
}

/** True when taps may join this run's entry pipelines. */
export function isPlaylistRunJoinable<S, T>(
  run: PlaylistRun<S, T> | null | undefined,
): boolean {
  if (!run) return false;
  return isPlaylistRunCurrent(run) && run.joinable;
}

/**
 * Publish the run for tap-joining once its initial queue has settled.
 * No-op on a superseded run. Never throws.
 */
export function markPlaylistRunJoinable<S, T>(run: PlaylistRun<S, T>): void {
  if (!isPlaylistRunCurrent(run)) return;
  run.joinable = true;
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

export function getPlaylistEntryState<S, T>(
  run: PlaylistRun<S, T>,
  playlistIndex: number,
): PlaylistEntryState | null {
  if (!isPlaylistRunCurrent(run)) return null;
  return run.entries.get(playlistIndex)?.state ?? null;
}

/** Mark a playlist index enqueued without polling (ready tracks, resolved start track). */
export function markPlaylistEntryEnqueued<S, T>(
  run: PlaylistRun<S, T>,
  playlistIndex: number,
): void {
  if (!isPlaylistRunCurrent(run)) return;
  run.enqueued[playlistIndex] = true;
  const entry = run.entries.get(playlistIndex);
  if (entry) entry.state = "ready";
}

function getOrPollJob<S, T>(
  run: PlaylistRun<S, T>,
  entry: PlaylistPendingEntry<T>,
): Promise<PlaylistPendingResolved<S>> {
  const inFlight = run.jobs.get(entry.jobId);
  if (inFlight) return inFlight;
  // First poller registers the job (Processing tab shows progress via the
  // shared poller's store writes); joiners reuse the same promise.
  run.deps.registerJob(entry.jobId, entry.songId);
  const created = run.deps.pollJob(entry.jobId, () =>
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
 * start-track path inserts the result into the initial queue itself, while
 * background and tap paths go through ensurePlaylistEntryInserted.
 */
export async function resolvePlaylistEntry<S, T>(
  run: PlaylistRun<S, T>,
  playlistIndex: number,
): Promise<PlaylistPendingResolved<S>> {
  const entry = run.entries.get(playlistIndex);
  if (!entry) {
    throw new Error("Unknown playlist entry");
  }
  if (!isPlaylistRunCurrent(run)) {
    throw new JobPollingCancelledError();
  }
  if (entry.state === "pending" || entry.state === "failed") {
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
 * Resolve one pending entry and insert it at its playlist-order position,
 * joining the in-flight pipeline when one exists. The claim is synchronous:
 * the first caller owns the pipeline while every later caller (background
 * task, tap, double tap) awaits the same promise — one poll per job, one
 * native insertion per entry, no competing rebuilds. The entry reads ready
 * only after the insertion succeeds; terminal failure releases ownership so
 * a retry starts fresh. Throws the resolve/insert error, or
 * JobPollingCancelledError when the run was superseded or the server
 * switched (stale work never inserts into, marks, or notifies a replaced
 * queue). Callers join joinable runs only (see isPlaylistRunJoinable).
 */
export function ensurePlaylistEntryInserted<S, T>(
  run: PlaylistRun<S, T>,
  playlistIndex: number,
): Promise<T> {
  const entry = run.entries.get(playlistIndex);
  if (!entry) {
    return Promise.reject(new Error("Unknown playlist entry"));
  }
  if (!isPlaylistRunCurrent(run)) {
    return Promise.reject(new JobPollingCancelledError());
  }
  if (entry.pipeline) return entry.pipeline;
  if (entry.state === "ready") {
    // Only the start-track path marks ready without a pipeline, and its
    // track is already in the queue: reject loudly rather than inserting a
    // duplicate. (The tap path skips ready entries before reaching here.)
    return Promise.reject(new Error("Playlist entry is already inserted"));
  }
  const pipeline = runEntryPipeline(run, entry);
  entry.pipeline = pipeline;
  // Release ownership on terminal failure so a retry starts fresh (clearing
  // a dead run's entry is harmless). Fulfilled pipelines stay: late joiners
  // reuse the inserted track. This branch also guarantees the rejection is
  // always handled, even with no joiners.
  void pipeline.then(undefined, () => {
    if (entry.pipeline === pipeline) {
      entry.pipeline = null;
    }
  });
  return pipeline;
}

async function runEntryPipeline<S, T>(
  run: PlaylistRun<S, T>,
  entry: PlaylistPendingEntry<T>,
): Promise<T> {
  try {
    const resolved = await resolvePlaylistEntry(run, entry.playlistIndex);
    if (!isPlaylistRunCurrent(run)) {
      throw new JobPollingCancelledError();
    }
    // Serialize the insert phase per run: the link handoff is synchronous,
    // so exactly one pipeline inserts at a time and each position derives
    // from enqueued flags that already include every earlier insertion.
    // Stale waiters pass through, then throw at the currency check below.
    const previousInsert = run.insertChain;
    let releaseInsert!: () => void;
    run.insertChain = new Promise<void>((resolve) => {
      releaseInsert = resolve;
    });
    await previousInsert;
    try {
      if (!isPlaylistRunCurrent(run)) {
        throw new JobPollingCancelledError();
      }
      entry.state = "inserting";
      const track = await run.deps.createTrack(
        resolved.song,
        resolved.playbackToken,
      );
      if (!isPlaylistRunCurrent(run)) {
        throw new JobPollingCancelledError();
      }
      run.deps.addTrackToMap(track);
      const queueLength = await run.deps.getNativeQueueLength();
      if (!isPlaylistRunCurrent(run)) {
        throw new JobPollingCancelledError();
      }
      // Manual adds/removals shift the native queue after the load, so the
      // playlist-order position clamps to the live length.
      const position = Math.min(
        countEnqueuedBefore(run.enqueued, entry.playlistIndex),
        queueLength,
      );
      await run.deps.insertNativeTrack(position, track);
      if (!isPlaylistRunCurrent(run)) {
        throw new JobPollingCancelledError();
      }
      run.enqueued[entry.playlistIndex] = true;
      entry.state = "ready";
      run.deps.notifyQueueUpdate();
      return track;
    } finally {
      releaseInsert();
    }
  } catch (error) {
    if (!isPlaylistRunCurrent(run) || isJobPollingCancelled(error)) {
      throw error;
    }
    entry.state = "failed";
    throw error;
  }
}

/**
 * Fire-and-forget background resolution: join (or start) the entry pipeline.
 * Silent on failure and cancellation — the entry retries when tapped, and
 * the Processing tab shows the shared job state. Never throws, never touches
 * a superseded run's queue.
 */
export function resolvePlaylistEntryInBackground<S, T>(
  run: PlaylistRun<S, T>,
  playlistIndex: number,
): void {
  void ensurePlaylistEntryInserted(run, playlistIndex).then(undefined, (error: unknown) => {
    if (!isPlaylistRunCurrent(run) || isJobPollingCancelled(error)) return;
    // Terminal failure is already recorded on the entry; the track retries
    // when tapped.
  });
}

/**
 * Fire-and-forget background resolution of several entries, strictly one at
 * a time in playlist order: each entry's poll starts only after the previous
 * entry has fully landed (or terminally failed), so queued entries never
 * burn their poll timeout while waiting, and one failed download never
 * starves the rest of the playlist. Taps bypass the queue — ensure() starts
 * (or joins) immediately — and the chain simply joins tap-owned pipelines
 * when it reaches them. Stops silently on a superseded run. Never throws.
 */
export function resolvePlaylistEntriesInBackground<S, T>(
  run: PlaylistRun<S, T>,
  playlistIndices: readonly number[],
): void {
  const ordered = [...new Set(playlistIndices)].sort((a, b) => a - b);
  void (async () => {
    for (const playlistIndex of ordered) {
      if (!isPlaylistRunCurrent(run)) return;
      try {
        await ensurePlaylistEntryInserted(run, playlistIndex);
      } catch (error) {
        if (!isPlaylistRunCurrent(run) || isJobPollingCancelled(error)) return;
        // Recorded on the entry (tap retries); continue with the next one.
      }
    }
  })();
}
