import { resetPlaybackRecovery } from '@/features/playback/components/PlaybackSync';
import { cancelPlaylistResolution } from '@/features/playback/services/playlistPendingService';
import { cancelAllJobPolling } from '@/features/playback/services/pollingResolver';
import {
  cancelSmartQueueWork,
  resetSmartQueueRadio,
} from '@/features/playback/services/smartQueueService';
import { useJobStore } from '@/features/playback/store/useJobStore';
import type { QueryClient } from '@tanstack/react-query';

export interface AdminStorageResetDeps {
  queryClient: QueryClient;
  stopPlayback: () => void | Promise<void>;
}

/**
 * Playback/data reset for an admin storage save on the SAME server.
 *
 * Mirrors the playback half of performServerSwitch() in the same order —
 * invalidate in-flight work, stop playback (native stop + queue clear +
 * playback store reset incl. trackMap), drop the server-derived caches — but
 * deliberately KEEPS the session, so it must never call it:
 *
 * - no session-generation bump (in-flight token refreshes stay valid: same
 *   server, same tokens — bumping would only fail queued requests);
 * - no token clear and no auth reset (the user stays logged in);
 * - no server change (the URL is untouched);
 * - no progress-sync header clear (sync resumes with the kept token);
 * - no player recreate (all baked URLs are unchanged).
 *
 * Every step is idempotent, so the unknown-result path (reset → server check
 * → resubmit) can safely run it again on retry.
 */
export async function resetPlaybackForStorageChange(
  deps: AdminStorageResetDeps,
): Promise<void> {
  cancelAllJobPolling();
  cancelPlaylistResolution();
  cancelSmartQueueWork();
  resetSmartQueueRadio();
  useJobStore.getState().clearJobs();
  resetPlaybackRecovery();

  await deps.stopPlayback();

  deps.queryClient.clear();
}
