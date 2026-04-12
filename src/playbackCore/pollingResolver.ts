import { musicApi } from '@/src/api/musicApi';
import { PlayJobResponse, ResolvedStream } from './types';
import { useJobStore } from './useJobStore';

// ─── Constants ──────────────────────────────────────────────────────────────

export const STREAM_URL_TTL_MS = 5 * 60 * 1000;       // 5 minutes (matches backend)
export const STREAM_URL_BUFFER_MS = 30 * 1000;

const INITIAL_POLL_INTERVAL = 4000;  // start fast (4s)
const MAX_POLL_INTERVAL = 10000;     // cap at 10s
const BACKOFF_STEP = 2000;           // increase by 2s
const MAX_TIMEOUT = 300000;          // 5 min (important)

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Implementation ─────────────────────────────────────────────────────────

export async function pollJobStatus(jobId: string): Promise<ResolvedStream> {
    const startTime = Date.now();
    let currentInterval = INITIAL_POLL_INTERVAL;
    const jobStore = useJobStore.getState();

    while (Date.now() - startTime < MAX_TIMEOUT) {
        let response: PlayJobResponse | null = null;

        try {
            response = await musicApi.getJob(jobId);
        } catch (error: any) {
            console.warn('[pollingResolver] Poll network error, retrying...', error);
            await sleep(currentInterval);
            continue;
        }

        // First successful poll (that isn't completed/failed yet) marks it as active/processing
        if (response.status !== 'completed' && response.status !== 'failed') {
            jobStore.updateJob(jobId, {
                status: 'active',
                progress: response.progress
            });
        }

        if (response.status === 'completed') {
            const res = response as Extract<PlayJobResponse, { status: 'completed' }>;

            // Sync to job store
            jobStore.updateJob(jobId, {
                status: 'completed',
                streamUrl: res.streamUrl,
                song: res.song,
            });

            return {
                streamUrl: res.streamUrl,
                streamUrlExpiresAt: Date.now() + STREAM_URL_TTL_MS - STREAM_URL_BUFFER_MS,
                song: res.song,
            };
        }

        if (response.status === 'failed') {
            const errorMsg = response.message || 'Job failed';
            jobStore.updateJob(jobId, {
                status: 'failed',
                error: errorMsg,
            });
            throw new Error(errorMsg);
        }

        // pending/waiting
        await sleep(currentInterval);

        // Progressive backoff (start fast, get slower)
        currentInterval = Math.min(
            currentInterval + BACKOFF_STEP,
            MAX_POLL_INTERVAL
        );
    }

    const timeoutMsg = 'Job timeout';
    jobStore.updateJob(jobId, {
        status: 'failed',
        error: timeoutMsg,
    });
    throw new Error(timeoutMsg);
}
