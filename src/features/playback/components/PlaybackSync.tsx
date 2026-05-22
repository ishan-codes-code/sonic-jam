import { useEffect, useRef } from 'react';
import { usePlaybackState, useProgress, PlaybackState as State, default as TrackPlayer, Event, useIsPlaying, RepeatMode } from '@rntp/player';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { extractArtworkColors } from '@/features/artwork-colors';
import { PlayHistoryService } from '@/services/playHistoryService';
import { useProgressSyncAuth } from '../hooks/useProgressSyncAuth';
import { useSmartQueue } from '../hooks/useSmartQueue';
import { resolveStream } from '../api/playbackApi';
import { createPlaybackTrack } from '../utils/playbackHelpers';
import type { PlaybackTrack } from '../types';

const recoveryAttempts = new Map<string, { count: number; lastAttempt: number }>();

function canAttemptRecovery(songId: string): boolean {
    const now = Date.now();
    const attempt = recoveryAttempts.get(songId);
    if (!attempt) {
        recoveryAttempts.set(songId, { count: 1, lastAttempt: now });
        return true;
    }

    if (now - attempt.lastAttempt > 30000) {
        // Reset after 30 seconds
        recoveryAttempts.set(songId, { count: 1, lastAttempt: now });
        return true;
    }

    if (attempt.count >= 2) {
        return false;
    }

    attempt.count++;
    attempt.lastAttempt = now;
    return true;
}


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
    // Mount the SmartQueue orchestrator hook globally
    useSmartQueue();

    const setPosition = usePlaybackStore(s => s.setPosition);
    const setDuration = usePlaybackStore(s => s.setDuration);
    const setStatus = usePlaybackStore(s => s.setStatus);
    const setError = usePlaybackStore(s => s.setError);
    const currentTrack = usePlaybackStore(s => s.currentTrack);

    // Keep native background progress sync HTTP headers authenticated
    useProgressSyncAuth();

    const rnkpState = usePlaybackState();
    const isPlaying = useIsPlaying();
    const progress = useProgress(1); // Single poll for store sync
    const { position, duration } = progress;


    // ── Position & Duration ──────────────────────────────────────
    useEffect(() => {
        if (position >= 0 && usePlaybackStore.getState().position !== position) {
            setPosition(position);
        }
    }, [position, setPosition]);

    useEffect(() => {
        // Only update store if duration is a valid positive number
        // (Prevents poisoning the store with native 'unset' values like -9223372036854776)
        if (duration > 0 && usePlaybackStore.getState().duration !== duration) {
            setDuration(duration);
        }
    }, [duration, setDuration]);

    const pendingJobId = usePlaybackStore(s => s.pendingJobId);

    // ── Playback Status ──────────────────────────────────────────
    useEffect(() => {
        if (rnkpState === undefined) return;

        const { status } = usePlaybackStore.getState();

        // 1. Error state is highest priority
        if (rnkpState === State.Error) {
            if (status !== 'error') setError('Playback error occurred');
            return;
        }

        // 2. If a background job is actively resolving, force the UI into loading state.
        // This prevents the native player's "Idle" state (after we call clear()) from 
        // overriding our optimistic loading UI.
        if (pendingJobId) {
            if (status !== 'loading') setStatus('loading');
            return;
        }

        // 3. Normal native state sync
        if (isPlaying) {
            if (status !== 'playing') setStatus('playing');
        } else if (rnkpState === State.Buffering) {
            if (status !== 'loading') setStatus('loading');
        } else if (rnkpState === State.Ended) {
            if (status !== 'stopped') setStatus('stopped');
        } else {
            // Ready/Idle but not playing = Paused
            if (status !== 'paused' && status !== 'idle') setStatus('paused');
        }
    }, [rnkpState, isPlaying, setStatus, setError, pendingJobId]);

    // ── Listeners: Error & State ─────────────────────────────────
    useEffect(() => {
        const errorSub = TrackPlayer.addEventListener(Event.PlaybackError, async (event: any) => {
            console.error('❌ [PlaybackError]', event.code, event.message);

            try {
                const currentIndex = await TrackPlayer.getActiveMediaItemIndex();
                if (currentIndex === null || currentIndex === undefined) return;

                const queue = await TrackPlayer.getQueue();
                const activeItem = queue[currentIndex] as PlaybackTrack;
                if (!activeItem || !activeItem.song || !activeItem.song.id) return;

                const songId = activeItem.song.id;

                // Rate limit recovery to prevent infinite loops
                if (!canAttemptRecovery(songId)) {
                    console.error('[Playback Recovery] Too many recovery attempts for song:', songId);
                    return;
                }

                console.log(`[Playback Recovery] Attempting to recover track: ${activeItem.title} (ID: ${songId})`);

                // 1. Fetch fresh song metadata and playback token from backend
                const resolved = await resolveStream({ songId });
                if (!resolved.playbackToken) {
                    throw new Error("No playback token returned during recovery");
                }

                // 2. Create fresh PlaybackTrack with new playback token & update/reload track
                const newTrack = await createPlaybackTrack(resolved.song, resolved.playbackToken, {
                    isManualAdd: activeItem.isManualAdd,
                });

                // 3. Update the trackMap in store
                const store = usePlaybackStore.getState();
                store.addTrackToMap(newTrack);

                // 4. Record current position before replacing item to resume smoothly
                const progress = await TrackPlayer.getProgress();
                const resumePosition = progress.position;

                // 5. Replace in the TrackPlayer queue
                await TrackPlayer.replaceMediaItem(currentIndex, newTrack);

                // 6. Play to load the new URL
                await TrackPlayer.play();

                // 7. If we had non-zero progress, seek back to it once metadata loads
                if (resumePosition > 0) {
                    let attempts = 0;
                    const pollInterval = 100;
                    const maxAttempts = 30; // 3 seconds timeout
                    while (attempts < maxAttempts) {
                        const currentProgress = await TrackPlayer.getProgress();
                        if (currentProgress.duration > 0) {
                            await TrackPlayer.seekTo(resumePosition);
                            break;
                        }
                        await new Promise((resolve) => setTimeout(resolve, pollInterval));
                        attempts++;
                    }
                }
                console.log(`[Playback Recovery] Successfully recovered track: ${activeItem.title}`);
            } catch (recoveryError) {
                console.error('[Playback Recovery] Recovery process failed:', recoveryError);
            }
        });

        return () => {
            errorSub.remove();
        };
    }, []);

    // ── Sleep Timer Triggered Listener ───────────────────────────
    useEffect(() => {
        const sub = TrackPlayer.addEventListener(Event.SleepTimerTriggered, () => {
            console.log('[PlaybackSync] Sleep timer triggered / completed');
            usePlaybackStore.getState().setSleepTimer(null);
        });

        return () => sub.remove();
    }, []);

    // ── [DEBUG] TrackPlayer State Logger ─────────────────────────
    // useEffect(() => {
    //     const interval = setInterval(async () => {
    //         try {
    //             const [state, progress, activeIndex, queue] = await Promise.all([
    //                 TrackPlayer.getPlaybackState(),
    //                 TrackPlayer.getProgress(),
    //                 TrackPlayer.getActiveMediaItemIndex(),
    //                 TrackPlayer.getQueue(),
    //             ]);
    //             const activeTrack = activeIndex != null ? queue[activeIndex] : null;
    //             console.log('[🎵 DEBUG | TrackPlayer State]', {
    //                 state,
    //                 position: `${progress.position.toFixed(1)}s`,
    //                 duration: `${progress.duration.toFixed(1)}s`,
    //                 buffered: `${progress.buffered.toFixed(1)}s`,
    //                 activeIndex,
    //                 queueLength: queue.length,
    //                 activeTrack: activeTrack
    //                     ? { title: (activeTrack as any).title, id: (activeTrack as any).mediaId }
    //                     : null,
    //             });
    //         } catch (e) {
    //             console.warn('[DEBUG] Failed to read TrackPlayer state:', e);
    //         }
    //     }, 3000);

    //     return () => clearInterval(interval);
    // }, []);

    // ── Track Change → Sync metadata + Extract colors ────────────
    useEffect(() => {
        const sub = TrackPlayer.addEventListener(Event.MediaItemTransition, async (event: any) => {
            console.log('[PlaybackSync] Transition to:', event.index, event.item?.title);

            // Sync repeat mode
            const nativeMode = await TrackPlayer.getRepeatMode();
            const store = usePlaybackStore.getState();
            if (nativeMode === RepeatMode.All) {
                if (store.repeatMode !== 'queue') store.setRepeatMode('queue');
            } else if (nativeMode === RepeatMode.One) {
                if (store.repeatMode !== 'track') store.setRepeatMode('track');
            } else if (nativeMode === RepeatMode.Off) {
                if (store.repeatMode !== 'off') store.setRepeatMode('off');
            }

            const mediaItem = event.item;
            if (mediaItem && mediaItem.mediaId) {
                const store = usePlaybackStore.getState();

                // Recover the full track/song from our map because RNTP strips custom props
                const fullTrack = store.trackMap[mediaItem.mediaId];

                // Reset smart queue pointer on track change
                store.setManualInsertIndex(null);

                if (fullTrack && fullTrack.song) {
                    store.setCurrentSong(fullTrack.song, fullTrack);
                    void PlayHistoryService.addToHistory(fullTrack.song);

                    if (fullTrack.url) {
                        const url = fullTrack.url;
                        const streamUrl = typeof url === 'string'
                            ? url
                            : (typeof url === 'object' ? url.uri : undefined);

                        if (streamUrl) store.setStream(streamUrl);
                    }

                    // Extract colors for the UI
                    const artwork = fullTrack.artworkUrl ?? fullTrack.song?.image;
                    const artworkUri = typeof artwork === 'string'
                        ? artwork
                        : (typeof artwork === 'object' ? artwork.uri : undefined);

                    extractArtworkColors(artworkUri).then((colors) => {
                        usePlaybackStore.getState().setTrackColors({
                            primary: colors.primary,
                            secondary: colors.secondary,
                        });
                    });
                }
            }
        });

        return () => sub.remove();
    }, []);

    return null;
};
