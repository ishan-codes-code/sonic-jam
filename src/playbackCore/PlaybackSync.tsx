import { useEffect } from 'react';
import { usePlaybackState, useProgress, State, default as TrackPlayer, Event } from 'react-native-track-player';
import { usePlaybackStore } from './usePlaybackStore';
import { isStreamExpired } from './playbackApi';
import { extractTrackColors } from '../services/trackColorService';
import { PlayHistoryService } from '../services/playHistoryService';

/**
 * Background component that synchronizes React Native Track Player state
 * with our global Zustand store.
 *
 * Also handles:
 * - Track change → update currentSong & extract artwork colors
 *
 * Queue extension (radio mode auto-fill) is handled by trackPlayerService
 * so it runs in background regardless of component lifecycle.
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
        if (usePlaybackStore.getState().position !== position) {
            setPosition(position);
        }
    }, [position, setPosition]);

    useEffect(() => {
        if (usePlaybackStore.getState().duration !== duration) {
            setDuration(duration);
        }
    }, [duration, setDuration]);

    // ── Playback Status ──────────────────────────────────────────
    useEffect(() => {
        if (rnkpState === undefined) return;

        const { status } = usePlaybackStore.getState();

        switch (rnkpState) {
            case State.Playing:
                if (status !== 'playing') setStatus('playing');
                break;
            case State.Paused:
                if (status !== 'paused') setStatus('paused');
                break;
            case State.Stopped:
                if (status !== 'stopped') setStatus('stopped');
                break;
            case State.Error:
                if (status !== 'error') setError('Playback error occurred');
                break;
            default:
                break;
        }
    }, [rnkpState, setStatus, setError]);

    // ── Track Change → Sync metadata + Extract colors ────────────
    useEffect(() => {
        const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event: any) => {
            if (event.track) {
                const store = usePlaybackStore.getState();
                let track = event.track;

                // Resolve if: placeholder URL, missing URL, or stream TTL has expired.
                // This fires for every track activation — auto-advance, skip, remote controls.
                const needsResolve =
                    !track.url ||
                    track.url.startsWith('placeholder://') ||
                    isStreamExpired(track.streamUrlExpiresAt ?? null);

                if (needsResolve) {
                    try {
                        const { resolveStream } = await import('./playbackApi');

                        const { streamUrl, streamUrlExpiresAt } = await resolveStream({
                            songId: track.song.id,
                        });

                        const currentIndex = await TrackPlayer.getActiveTrackIndex();
                        if (currentIndex !== event.index) {
                            // User skipped away while we were resolving
                            return;
                        }

                        // Note: RNTP natively ignores URL mutations via `updateMetadataForTrack`.
                        // We must swap the track seamlessly: Add after → Skip to it → Remove stale
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

                        // The skip operation emits a new event for the refreshed track. Abort here.
                        return;

                    } catch (error) {
                        console.error('[PlaybackSync] resolve/refresh failed', error);
                        
                        // Self-healing: Skip to next track if this one fails to resolve
                        await TrackPlayer.skipToNext().catch(() => {});
                        
                        // Show notification so user knows why it skipped
                        try {
                            const { default: Toast } = await import('react-native-toast-message');
                            Toast.show({
                                type: 'info',
                                text1: 'Skipping unavailable track',
                                text2: 'This song couldn\'t be loaded',
                                position: 'bottom',
                                visibilityTime: 3000,
                            });
                        } catch (tErr) {
                            // ignore toast errors
                        }
                        
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

            }
        });

        return () => sub.remove();
    }, []);

    return null;
};
