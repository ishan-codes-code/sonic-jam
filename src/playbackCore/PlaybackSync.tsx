import { useEffect } from 'react';
import { usePlaybackState, useProgress, State, default as TrackPlayer, Event } from 'react-native-track-player';
import { usePlaybackStore } from './usePlaybackStore';
import { usePlayer } from './usePlayer';
import { extractTrackColors } from '../services/trackColorService';
import { PlayHistoryService } from '../services/playHistoryService';

/**
 * Background component that synchronizes React Native Track Player state
 * with our global Zustand store.
 *
 * Also handles:
 * - Track change → update currentSong & extract artwork colors
 * - Queue extension (radio mode auto-fill)
 *
 * Rendered at the root of the app so sync runs everywhere.
 */
export const PlaybackSync = () => {
    const setPosition = usePlaybackStore(s => s.setPosition);
    const setDuration = usePlaybackStore(s => s.setDuration);
    const setStatus = usePlaybackStore(s => s.setStatus);
    const setError = usePlaybackStore(s => s.setError);

    const { state: rnkpState } = usePlaybackState();
    const { position, duration } = useProgress(1000);

    // ── Position & Duration ──────────────────────────────────────
    useEffect(() => {
        setPosition(position);
    }, [position, setPosition]);

    useEffect(() => {
        setDuration(duration);
    }, [duration, setDuration]);

    // ── Playback Status ──────────────────────────────────────────
    useEffect(() => {
        if (rnkpState === undefined) return;

        switch (rnkpState) {
            case State.Playing:
                setStatus('playing');
                break;
            case State.Paused:
                setStatus('paused');
                break;
            case State.Stopped:
                setStatus('stopped');
                break;
            case State.Error:
                setError('Playback error occurred');
                break;
            default:
                break;
        }
    }, [rnkpState, setStatus, setError]);

    // ── Track Change → Sync metadata + Extract colors ────────────
    const { extendQueue } = usePlayer();

    useEffect(() => {
        const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event: any) => {
            if (event.track) {
                const store = usePlaybackStore.getState();
                let track = event.track;

                // Resolve ONLY if placeholder
                if (!track.url || track.url.startsWith('placeholder://')) {
                    try {
                        const { resolveStream } = await import('./playbackApi');

                        const { streamUrl, streamUrlExpiresAt } = await resolveStream({
                            songId: track.song.id,
                        });

                        const currentIndex = await TrackPlayer.getActiveTrackIndex();
                        if (currentIndex !== event.index) {
                            // User skipped away while we were loading
                            return;
                        }

                        // Note: RNTP natively ignores URL mutations via `updateMetadataForTrack`.
                        // We must swap the track seamlessly: Add after -> Skip to it -> Remove placeholder
                        const updatedTrack = {
                            ...track,
                            url: streamUrl,
                            streamUrlExpiresAt,
                        };

                        await TrackPlayer.add(updatedTrack, event.index + 1);
                        await TrackPlayer.skip(event.index + 1);
                        await TrackPlayer.remove(event.index);
                        
                        store.notifyQueueUpdate();

                        const { state } = await TrackPlayer.getPlaybackState();
                        if (state !== State.Playing && state !== State.Paused) {
                            await TrackPlayer.play();
                        }

                        // The skip operation emits a new event for the resolved track. Abort here.
                        return;

                    } catch (error) {
                        console.error('[PlaybackSync] resolve failed', error);
                        return;
                    }
                }

                // Reset smart queue pointer on track change
                store.setManualInsertIndex(null);

                // Sync store and history
                if (track.song) {
                    store.setCurrentSong(track.song, track);
                    void PlayHistoryService.addToHistory(track.song);

                    if (track.url) {
                        store.setStream(
                            track.url,
                            track.streamUrlExpiresAt || (Date.now() + 300000)
                        );
                    }
                }

                // Extract colors
                const artworkUri = track.artwork ?? track.song?.image ?? undefined;
                extractTrackColors(artworkUri).then((colors) => {
                    usePlaybackStore.getState().setTrackColors(colors);
                });

                // Auto-fill logic
                if (store.queueType === 'radio') {
                    extendQueue();
                }
            }
        });

        return () => sub.remove();
    }, [extendQueue]);

    return null;
};
