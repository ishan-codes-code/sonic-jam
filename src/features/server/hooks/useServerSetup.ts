import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { usePlayer } from '@/features/playback/hooks/usePlayer';
import { toastImperative } from '@/features/Toast/utils/toastSingleton';
import { checkServerConnection } from '../api/serverValidation';
import { useServerStore } from '../store/serverStore';
import {
  BAKED_SERVER_URL,
  isLocalHostUrl,
  validateServerUrl,
} from '../utils/serverConfig';
import { performServerSwitch } from '../utils/serverSwitch';
import {
  createAttemptGuard,
  isReviewUnchanged,
  planConnectResult,
} from '../utils/setupNavigation';

export function useServerSetup() {
  // Review mode (reached from Login) has a configured server: prefill it so
  // the user can inspect or change it. First launch falls back to the baked
  // URL as before; the user must still press Connect either way.
  const currentUrl = useServerStore((s) => s.serverUrl);
  // Captured once: review mode is a property of how this screen was reached,
  // not of the current store state (first launch also has a URL persisted by
  // the time a wizard back-out returns here — that is still first launch,
  // and plans its follow-up accordingly).
  const [isReviewMode] = useState(() => currentUrl !== null);
  const [url, setUrlState] = useState(currentUrl ?? BAKED_SERVER_URL ?? '');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const setServer = useServerStore((s) => s.setServer);
  const queryClient = useQueryClient();
  const { stop } = usePlayer();
  const router = useRouter();

  // Guards the async connect flow: a validation result (or switch) that
  // finishes after the user left this screen or started a newer attempt must
  // not touch server state, navigate, or overwrite newer field feedback.
  const [attemptGuard] = useState(() => createAttemptGuard());
  useEffect(() => {
    return () => {
      attemptGuard.unmount();
    };
  }, [attemptGuard]);

  function setUrl(next: string) {
    setUrlState(next);
    setFieldError(null);
  }

  const showLocalhostHint = useMemo(() => isLocalHostUrl(url), [url]);

  // True only when the input holds the already-verified, configured URL
  // (Login review mode, untouched): the CTA reads Continue with a verified
  // check. There is deliberately no unchanged shortcut — every Continue
  // re-validates via /health so a stale backend state (newly required setup,
  // recovered database) is always observed.
  const isUrlUnchanged = isReviewUnchanged(isReviewMode, currentUrl, url);

  async function handleConnect() {
    setFieldError(null);

    const validationError = validateServerUrl(url);
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    const attempt = attemptGuard.start();
    const isCurrent = () => attemptGuard.isCurrent(attempt);

    setIsConnecting(true);
    try {
      const result = await checkServerConnection(url);
      if (!isCurrent()) return;
      if (!result.ok) {
        // Retryable inline error (unreachable, not-Sonic, db down, timeout):
        // nothing is committed and no navigation runs.
        setFieldError(result.message);
        return;
      }
      const plan = planConnectResult(currentUrl, result, { isReviewMode });
      if (plan.commit === 'switch') {
        // A different server was confirmed from the Login review path: run
        // the shared atomic switch (session reset + apply + player re-point)
        // so no old-server state leaks into the new session.
        await performServerSwitch(
          result.serverUrl,
          {
            queryClient,
            stopPlayback: stop,
          },
          { setupPending: plan.setupPending },
        );
      } else {
        await setServer(result.serverUrl, {
          setupPending: plan.setupPending,
        });
      }
      // The commit above is atomic (URL + setup flag + request id): ServerGuard
      // routes wizard-bound commits to the Setup Wizard and fresh-URL
      // first-launch ready commits to Login. This screen stays mounted across
      // the commit (it is a routed screen and the navigator is never
      // removed), so the committed navigation cannot be cancelled from here.
      // Same-URL ready re-commits are ServerGuard-silent, so the hook owns
      // those follow-ups itself (review 'back', back-out 'login') — exactly
      // one owner per redirect either way.
      if (!isCurrent()) return;
      if (plan.toast === 'connected') {
        toastImperative.show({
          type: 'success',
          text1: 'Connected. Please sign in.',
          visibilityTime: 4000,
        });
      } else if (plan.toast === 'updated') {
        toastImperative.show({
          type: 'success',
          text1: 'Server updated. Please sign in.',
          visibilityTime: 4000,
        });
      }
      if (plan.followUp === 'back') {
        // Review mode, ready server: back to Login. (A superseded attempt
        // must not pop a screen a newer attempt pushed — hence isCurrent.)
        router.back();
      } else if (plan.followUp === 'login') {
        // First-launch wizard back-out whose backend now reports ready:
        // ServerGuard stays silent (previous status already 'configured'),
        // so this replace is the single owner.
        router.replace('/login');
      }
    } catch {
      if (!isCurrent()) return;
      setFieldError(
        "Couldn't save the server address on this device. Please try again.",
      );
    } finally {
      // A superseded attempt must not clear the spinner of the newer one.
      if (isCurrent()) {
        setIsConnecting(false);
      }
    }
  }

  return {
    url,
    setUrl,
    fieldError,
    isConnecting,
    showLocalhostHint,
    handleConnect,
    isUrlUnchanged,
  };
}
