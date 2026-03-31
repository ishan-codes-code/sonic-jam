import { PlayJobResponse, musicApi } from "../api/musicApi";
import { playTrack } from "./player.engine";
import {
  isCompletedJobStatus,
  isFailedJobStatus,
  isProcessingJobStatus,
} from "./player.helpers";
import { InternalJob } from "./player.types";

const JOB_POLL_INTERVAL_MS = 20_000;

const jobPollers = new Map<string, ReturnType<typeof setInterval>>();
const jobPollInFlight = new Set<string>();
const jobErrorCount = new Map<string, number>();
const jobsMap = new Map<string, InternalJob>();

const removeJob = (jobId: string) => {
  jobsMap.delete(jobId);
};

export const syncSongJobsFromMap = (set: (state: any) => void) => {
  const jobsArray = Array.from(jobsMap.values());

  // Sort by createdAt descending (latest first)
  jobsArray.sort((a, b) => b.createdAt - a.createdAt);

  const visibleJobs = jobsArray.map((job) => ({
    jobId: job.jobId,
    title: job.video.title,
    youtubeId: job.video.videoId,
    status: job.status,
    progress: job.progress,
    duration: job.duration,
    createdAt: job.createdAt,
  }));

  set({
    songJobs: visibleJobs,
    isPlayPending: visibleJobs.some((job) => isProcessingJobStatus(job.status)),
  });
};

export const upsertJob = (jobId: string, updates: Partial<InternalJob>) => {
  const existing = jobsMap.get(jobId);

  const next: InternalJob = {
    jobId,
    video: updates.video ?? existing?.video!,
    duration: updates.duration ?? existing?.duration!,
    status: updates.status ?? existing?.status ?? "queued",
    progress: updates.progress ?? existing?.progress ?? 0,
    streamUrl: updates.streamUrl ?? existing?.streamUrl,
    createdAt: existing?.createdAt ?? Date.now(),
  };

  jobsMap.set(jobId, next);
};

export const stopPollingJob = (jobId: string) => {
  console.log("[playerStore] stopPollingJob:", jobId);
  const poller = jobPollers.get(jobId);
  if (poller) {
    clearInterval(poller);
    jobPollers.delete(jobId);
  }

  jobPollInFlight.delete(jobId);
};

export const handleJobStatus = async (
  jobId: string,
  res: PlayJobResponse,
  get: () => any,
  set: (state: any) => void,
) => {
  console.log("[playerStore] handleJobStatus:", { jobId, res });
  const job = jobsMap.get(jobId);
  if (!job) return;

  if (isProcessingJobStatus(res.status)) {
    upsertJob(jobId, {
      status: res.status,
      progress: res.progress ?? 0,
    });
    syncSongJobsFromMap(set);
    return;
  }

  if (isCompletedJobStatus(res.status) || typeof res.streamUrl === "string") {
    if (typeof res.streamUrl !== "string") {
      stopPollingJob(jobId);
      upsertJob(jobId, {
        status: res.status,
        progress: 100,
        streamUrl: res.streamUrl,
      });
      syncSongJobsFromMap(set);
      set({
        status: "error",
        error: "Playback finished processing but no stream URL was returned.",
      });
      return;
    }

    stopPollingJob(jobId);
    upsertJob(jobId, {
      status: res.status,
      progress: 100,
      streamUrl: res.streamUrl,
    });
    syncSongJobsFromMap(set);
    console.log("[playerStore] starting playback for completed job:", {
      jobId,
      title: job.video.title,
      streamUrl: res.streamUrl,
    });
    const { pendingTrack } = get();
    if (pendingTrack?.youtubeId === job.video.videoId) {
      set({ pendingTrack: null });
      await playTrack(
        get,
        set,
        {
          id: job.jobId,
          title: job.video.title,
          youtubeId: job.video.videoId,
          duration: job.duration,
        },
        res.streamUrl,
      );
    } else {
      get().showToast({
        title: "Song ready",
        subtitle: job.video.title,
        action: {
          label: "Play",
          onPress: () => get().playCompletedJob(jobId),
        },
      });
    }
    return;
  }

  stopPollingJob(jobId);
  upsertJob(jobId, {
    status: res.status,
    progress: 0,
  });
  syncSongJobsFromMap(set);
  set({
    status: "error",
    error:
      res.message ??
      (isFailedJobStatus(res.status)
        ? "Playback failed while processing this song."
        : `Unexpected job status: ${res.status}`),
  });
};

export const pollPlayJob = async (
  jobId: string,
  get: () => any,
  set: (state: any) => void,
  handleJobStatus: (
    jobId: string,
    res: PlayJobResponse,
    get: () => any,
    set: (state: any) => void,
  ) => Promise<void>,
) => {
  if (jobPollInFlight.has(jobId)) return;

  jobPollInFlight.add(jobId);
  console.log("[playerStore] pollPlayJob:", jobId);

  try {
    const res = await musicApi.getPlayJob(jobId);
    await handleJobStatus(jobId, res, get, set);
  } catch (err: any) {
    console.error("[playerStore] pollPlayJob error:", {
      jobId,
      message: err?.message,
      response: err?.response?.data,
      status: err?.response?.status,
    });

    const count = jobErrorCount.get(jobId) ?? 0;

    if (count < 3) {
      jobErrorCount.set(jobId, count + 1);
      console.log(`[playerStore] retrying job ${jobId}, attempt ${count + 1}`);
      return; // retry next interval
    }

    const job = jobsMap.get(jobId);
    stopPollingJob(jobId);

    if (job) {
      upsertJob(jobId, {
        status: "failed",
        progress: 0,
      });
      syncSongJobsFromMap(set);
    }

    set({
      status: "error",
      error: err?.message ?? "Playback polling failed",
    });
  } finally {
    jobPollInFlight.delete(jobId);
  }
};

export const startPollingJob = (
  jobId: string,
  pollPlayJob: (jobId: string) => Promise<void>,
) => {
  if (jobPollers.has(jobId)) return;

  console.log("[playerStore] startPollingJob:", jobId);
  void pollPlayJob(jobId);

  const interval = setInterval(() => {
    void pollPlayJob(jobId);
  }, JOB_POLL_INTERVAL_MS);

  jobPollers.set(jobId, interval);
};

export const dismissSongJob = (jobId: string, set: (state: any) => void) => {
  stopPollingJob(jobId);
  removeJob(jobId);
  syncSongJobsFromMap(set);
};

export const cleanupSongJobs = (set: (state: any) => void) => {
  for (const jobId of Array.from(jobPollers.keys())) {
    stopPollingJob(jobId);
  }

  jobsMap.clear();
  set({ songJobs: [], isPlayPending: false });
};

export const getJob = (jobId: string) => jobsMap.get(jobId);
