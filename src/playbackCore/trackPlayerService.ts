import TrackPlayer, { Event } from 'react-native-track-player';

// This file MUST be a separate module registered with RNTP.
// It runs in a background thread and handles remote control events
// (lock screen, headphones, notification controls).

export async function PlaybackService() {
    // ── Remote Controls ──────────────────────────────────────────
    // These fire when the user interacts with:
    // - Lock screen media controls
    // - Notification player
    // - Bluetooth headphones / AirPods

    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        TrackPlayer.stop();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        TrackPlayer.skipToNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        TrackPlayer.skipToPrevious();
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        TrackPlayer.seekTo(event.position);
    });

    // ── Playback Events ──────────────────────────────────────────
    // PlaybackActiveTrackChanged fires when the track changes in queue.
    // We don't handle queue navigation yet, but this is the right
    // place to hook into it later (e.g. auto-play next, scrobbling).

    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
        const index = (event as any).index;
        if (index === undefined || index === null) return;
        
        try {
            const track = await TrackPlayer.getTrack(index) as any;
            if (track && track.song) {
                const { usePlaybackStore } = await import('./usePlaybackStore');
                usePlaybackStore.getState().setCurrentSong(track.song, track);
            }
        } catch (error) {
            console.error('[TrackPlayerService] Failed to sync track change:', error);
        }
    });

    TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
        console.error('[TrackPlayerService] Playback error:', event);
        // future: dispatch error to Zustand store from here
    });
}