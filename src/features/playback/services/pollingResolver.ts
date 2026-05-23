import { playbackApi } from "@/features/playback/api/playback.api";
import type { PlayJobResponse, ResolvedStream } from "../types";
import { useJobStore } from "../store/useJobStore";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_TIMEOUT = 300000; // 5 min (important timeout fallback)

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculates the next poll sleep interval based on the number of completed polls.
 * 
 * Schedule:
 * - Poll #1 (0s since start)  -> Sleep 2s
 * - Poll #2 (2s since start)  -> Sleep 2s
 * - Poll #3 (4s since start)  -> Sleep 11s (Dead Zone: 4s to 15s)
 * - Poll #4 (15s since start) -> Sleep 2s  (15s to 17s)
 * - Poll #5 (17s since start) -> Sleep 4s  (17s to 21s)
 * - Poll #6 (21s since start) -> Sleep 6s  (21s to 27s)
 * - Poll #7 (27s since start) -> Sleep 8s  (27s to 35s)
 * - Poll #8+ (35s since start onwards) -> Sleep 10s (capped)
 */
function getNextPollInterval(pollCount: number): number {
  if (pollCount <= 1) {
    return 2000; // Sleep after Poll #1: 2s (reaches 2s)
  }
  if (pollCount === 2) {
    return 2000; // Sleep after Poll #2: 2s (reaches 4s)
  }
  if (pollCount === 3) {
    return 11000; // Sleep after Poll #3: 11s (Dead Zone: reaches 15s)
  }
  
  // For Poll #4 onwards: backoff starting at 2s, increasing by 2s each stage, capped at 10s
  const baseInterval = 2000;
  const backoffFactor = pollCount - 4; // 0 for poll #4, 1 for poll #5, etc.
  return Math.min(baseInterval + backoffFactor * 2000, 10000);
}

// ─── Implementation ─────────────────────────────────────────────────────────

export async function pollJobStatus(jobId: string): Promise<ResolvedStream> {
  let startTime = Date.now();
  let pollCount = 0;
  const jobStore = useJobStore.getState();

  while (Date.now() - startTime < MAX_TIMEOUT) {
    let response: PlayJobResponse | null = null;

    try {
      response = await playbackApi.getJob(jobId);
    } catch (error: any) {
      const isInternetDrop =
        !error.response ||
        error.code === "ERR_NETWORK" ||
        error.message?.includes("Network Error") ||
        error.message?.includes("network");

      if (isInternetDrop) {
        console.warn(
          "[pollingResolver] Poll network error (internet drop), retrying...",
          error.message,
        );
        // Sleep using the current stage interval so we don't spam during device offline
        const currentInterval = getNextPollInterval(pollCount);
        await sleep(currentInterval);
        continue;
      }

      // Real server error (e.g. 500, 502 Bad Gateway, 404, etc.) - do not retry
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to poll job status";
      jobStore.updateJob(jobId, {
        status: "failed",
        error: errorMsg,
      });
      throw error;
    }

    if (!response) {
      const currentInterval = getNextPollInterval(pollCount);
      await sleep(currentInterval);
      continue;
    }

    // Handle busy worker status with custom retry-after sleep
    if (response.status === "busy") {
      const retryAfter = (response as any).retryAfter ?? 5;

      jobStore.updateJob(jobId, {
        status: "waiting",
        error: `Worker busy. Retrying in ${retryAfter}s...`,
      });

      console.log(
        `[pollingResolver] Worker busy. Sleeping for ${retryAfter}s before next poll...`,
      );
      // Pause max timeout by shifting startTime forward by the sleep duration
      startTime += retryAfter * 1000;
      await sleep(retryAfter * 1000);
      pollCount = 0; // Reset completed count to trigger rapid poll stages when free
      continue;
    }

    // Success response - increment completed poll count
    pollCount++;

    // First successful poll (that isn't completed/failed yet) marks it as active/processing
    if (
      response.status !== "completed" &&
      response.status !== "finished" &&
      response.status !== "failed"
    ) {
      jobStore.updateJob(jobId, {
        status: "active",
        progress: response.progress,
      });
    }

    if (response.status === "completed" || response.status === "finished") {
      if (!response.song || !response.playbackToken) {
        throw new Error("Job completed but song or playbackToken is missing");
      }

      jobStore.updateJob(jobId, {
        status: "completed",
        progress: 100,
        song: response.song,
      });

      return {
        song: response.song,
        playbackToken: response.playbackToken,
      };
    }

    if (response.status === "failed") {
      const errorMsg = response.message || "Job failed";
      jobStore.updateJob(jobId, {
        status: "failed",
        error: errorMsg,
      });
      throw new Error(errorMsg);
    }

    // pending/waiting - sleep for calculated backoff interval
    const nextInterval = getNextPollInterval(pollCount);
    await sleep(nextInterval);
  }

  const timeoutMsg = "Job timeout";
  jobStore.updateJob(jobId, {
    status: "failed",
    error: timeoutMsg,
  });
  throw new Error(timeoutMsg);
}
