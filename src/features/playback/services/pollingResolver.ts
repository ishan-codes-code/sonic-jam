import { playbackApi } from "@/features/playback/api/playback.api";
import type { PlayJobResponse, ResolvedStream } from "../types";
import { useJobStore } from "../store/useJobStore";
import {
  isJobPollingCancelled,
  JobPollingCancelledError,
} from "./jobCancellation";
import { isRateLimitError, parseRateLimitDelayMs } from "./rateLimit";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_TIMEOUT = 300000; // 5 min (important timeout fallback)

// ─── Session generation ─────────────────────────────────────────────────────
// Bumped by cancelAllJobPolling() during the server-switch session reset so
// old-server polls stop before they can write into new-server state. The loop
// checks the generation on every iteration and throws JobPollingCancelledError,
// which resolveStream callers must let through silently (see usePlayer).

let pollingGeneration = 0;

/** Invalidate every in-flight pollJobStatus() loop. Never throws. */
export function cancelAllJobPolling(): void {
  pollingGeneration++;
}

/**
 * Current polling generation. Stream resolution captures this BEFORE its
 * initial `/songs/play` request and passes it back into pollJobStatus(), so a
 * pre-poll response that arrives after a server switch is rejected instead of
 * starting a poll (or resurrecting job state) for the new session.
 */
export function getPollingGeneration(): number {
  return pollingGeneration;
}

// Re-exported so every existing importer keeps working unchanged.
export { isJobPollingCancelled, JobPollingCancelledError };

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sleep that stays responsive to cancellation: wakes in slices to re-check,
 * so a server switch or playlist replacement aborts a long rate-limit wait
 * instead of sleeping through it.
 */
const sleepCancellable = async (
  ms: number,
  isCancelled: () => boolean,
): Promise<void> => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (isCancelled()) {
      throw new JobPollingCancelledError();
    }
    await sleep(Math.min(1000, Math.max(0, end - Date.now())));
  }
  if (isCancelled()) {
    throw new JobPollingCancelledError();
  }
};

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

/**
 * Poll a download job to completion. `shouldAbort` (playlist pending-track
 * resolutions) aborts the loop with JobPollingCancelledError just like a
 * server switch — same silent treatment by callers, no failed marking.
 */
export async function pollJobStatus(
  jobId: string,
  expectedGeneration?: number,
  shouldAbort?: () => boolean,
): Promise<ResolvedStream> {
  let startTime = Date.now();
  let pollCount = 0;
  const jobStore = useJobStore.getState();
  const generation = pollingGeneration;

  // The resolve operation started before the initial `/songs/play` request on
  // an older generation: the server switched mid-flight. Reject before any
  // poll or job-store write can touch the new session.
  if (
    expectedGeneration !== undefined &&
    expectedGeneration !== generation
  ) {
    throw new JobPollingCancelledError();
  }

  while (Date.now() - startTime < MAX_TIMEOUT) {
    if (generation !== pollingGeneration || shouldAbort?.()) {
      throw new JobPollingCancelledError();
    }

    let response: PlayJobResponse | null = null;

    try {
      response = await playbackApi.getJob(jobId);
      if (generation !== pollingGeneration || shouldAbort?.()) {
        throw new JobPollingCancelledError();
      }
    } catch (error: any) {
      // Cancellation is not a server error: let it through without marking
      // the (already cleared) job failed.
      if (isJobPollingCancelled(error)) {
        throw error;
      }
      // A fetch that was in flight during a server switch rejects here with
      // an old-server error: never mark the job failed (the registry was
      // already cleared and the write would resurrect it). Same for an
      // owner-aborted poll (e.g. its playlist was replaced): the failure
      // belongs to no live run, so it must not mark anything either.
      if (generation !== pollingGeneration || shouldAbort?.()) {
        throw new JobPollingCancelledError();
      }
      // HTTP 429 is temporary (API rate limit): wait it out like the busy
      // path — honor Retry-After (exact or suffixed header, else body
      // seconds), otherwise back off on the poll-stage interval. The wait
      // never marks the job failed and never counts against its timeout.
      if (isRateLimitError(error)) {
        const headerDelayMs = parseRateLimitDelayMs(error);
        const delayMs = headerDelayMs ?? getNextPollInterval(pollCount);
        if (headerDelayMs === null) {
          // No server direction: escalate subsequent waits instead of
          // hammering at a fixed pace.
          pollCount++;
        }
        const delaySec = Math.max(1, Math.ceil(delayMs / 1000));
        jobStore.updateJob(jobId, {
          status: "waiting",
          error: `Rate limited. Retrying in ${delaySec}s...`,
        });
        console.warn(
          `[pollingResolver] HTTP 429 for job ${jobId}: waiting ${delaySec}s before next poll...`,
        );
        // Pause max timeout by shifting startTime forward by the sleep duration
        startTime += delayMs;
        await sleepCancellable(
          delayMs,
          () => generation !== pollingGeneration || shouldAbort?.() === true,
        );
        continue;
      }
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
  if (generation !== pollingGeneration || shouldAbort?.()) {
    throw new JobPollingCancelledError();
  }
  jobStore.updateJob(jobId, {
    status: "failed",
    error: timeoutMsg,
  });
  throw new Error(timeoutMsg);
}
