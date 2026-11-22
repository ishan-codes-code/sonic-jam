import { useAuthStore } from '@/features/auth/store/authStore';
import { tokenStorage } from '@/features/auth/utils/tokenStorage';
import { resetPlaybackRecovery } from '@/features/playback/components/PlaybackSync';
import { setProgressSyncToken } from '@/features/playback/hooks/useProgressSyncAuth';
import { recreatePlayer } from '@/features/playback/services/playerSetup';
import { cancelAllJobPolling } from '@/features/playback/services/pollingResolver';
import {
  cancelSmartQueueWork,
  resetSmartQueueRadio,
} from '@/features/playback/services/smartQueueService';
import { useJobStore } from '@/features/playback/store/useJobStore';
import type { QueryClient } from '@tanstack/react-query';
import { useServerStore } from '../store/serverStore';

export interface ServerSwitchDeps {
  queryClient: QueryClient;
  stopPlayback: () => void;
}

/**
 * Atomic server switch (ADR 0002): invalidate old-server work, stop playback,
 * clear session state, persist + apply the new server, re-point the player.
 *
 * Used by both switch entry points (`useServerSwitch` confirm step and the
 * Login → Server Setup review path) so there is exactly one reset sequence.
 * Every step is idempotent, so a failure can be retried safely. Callers pass
 * the React-bound deps (`useQueryClient()`, `usePlayer().stop`).
 *
 * @param serverUrl validated + normalized new server URL.
 */
export async function performServerSwitch(
  serverUrl: string,
  deps: ServerSwitchDeps,
): Promise<void> {
  // 1. Invalidate old-server work synchronously, before the first await,
  //    so nothing in flight can land once the switch begins (poll loops
  //    throw a filtered cancellation error; radio/recovery check theirs).
  cancelAllJobPolling();
  cancelSmartQueueWork();
  resetSmartQueueRadio();
  useJobStore.getState().clearJobs();
  resetPlaybackRecovery();

  // 2. Stop playback via the same path AuthGuard uses on logout
  //    (native stop + queue clear + playback store reset incl. trackMap).
  //    RNTP v5 stop()/clear() are synchronous, so teardown dispatches in
  //    order; the await sequences it before the reset steps below.
  await deps.stopPlayback();

  // 3. Clear the native progress-sync auth header.
  await setProgressSyncToken(null);

  // 4. Drop every server-derived React Query cache entry.
  deps.queryClient.clear();

  // 5. End the old-server session (same sequence as the 401 interceptor).
  await tokenStorage.clearTokens();
  useAuthStore.getState().resetAuth();

  // 6. Persist + apply the new server only now that nothing old remains.
  await useServerStore.getState().setServer(serverUrl);

  // 7. Re-point the native player (incl. the baked progress-sync URL) at
  //    the new server. Best-effort: a failure leaves the setup guard open
  //    so the next ensureSetup() retries.
  await recreatePlayer();
}
