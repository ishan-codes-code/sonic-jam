import TrackPlayer, { Event, State, usePlaybackState, useProgress } from 'react-native-track-player';
import { useCallback, useEffect, useRef } from 'react';
import { setupPlayer } from './playerSetup';
import { resolveStream, isStreamExpired } from './playbackApi';
import { usePlaybackStore } from './usePlaybackStore';
import { useJobStore } from './useJobStore';
import type { PlaySongDto, PlaybackTrack, Song } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SHUFFLE_STORAGE_KEY = '@sonic_is_shuffling';

// Fisher-Yates Shuffle Algorithm
function shuffleArray<T>(array: T[]): T[] {
    const fresh = [...array];
    for (let i = fresh.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
    }
    return fresh;
}

const isExtendingRef = { current: false };

export function usePlayer() {
    const isSettingUp = useRef(false);

    // ── Helper: Get Store ───────────────────────────────────────
    const getStore = () => usePlaybackStore.getState();

    // ── Persistence: Load Shuffle State ──────────────────────────
    useEffect(() => {
        const loadShuffle = async () => {
            try {
                const stored = await AsyncStorage.getItem(SHUFFLE_STORAGE_KEY);
                if (stored !== null) {
                    getStore().setShuffling(JSON.parse(stored));
                }
            } catch (e) {
                console.error('[usePlayer] Failed to load shuffle state', e);
            }
        };
        loadShuffle();
    }, []);

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
            
            store.notifyQueueUpdate();

            return track;
        } catch (error: any) {
            if (!options?.silent) {
                console.error('[usePlayer] enqueue error:', error);
                store.setError(error?.message ?? 'Failed to add track');
            }
            return undefined;
        }
    }, [ensureSetup]);

    // ── Shuffle Logic ─────────────────────────────────────────────
    const toggleShuffle = useCallback(async () => {
        const store = getStore();
        
        // Guard: Only for playlists
        if (store.queueType !== 'playlist') return;

        const nextShuffling = !store.isShuffling;
        
        try {
            const currentQueue = await TrackPlayer.getQueue() as PlaybackTrack[];
            const activeIndex = await TrackPlayer.getActiveTrackIndex();
            
            if (activeIndex === undefined || activeIndex === null) return;
            const currentTrack = currentQueue[activeIndex];

            if (nextShuffling) {
                // TURN ON SHUFFLE
                store.setOriginalQueue(currentQueue);
                
                // 1. Prepare shuffled array of everything EXCEPT the current track
                const others = currentQueue.filter((_, i) => i !== activeIndex);
                const shuffled = shuffleArray(others);
                
                // 2. Batch remove all OTHER tracks
                // Identifying all indices except activeIndex
                const indicesToRemove = currentQueue
                    .map((_, i) => i)
                    .filter(i => i !== activeIndex);
                
                if (indicesToRemove.length > 0) {
                    await TrackPlayer.remove(indicesToRemove);
                }
                
                // Now currentTrack is at index 0
                // 3. Append shuffled tracks
                await TrackPlayer.add(shuffled as any);
                
            } else {
                // TURN OFF SHUFFLE
                const original = store.originalQueue;
                if (original.length > 0) {
                    const originalIdx = original.findIndex(t => t.songId === currentTrack.songId);
                    
                    if (originalIdx !== -1) {
                        const before = original.slice(0, originalIdx);
                        const after = original.slice(originalIdx + 1);
                        
                        const nativeIdx = await TrackPlayer.getActiveTrackIndex() ?? 0;
                        const nativeQueue = await TrackPlayer.getQueue();

                        // 1. Batch remove everything except current
                        const indicesToRemove = nativeQueue
                            .map((_, i) => i)
                            .filter(i => i !== nativeIdx);

                        if (indicesToRemove.length > 0) {
                            await TrackPlayer.remove(indicesToRemove);
                        }

                        // Current track is at index 0 now
                        // 2. Re-insert original 'before' tracks at index 0 (pushes current track down)
                        if (before.length > 0) await TrackPlayer.add(before as any, 0);
                        
                        // 3. Append original 'after' tracks at the end
                        if (after.length > 0) await TrackPlayer.add(after as any);
                    }
                }
            }

            store.setShuffling(nextShuffling);
            await AsyncStorage.setItem(SHUFFLE_STORAGE_KEY, JSON.stringify(nextShuffling));
            store.notifyQueueUpdate();

        } catch (error) {
            console.error('[usePlayer] toggleShuffle error:', error);
        }
    }, []);

    const shufflePlay = useCallback(async (songs: Song[], playlistId: string) => {
        const store = getStore();
        try {
            store.setStatus('loading');
            store.setQueueType('playlist');
            store.setPlaylistMeta({ playlistId, total: songs.length });

            const shuffledSongs = shuffleArray(songs);
            
            await ensureSetup();
            await TrackPlayer.reset();

            // 1. Resolve first track of the shuffled set
            const startSong = shuffledSongs[0];
            const { streamUrl, streamUrlExpiresAt, song: resolvedStartSong } = await resolveStream({ songId: startSong.id });

            // 2. Prepare the Shuffled Queue
            const shuffledTracks = shuffledSongs.map((song, index) => {
                const isStartItem = index === 0;
                return {
                    url: isStartItem ? streamUrl : 'placeholder://pending',
                    title: song.trackName,
                    artist: song.artistName,
                    artwork: song.image ?? undefined,
                    duration: song.duration,
                    songId: song.id,
                    song,
                    streamUrlExpiresAt: isStartItem ? streamUrlExpiresAt : undefined,
                } as PlaybackTrack;
            });

            // 3. Prepare the Original Queue (so we can un-shuffle later)
            const originalTracks = songs.map((song) => {
                // Check if this song was the one we just resolved to avoid double-resolving later
                const isStartItem = song.id === startSong.id;
                return {
                    url: isStartItem ? streamUrl : 'placeholder://pending',
                    title: song.trackName,
                    artist: song.artistName,
                    artwork: song.image ?? undefined,
                    duration: song.duration,
                    songId: song.id,
                    song,
                    streamUrlExpiresAt: isStartItem ? streamUrlExpiresAt : undefined,
                } as PlaybackTrack;
            });

            await TrackPlayer.add(shuffledTracks as any);
            await TrackPlayer.play();

            store.setShuffling(true);
            store.setOriginalQueue(originalTracks);
            await AsyncStorage.setItem(SHUFFLE_STORAGE_KEY, JSON.stringify(true));
            
            store.setCurrentSong(resolvedStartSong, shuffledTracks[0]);
            store.setStream(streamUrl, streamUrlExpiresAt);
            store.notifyQueueUpdate();

        } catch (error) {
            console.error('[usePlayer] shufflePlay error:', error);
            store.setError('Failed to shuffle play');
        }
    }, [ensureSetup]);


    // ── Queue: Play Next ───────────────────────────────────────────
    const playNext = useCallback(async (payload: PlaySongDto) => {
        const store = getStore();

        try {
            const ok = await ensureSetup();
            if (!ok) {
                store.setError('Player setup failed');
                return;
            }

            const { streamUrl, streamUrlExpiresAt, song } = await resolveStream(payload);

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

            const currentIndex = await TrackPlayer.getActiveTrackIndex();

            if (currentIndex === null || currentIndex === undefined) {
                await TrackPlayer.add(track);
                await TrackPlayer.play();
                return;
            }

            // Always insert immediately after current track
            await TrackPlayer.add(track, currentIndex + 1);

            // Shift the smart pointer up if it was tracing, so subsequent adds don't overwrite this!
            if (store.manualInsertIndex !== null) {
                store.setManualInsertIndex(store.manualInsertIndex + 1);
            }

            store.notifyQueueUpdate();

        } catch (error: any) {
            console.error('[usePlayer] playNext error:', error);
            store.setError(error?.message ?? 'Failed to play next');
        }
    }, [ensureSetup]);

    // ── Queue: Add to Queue (Smart Add) ────────────────────────────
    const addToQueue = useCallback(async (payload: PlaySongDto) => {
        const store = getStore();

        try {
            const ok = await ensureSetup();
            if (!ok) {
                store.setError('Player setup failed');
                return;
            }

            const { streamUrl, streamUrlExpiresAt, song } = await resolveStream(payload);

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

            const currentIndex = await TrackPlayer.getActiveTrackIndex();

            if (currentIndex === null || currentIndex === undefined) {
                await TrackPlayer.add(track);
                await TrackPlayer.play();
                return;
            }

            let insertIndex: number;

            if (store.manualInsertIndex === null) {
                // First manual add after track boundary begins trailing the active track
                insertIndex = currentIndex + 1;
            } else {
                // Subsequent adds append smoothly sequentially
                insertIndex = store.manualInsertIndex + 1;
            }

            await TrackPlayer.add(track, insertIndex);
            
            // Advance sequential pointer
            store.setManualInsertIndex(insertIndex);

            store.notifyQueueUpdate();

        } catch (error: any) {
            console.error('[usePlayer] addToQueue error:', error);
            store.setError(error?.message ?? 'Failed to add to queue');
        }
    }, [ensureSetup]);

    // ── Queue: Remove from Queue ──────────────────────────────────
    const removeFromQueue = useCallback(async (index: number) => {
        try {
            const queue = await TrackPlayer.getQueue();
            if (index < 0 || index >= queue.length) return;
            
            await TrackPlayer.remove(index);
            getStore().notifyQueueUpdate();
        } catch (error) {
            console.error('[usePlayer] removeFromQueue error:', error);
        }
    }, []);

    // ── Extended: Auto-fill ────────────────────────────────────────
    const extendQueue = useCallback(async () => {
        const store = getStore();
        if (store.queueType === 'playlist') {
            return;
        }

        if (isExtendingRef.current) return;
        
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
                store.notifyQueueUpdate();
            }
        } catch (error) {
            console.error('[usePlayer] ❌ extendQueue error:', error);
        } finally {
            isExtendingRef.current = false;
        }
    }, [enqueue]);

    // ── Core: Play ───────────────────────────────────────────────
    const play = useCallback(async (payload: PlaySongDto, options?: { preserveQueue?: boolean }): Promise<PlaybackTrack | undefined> => {
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

            // Fresh start: Clear queue and add new track if not preserving queue
            if (!options?.preserveQueue) {
                store.setQueueType('radio');
                store.clearPlaylistMeta();
                store.setShuffling(false);
                await AsyncStorage.setItem(SHUFFLE_STORAGE_KEY, JSON.stringify(false));
                await TrackPlayer.reset();
            } else if (store.queueType !== 'playlist') {
                store.setQueueType('manual');
            }
            const track = await enqueue(payload);
            
            if (track) {
                await TrackPlayer.play();
                extendQueue();
                store.notifyQueueUpdate();
            }

            return track;

        } catch (error: any) {
            console.error('[usePlayer] play error:', error);
            store.setError(error?.message ?? 'Failed to play song');
            return undefined;
        }
    }, [ensureSetup, enqueue, extendQueue]);

    // ── Playlist: Play ───────────────────────────────────────────
    const playPlaylist = useCallback(async (
        songs: Song[],
        startIndex: number,
        playlistId: string
    ) => {
        const store = getStore();

        try {
            store.setStatus('loading');
            store.setQueueType('playlist');
            store.setShuffling(false);
            await AsyncStorage.setItem(SHUFFLE_STORAGE_KEY, JSON.stringify(false));
            store.setPlaylistMeta({
                playlistId,
                total: songs.length,
            });

            await ensureSetup();
            await TrackPlayer.reset();

            // 1. Resolve the specific track we want to start with
            const startSong = songs[startIndex];
            const { streamUrl, streamUrlExpiresAt, song: resolvedStartSong } = await resolveStream({ songId: startSong.id });

            // 2. Prepare the full queue
            const tracks = songs.map((song, index) => {
                const isStartItem = index === startIndex;
                
                return {
                    id: song.id,
                    url: isStartItem ? streamUrl : 'placeholder://pending',
                    title: song.trackName,
                    artist: song.artistName,
                    artwork: song.image ?? undefined,
                    duration: song.duration,
                    songId: song.id,
                    song,
                    streamUrlExpiresAt: isStartItem ? streamUrlExpiresAt : undefined,
                };
            });

            // 3. Populate queue and jump to start
            await TrackPlayer.add(tracks as any);
            await TrackPlayer.skip(startIndex);
            const { state } = await TrackPlayer.getPlaybackState();
            if (state !== State.Playing) {
                await TrackPlayer.play();
            }

            // 4. Update store state
            store.setCurrentSong(resolvedStartSong, tracks[startIndex] as any);
            store.setStream(streamUrl, streamUrlExpiresAt);
            store.notifyQueueUpdate();

        } catch (error) {
            console.error('[playPlaylist]', error);
            store.setError('Failed to play playlist');
        }
    }, [ensureSetup]);

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
        playPlaylist,
        enqueue,
        playNext,
        addToQueue,
        removeFromQueue,
        extendQueue,
        pause,
        resume,
        seek,
        stop,
        skipToNext,
        skipToPrevious,
        toggleShuffle,
        shufflePlay,
    };
}