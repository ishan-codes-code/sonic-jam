import { AudioPlayer, AudioStatus, createAudioPlayer } from "expo-audio";
import { create } from "zustand";
import { PlayJobResponse, Song, musicApi } from "../api/musicApi";
import { YouTubeVideo, fetchVideoDetails } from "../services/youtube";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type SongJob = {
  jobId: string;
  title: string;
  status: string;
  progress: number;
};

type PendingVideoJob = {
  video: YouTubeVideo;
  duration: number;
};

const JOB_POLL_INTERVAL_MS = 10_000;
const JOB_REMOVE_DELAY_MS = 2_500;

const jobPollers = new Map<string, ReturnType<typeof setInterval>>();
const pendingVideoJobs = new Map<string, PendingVideoJob>();
const jobCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
const jobPollInFlight = new Set<string>();

const PROCESSING_JOB_STATUSES = new Set([
  "processing",
  "queued",
  "pending",
  "in_progress",
  "waiting",
  "active",
  "delayed",
  "prioritized",
  "waiting-children",
  "paused",
]);

const FAILED_JOB_STATUSES = new Set(["error", "failed", "failure"]);

const COMPLETED_JOB_STATUSES = new Set([
  "done",
  "completed",
  "ready",
  "success",
]);

const isProcessingJobStatus = (status: string) =>
  PROCESSING_JOB_STATUSES.has(status.toLowerCase());

const isFailedJobStatus = (status: string) =>
  FAILED_JOB_STATUSES.has(status.toLowerCase());

const isCompletedJobStatus = (status: string) =>
  COMPLETED_JOB_STATUSES.has(status.toLowerCase());

interface PlayerState {
  currentSong: Song | null;
  currentVideo: YouTubeVideo | null;
  status: PlayerStatus;
  progress: number;
  duration: number;
  streamUrl: string | null;
  lastFetchTime: number;
  error: string | null;
  isPlayPending: boolean;
  player: AudioPlayer | null;
  songJobs: SongJob[];

  playSong: (song: Song) => Promise<void>;
  playFromYouTube: (video: YouTubeVideo) => Promise<void>;
  togglePlayback: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  stop: () => Promise<void>;
  dismissSongJob: (jobId: string) => void;
  cleanupSongJobs: () => void;
}

const safelyRemovePlayer = (player: AudioPlayer | null) => {
  if (!player) return;

  try {
    player.pause();
    player.remove();
  } catch (err) {
    console.warn("Error cleanup player", err);
  }
};

const clearJobCleanupTimer = (jobId: string) => {
  const cleanupTimer = jobCleanupTimers.get(jobId);
  if (!cleanupTimer) return;

  clearTimeout(cleanupTimer);
  jobCleanupTimers.delete(jobId);
};

const scheduleJobRemoval = (
  jobId: string,
  removeJob: (jobId: string) => void,
  delayMs = JOB_REMOVE_DELAY_MS,
) => {
  clearJobCleanupTimer(jobId);

  const timeout = setTimeout(() => {
    jobCleanupTimers.delete(jobId);
    removeJob(jobId);
  }, delayMs);

  jobCleanupTimers.set(jobId, timeout);
};

const stopPollingJob = (jobId: string) => {
  console.log("[playerStore] stopPollingJob:", jobId);
  const poller = jobPollers.get(jobId);
  if (poller) {
    clearInterval(poller);
    jobPollers.delete(jobId);
  }

  jobPollInFlight.delete(jobId);
  pendingVideoJobs.delete(jobId);
  clearJobCleanupTimer(jobId);
};

export const usePlayerStore = create<PlayerState>((set, get) => {
  const removeSongJob = (jobId: string) => {
    stopPollingJob(jobId);

    set((state) => {
      const nextJobs = state.songJobs.filter((job) => job.jobId !== jobId);
      return {
        songJobs: nextJobs,
        isPlayPending: nextJobs.some((job) => isProcessingJobStatus(job.status)),
      };
    });
  };

  const upsertSongJob = (jobId: string, job: Omit<SongJob, "jobId">) => {
    clearJobCleanupTimer(jobId);

    set((state) => {
      const existingIndex = state.songJobs.findIndex(
        (item) => item.jobId === jobId,
      );

      const nextJob: SongJob = { jobId, ...job };

      if (existingIndex === -1) {
        const nextJobs = [...state.songJobs, nextJob];
        return {
          songJobs: nextJobs,
          isPlayPending: nextJobs.some((item) => isProcessingJobStatus(item.status)),
        };
      }

      const nextJobs = [...state.songJobs];
      nextJobs[existingIndex] = nextJob;
      return {
        songJobs: nextJobs,
        isPlayPending: nextJobs.some((item) => isProcessingJobStatus(item.status)),
      };
    });
  };

  const playVideoStream = async (
    video: YouTubeVideo,
    resolvedDuration: number,
    streamUrl: string,
  ) => {
    const state = get();
    safelyRemovePlayer(state.player);

    set({
      currentVideo: video,
      currentSong: null,
      status: "loading",
      progress: 0,
      duration: resolvedDuration * 1000,
      error: null,
      player: null,
      streamUrl: null,
    });

    set({ streamUrl, lastFetchTime: Date.now() });

    const player = createAudioPlayer(streamUrl);
    player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
      if (get().currentVideo?.videoId !== video.videoId) {
        try {
          player.remove();
        } catch {}
        return;
      }

      set({
        progress: status.currentTime * 1000,
        duration:
          typeof status.duration === "number"
            ? status.duration * 1000
            : resolvedDuration * 1000,
        status: status.playing
          ? "playing"
          : status.didJustFinish
            ? "idle"
            : "paused",
      });

      if (status.didJustFinish) {
        get().stop();
      }
    });

    player.play();
    set({ player, status: "playing" });
  };

  const playLibraryStream = async (
    song: Song,
    streamUrl: string,
  ) => {
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

    set({ streamUrl, lastFetchTime: Date.now() });

    const player = createAudioPlayer(streamUrl);
    player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
      if (get().currentSong?.songId !== song.songId) {
        try {
          player.remove();
        } catch {}
        return;
      }

      set({
        progress: status.currentTime * 1000,
        duration:
          typeof status.duration === "number"
            ? status.duration * 1000
            : song.duration * 1000,
        status: status.playing
          ? "playing"
          : status.didJustFinish
            ? "idle"
            : "paused",
      });

      if (status.didJustFinish) get().stop();
    });

    player.play();
    set({ player, status: "playing" });
  };

  const handleJobStatus = async (jobId: string, res: PlayJobResponse) => {
    console.log("[playerStore] handleJobStatus:", { jobId, res });
    const pendingJob = pendingVideoJobs.get(jobId);

    if (!pendingJob) {
      console.warn("[playerStore] pending job metadata missing:", jobId);
      stopPollingJob(jobId);
      removeSongJob(jobId);
      return;
    }

    if (isProcessingJobStatus(res.status)) {
      upsertSongJob(jobId, {
        title: pendingJob.video.title,
        status: res.status,
        progress: res.progress ?? 0,
      });
      return;
    }

    if (isCompletedJobStatus(res.status) || typeof res.streamUrl === "string") {
      if (typeof res.streamUrl !== "string") {
        stopPollingJob(jobId);
        upsertSongJob(jobId, {
          title: pendingJob.video.title,
          status: res.status,
          progress: res.progress ?? 100,
        });
        set({
          status: "error",
          error: "Playback finished processing but no stream URL was returned.",
        });
        return;
      }

      stopPollingJob(jobId);
      upsertSongJob(jobId, {
        title: pendingJob.video.title,
        status: res.status,
        progress: res.progress ?? 100,
      });
      console.log("[playerStore] starting playback for completed job:", {
        jobId,
        title: pendingJob.video.title,
        streamUrl: res.streamUrl,
      });
      await playVideoStream(
        pendingJob.video,
        pendingJob.duration,
        res.streamUrl,
      );
      scheduleJobRemoval(jobId, removeSongJob);
      return;
    }

    stopPollingJob(jobId);
    upsertSongJob(jobId, {
      title: pendingJob.video.title,
      status: res.status,
      progress: res.progress ?? 0,
    });
    set({
      status: "error",
      error:
        res.message ??
        (isFailedJobStatus(res.status)
          ? "Playback failed while processing this song."
          : `Unexpected job status: ${res.status}`),
    });
  };

  const pollPlayJob = async (jobId: string) => {
    if (jobPollInFlight.has(jobId)) return;

    jobPollInFlight.add(jobId);
    console.log("[playerStore] pollPlayJob:", jobId);

    try {
      const res = await musicApi.getPlayJob(jobId);
      await handleJobStatus(jobId, res);
    } catch (err: any) {
      console.error("[playerStore] pollPlayJob error:", {
        jobId,
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
      });
      const pendingJob = pendingVideoJobs.get(jobId);
      stopPollingJob(jobId);

      if (pendingJob) {
        upsertSongJob(jobId, {
          title: pendingJob.video.title,
          status: "failed",
          progress: 0,
        });
      }

      set({
        status: "error",
        error: err?.message ?? "Playback polling failed",
      });
    } finally {
      jobPollInFlight.delete(jobId);
    }
  };

  const startPollingJob = (jobId: string) => {
    if (jobPollers.has(jobId)) return;

    console.log("[playerStore] startPollingJob:", jobId);
    void pollPlayJob(jobId);

    const interval = setInterval(() => {
      void pollPlayJob(jobId);
    }, JOB_POLL_INTERVAL_MS);

    jobPollers.set(jobId, interval);
  };

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

        await playLibraryStream(song, streamUrl);
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

      safelyRemovePlayer(state.player);

      set({
        status: "loading",
        progress: 0,
        error: null,
        player: null,
        currentVideo: video,
        currentSong: null,
        streamUrl: null,
      });

      try {
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

        console.log("[playerStore] /songs/play normalized result:", {
          videoId: video.videoId,
          title: video.title,
          res,
        });

        if (res.type === "ready") {
          await playVideoStream(video, resolvedDuration ?? 180, res.streamUrl);
          return;
        }

        pendingVideoJobs.set(res.jobId, {
          video,
          duration: resolvedDuration ?? 180,
        });
        console.log("[playerStore] queued job metadata:", {
          jobId: res.jobId,
          videoId: video.videoId,
          title: video.title,
          duration: resolvedDuration ?? 180,
        });

        upsertSongJob(res.jobId, {
          title: video.title,
          status: "queued",
          progress: 0,
        });

        set({
          currentVideo: null,
          status: "idle",
          progress: 0,
          duration: 0,
          streamUrl: null,
        });

        startPollingJob(res.jobId);
      } catch (err: any) {
        console.error("[playerStore] playFromYouTube error detailing:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          stack: err.stack,
        });

        if (get().currentVideo?.videoId === video.videoId) {
          set({
            status: "error",
            error: err?.message ?? "Playback failed",
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
        isPlayPending: get().songJobs.some(
          (job) => isProcessingJobStatus(job.status),
        ),
      });
    },

    dismissSongJob: (jobId: string) => {
      removeSongJob(jobId);
    },

    cleanupSongJobs: () => {
      for (const jobId of [...jobPollers.keys()]) {
        stopPollingJob(jobId);
      }

      for (const [jobId, timeout] of jobCleanupTimers.entries()) {
        clearTimeout(timeout);
        jobCleanupTimers.delete(jobId);
      }

      set({ songJobs: [], isPlayPending: false });
    },
  };
});
