import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { tokenStorage } from '@/features/auth/utils/tokenStorage';
import { cancelAllJobPolling } from '@/features/playback/services/pollingResolver';
import { setProgressSyncToken } from '@/features/playback/hooks/useProgressSyncAuth';
import { usePlayer } from '@/features/playback/hooks/usePlayer';
import { recreatePlayer } from '@/features/playback/services/playerSetup';
import {
  cancelSmartQueueWork,
  resetSmartQueueRadio,
} from '@/features/playback/services/smartQueueService';
import { resetPlaybackRecovery } from '@/features/playback/components/PlaybackSync';
import { useJobStore } from '@/features/playback/store/useJobStore';
import { toastImperative } from '@/features/Toast/utils/toastSingleton';
import { checkServerConnection } from '../api/serverValidation';
import { useServerStore } from '../store/serverStore';
import {
  isLocalHostUrl,
  normalizeServerUrl,
  validateServerUrl,
} from '../utils/serverConfig';

export type ServerSwitchPhase =
  | 'editing'
  | 'validating'
  | 'confirm'
  | 'switching';

/**
 * Server-switch form state + the atomic session reset (ADR 0002).
 *
 * Flow: validate format → reject same-URL → checkServerConnection() →
 * explicit confirm → reset everything old → setServer(new) → recreatePlayer().
 *
 * The reset reuses the existing logout/session conventions: stop() is the same
 * path AuthGuard uses, tokens end via the same clearTokens()+resetAuth()
 * sequence as the 401 interceptor, and AuthGuard routes to /login on the
 * resulting unauthenticated status. Nothing is reset on validation failure or
 * cancel, and the current server stays applied until the switch succeeds.
 */
export function useServerSwitch() {
  const currentUrl = useServerStore((s) => s.serverUrl);
  const setServer = useServerStore((s) => s.setServer);
  const queryClient = useQueryClient();
  const { stop } = usePlayer();

  const [url, setUrlState] = useState(currentUrl ?? '');
  const [phase, setPhase] = useState<ServerSwitchPhase>('editing');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [validatedUrl, setValidatedUrl] = useState<string | null>(null);

  function setUrl(next: string) {
    setUrlState(next);
    setFieldError(null);
    // Editing after validation invalidates the confirmation.
    if (phase === 'confirm') {
      setPhase('editing');
      setValidatedUrl(null);
    }
  }

  const showLocalhostHint = useMemo(() => isLocalHostUrl(url), [url]);

  async function handleValidate() {
    setFieldError(null);

    const formatError = validateServerUrl(url);
    if (formatError) {
      setFieldError(formatError);
      return;
    }

    const normalized = normalizeServerUrl(url);
    if (normalized && normalized === currentUrl) {
      setFieldError('This is already your current server.');
      return;
    }

    setPhase('validating');
    try {
      const result = await checkServerConnection(url);
      if (!result.ok) {
        setFieldError(result.message);
        setPhase('editing');
        return;
      }
      setValidatedUrl(result.serverUrl);
      setPhase('confirm');
    } catch {
      setFieldError(
        "Couldn't reach that server. Check the URL and try again.",
      );
      setPhase('editing');
    }
  }

  function handleCancelConfirm() {
    setValidatedUrl(null);
    setFieldError(null);
    setPhase('editing');
  }

  async function handleConfirmSwitch() {
    if (!validatedUrl || phase === 'switching') return;
    setPhase('switching');
    setFieldError(null);

    try {
      // 1. Stop playback via the same path AuthGuard uses on logout
      //    (native stop + queue clear + playback store reset incl. trackMap).
      //    RNTP v5 stop()/clear() are synchronous, so teardown dispatches in
      //    order; the await sequences it before the reset steps below.
      await stop();

      // 2. Freeze in-flight work so old-server results cannot land in the
      //    fresh session (poll loops throw a filtered cancellation error).
      cancelAllJobPolling();
      cancelSmartQueueWork();

      // 3. Clear playback-side session state: smart radio (+ module
      //    singletons), job registry, recovery history, sync headers.
      resetSmartQueueRadio();
      useJobStore.getState().clearJobs();
      resetPlaybackRecovery();
      await setProgressSyncToken(null);

      // 4. Drop every server-derived React Query cache entry.
      queryClient.clear();

      // 5. End the old-server session (same sequence as the 401 interceptor).
      await tokenStorage.clearTokens();
      useAuthStore.getState().resetAuth();

      // 6. Persist + apply the new server only now that nothing old remains.
      await setServer(validatedUrl);

      // 7. Re-point the native player (incl. the baked progress-sync URL) at
      //    the new server. Best-effort: a failure leaves the setup guard open
      //    so the next ensureSetup() retries.
      await recreatePlayer();

      toastImperative.show({
        type: 'success',
        text1: 'Server switched. Please sign in.',
        visibilityTime: 4000,
      });
      // AuthGuard routes to /login on the unauthenticated status.
    } catch {
      // All steps are idempotent, so staying on the confirm step allows a
      // retry. The current server is untouched unless setServer() succeeded.
      setPhase('confirm');
      const message =
        "Couldn't finish switching servers. Please try again.";
      setFieldError(message);
      toastImperative.show({
        type: 'error',
        text1: message,
        visibilityTime: 4000,
      });
    }
  }

  return {
    currentUrl,
    url,
    setUrl,
    phase,
    fieldError,
    validatedUrl,
    showLocalhostHint,
    handleValidate,
    handleCancelConfirm,
    handleConfirmSwitch,
  };
}
