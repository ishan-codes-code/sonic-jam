import { useJobStore } from "@/features/playback";
import { useEffect, useMemo, useState } from "react";
import type { ProcessingSectionKey, ProcessingSectionOption } from "../types";
import { PROCESSING_TICK_MS } from "../utils/progress";

export function useProcessingJobs(activeSection: ProcessingSectionKey) {
  const jobsMap = useJobStore((state) => state.jobs);

  const jobs = useMemo(
    () => Object.values(jobsMap).sort((a, b) => b.createdAt - a.createdAt),
    [jobsMap]
  );

  const processing = useMemo(
    () => jobs.filter((job) => job.status === "waiting" || job.status === "active"),
    [jobs]
  );
  const completed = useMemo(
    () => jobs.filter((job) => job.status === "completed" && job.song),
    [jobs]
  );
  const failed = useMemo(() => jobs.filter((job) => job.status === "failed"), [jobs]);

  const sectionOptions = useMemo<ProcessingSectionOption[]>(
    () => [
      { key: "processing", label: "Processing", count: processing.length },
      { key: "completed", label: "Completed", count: completed.length },
      { key: "failed", label: "Failed", count: failed.length },
    ],
    [completed.length, failed.length, processing.length]
  );

  const activeJobs = useMemo(() => {
    switch (activeSection) {
      case "completed":
        return completed;
      case "failed":
        return failed;
      case "processing":
      default:
        return processing;
    }
  }, [activeSection, completed, failed, processing]);

  return {
    activeJobs,
    sectionOptions,
  };
}
