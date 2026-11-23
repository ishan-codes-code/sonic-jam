import TrackPlayer from "@rntp/player";
import { useCallback, useRef } from "react";
import { recreatePlayer, setupPlayer } from "../services/playerSetup";
import { isNativePlayerDead } from "../services/nativeSync";
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
import { isJobPollingCancelled } from "../services/pollingResolver";

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

  // ── Helper: Dead-player retry ──────────────────────────────────
  // When Android has killed the native service, queue-building calls are
  // silent no-ops and getQueue() stays empty. After a recreate the native
  // MediaController reconnects asynchronously and commands sent before it
  // connects are silently dropped, so poll + rebuild until the queue lands.
  // rebuild() only runs while the queue is still empty — nothing is added
  // twice. True = the native queue is non-empty. Callers show the error +
  // bail on false.
  const ensureNativeQueue = useCallback(
    async (rebuild: () => Promise<void>): Promise<boolean> => {
      const sleep = (ms: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, ms));
      const queueAlive = async (): Promise<boolean> => {
        try {
          return (await TrackPlayer.getQueue()).length > 0;
        } catch {
          return false;
        }
      };
      const pollAndRebuild = async (): Promise<boolean> => {
        for (let attempt = 0; attempt < 8; attempt++) {
          await sleep(400);
          if (await queueAlive()) return true;
          await rebuild();
          if (await queueAlive()) return true;
        }
        return false;
      };

      try {
        if ((await TrackPlayer.getQueue()).length > 0) return true;
      } catch {
        // Fall through to recreate — a throw also means dead.
      }
      await recreatePlayer();
      if (await pollAndRebuild()) return true;
      // One last chance: recreate again (fresh controller build) + one
      // more round of the same loop before giving up.
      await recreatePlayer();
      return pollAndRebuild();
    },
    [],
  );

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
        // Server switch cancelled the resolve: the session was already reset,
        // so there is no error to report and no toast to show.
        if (isJobPollingCancelled(error)) return undefined;
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

        // Re-reads the live index so the retry (after a recreate the queue
        // is empty) degrades to add + play by itself.
        const loadNext = async () => {
          const currentIndex = await TrackPlayer.getActiveMediaItemIndex();
          if (currentIndex === null || currentIndex === undefined) {
            await TrackPlayer.addMediaItem(track as any);
            await TrackPlayer.play();
          } else {
            await TrackPlayer.insertMediaItem(currentIndex + 1, track as any);
          }
        };

        await loadNext();
        if (!(await ensureNativeQueue(loadNext))) {
          console.warn(
            "[usePlayer] playNext: native queue still empty after recreate retries",
          );
          store.setError("Couldn't start playback. Tap the song to try again.");
          return;
        }
        toastImperative.show({
          type: "info",
          text1: "Playing next...",
        });
        store.notifyQueueUpdate();
      } catch (error: any) {
        if (isJobPollingCancelled(error)) return;
        console.error("[usePlayer] playNext error:", error);
        store.setError(error?.message ?? "Failed to play next");
      }
    },
    [ensureSetup, ensureNativeQueue, resolveAndCreateTrack],
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
        const loadAppend = async () => {
          await TrackPlayer.addMediaItem(track as any);

          const queue = await TrackPlayer.getQueue();
          if (queue.length === 1) {
            // Was empty, start playing
            await TrackPlayer.play();
          }
        };

        await loadAppend();
        if (!(await ensureNativeQueue(loadAppend))) {
          console.warn(
            "[usePlayer] addToQueue: native queue still empty after recreate retries",
          );
          store.setError("Couldn't start playback. Tap the song to try again.");
          return;
        }
        toastImperative.show({
          type: "info",
          text1: "Added to queue",
        });
        store.notifyQueueUpdate();
      } catch (error: any) {
        if (isJobPollingCancelled(error)) return;
        console.error("[usePlayer] addToQueue error:", error);
        store.setError(error?.message ?? "Failed to add to queue");
      }
    },
    [ensureSetup, ensureNativeQueue, resolveAndCreateTrack],
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

  // ── Queue: Remove by Song Id ──────────────────────────────────
  // Identity-based removal so playlist edits (which shift positions) can sync
  // the native queue without trusting a stale index. Reads the live queue at
  // call time. Never removes the active item — dropping what is playing would
  // stop/break playback.
  const removeFromQueueBySongId = useCallback(
    async (songId: string) => {
      try {
        const queue = await TrackPlayer.getQueue();
        const activeIndex = await TrackPlayer.getActiveMediaItemIndex();
        const index = queue.findIndex(
          (t) =>
            (t as PlaybackTrack).mediaId === songId ||
            (t as PlaybackTrack).song?.id === songId,
        );
        if (index === -1) return;
        if (
          activeIndex !== null &&
          activeIndex !== undefined &&
          index === activeIndex
        )
          return;
        await removeFromQueue(index);
      } catch (error) {
        console.error("[usePlayer] removeFromQueueBySongId error:", error);
      }
    },
    [removeFromQueue],
  );

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

        // Re-runnable: on retry after a recreate the queue is empty, so
        // the insert path degrades to setMediaItems by itself.
        const loadTrack = async () => {
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
        };

        await loadTrack();
        if (!(await ensureNativeQueue(loadTrack))) {
          console.warn(
            "[usePlayer] play: native queue still empty after recreate retries",
          );
          store.setError("Couldn't start playback. Tap the song to try again.");
          return undefined;
        }

        store.setCurrentSong(song, track);
        store.setDuration(song.duration);
        store.notifyQueueUpdate();
        void ensureSmartQueueActive();

        return track;
      } catch (error: any) {
        if (isJobPollingCancelled(error)) return undefined;
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
    [ensureSetup, ensureNativeQueue],
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
            // Cancellation (e.g. a server switch tore down the queue) must
            // stop the playlist immediately: continuing would rebuild and play
            // stale tracks with an empty token after the reset.
            if (isJobPollingCancelled(e)) return;
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

        const loadPlaylist = async () => {
          await TrackPlayer.setMediaItems(tracks, clampedIndex);
          await TrackPlayer.play();
        };

        await loadPlaylist();
        if (!(await ensureNativeQueue(loadPlaylist))) {
          console.warn(
            "[usePlayer] playPlaylist: native queue still empty after recreate retries",
          );
          store.setError("Couldn't start playback. Tap the song to try again.");
          return;
        }

        store.setCurrentSong(firstSong, tracks[clampedIndex] as any);
        store.setDuration(firstSong.duration);
        store.setStream(getPlaybackUrl(firstSong));
        store.notifyQueueUpdate();
      } catch (error) {
        if (isJobPollingCancelled(error)) return;
        console.error("[playPlaylist]", error);
        store.setError("Failed to play playlist");
      }
    },
    [ensureSetup, ensureNativeQueue],
  );

  const pause = useCallback(() => {
    try {
      TrackPlayer.pause();
    } catch (error) {
      console.warn("[usePlayer] pause error:", error);
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      await TrackPlayer.play();
    } catch (error) {
      console.warn("[usePlayer] resume error:", error);
    }
    // Dead service: play() above was a silent no-op. Recreate and reset
    // the now-false UI to idle instead of leaving the button stuck.
    if (await isNativePlayerDead()) {
      await recreatePlayer();
      const store = getStore();
      store.clearCurrentSong();
      store.clearStream();
      store.setStatus("idle");
    }
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
    removeFromQueueBySongId,
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
