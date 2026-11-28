import { pollJobStatus } from './pollingResolver';
import type { ResolvedStream } from '../types';

/**
 * Abstraction layer for resolving asynchronous playback jobs.
 * 
 * This acts as the single entry point for any 'job' response from the backend.
 * Currently uses polling, but can be replaced with WebSockets or other 
 * implementations in the future without changing the business logic.
 */
export async function resolveJob(
    jobId: string,
    expectedGeneration?: number,
    shouldAbort?: () => boolean,
): Promise<ResolvedStream> {
    return pollJobStatus(jobId, expectedGeneration, shouldAbort);
}
