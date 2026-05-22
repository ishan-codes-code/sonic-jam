import type { JobItem, JobStatus } from "@/features/playback";

const FAKE_PROGRESS_MS = 16000;
const ACTIVE_HOLD_PERCENT = 95;
const WAITING_HOLD_PERCENT = 90;
const MAX_FAKE_PROGRESS_PERCENT = 99;

export const PROCESSING_TICK_MS = 500;

export function getDisplayStatus(status: JobStatus) {
  switch (status) {
    case "waiting":
      return "Queued";
    case "active":
      return "Processing";
    case "completed":
      return "Ready";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function getFakeProgress(job: JobItem, now: number) {
  if (job.status === "completed") return 100;
  if (job.status === "failed") return 0;

  const elapsed = Math.max(0, now - job.createdAt);
  const firstStageCap = job.status === "waiting" ? WAITING_HOLD_PERCENT : ACTIVE_HOLD_PERCENT;
  const firstStageProgress = Math.min((elapsed / FAKE_PROGRESS_MS) * firstStageCap, firstStageCap);

  if (job.status === "waiting" || elapsed <= FAKE_PROGRESS_MS) {
    return Math.round(firstStageProgress);
  }

  const tailElapsed = elapsed - FAKE_PROGRESS_MS;
  const tailRange = MAX_FAKE_PROGRESS_PERCENT - ACTIVE_HOLD_PERCENT;
  const tailProgress = Math.min((tailElapsed / FAKE_PROGRESS_MS) * tailRange, tailRange);

  return Math.round(ACTIVE_HOLD_PERCENT + tailProgress);
}
