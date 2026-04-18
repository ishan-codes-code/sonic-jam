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

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        try {
            await TrackPlayer.skipToPrevious();
        } catch (e) {
            await TrackPlayer.seekTo(0);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteJumpForward, () => {
        TrackPlayer.skipToNext();
    });

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, () => {
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

        // ── Background Queue Auto-fill ─────────────────────────────
        // Only extend in radio mode. Playlist mode manages its own queue.
        try {
            const { usePlaybackStore } = await import('./usePlaybackStore');
            const store = usePlaybackStore.getState();

            if (store.queueType !== 'radio') return;
            if (!store.currentSong) return;

            // Check how many tracks remain after the active track
            const queue = await TrackPlayer.getQueue();
            const activeIndex = await TrackPlayer.getActiveTrackIndex();
            const remaining = queue.length - ((activeIndex ?? 0) + 1);

            // Only fill if fewer than 3 tracks remain ahead
            if (remaining >= 3) return;

            // Guard against concurrent fills
            if ((globalThis as any).__sonicIsExtending) return;
            (globalThis as any).__sonicIsExtending = true;

            try {
                const { getRecommendations } = await import(
                    '../services/recommendationService'
                );

                const recs = await getRecommendations({
                    title: store.currentSong.trackName,
                    artists: store.currentSong.artists || [],
                    limit: 5,
                });

                const currentQueue = await TrackPlayer.getQueue();

                for (const rec of recs) {
                    if (!rec.title || !rec.artist) continue;

                    const alreadyInQueue = currentQueue.some((t) => {
                        const tTitle = (t.title || '').trim().toLowerCase();
                        const tArtist = (t.artist || '').trim().toLowerCase();
                        const rTitle = rec.title.trim().toLowerCase();
                        const rArtist = rec.artist.trim().toLowerCase();
                        return tTitle === rTitle && tArtist === rArtist;
                    });

                    if (alreadyInQueue) continue;

                    // Import resolveStream fresh each time (background-safe)
                    const { resolveStream } = await import('./playbackApi');
                    const { streamUrl, streamUrlExpiresAt, song } =
                        await resolveStream({
                            trackName: rec.title,
                            artistName: rec.artist,
                        });

                    const track = {
                        url: streamUrl,
                        title: song.trackName,
                        artist: song.artists?.map((a: any) => a.name).join(', '),
                        artwork: song.image ?? undefined,
                        duration: song.duration,
                        songId: song.id,
                        song,
                        streamUrlExpiresAt,
                    };

                    await TrackPlayer.add(track as any);

                    // Rate limit protection — 800ms between each enqueue
                    await new Promise((r) => setTimeout(r, 800));
                }

                store.notifyQueueUpdate();
            } finally {
                (globalThis as any).__sonicIsExtending = false;
            }
        } catch (err) {
            console.error('[TrackPlayerService] background extendQueue error:', err);
            (globalThis as any).__sonicIsExtending = false;
        }
    });

    TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
        console.error('[TrackPlayerService] Playback error:', event);
        // future: dispatch error to Zustand store from here
    });
}