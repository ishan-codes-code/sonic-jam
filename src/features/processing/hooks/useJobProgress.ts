import { useEffect, useState } from "react";
import type { JobItem } from "@/features/playback";
import { getFakeProgress, PROCESSING_TICK_MS } from "../utils/progress";

/**
 * Hook to manage individual job progress without re-rendering the entire list.
 * Calculates fake progress based on job creation time and status.
 */
export function useJobProgress(job: JobItem) {
  const [progress, setProgress] = useState(() => getFakeProgress(job, Date.now()));

  useEffect(() => {
    // If the job is finished, set final state and stop ticking
    if (job.status === "completed" || job.status === "failed") {
      setProgress(job.status === "completed" ? 100 : 0);
      return;
    }

    // Tick the progress every PROCESSING_TICK_MS
    const timer = setInterval(() => {
      setProgress(getFakeProgress(job, Date.now()));
    }, PROCESSING_TICK_MS);

    return () => clearInterval(timer);
  }, [job.status, job.createdAt, job.jobId]);

  return progress;
}
