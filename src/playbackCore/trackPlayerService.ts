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
        const triggerAutoFill = async () => {
            if ((globalThis as any).__sonicIsExtending) return;
            (globalThis as any).__sonicIsExtending = true;

            try {
                while (true) {
                    const { usePlaybackStore } = await import('./usePlaybackStore');
                    const store = usePlaybackStore.getState();

                    if (store.queueType !== 'radio') break;
                    if (!store.currentSong) break;

                    const queue = await TrackPlayer.getQueue();
                    const activeIndex = await TrackPlayer.getActiveTrackIndex();
                    const remaining = queue.length - ((activeIndex ?? 0) + 1);

                    // If we have enough tracks, stop filling
                    if (remaining >= 3) break;

                    const { getRecommendations } = await import('../services/recommendationService');
                    const recs = await getRecommendations({
                        title: store.currentSong.trackName,
                        artists: store.currentSong.artists || [],
                        limit: 20,
                    });

                    if (!recs || recs.length === 0) break;

                    let addedCount = 0;
                    const currentQueue = await TrackPlayer.getQueue();

                    const uniqueRecs = recs.filter((rec) => {
                        if (!rec.title || !rec.artist) return false;
                        return !currentQueue.some((t) => {
                            const tTitle = (t.title || '').trim().toLowerCase();
                            const tArtist = (t.artist || '').trim().toLowerCase();
                            const rTitle = rec.title.trim().toLowerCase();
                            const rArtist = rec.artist.trim().toLowerCase();
                            return tTitle === rTitle && tArtist === rArtist;
                        });
                    }).slice(0, 5);

                    for (const rec of uniqueRecs) {
                        try {
                            const { resolveStream } = await import('./playbackApi');
                            const { streamUrl, streamUrlExpiresAt, song } = await resolveStream({
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
                            addedCount++;
                            
                            // Notify immediately so UI updates while next track resolves
                            store.notifyQueueUpdate();

                            // Rate limit protection
                            await new Promise((r) => setTimeout(r, 800));
                        } catch (err) {
                            console.error('[TrackPlayerService] Failed to resolve recommended track:', err);
                        }
                    }

                    // If no tracks were added (duplicates or errors), break to prevent infinite loop
                    if (addedCount === 0) break;
                }
            } catch (err) {
                console.error('[TrackPlayerService] background extendQueue error:', err);
            } finally {
                (globalThis as any).__sonicIsExtending = false;
            }
        };

        triggerAutoFill();
    });

    TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
        console.error('[TrackPlayerService] Playback error:', event);
        // future: dispatch error to Zustand store from here
    });
}