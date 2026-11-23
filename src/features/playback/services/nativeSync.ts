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
 * Re-reads the live native player (active item, play state, progress) into
 * the store. Skips the track update when the active mediaId is unchanged and
 * leaves status alone while the store is in error or a job is resolving.
 * Idempotent. Never throws.
 */
export async function syncPlayerFromNative(): Promise<void> {
  try {
    const { usePlaybackStore } = await import("../store/usePlaybackStore");

    // ── Track ──────────────────────────────────────────────
    const activeItem = TrackPlayer.getActiveMediaItem();
    if (activeItem?.mediaId) {
      const state = usePlaybackStore.getState();
      const fullTrack = state.trackMap[activeItem.mediaId];
      if (fullTrack?.song && activeItem.mediaId !== state.currentTrack?.mediaId) {
        await syncTrackMetadata(fullTrack);
      }
    }

    // ── Status ─────────────────────────────────────────────
    const { status, pendingJobId } = usePlaybackStore.getState();
    if (status !== "error" && !pendingJobId) {
      const store = usePlaybackStore.getState();
      const next = resolveStoreStatus(
        TrackPlayer.getPlaybackState(),
        TrackPlayer.isPlaying(),
        status,
      );
      if (next === "error") {
        store.setError("Playback error occurred");
      } else if (next) {
        store.setStatus(next);
      }
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
