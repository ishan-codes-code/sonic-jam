import TrackPlayer from "@rntp/player";
import { useCallback, useRef } from "react";
import { recreatePlayer, setupPlayer } from "../services/playerSetup";
import { isNativePlayerDead, waitForNativeQueue } from "../services/nativeSync";
import { resolveStream } from "../api/playbackApi";
import { RepeatManager } from "../services/repeatManager";
import {
  ensureSmartQueueActive,
  resetSmartQueueRadio,
} from "../services/smartQueueService";
import { usePlaybackStore } from "../store/usePlaybackStore";
import { useJobStore } from "../store/useJobStore";
import type {
  PlaySongDto,
  PlaybackTrack,
  PlaylistTrack,
  Song,
  TrackSource,
} from "../types";
import { createPlaybackTrack } from "../utils/playbackHelpers";
import {
  hasUsableStreamUrl,
  nearestReadyIndex,
  normalizeJobId,
  partitionPlaylistTracks,
} from "../utils/streamHelpers";
import {
  cancelPlaylistResolution,
  ensurePlaylistEntryInserted,
  getActivePlaylistRun,
  getPlaylistEntryState,
  isPlaylistRunCurrent,
  isPlaylistRunJoinable,
  markPlaylistEntryEnqueued,
  markPlaylistRunJoinable,
  resolvePlaylistEntry,
  resolvePlaylistEntriesInBackground,
  startPlaylistRun,
  type PlaylistPendingDeps,
} from "../services/playlistPendingService";
import { resolveJob } from "../services/jobResolver";
import { ensureFreshToken } from "@/features/auth/utils/tokenManager";
import { toastImperative } from "@/features/Toast/utils/toastSingleton";
import { isJobPollingCancelled } from "../services/pollingResolver";

// Production effects for playlist pending-track pipelines: the shared job
// poller, job registration, track building, track-map mirror + queue
// revision, and the native queue length/insert calls.
const playlistPendingDeps: PlaylistPendingDeps<Song, PlaybackTrack> = {
  pollJob: (jobId, shouldAbort) => resolveJob(jobId, undefined, shouldAbort),
  registerJob: (jobId, songId) =>
    useJobStore.getState().addJob(jobId, { payload: { songId } }),
  createTrack: (song, playbackToken) =>
    createPlaybackTrack(song, playbackToken),
  addTrackToMap: (track) => usePlaybackStore.getState().addTrackToMap(track),
  getNativeQueueLength: async () => (await TrackPlayer.getQueue()).length,
  insertNativeTrack: async (position, track) => {
    await TrackPlayer.insertMediaItem(position, track as any);
  },
  notifyQueueUpdate: () => usePlaybackStore.getState().notifyQueueUpdate(),
};

export function usePlayer() {
  const isSettingUp = useRef(false);

  // ── Mutex: serialize playNext / addToQueue ops ──────────────────
  // Prevents race conditions when user taps rapidly. Each op chains
  // onto the previous one, so queue state is always consistent.
  const queueOpLock = useRef<Promise<void>>(Promise.resolve());

  // Monotonic play-op id: play()/playPlaylist()/stop() bump it so a newer
  // op (or stop) invalidates in-flight retry loops, which then bail instead
  // of writing stale state.
  const playOpRef = useRef(0);

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

  // ── Helper: Swallowed loader ───────────────────────────────────
  // A loader throw counts as a dead queue, not a crash: warn and fall
  // through so the queue check / recreate flow decides. Never throws.
  const tryRebuild = useCallback(
    async (rebuild: () => Promise<void>): Promise<void> => {
      try {
        await rebuild();
      } catch (error) {
        console.warn("[usePlayer] native load failed:", error);
      }
    },
    [],
  );

  // ── Helper: Dead-player wait + recreate ──────────────────────────
  // Thin wiring around waitForNativeQueue (see nativeSync.ts): waits for
  // the queue to land before any recreate, then one rebuild per recreate.
  // isCurrent bails the waits as soon as a newer op (or stop) takes over.
  // True = the native queue is non-empty. Callers show the error + bail
  // on false.
  const ensureNativeQueue = useCallback(
    async (
      rebuild: () => Promise<void>,
      isCurrent: () => boolean,
    ): Promise<boolean> => {
      const sleep = (ms: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, ms));
      return waitForNativeQueue({
        getQueueLength: async () => (await TrackPlayer.getQueue()).length,
        recreate: () => recreatePlayer(),
        rebuild: () => tryRebuild(rebuild),
        isCurrent,
        sleep,
      });
    },
    [tryRebuild],
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
          // The actual backend stream URL — never a guessed path.
          store.setStream(song.streamUrl);
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
      // No bump — only play()/playPlaylist()/stop() own the op id. A newer
      // op aborts our retry loop instead of running it stale.
      const opId = playOpRef.current;
      const isCurrent = () => playOpRef.current === opId;
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

        await tryRebuild(loadNext);
        if (!(await ensureNativeQueue(loadNext, isCurrent))) {
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
    [ensureSetup, ensureNativeQueue, resolveAndCreateTrack, tryRebuild],
  );

  // Add to Queue — FIFO append to the end
  const addToQueue = useCallback(
    async (payload: PlaySongDto, source: TrackSource = "addToQueue") => {
      const store = getStore();
      // No bump — only play()/playPlaylist()/stop() own the op id. A newer
      // op aborts our retry loop instead of running it stale.
      const opId = playOpRef.current;
      const isCurrent = () => playOpRef.current === opId;
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

        await tryRebuild(loadAppend);
        if (!(await ensureNativeQueue(loadAppend, isCurrent))) {
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
    [ensureSetup, ensureNativeQueue, resolveAndCreateTrack, tryRebuild],
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
      const opId = ++playOpRef.current;
      const isCurrent = () => playOpRef.current === opId;
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
          // Stop playlist pending-track resolutions: the queue they would
          // insert into is gone, and their tracks belong to no live run.
          cancelPlaylistResolution();
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

        await tryRebuild(loadTrack);
        if (!(await ensureNativeQueue(loadTrack, isCurrent))) {
          // Stale: a newer op (or stop) owns the store — stay silent.
          if (!isCurrent()) return undefined;
          console.warn(
            "[usePlayer] play: native queue still empty after recreate retries",
          );
          store.setError("Couldn't start playback. Tap the song to try again.");
          return undefined;
        }

        if (isCurrent()) {
          store.setCurrentSong(song, track);
          store.setDuration(song.duration);
        }
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
    [ensureSetup, ensureNativeQueue, tryRebuild],
  );

  // ── Playlist: Play ───────────────────────────────────────────
  // Pending-track aware: ready tracks enqueue immediately in playlist order
  // while missing-file tracks (streamUrl '' + jobId) resolve through the
  // shared job poller — the start track awaited, the rest in the background —
  // and slot into the native queue at their playlist-order positions as they
  // complete. Empty URLs never enter the native queue. Playlists without
  // pending tracks (all R2 playlists) follow the pre-existing path exactly.
  const playPlaylist = useCallback(
    async (
      songs: PlaylistTrack[],
      startIndex: number = 0,
      playlistId: string,
      playbackToken?: string,
    ) => {
      if (!songs.length) return;

      const store = getStore();
      const opId = ++playOpRef.current;
      const isCurrent = () => playOpRef.current === opId;
      const clampedIndex = Math.max(0, Math.min(startIndex, songs.length - 1));

      // Partition once: playlist positions stay stable for the whole run.
      const partition = partitionPlaylistTracks(songs);
      const readyAt = new Array(songs.length).fill(false);
      for (const entry of partition.ready) readyAt[entry.index] = true;

      // The start position stays in playlist coordinates even when the tapped
      // track is pending: it resolves first, then playback begins there.
      let effectiveStart = clampedIndex;
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

        // Track the run from here: every background resolution below aborts
        // when another playlist (or a single play/stop/switch) supersedes it.
        // The run publishes for tap-joining only once the initial queue has
        // settled (see markPlaylistRunJoinable below).
        const run = startPlaylistRun(
          playlistId,
          songs.length,
          partition.pending.map((entry) => ({
            playlistIndex: entry.index,
            jobId: normalizeJobId(entry.track.jobId) ?? "",
            songId: entry.track.id,
          })),
          playlistPendingDeps,
        );
        const isRunCurrent = () => isPlaylistRunCurrent(run) && isCurrent();

        let token = playbackToken ?? "";
        if (!token && partition.ready.length > 0) {
          try {
            // Any ready track yields the shared playlist token instantly —
            // prefer the start track when it is ready.
            const tokenSong = readyAt[effectiveStart]
              ? songs[effectiveStart]
              : partition.ready[0].track;
            const resolved = await resolveStream({ songId: tokenSong.id });
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
        if (!isRunCurrent()) return;

        const resolveRestInBackground = () => {
          resolvePlaylistEntriesInBackground(
            run,
            partition.pending
              .map((entry) => entry.index)
              .filter((index) => index !== effectiveStart),
          );
        };

        // Resolve-then-play when the start track is pending: the queue cannot
        // start on a track with no URL. Failures fall back to the nearest
        // ready track instead of failing the whole playlist.
        let startSong: Song = songs[effectiveStart];
        let startTrack: PlaybackTrack | null = null;
        if (!readyAt[effectiveStart]) {
          const startJobId = normalizeJobId(songs[effectiveStart].jobId);
          if (!startJobId) {
            // Unplayable (no URL, no job): fall back without polling.
            const fallback = nearestReadyIndex(readyAt, effectiveStart + 1);
            if (fallback === -1) {
              // Nothing will load: publish so taps join the background work
              // instead of rebuilding into the same state.
              markPlaylistRunJoinable(run);
              resolveRestInBackground();
              store.setError(
                "This playlist has no playable tracks right now.",
              );
              return;
            }
            effectiveStart = fallback;
            startSong = songs[effectiveStart];
          } else {
            store.setPendingJobId(startJobId);
            toastImperative.show({
              type: "info",
              text1: "Downloading track...",
            });
            try {
              const resolved = await resolvePlaylistEntry(run, effectiveStart);
              if (!isRunCurrent()) return;
              startSong = resolved.song;
              startTrack = await createPlaybackTrack(
                resolved.song,
                resolved.playbackToken,
              );
              if (!isRunCurrent()) return;
              store.addTrackToMap(startTrack);
              // The entry marks enqueued only after the initial queue lands
              // (see below): until setMediaItems succeeds it is still
              // resolving, never ready.
            } catch (e) {
              if (!isPlaylistRunCurrent(run) || isJobPollingCancelled(e)) {
                return;
              }
              console.warn(
                "[playPlaylist] Start track failed, falling back:",
                e,
              );
              const fallback = nearestReadyIndex(readyAt, effectiveStart + 1);
              if (fallback === -1) {
                store.setPendingJobId(null);
                store.setError(
                  "Couldn't download this track. Try again in a bit.",
                );
                toastImperative.show({
                  type: "error",
                  text1: "Couldn't download this track.",
                });
                // The rest keep resolving in the background; the user can tap
                // them once they land.
                markPlaylistRunJoinable(run);
                resolveRestInBackground();
                return;
              }
              effectiveStart = fallback;
              startSong = songs[effectiveStart];
              toastImperative.show({
                type: "error",
                text1:
                  "Couldn't download that track — playing the next available one.",
              });
            } finally {
              if (isCurrent()) store.setPendingJobId(null);
            }
          }
        }
        if (!isRunCurrent()) return;

        // Assemble the native queue in playlist order: ready tracks plus the
        // resolved start track. Unplayable and still-pending tracks stay out.
        const ordered: { playlistIndex: number; track: PlaybackTrack }[] = [];
        for (const entry of partition.ready) {
          const track = await createPlaybackTrack(entry.track, token);
          if (!isRunCurrent()) return;
          store.addTrackToMap(track);
          markPlaylistEntryEnqueued(run, entry.index);
          ordered.push({ playlistIndex: entry.index, track });
        }
        if (startTrack) {
          ordered.push({ playlistIndex: effectiveStart, track: startTrack });
        }
        ordered.sort((a, b) => a.playlistIndex - b.playlistIndex);
        const tracks = ordered.map((item) => item.track);
        const nativeStartIndex = ordered.findIndex(
          (item) => item.playlistIndex === effectiveStart,
        );

        const loadPlaylist = async () => {
          await TrackPlayer.setMediaItems(tracks, nativeStartIndex);
          await TrackPlayer.play();
        };

        await tryRebuild(loadPlaylist);
        if (!(await ensureNativeQueue(loadPlaylist, isCurrent))) {
          // Stale: a newer op (or stop) owns the store — stay silent.
          if (!isCurrent()) return;
          console.warn(
            "[usePlayer] playPlaylist: native queue still empty after recreate retries",
          );
          store.setError("Couldn't start playback. Tap the song to try again.");
          return;
        }

        if (isCurrent()) {
          store.setCurrentSong(startSong, tracks[nativeStartIndex] as any);
          store.setDuration(startSong.duration);
          // The actual backend stream URL — never a guessed path.
          store.setStream(startSong.streamUrl);
        }
        // The initial queue landed: a resolved start track is truly enqueued
        // now, and taps may join entry pipelines instead of rebuilding.
        // Both calls no-op on a superseded run.
        if (startTrack) markPlaylistEntryEnqueued(run, effectiveStart);
        markPlaylistRunJoinable(run);
        store.notifyQueueUpdate();

        // Pending tracks resolve without blocking playback; each one slots
        // into the native queue (and queue traversal) as it completes.
        resolveRestInBackground();
      } catch (error) {
        if (isJobPollingCancelled(error)) return;
        console.error("[playPlaylist]", error);
        store.setError("Failed to play playlist");
      }
    },
    [ensureSetup, ensureNativeQueue, tryRebuild],
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
    // Invalidate in-flight play retry loops so they bail silently instead
    // of writing stale state after the reset.
    playOpRef.current++;
    cancelPlaylistResolution();
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

  // ── Playlist: Skip to a playlist position ──────────────────────
  // Resolution-aware skip for playlists with pending tracks, where playlist
  // positions and native queue indices diverge. Ready tracks skip by song
  // identity (live queue read — robust against shifts); pending tracks join
  // the entry's in-flight pipeline (never a duplicate poll or insertion) and
  // skip once it lands; failed tracks retry. Falls back to a full playlist
  // rebuild when the live queue no longer belongs to this playlist run, or
  // the run's initial queue has not settled yet.
  const skipToPlaylistIndex = useCallback(
    async (
      songs: PlaylistTrack[],
      playlistIndex: number,
      playlistId: string,
      playbackToken?: string,
    ) => {
      const store = getStore();
      const target = songs[playlistIndex];
      if (!target) return;

      const run = getActivePlaylistRun<Song, PlaybackTrack>();
      if (
        !run ||
        run.playlistId !== playlistId ||
        !isPlaylistRunJoinable(run)
      ) {
        await playPlaylist(songs, playlistIndex, playlistId, playbackToken);
        return;
      }

      const skipToSongId = async (songId: string): Promise<boolean> => {
        try {
          const queue = await TrackPlayer.getQueue();
          const nativeIndex = queue.findIndex(
            (item) =>
              (item as PlaybackTrack).mediaId === songId ||
              (item as PlaybackTrack).song?.id === songId,
          );
          if (nativeIndex === -1) return false;
          await ensureSetup();
          await TrackPlayer.skipToIndex(nativeIndex);
          await TrackPlayer.play();
          return true;
        } catch (e) {
          console.error("[skipToPlaylistIndex] skip error:", e);
          return false;
        }
      };

      try {
        const entryState = getPlaylistEntryState(run, playlistIndex);
        if (hasUsableStreamUrl(target.streamUrl) || entryState === "ready") {
          // Ready now (or resolved since): skip by identity. A miss means
          // the queue drifted (manual removal) — rebuild from here.
          if (await skipToSongId(target.id)) return;
          await playPlaylist(songs, playlistIndex, playlistId, playbackToken);
          return;
        }

        if (!normalizeJobId(target.jobId)) {
          toastImperative.show({
            type: "info",
            text1: "This track isn't available right now.",
          });
          return;
        }

        // Pending, resolving, inserting, or failed: join the entry pipeline
        // (a tap racing the background work awaits the same operation — one
        // poll, one insertion), then skip to the inserted track.
        store.setPendingJobId(normalizeJobId(target.jobId));
        toastImperative.show({
          type: "info",
          text1:
            entryState === "failed"
              ? "Retrying download..."
              : "Downloading track...",
        });
        try {
          const track = await ensurePlaylistEntryInserted(run, playlistIndex);
          if (!isPlaylistRunCurrent(run)) return;
          if (!(await skipToSongId(track.song.id))) {
            await playPlaylist(songs, playlistIndex, playlistId, playbackToken);
          }
        } finally {
          // Ours to clear only while the run still owns the store — a
          // superseding playlist may have set its own pending job.
          if (isPlaylistRunCurrent(run)) store.setPendingJobId(null);
        }
      } catch (error) {
        if (isJobPollingCancelled(error)) return;
        console.error("[skipToPlaylistIndex]", error);
        if (isPlaylistRunCurrent(run)) store.setPendingJobId(null);
        toastImperative.show({
          type: "error",
          text1: "Couldn't download this track.",
        });
      }
    },
    [ensureSetup, playPlaylist],
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
    skipToPlaylistIndex,
    toggleShuffle,
    toggleRepeatMode,
    syncSleepTimer,
  };
}
