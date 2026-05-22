import TrackPlayer from "@rntp/player";
import { useCallback, useRef } from "react";
import { setupPlayer } from "../services/playerSetup";
import { resolveStream } from "../api/playbackApi";
import { RepeatManager } from "../services/repeatManager";
import {
  ensureSmartQueueActive,
  resetSmartQueueRadio,
} from "../services/smartQueueService";
import { usePlaybackStore } from "../store/usePlaybackStore";
import { useJobStore } from "../store/useJobStore";
import type { PlaySongDto, PlaybackTrack, Song } from "../types";
import {
  getPlaybackUrl,
  createPlaybackTrack,
  syncQueueTokens,
} from "../utils/playbackHelpers";
import { ensureFreshToken } from "@/features/auth/utils/tokenManager";

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
  const enqueue = useCallback(
    async (
      payload: PlaySongDto,
      options?: { silent?: boolean; isManualAdd?: boolean },
    ): Promise<PlaybackTrack | undefined> => {
      const store = getStore();
      try {
        const ok = await ensureSetup();
        if (!ok) {
          if (!options?.silent) store.setError("Player setup failed");
          return undefined;
        }

        // Fresh fetch
        const { song, playbackToken } = await resolveStream(payload, {
          onJob: (jobId) => {
            useJobStore.getState().addJob(jobId, { payload });

            import("react-native-toast-message").then(({ default: Toast }) => {
              Toast.show({
                type: "info",
                text1: "Preparing your track...",
                text2: "Processing in background",
                onPress: () => {
                  import("expo-router").then(({ router }) => {
                    router.push("/processing" as any);
                  });
                  Toast.hide();
                },
              });
            });
          },
        });

        console.log(
          "[usePlayer] Enqueueing track with URL:",
          getPlaybackUrl(song),
        );
        const track = await createPlaybackTrack(song, playbackToken, {
          isManualAdd: options?.isManualAdd ?? false,
        });

        store.addTrackToMap(track);
        await TrackPlayer.addMediaItem(track as any);

        // If queue was empty, sync store immediately
        const queue = await TrackPlayer.getQueue();
        if (queue.length === 1) {
          store.setCurrentSong(song, track);
          store.setDuration(song.duration);
          store.setStream(getPlaybackUrl(song));
        }

        store.notifyQueueUpdate();

        return track;
      } catch (error: any) {
        if (!options?.silent) {
          console.error("[usePlayer] enqueue error:", error);
          store.setError(error?.message ?? "Failed to add track");
        }
        return undefined;
      }
    },
    [ensureSetup],
  );

  // ── Queue: Play Next ───────────────────────────────────────────
  const playNext = useCallback(
    async (payload: PlaySongDto) => {
      const store = getStore();
      try {
        const ok = await ensureSetup();
        if (!ok) {
          store.setError("Player setup failed");
          return;
        }

        const { song, playbackToken } = await resolveStream(payload);
        console.log(
          "[usePlayer] PlayNext track with URL:",
          getPlaybackUrl(song),
        );
        const track = await createPlaybackTrack(song, playbackToken, { isManualAdd: true });

        store.addTrackToMap(track);
        const currentIndex = await TrackPlayer.getActiveMediaItemIndex();

        if (currentIndex === null || currentIndex === undefined) {
          await TrackPlayer.addMediaItem(track as any);
          await TrackPlayer.play();
          return;
        }

        await TrackPlayer.insertMediaItem(currentIndex + 1, track as any);

        if (store.manualInsertIndex !== null) {
          store.setManualInsertIndex(store.manualInsertIndex + 1);
        }

        store.notifyQueueUpdate();
      } catch (error: any) {
        console.error("[usePlayer] playNext error:", error);
        store.setError(error?.message ?? "Failed to play next");
      }
    },
    [ensureSetup],
  );

  // ── Queue: Add to Queue (Smart Add) ────────────────────────────
  const addToQueue = useCallback(
    async (payload: PlaySongDto) => {
      const store = getStore();
      try {
        const ok = await ensureSetup();
        if (!ok) {
          store.setError("Player setup failed");
          return;
        }

        const { song, playbackToken } = await resolveStream(payload);
        console.log(
          "[usePlayer] AddToQueue track with URL:",
          getPlaybackUrl(song),
        );
        const track = await createPlaybackTrack(song, playbackToken, { isManualAdd: true });

        store.addTrackToMap(track);
        const currentIndex = await TrackPlayer.getActiveMediaItemIndex();

        if (currentIndex === null || currentIndex === undefined) {
          await TrackPlayer.addMediaItem(track as any);
          await TrackPlayer.play();
          return;
        }

        let insertIndex =
          store.manualInsertIndex === null
            ? currentIndex + 1
            : store.manualInsertIndex + 1;

        await TrackPlayer.insertMediaItem(insertIndex, track as any);
        store.setManualInsertIndex(insertIndex);
        store.notifyQueueUpdate();
      } catch (error: any) {
        console.error("[usePlayer] addToQueue error:", error);
        store.setError(error?.message ?? "Failed to add to queue");
      }
    },
    [ensureSetup],
  );

  // ── Queue: Remove from Queue ──────────────────────────────────
  const removeFromQueue = useCallback(async (index: number) => {
    try {
      const queue = await TrackPlayer.getQueue();
      if (index < 0 || index >= queue.length) return;

      await TrackPlayer.removeMediaItem(index);
      getStore().notifyQueueUpdate();
    } catch (error) {
      console.error("[usePlayer] removeFromQueue error:", error);
    }
  }, []);

  // ── Extended: Auto-fill ────────────────────────────────────────
  const extendQueue = useCallback(async () => { }, []);

  // ── Core: Play ───────────────────────────────────────────────
  const play = useCallback(
    async (
      payload: PlaySongDto,
      options?: { preserveQueue?: boolean },
    ): Promise<PlaybackTrack | undefined> => {
      const store = getStore();
      try {
        // 1. Instant Optimistic Update
        const optimisticSong: any = {
          id: "songId" in payload ? payload.songId : `temp_${Date.now()}`,
          trackName: "trackName" in payload ? payload.trackName : "Loading...",
          artists:
            "artistName" in payload ? [{ name: payload.artistName }] : [],
          image: "image" in payload ? payload.image : null,
          duration: "duration" in payload ? payload.duration : 0,
        };
        store.setOptimisticSong(optimisticSong);
        store.setPendingJobId("resolving"); // Lock UI into loading state during initial API roundtrip

        const shouldPreserveQueue = options?.preserveQueue ?? true;
        const isPlaylistActive = store.queueType === "playlist" || store.playlistMeta !== null;
        const forceQueueReplacement = !shouldPreserveQueue || isPlaylistActive;

        if (forceQueueReplacement) {
          resetSmartQueueRadio();
          store.setQueueType("radio");
          store.clearPlaylistMeta();
          store.setManualInsertIndex(null);

          // Kill old audio immediately for explicit queue replacement.
          try {
            await TrackPlayer.clear();
          } catch {
            // Player might not be initialized yet, which is fine.
          }
        }

        // 3. Ensure Setup (can be slow)
        const ok = await ensureSetup();
        if (!ok) {
          store.setPendingJobId(null);
          store.setError("Player setup failed");
          return undefined;
        }

        if (forceQueueReplacement) {
          store.clearPlaylistMeta();
        }

        // 3. Background Fetch (silent)
        const { song, playbackToken } = await resolveStream(payload, {
          onJob: (jobId) => {
            useJobStore.getState().addJob(jobId, { payload });
            store.setPendingJobId(jobId);

            import("react-native-toast-message").then(({ default: Toast }) => {
              Toast.show({
                type: "info",
                text1: "Whoops, we don't have this one.",
                text2: "Magically resolving the audio stream for you...",
                visibilityTime: 4000,
              });
            });
          },
        });
        store.setPendingJobId(null); // Clear it once done
        const track = await createPlaybackTrack(song, playbackToken, { isManualAdd: true });

        console.log("[usePlayer] Resolved track:", track.title);

        store.addTrackToMap(track);

        if (forceQueueReplacement) {
          // Atomic queue replacement
          await TrackPlayer.setMediaItems([track]);
        } else {
          const queue = await TrackPlayer.getQueue();
          const activeIndex = await TrackPlayer.getActiveMediaItemIndex();
          const insertIndex =
            activeIndex === null || activeIndex === undefined
              ? queue.length
              : Math.max(activeIndex, 0);

          if (queue.length === 0) {
            await TrackPlayer.setMediaItems([track]);
          } else {
            await TrackPlayer.insertMediaItem(insertIndex, track as any);
            await TrackPlayer.skipToIndex(insertIndex);
          }
        }

        await TrackPlayer.play();

        // Final store sync with full metadata
        store.setCurrentSong(song, track);
        store.setDuration(song.duration);
        store.notifyQueueUpdate();
        void ensureSmartQueueActive();

        return track;
      } catch (error: any) {
        console.error("[usePlayer] play error:", error);
        store.setPendingJobId(null);
        store.setError(error?.message ?? "Failed to play song");

        import("react-native-toast-message").then(({ default: Toast }) => {
          Toast.show({
            type: "error",
            text1: "Audio Error",
            text2: error?.message ?? "Failed to magically steal the song.",
            visibilityTime: 4000,
          });
        });

        return undefined;
      }
    },
    [ensureSetup],
  );

  // ── Playlist: Play ───────────────────────────────────────────
  const playPlaylist = useCallback(
    async (songs: Song[], startIndex: number = 0, playlistId: string, playbackToken?: string) => {
      if (!songs.length) return;

      const store = getStore();
      const clampedIndex = Math.max(0, Math.min(startIndex, songs.length - 1));
      const firstSong = songs[clampedIndex];

      try {
        // Optimistic update: show the chosen song instantly in the UI
        store.setOptimisticSong({
          id: firstSong.id,
          trackName: firstSong.trackName,
          artists: firstSong.artists,
          image: firstSong.image,
          duration: firstSong.duration,
        } as any);
        store.setStatus("loading");

        resetSmartQueueRadio();
        store.setQueueType("playlist");
        store.setPlaylistMeta({ playlistId, total: songs.length });

        // Guard: abort if player setup fails
        const ok = await ensureSetup();
        if (!ok) {
          store.setError("Player setup failed");
          return;
        }

        // Resolve auth token for the first song if not supplied by caller.
        // All tracks in the queue share this playlist-scoped token; the native
        // player will lazily re-authenticate when it buffers each subsequent track.
        let token = playbackToken ?? "";
        if (!token) {
          try {
            const resolved = await resolveStream({ songId: firstSong.id });
            token = resolved.playbackToken;
          } catch (e) {
            console.warn("[playPlaylist] Could not pre-resolve first track token:", e);
          }
        }

        // Build all tracks using the resolved token
        const tracks = await Promise.all(
          songs.map((song) => createPlaybackTrack(song, token)),
        );

        // Register tracks in the lookup map
        tracks.forEach((t) => store.addTrackToMap(t as any));

        // Atomic queue replacement starting at the user's chosen index
        await TrackPlayer.setMediaItems(tracks, clampedIndex);
        await TrackPlayer.play();

        store.setCurrentSong(firstSong, tracks[clampedIndex] as any);
        store.setDuration(firstSong.duration);
        store.setStream(getPlaybackUrl(firstSong));
        store.notifyQueueUpdate();
      } catch (error) {
        console.error("[playPlaylist]", error);
        store.setError("Failed to play playlist");
      }
    },
    [ensureSetup],
  );

  const pause = useCallback(() => {
    try {
      TrackPlayer.pause();
    } catch { }
  }, []);

  const resume = useCallback(async () => {
    try {
      await TrackPlayer.play();
    } catch { }
  }, []);

  const seek = useCallback(async (seconds: number) => {
    try {
      // const position = Math.max(0, seconds);
      // console.log(`[usePlayer] Executing seekTo: ${position}s`);
      // await TrackPlayer.seekTo(position);
      const position = Math.max(0, seconds);
      console.log(`[BEFORE SEEK] state:`, await TrackPlayer.getPlaybackState());
      console.log("[SEEK to]", position);
      await TrackPlayer.seekTo(position);
      await new Promise((r) => setTimeout(r, 500)); // wait for native
      console.log(`[AFTER SEEK] position:`, await TrackPlayer.getProgress());
    } catch (e) {
      console.error("[usePlayer] Seek error:", e);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      TrackPlayer.stop();
      TrackPlayer.clear();
      getStore().reset();
    } catch { }
  }, []);

  const skipToNext = useCallback(async () => {
    try {
      TrackPlayer.skipToNext();
    } catch { }
  }, []);

  const skipToPrevious = useCallback(async () => {
    try {
      TrackPlayer.skipToPrevious();
    } catch { }
  }, []);

  const skipToIndex = useCallback(async (index: number) => {
    try {
      await ensureSetup();
      await TrackPlayer.skipToIndex(index);
      await TrackPlayer.play();
    } catch (e) {
      console.error("[usePlayer] skipToIndex error:", e);
    }
  }, [ensureSetup]);

  const toggleShuffle = useCallback(async () => {
    const store = getStore();
    try {
      const nextState = !store.shuffleEnabled;
      await ensureSetup();
      await TrackPlayer.setShuffleEnabled(nextState);
      store.setShuffleEnabled(nextState);
    } catch (error) {
      console.error("[usePlayer] toggleShuffle error:", error);
    }
  }, [ensureSetup]);

  const toggleRepeatMode = useCallback(async () => {
    await RepeatManager.toggleRepeatMode();
  }, []);

  const syncSleepTimer = useCallback(() => {
    const store = getStore();
    const timer = TrackPlayer.getSleepTimer?.();
    if (!timer) {
      store.setSleepTimer(null);
      return null;
    }

    if (timer.type === "mediaItem") {
      const timerData = { type: "track" as const };
      store.setSleepTimer(timerData);
      return timerData;
    }

    const currentStoreTimer = store.sleepTimer;
    let originalSeconds =
      currentStoreTimer?.type === "time" ? currentStoreTimer.seconds : undefined;

    if (!originalSeconds && timer.remainingSeconds !== undefined) {
      const standardSeconds = [300, 600, 900, 1800, 2700, 3600];
      const matched = standardSeconds.find((s) => s >= timer.remainingSeconds);
      if (matched) {
        originalSeconds = matched;
      }
    }

    const timerData = {
      type: "time" as const,
      seconds: originalSeconds,
      remainingSeconds: timer.remainingSeconds,
    };
    store.setSleepTimer(timerData);
    return timerData;
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
    skipToIndex,
    toggleShuffle,
    toggleRepeatMode,
    syncSleepTimer,
  };
}
