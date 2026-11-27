// --------------------------------------------------------------------------
// Pure stream-URL + playlist-pending helpers (zero imports).
//
// Single source of truth for "is this track playable right now": a track is
// playable only with a non-blank stream URL. A Local backend returns playlist
// tracks whose file is missing as `streamUrl: ''` plus the `jobId` to poll —
// those must resolve through the job endpoint before they may enter the
// native queue. This module stays dependency-free so the node:test suite next
// to it executes the EXACT predicates the player runs.
// --------------------------------------------------------------------------

/** Minimal shape the predicates need — Song and PlaylistSong both satisfy it. */
export interface PlaylistStreamEntry {
  streamUrl?: unknown;
  jobId?: unknown;
}

/** True only for a non-blank string URL. Anything else is not playable. */
export function hasUsableStreamUrl(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Trimmed job id, or null when there is nothing to poll. A blank or
 * non-string jobId can never resolve, so it reads as unplayable.
 */
export function normalizeJobId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * True for a missing-file playlist track: no usable stream URL, but a job id
 * to resolve it with. Ready tracks (usable URL) and unplayable tracks (no URL
 * and no job) both read false.
 */
export function isPendingPlaylistTrack(track: PlaylistStreamEntry): boolean {
  return (
    !hasUsableStreamUrl(track.streamUrl) &&
    normalizeJobId(track.jobId) !== null
  );
}

export interface PartitionedPlaylist<T> {
  /** Immediately playable, in playlist order. */
  ready: { track: T; index: number }[];
  /** Missing file with a job to poll, in playlist order. */
  pending: { track: T; index: number }[];
  /**
   * No usable URL and no job to resolve it with: skipped always, never
   * enqueued, never polled.
   */
  unplayable: { track: T; index: number }[];
}

/**
 * Split playlist tracks by playability, keeping each group's playlist order
 * and original index. Every input lands in exactly one group.
 */
export function partitionPlaylistTracks<T extends PlaylistStreamEntry>(
  tracks: readonly T[],
): PartitionedPlaylist<T> {
  const ready: { track: T; index: number }[] = [];
  const pending: { track: T; index: number }[] = [];
  const unplayable: { track: T; index: number }[] = [];
  tracks.forEach((track, index) => {
    if (hasUsableStreamUrl(track.streamUrl)) {
      ready.push({ track, index });
    } else if (normalizeJobId(track.jobId) !== null) {
      pending.push({ track, index });
    } else {
      unplayable.push({ track, index });
    }
  });
  return { ready, pending, unplayable };
}

/**
 * Exact headers attached to every RNTP track: the backend-issued playback
 * token as a Bearer token, verbatim. Never the user's access token — the
 * stream endpoints reject login tokens.
 */
export function buildPlaybackHeaders(
  playbackToken: string,
): Record<string, string> {
  return { Authorization: `Bearer ${playbackToken}` };
}

/**
 * Native insert position for a playlist entry: pending tracks resolve after
 * the initial queue is built, so each one slots in after however many
 * playlist entries before it are already enqueued. Callers clamp to the live
 * native queue length (manual adds/removals shift it).
 */
export function countEnqueuedBefore(
  enqueued: readonly boolean[],
  playlistIndex: number,
): number {
  let count = 0;
  const end = Math.max(0, Math.min(playlistIndex, enqueued.length));
  for (let i = 0; i < end; i++) {
    if (enqueued[i]) count++;
  }
  return count;
}

/**
 * Nearest playable playlist index to `from`, preferring later tracks, or
 * -1 when nothing is playable. Used when the tapped track cannot resolve:
 * playback falls back instead of failing the whole playlist.
 */
export function nearestReadyIndex(
  ready: readonly boolean[],
  from: number,
): number {
  for (let i = Math.max(0, from); i < ready.length; i++) {
    if (ready[i]) return i;
  }
  for (let i = Math.min(from, ready.length - 1); i >= 0; i--) {
    if (ready[i]) return i;
  }
  return -1;
}
