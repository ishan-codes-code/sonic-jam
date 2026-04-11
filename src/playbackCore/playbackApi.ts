import { musicApi } from '@/src/api/musicApi';
import type { PlaySongDto, PlayResponseDto, ResolvedStream } from './types';
import { resolveJob } from './jobResolver';

export const STREAM_URL_TTL_MS = 5 * 60 * 1000;       // 5 minutes (matches backend)
export const STREAM_URL_BUFFER_MS = 30 * 1000;         // 30 second safety buffer


export async function resolveStream(
    payload: PlaySongDto,
    options?: { onJob?: (jobId: string) => void }
): Promise<ResolvedStream> {
    const response: PlayResponseDto = await musicApi.play(payload);

    if (response.type === 'job') {
        options?.onJob?.(response.jobId);
        return resolveJob(response.jobId);
    }

    // response.type === 'ready'
    return {
        streamUrl: response.streamUrl,
        streamUrlExpiresAt: Date.now() + STREAM_URL_TTL_MS - STREAM_URL_BUFFER_MS,
        song: response.song,
    };
}

export function isStreamExpired(streamUrlExpiresAt: number | null): boolean {
    if (streamUrlExpiresAt === null) return true;
    return Date.now() >= streamUrlExpiresAt;
}