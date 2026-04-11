import TrackPlayer, { Event, State, usePlaybackState, useProgress } from 'react-native-track-player';
import { useCallback, useEffect, useRef } from 'react';
import { setupPlayer } from './playerSetup';
import { resolveStream, isStreamExpired } from './playbackApi';
import { usePlaybackStore } from './usePlaybackStore';
import { useJobStore } from './useJobStore';
import type { PlaySongDto, PlaybackTrack } from './types';

const isExtendingRef = { current: false };

export function usePlayer() {
    const isSettingUp = useRef(false);

    // ── Helper: Get Store ───────────────────────────────────────
    const getStore = () => usePlaybackStore.getState();

    // ── Setup ────────────────────────────────────────────────────
    const ensureSetup = useCallback(async (): Promise<boolean> => {
        if (isSettingUp.current) return false;
        try {
            isSettingUp.current = true;
            const ok = await setupPlayer();
            return ok;
        } finally {
            isSettingUp.current = false;
        }
    }, []);

    // ── Core: Enqueue ──────────────────────────────────────────────
    const enqueue = useCallback(async (payload: PlaySongDto, options?: { silent?: boolean }): Promise<PlaybackTrack | undefined> => {
        const store = getStore();
        try {
            const ok = await ensureSetup();
            if (!ok) {
                if (!options?.silent) store.setError('Player setup failed');
                return undefined;
            }

            // Optional: Duplicate check in current queue
            const currentQueue = await TrackPlayer.getQueue();
            const isDuplicate = currentQueue.some(t => {
                if ('songId' in payload) return (t as any).songId === payload.songId;
                return t.title === payload.trackName && t.artist === payload.artistName;
            });

            if (isDuplicate) {
                // Spotify allows duplicates
            }

            // Fresh fetch
            const { streamUrl, streamUrlExpiresAt, song } = await resolveStream(payload, {
                onJob: (jobId) => {
                    const songMeta = 'trackName' in payload ? { 
                        trackName: payload.trackName, 
                        artistName: payload.artistName 
                    } : undefined;

                    useJobStore.getState().addJob(jobId, { song: songMeta as any });
                    
                    import('react-native-toast-message').then(({ default: Toast }) => {
                        Toast.show({
                            type: 'info',
                            text1: 'Preparing your track...',
                            text2: 'Processing in background',
                            onPress: () => {
                                import('expo-router').then(({ router }) => {
                                    router.push('/processing' as any);
                                });
                                Toast.hide();
                            },
                        });
                    });
                }
            });

            const track: PlaybackTrack = {
                url: streamUrl,
                title: song.trackName,
                artist: song.artistName,
                artwork: song.image ?? undefined,
                duration: song.duration,
                songId: song.id,
                song,
                streamUrlExpiresAt,
            } as any;

            await TrackPlayer.add(track);
            
            if ((await TrackPlayer.getQueue()).length === 1) {
                store.setCurrentSong(song, track);
                store.setStream(streamUrl, streamUrlExpiresAt);
            }

            return track;
        } catch (error: any) {
            if (!options?.silent) {
                console.error('[usePlayer] enqueue error:', error);
                store.setError(error?.message ?? 'Failed to add track');
            }
            return undefined;
        }
    }, [ensureSetup]);

    // ── Extended: Auto-fill ────────────────────────────────────────
    const extendQueue = useCallback(async () => {
        if (isExtendingRef.current) return;
        
        const store = getStore();
        if (!store.currentSong) return;

        try {
            isExtendingRef.current = true;
            const queue = await TrackPlayer.getQueue();
            const activeIndex = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
            
            console.log(`[usePlayer] 🔄 Checking extension (Queue: ${queue.length}, Active: ${activeIndex})`);

            // Increase threshold to 3 tracks remaining to be more proactive
            if (queue.length - activeIndex <= 3) {
                console.log(`[usePlayer] 🚀 Fetching recommendations based on: ${store.currentSong.trackName} by ${store.currentSong.artistName}...`);
                const { getRecommendations } = await import('../services/recommendationService');
                const recommendations = await getRecommendations({
                    title: store.currentSong.trackName,
                    artist: store.currentSong.artistName,
                    limit: 5,
                });

                console.log(`[usePlayer] ✨ Got ${recommendations.length} recommendations`);

                for (const rec of recommendations) {
                    if (!rec.title || !rec.artist) {
                        console.log(`[usePlayer] ⚠️ Skipping rec due to missing metadata: ${rec.title}`);
                        continue;
                    }

                    // Case-insensitive, trimmed comparison
                    const alreadyInQueue = queue.some(t => {
                        const tTitle = (t.title || '').trim().toLowerCase();
                        const tArtist = (t.artist || '').trim().toLowerCase();
                        const rTitle = rec.title.trim().toLowerCase();
                        const rArtist = rec.artist.trim().toLowerCase();
                        return tTitle === rTitle && tArtist === rArtist;
                    });
                    
                    if (!alreadyInQueue) {
                        console.log(`[usePlayer] ➕ Enqueueing: ${rec.title} by ${rec.artist}`);
                        await enqueue({
                            trackName: rec.title,
                            artistName: rec.artist,
                        }, { silent: true });

                        // Small delay to avoid 429 (Rate Limiting) from aggressive filling
                        await new Promise(r => setTimeout(r, 800));
                    } else {
                        console.log(`[usePlayer] ⏭️ Skipping duplicate: ${rec.title}`);
                    }
                }
            }
        } catch (error) {
            console.error('[usePlayer] ❌ extendQueue error:', error);
        } finally {
            isExtendingRef.current = false;
        }
    }, [enqueue]);

    // ── Core: Play ───────────────────────────────────────────────
    const play = useCallback(async (payload: PlaySongDto): Promise<PlaybackTrack | undefined> => {
        const store = getStore();
        try {
            store.setStatus('loading');

            const ok = await ensureSetup();
            if (!ok) {
                store.setError('Player setup failed');
                return undefined;
            }

            const isSameSong =
                'songId' in payload
                    ? store.currentSong?.id === payload.songId
                    : store.currentSong?.trackName === payload.trackName &&
                    store.currentSong?.artistName === payload.artistName;

            if (isSameSong && !isStreamExpired(store.streamUrlExpiresAt)) {
                const { state } = await TrackPlayer.getPlaybackState();
                if (state !== State.Playing) {
                    await TrackPlayer.play();
                }
                return store.currentTrack ?? undefined;
            }

            // Fresh start: Clear queue and add new track
            await TrackPlayer.reset();
            const track = await enqueue(payload);
            
            if (track) {
                await TrackPlayer.play();
                extendQueue();
            }

            return track;

        } catch (error: any) {
            console.error('[usePlayer] play error:', error);
            store.setError(error?.message ?? 'Failed to play song');
            return undefined;
        }
    }, [ensureSetup, enqueue, extendQueue]);

    // ── Actions ──────────────────────────────────────────────────
    const pause = useCallback(async () => {
        try { await TrackPlayer.pause(); } catch (e) {}
    }, []);

    const resume = useCallback(async () => {
        const store = getStore();
        try {
            if (isStreamExpired(store.streamUrlExpiresAt) && store.currentSong) {
                await TrackPlayer.reset();
                const track = await enqueue({ songId: store.currentSong.id });
                if (track) await TrackPlayer.play();
            } else {
                await TrackPlayer.play();
            }
        } catch (e) {}
    }, [enqueue]);

    const seek = useCallback(async (seconds: number) => {
        try { await TrackPlayer.seekTo(seconds); } catch (e) {}
    }, []);

    const stop = useCallback(async () => {
        try {
            await TrackPlayer.reset();
            getStore().reset();
        } catch (e) {}
    }, []);

    const skipToNext = useCallback(async () => {
        try { await TrackPlayer.skipToNext(); } catch (e) {}
    }, []);

    const skipToPrevious = useCallback(async () => {
        try { await TrackPlayer.skipToPrevious(); } catch (e) {}
    }, []);

    return {
        play,
        enqueue,
        extendQueue,
        pause,
        resume,
        seek,
        stop,
        skipToNext,
        skipToPrevious,
    };
}