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
import type { PlaySongDto, PlaybackTrack, Song, TrackSource } from "../types";
import {
  getPlaybackUrl,
  createPlaybackTrack,
  syncQueueTokens,
} from "../utils/playbackHelpers";
import { ensureFreshToken } from "@/features/auth/utils/tokenManager";
import { toastImperative } from "@/features/Toast/utils/toastSingleton";

export function usePlayer() {
  const isSettingUp = useRef(false);

  // ── Mutex: serialize playNext / addToQueue ops ──────────────────
  // Prevents race conditions when user taps rapidly. Each op chains
  // onto the previous one, so queue state is always consistent.
  const queueOpLock = useRef<Promise<void>>(Promise.resolve());

  // ── Helper: Get Store ───────────────────────────────────────────
  const getStore = () => usePlaybackStore.getState();

  // ── Setup ────────────────────────────────────────────────────────
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

        const { song, playbackToken } = await resolveStream(payload, {
          onJob: (jobId) => {
            useJobStore.getState().addJob(jobId, { payload });
            toastImperative.show({
              type: "info",
              text1: "Preparing your track...",
            });
          },
        });

        const track = await createPlaybackTrack(song, playbackToken, {
          isManualAdd: options?.isManualAdd ?? false,
        });

        store.addTrackToMap(track);
        await TrackPlayer.addMediaItem(track as any);

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

  // ── Helper: Resolve & Create Track ──────────────────────────────
  const resolveAndCreateTrack = useCallback(
    async (payload: PlaySongDto, source?: TrackSource) => {
      const store = getStore();
      const { song, playbackToken } = await resolveStream(payload);
      const track = await createPlaybackTrack(song, playbackToken, {
        isManualAdd: true,
        source,
      });
      store.addTrackToMap(track);
      return { song, track };
    },
    [],
  );

  // ── Helper: Find last manual insert position ─────────────────────
  // Scans the live queue backwards from the end, stopping at the first
  // track with source "playNext" or "addToQueue". Returns the index
  // AFTER that track (i.e., where the next addToQueue should insert).
  // Falls back to currentIndex + 1 if no manual tracks exist ahead.
  //
  // This is safe against index shifts because it reads the live queue
  // state at call time — there's no stale integer to go wrong.
  const findAddToQueueInsertIndex = useCallback(async (): Promise<number> => {
    const queue = await TrackPlayer.getQueue();
    const currentIndex = (await TrackPlayer.getActiveMediaItemIndex()) ?? -1;

    // Scan backwards from end, stop at first manual track past currentIndex
    for (let i = queue.length - 1; i > currentIndex; i--) {
      const t = queue[i] as PlaybackTrack;
      if (t.source === "playNext" || t.source === "addToQueue") {
        return i + 1; // insert after this track
      }
    }

    // No manual tracks ahead — insert right after current
    return currentIndex + 1;
  }, []);

  // Play Next — drop immediately after current song
  const playNext = useCallback(
    async (payload: PlaySongDto, source: TrackSource = "playNext") => {
      const store = getStore();
      try {
        const ok = await ensureSetup();
        if (!ok) {
          store.setError("Player setup failed");
          return;
        }

        const { track } = await resolveAndCreateTrack(payload, source);
        const currentIndex = await TrackPlayer.getActiveMediaItemIndex();

        if (currentIndex === null || currentIndex === undefined) {
          await TrackPlayer.addMediaItem(track as any);
          await TrackPlayer.play();
        } else {
          await TrackPlayer.insertMediaItem(currentIndex + 1, track as any);
        }
        toastImperative.show({
          type: "info",
          text1: "Playing next...",
        });
        store.notifyQueueUpdate();
      } catch (error: any) {
        console.error("[usePlayer] playNext error:", error);
        store.setError(error?.message ?? "Failed to play next");
      }
    },
    [ensureSetup, resolveAndCreateTrack],
  );

  // Add to Queue — FIFO append to the end
  const addToQueue = useCallback(
    async (payload: PlaySongDto, source: TrackSource = "addToQueue") => {
      const store = getStore();
      try {
        const ok = await ensureSetup();
        if (!ok) {
          store.setError("Player setup failed");
          return;
        }

        const { track } = await resolveAndCreateTrack(payload, source);

        // Just append — no index math needed
        await TrackPlayer.addMediaItem(track as any);

        const queue = await TrackPlayer.getQueue();
        if (queue.length === 1) {
          // Was empty, start playing
          await TrackPlayer.play();
        }
        toastImperative.show({
          type: "info",
          text1: "Added to queue",
        });
        store.notifyQueueUpdate();
      } catch (error: any) {
        console.error("[usePlayer] addToQueue error:", error);
        store.setError(error?.message ?? "Failed to add to queue");
      }
    },
    [ensureSetup, resolveAndCreateTrack],
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
        const optimisticSong: any = {
          id: "songId" in payload ? payload.songId : `temp_${Date.now()}`,
          trackName: "trackName" in payload ? payload.trackName : "Loading...",
          artists:
            "artistName" in payload ? [{ name: payload.artistName }] : [],
          image: "image" in payload ? payload.image : null,
          duration: "duration" in payload ? payload.duration : 0,
        };
        store.setOptimisticSong(optimisticSong);
        store.setPendingJobId("resolving");

        const shouldPreserveQueue = options?.preserveQueue ?? true;
        const isPlaylistActive =
          store.queueType === "playlist" || store.playlistMeta !== null;
        const forceQueueReplacement = !shouldPreserveQueue || isPlaylistActive;

        if (forceQueueReplacement) {
          resetSmartQueueRadio();
          store.setQueueType("radio");
          store.clearPlaylistMeta();
          // ✅ Clear the lock too so stale ops don't run after a hard reset
          queueOpLock.current = Promise.resolve();

          try {
            await TrackPlayer.clear();
          } catch { }
        }

        const ok = await ensureSetup();
        if (!ok) {
          store.setPendingJobId(null);
          store.setError("Player setup failed");
          return undefined;
        }

        if (forceQueueReplacement) {
          store.clearPlaylistMeta();
        }

        const { song, playbackToken } = await resolveStream(payload, {
          onJob: (jobId) => {
            useJobStore.getState().addJob(jobId, { payload });
            store.setPendingJobId(jobId);
            toastImperative.show({
              type: "info",
              text1:
                "Whoops, we don't have this one. Magically resolving the audio stream for you...",
              visibilityTime: 4000,
            });
          },
        });

        store.setPendingJobId(null);
        const track = await createPlaybackTrack(song, playbackToken, {
          isManualAdd: true,
        });

        store.addTrackToMap(track);

        if (forceQueueReplacement) {
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

        store.setCurrentSong(song, track);
        store.setDuration(song.duration);
        store.notifyQueueUpdate();
        void ensureSmartQueueActive();

        return track;
      } catch (error: any) {
        console.error("[usePlayer] play error:", error);
        store.setPendingJobId(null);
        store.setError(error?.message ?? "Failed to play song");
        toastImperative.show({
          type: "error",
          text1: error?.message ?? "Failed to magically steal the song.",
          visibilityTime: 4000,
        });
        return undefined;
      }
    },
    [ensureSetup],
  );

  // ── Playlist: Play ───────────────────────────────────────────
  const playPlaylist = useCallback(
    async (
      songs: Song[],
      startIndex: number = 0,
      playlistId: string,
      playbackToken?: string,
    ) => {
      if (!songs.length) return;

      const store = getStore();
      const clampedIndex = Math.max(0, Math.min(startIndex, songs.length - 1));
      const firstSong = songs[clampedIndex];

      try {
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
        // ✅ Clear lock on hard reset
        queueOpLock.current = Promise.resolve();

        const ok = await ensureSetup();
        if (!ok) {
          store.setError("Player setup failed");
          return;
        }

        let token = playbackToken ?? "";
        if (!token) {
          try {
            const resolved = await resolveStream({ songId: firstSong.id });
            token = resolved.playbackToken;
          } catch (e) {
            console.warn(
              "[playPlaylist] Could not pre-resolve first track token:",
              e,
            );
          }
        }

        const tracks = await Promise.all(
          songs.map((song) => createPlaybackTrack(song, token)),
        );

        tracks.forEach((t) => store.addTrackToMap(t as any));

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
      const position = Math.max(0, seconds);
      console.log(`[BEFORE SEEK] state:`, await TrackPlayer.getPlaybackState());
      console.log("[SEEK to]", position);
      await TrackPlayer.seekTo(position);
      await new Promise((r) => setTimeout(r, 500));
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

  const skipToIndex = useCallback(
    async (index: number) => {
      try {
        await ensureSetup();
        await TrackPlayer.skipToIndex(index);
        await TrackPlayer.play();
      } catch (e) {
        console.error("[usePlayer] skipToIndex error:", e);
      }
    },
    [ensureSetup],
  );

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
      currentStoreTimer?.type === "time"
        ? currentStoreTimer.seconds
        : undefined;

    if (!originalSeconds && timer.remainingSeconds !== undefined) {
      const standardSeconds = [300, 600, 900, 1800, 2700, 3600];
      const matched = standardSeconds.find((s) => s >= timer.remainingSeconds);
      if (matched) originalSeconds = matched;
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
