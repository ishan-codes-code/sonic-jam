import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePlayer } from '@/features/playback/hooks/usePlayer';
import { toastImperative } from '@/features/Toast/utils/toastSingleton';
import { checkServerConnection } from '../api/serverValidation';
import { useServerStore } from '../store/serverStore';
import {
  isLocalHostUrl,
  normalizeServerUrl,
  validateServerUrl,
} from '../utils/serverConfig';
import { performServerSwitch } from '../utils/serverSwitch';

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
      // Shared atomic switch (ADR 0002): reset → setServer → recreatePlayer.
      await performServerSwitch(validatedUrl, {
        queryClient,
        stopPlayback: stop,
      });

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
