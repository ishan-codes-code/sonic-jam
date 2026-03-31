import { create } from "zustand";
import { Song, musicApi } from "../api/musicApi";
import { YouTubeVideo, fetchVideoDetails } from "../services/youtube";
import { playLibraryStream, playTrack, playVideoStream } from "./player.engine";
import {
  isCompletedJobStatus,
  isFailedJobStatus,
  isProcessingJobStatus,
  safelyRemovePlayer,
} from "./player.helpers";
import {
  cleanupSongJobs,
  dismissSongJob,
  getJob,
  handleJobStatus,
  pollPlayJob,
  startPollingJob,
  syncSongJobsFromMap,
  upsertJob,
} from "./player.jobs";
import { PlayerState } from "./player.types";

export const usePlayerStore = create<PlayerState>((set, get) => {
  return {
    currentSong: null,
    currentVideo: null,
    status: "idle",
    progress: 0,
    duration: 0,
    streamUrl: null,
    lastFetchTime: 0,
    error: null,
    isPlayPending: false,
    player: null,
    songJobs: [],
    pendingTrack: null,
    toast: null,
    queue: [],
    currentIndex: 0,
    isTransitioning: false,

    setQueue: (tracks, startIndex = 0) => {
      set({
        queue: tracks,
        currentIndex: startIndex,
      });

      const track = tracks[startIndex];
      if (!track) return;

      // 🔥 IMPORTANT: route to correct playback
      //   if (track.songId) {
      //     get().playSong({
      //       songId: track.songId,
      //       title: track.title,
      //       youtubeId: track.youtubeId,
      //       duration: track.duration ?? 180,
      //     });
      //   } else {
      //     get().playFromYouTube({
      //       videoId: track.youtubeId,
      //       title: track.title,
      //       duration: track.duration ?? 180,
      //     });
      //   }
      get().playFromYouTube({
        videoId: track.youtubeId,
        title: track.title,
        duration: track.duration,
        channelTitle: "",
        thumbnail: "",
      });
    },

    next: async () => {
      const { currentIndex, queue, isTransitioning } = get();

      if (isTransitioning) return; // 🚫 prevent double call

      if (currentIndex >= queue.length - 1) return;

      set({ isTransitioning: true });

      const nextIndex = currentIndex + 1;
      const track = queue[nextIndex];

      set({ currentIndex: nextIndex });

      if (!track) {
        set({ isTransitioning: false });
        return;
      }

      //   if (track.songId) {
      //     await get().playSong({
      //       songId: track.songId,
      //       title: track.title,
      //       youtubeId: track.youtubeId,
      //       duration: track.duration ?? 180,
      //     });
      //   } else {
      //     await get().playFromYouTube({
      //       videoId: track.youtubeId,
      //       title: track.title,
      //       duration: track.duration ?? 180,
      //     });
      //   }

      await get().playFromYouTube({
        videoId: track.youtubeId,
        title: track.title,
        duration: track.duration,
        channelTitle: "",
        thumbnail: "",
      });
      set({ isTransitioning: false });
    },

    prev: async () => {
      const { currentIndex, queue } = get();

      if (currentIndex <= 0) return;

      const prevIndex = currentIndex - 1;
      const track = queue[prevIndex];

      set({ currentIndex: prevIndex });

      if (!track) return;

      //   if (track.songId) {
      //     await get().playSong({
      //       songId: track.songId,
      //       title: track.title,
      //       youtubeId: track.youtubeId,
      //       duration: track.duration ?? 180,
      //     });
      //   } else {
      //     await get().playFromYouTube({
      //       videoId: track.youtubeId,
      //       title: track.title,
      //       duration: track.duration ?? 180,
      //     });
      //   }

      await get().playFromYouTube({
        videoId: track.youtubeId,
        title: track.title,
        duration: track.duration,
        channelTitle: "",
        thumbnail: "",
      });
    },

    playSong: async (song: Song) => {
      const state = get();
      safelyRemovePlayer(state.player);

      set({
        currentSong: song,
        currentVideo: null,
        status: "loading",
        progress: 0,
        duration: song.duration * 1000,
        error: null,
        player: null,
        streamUrl: null,
      });

      try {
        const { streamUrl } = await musicApi.getStreamUrl(song.songId);

        console.log("[playerStore] playSong stream URL:", {
          songId: song.songId,
          title: song.title,
          streamUrl,
        });

        await playLibraryStream(get, set, song, streamUrl);
      } catch (err: any) {
        console.error("[playerStore] playSong error detailing:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          stack: err.stack,
        });

        if (get().currentSong?.songId === song.songId) {
          let errorMessage = "Failed to start playback";

          if (err.response?.status === 403) {
            errorMessage =
              "Access Denied: You must add this song to your library first.";
          } else if (err.message) {
            errorMessage = err.message;
          }

          set({ status: "error", error: errorMessage });
        }
      }
    },

    playFromYouTube: async (video: YouTubeVideo) => {
      const state = get();

      try {
        // 🔹 Resolve duration if missing
        let resolvedDuration = video.duration;
        if (!resolvedDuration) {
          const details = await fetchVideoDetails(video.videoId);
          resolvedDuration = details?.duration ?? 180;
        }

        const res = await musicApi.play({
          youtubeId: video.videoId,
          title: video.title,
          duration: resolvedDuration ?? 180,
        });

        console.log("[playerStore] playFromYouTube result:", {
          videoId: video.videoId,
          title: video.title,
          res,
        });

        // =========================================================
        // ✅ CASE 1: READY → Play immediately
        // =========================================================
        if (res.type === "ready") {
          // 🔥 Stop current playback ONLY here
          safelyRemovePlayer(state.player);

          set({
            status: "loading",
            progress: 0,
            error: null,
            player: null,
            currentVideo: video,
            currentSong: null,
            streamUrl: null,
            pendingTrack: null, // ✅ clear pending
          });

          playVideoStream(get, set, video, resolvedDuration, res.streamUrl);

          return;
        }

        // =========================================================
        // ⚙️ CASE 2: JOB → Background processing
        // =========================================================

        console.log("[playerStore] queued job:", {
          jobId: res.jobId,
          videoId: video.videoId,
          title: video.title,
        });

        // 🔥 Register job
        upsertJob(res.jobId, {
          video,
          duration: resolvedDuration,
          status: "waiting",
          progress: 0,
        });

        syncSongJobsFromMap(set);

        // 🔥 Set pending (override previous pending automatically)
        set({
          pendingTrack: {
            id: video.videoId,
            title: video.title,
            youtubeId: video.videoId,
            duration: resolvedDuration ?? 180,
          },
        });

        // ❌ DO NOT stop current playback
        // ❌ DO NOT reset player
        // ❌ DO NOT change currentVideo/currentSong

        // 🔥 Start polling
        startPollingJob(res.jobId, (jobId) =>
          pollPlayJob(jobId, get, set, handleJobStatus),
        );
      } catch (err: any) {
        console.error("[playerStore] playFromYouTube error:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          stack: err.stack,
        });

        // Only show error if this was intended video
        if (get().pendingTrack?.youtubeId === video.videoId) {
          set({
            status: "error",
            error: err?.message ?? "Playback failed",
            pendingTrack: null,
          });
        }
      }
    },

    togglePlayback: async () => {
      const { player, status, lastFetchTime, currentSong, currentVideo } =
        get();
      if (!player || (!currentSong && !currentVideo)) return;

      try {
        if (status === "playing") {
          player.pause();
          set({ status: "paused" });
        } else if (status === "paused") {
          const isExpired = Date.now() - lastFetchTime > 270_000;

          if (isExpired && currentSong) {
            await get().playSong(currentSong);
          } else if (isExpired && currentVideo) {
            await get().playFromYouTube(currentVideo);
          } else {
            player.play();
            set({ status: "playing" });
          }
        }
      } catch (err: any) {
        console.error("[playerStore] togglePlayback error detailing:", {
          message: err.message,
          stack: err.stack,
        });

        if (currentSong) await get().playSong(currentSong);
        else if (currentVideo) await get().playFromYouTube(currentVideo);
      }
    },

    seek: async (positionMillis: number) => {
      const { player } = get();
      if (!player) return;

      player.seekTo(positionMillis / 1000);
      set({ progress: positionMillis });
    },

    stop: async () => {
      const { player } = get();
      safelyRemovePlayer(player);

      set({
        player: null,
        currentSong: null,
        currentVideo: null,
        status: "idle",
        progress: 0,
        duration: 0,
        streamUrl: null,
        pendingTrack: null,
        isPlayPending: get().songJobs.some((job) =>
          isProcessingJobStatus(job.status),
        ),
      });
    },

    dismissSongJob: (jobId: string) => {
      dismissSongJob(jobId, set);
    },

    cleanupSongJobs: () => {
      cleanupSongJobs(set);
    },

    playCompletedJob: (jobId: string) => {
      const job = getJob(jobId);
      if (!job || !job.streamUrl) return;

      playTrack(
        get,
        set,
        {
          id: jobId,
          title: job.video.title,
          youtubeId: job.video.videoId,
          duration: job.duration,
        },
        job.streamUrl,
      );
    },

    showToast: (data) => {
      set({ toast: data });
    },

    // Helper selectors
    getJobsByStatus: (status: string) =>
      get().songJobs.filter((job) => job.status === status),
    getProcessingJobs: () =>
      get().songJobs.filter((job) => isProcessingJobStatus(job.status)),
    getFailedJobs: () =>
      get().songJobs.filter((job) => isFailedJobStatus(job.status)),
    getCompletedJobs: () =>
      get().songJobs.filter((job) => isCompletedJobStatus(job.status)),
  };
});
