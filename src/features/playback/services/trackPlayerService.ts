import TrackPlayer, {
  BackgroundEvent,
  Event,
  MediaItemTransitionEvent,
  PlaybackState,
} from "@rntp/player";
import { RepeatManager } from "./repeatManager";
import { handleSmartQueueMediaTransition } from "./smartQueueService";

// This file MUST be a separate module registered with RNTP.
// It runs in a background thread and handles remote control events
// (lock screen, headphones, notification controls).

export async function PlaybackService(event: BackgroundEvent) {
  switch (event.type) {
    case Event.RemotePlay:
      TrackPlayer.play();
      break;
    case Event.RemotePause:
      TrackPlayer.pause();
      break;
    case Event.RemoteNext:
      TrackPlayer.skipToNext();
      break;
    case Event.RemotePrevious:
      TrackPlayer.skipToPrevious();
      break;

    case Event.RemoteSeek:
      TrackPlayer.seekTo(event.position);
      break;

    case Event.MediaItemTransition:
      await handleMediaItemTransition(event);
      break;

    case Event.PlaybackStateChanged:
      if (event.state === PlaybackState.Ended) {
        await RepeatManager.handlePlaybackEnd();
      }
      break;

    case Event.PlaybackError:
      console.error("[TrackPlayerService] Playback error:", event);
      break;

    case Event.SleepTimerTriggered as any:
      try {
        const { usePlaybackStore } = await import("../store/usePlaybackStore");
        usePlaybackStore.getState().setSleepTimer(null);
      } catch (error) {
        console.error("[TrackPlayerService] Failed to clear sleep timer on trigger:", error);
      }
      break;
  }
}

async function handleMediaItemTransition(event: MediaItemTransitionEvent) {
  const index = event.index;
  if (index === undefined || index === null) return;

  try {
    const { usePlaybackStore } = await import("../store/usePlaybackStore");
    const store = usePlaybackStore.getState();

    // Handle custom repeat logic
    // Since v5 doesn't provide a 'reason' in the event type, we call it
    // handlePlaybackEnd will check the repeatMode
    await RepeatManager.handlePlaybackEnd();

    // RNTP v5 strips custom properties.
    // We recover the full track (and Song) from our zustand trackMap.
    if (event.item && event.item.mediaId) {
      const track = store.trackMap[event.item.mediaId];
      if (track && track.song) {
        store.setCurrentSong(track.song, track);
      }
    }

    await handleSmartQueueMediaTransition();
  } catch (error) {
    console.error("[TrackPlayerService] Failed to sync track change:", error);
  }
}
