import { pollJobStatus } from './pollingResolver';
import { ResolvedStream } from './types';

/**
 * Abstraction layer for resolving asynchronous playback jobs.
 * 
 * This acts as the single entry point for any 'job' response from the backend.
 * Currently uses polling, but can be replaced with WebSockets or other 
 * implementations in the future without changing the business logic.
 */
export async function resolveJob(jobId: string): Promise<ResolvedStream> {
    return pollJobStatus(jobId);
}
