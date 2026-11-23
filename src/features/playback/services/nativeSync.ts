import TrackPlayer, { PlaybackState as RNTPPlaybackState } from "@rntp/player";
import type { MediaUrl } from "@rntp/player";
import type { PlaybackStatus, PlaybackTrack } from "../types";

// Shared foreground/background resync: re-reads the LIVE native player state
// into the zustand store. Used on app foreground (events can be missed or
// throttled while backgrounded) and from the headless transition handler.
//
// Hard rule 1: this module is imported by the headless service, so the store
// (and anything else cycle/background-sensitive) is lazy-imported inside the
// functions below — never statically.

/**
 * Resolves a MediaUrl (string | asset id | { uri, headers }) to a plain
 * string, matching the inline handling in the former transition listener.
 */
export function mediaUrlToString(url: MediaUrl | undefined): string | undefined {
  if (typeof url === "string") return url;
  if (url && typeof url === "object") return url.uri;
  return undefined;
}

/**
 * Pure mapping from native playback state to store status — the single
 * definition shared by the PlaybackSync status effect and syncPlayerFromNative.
 *
 * Returns null when the caller should leave status untouched (no change, or
 * the store is idle with nothing loaded). Native Error always returns "error":
 * it is highest priority and the caller must apply it before job guards.
 */
export function resolveStoreStatus(
  rntpState: RNTPPlaybackState,
  playing: boolean,
  currentStatus: PlaybackStatus,
): PlaybackStatus | null {
  if (rntpState === RNTPPlaybackState.Error) return "error";

  let next: PlaybackStatus;
  if (playing) {
    next = "playing";
  } else if (rntpState === RNTPPlaybackState.Buffering) {
    next = "loading";
  } else if (rntpState === RNTPPlaybackState.Ended) {
    next = "stopped";
  } else {
    // Ready/Idle but not playing = Paused
    next = "paused";
  }

  // Idle means nothing was ever loaded — don't flip it to paused.
  if (next === "paused" && currentStatus === "idle") return null;
  return next === currentStatus ? null : next;
}

/**
 * Applies full track metadata for a transition: current song + stream URL +
 * artwork colors. Idempotent per caller (callers skip when the mediaId is
 * unchanged). Never throws.
 */
export async function syncTrackMetadata(fullTrack: PlaybackTrack): Promise<void> {
  try {
    if (!fullTrack?.song) return;

    const { usePlaybackStore } = await import("../store/usePlaybackStore");
    const store = usePlaybackStore.getState();

    store.setCurrentSong(fullTrack.song, fullTrack);

    const streamUrl = mediaUrlToString(fullTrack.url);
    if (streamUrl) store.setStream(streamUrl);

    // Extract colors for the UI (fire-and-forget, as before)
    const artworkUri = mediaUrlToString(fullTrack.artworkUrl ?? fullTrack.song.image);
    const { extractArtworkColors } = await import(
      "../../artwork-colors/services/artworkColorService"
    );
    extractArtworkColors(artworkUri)
      .then((colors) => {
        usePlaybackStore.getState().setTrackColors({
          primary: colors.primary,
          secondary: colors.secondary,
        });
      })
      .catch((colorError) => {
        console.warn("[nativeSync] artwork color extraction failed:", colorError);
      });
  } catch (error) {
    console.warn("[nativeSync] syncTrackMetadata failed:", error);
  }
}

/**
 * True when the store claims something is loaded but the live native queue
 * is empty — i.e. Android killed the player service (onTaskRemoved →
 * stopSelf when paused/idle) and every native command is now a silent
 * no-op. Excludes the resolving window (no currentTrack yet) and pending
 * jobs (native was deliberately cleared). A throw also means dead. Never
 * throws itself.
 */
export async function isNativePlayerDead(): Promise<boolean> {
  const { usePlaybackStore } = await import("../store/usePlaybackStore");
  const { currentTrack, pendingJobId } = usePlaybackStore.getState();
  if (!currentTrack || pendingJobId) return false;
  try {
    const queue = await TrackPlayer.getQueue();
    return queue.length === 0;
  } catch {
    return true;
  }
}

/**
 * Re-reads the live native player (active item, play state, progress) into
 * the store. When the native service is dead (see isNativePlayerDead),
 * recreates it and resets the now-false UI to idle instead of syncing.
 * Otherwise skips the track update when the active mediaId is unchanged or
 * a stream request is pending (optimistic song), and leaves status alone
 * while the store is in error — or while a job is resolving, unless the
 * native side reports an error (highest priority, as in PlaybackSync).
 * Idempotent. Never throws.
 */
export async function syncPlayerFromNative(): Promise<void> {
  try {
    const { usePlaybackStore } = await import("../store/usePlaybackStore");

    // ── Dead native player ─────────────────────────────────
    // recreatePlayer() destroys + re-runs setup and resets the isSetup
    // guard. No stop/clear first: native is already gone. Lazy import —
    // this module runs in the headless service (hard rule 1).
    if (await isNativePlayerDead()) {
      const { recreatePlayer } = await import("./playerSetup");
      const recreated = await recreatePlayer();
      if (!recreated) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await recreatePlayer();
      }
      const deadStore = usePlaybackStore.getState();
      deadStore.clearCurrentSong();
      deadStore.clearStream();
      deadStore.setStatus("idle");
      return;
    }

    // ── Track ──────────────────────────────────────────────
    const activeItem = TrackPlayer.getActiveMediaItem();
    if (activeItem?.mediaId) {
      const state = usePlaybackStore.getState();
      const fullTrack = state.trackMap[activeItem.mediaId];
      // While a stream request is pending the store holds an optimistic song
      // (currentTrack is null): stale native metadata must not overwrite it.
      if (
        !state.pendingJobId &&
        fullTrack?.song &&
        activeItem.mediaId !== state.currentTrack?.mediaId
      ) {
        await syncTrackMetadata(fullTrack);
      }
    }

    // ── Status ─────────────────────────────────────────────
    // Native errors take priority over the pending-job guard — the same
    // contract as the PlaybackSync status effect. A store already in error
    // keeps its (possibly more specific) message and is left alone.
    const { status, pendingJobId } = usePlaybackStore.getState();
    const nextStatus = resolveStoreStatus(
      TrackPlayer.getPlaybackState(),
      TrackPlayer.isPlaying(),
      status,
    );
    if (nextStatus === "error") {
      if (status !== "error") {
        usePlaybackStore.getState().setError("Playback error occurred");
      }
    } else if (nextStatus && status !== "error" && !pendingJobId) {
      usePlaybackStore.getState().setStatus(nextStatus);
    }

    // ── Position & Duration ────────────────────────────────
    const store = usePlaybackStore.getState();
    const { position, duration } = TrackPlayer.getProgress();
    if (position >= 0 && store.position !== position) {
      store.setPosition(position);
    }
    // Ignore non-positive durations: the native side reports unset/unknown
    // durations as 0 or large negative sentinels.
    if (duration > 0 && store.duration !== duration) {
      store.setDuration(duration);
    }
  } catch (error) {
    console.warn("[nativeSync] syncPlayerFromNative failed:", error);
  }
}
