import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { usePlayer } from '@/features/playback/hooks/usePlayer';
import { toastImperative } from '@/features/Toast/utils/toastSingleton';
import { checkServerConnection } from '../api/serverValidation';
import { useServerStore } from '../store/serverStore';
import {
  BAKED_SERVER_URL,
  isLocalHostUrl,
  normalizeServerUrl,
  validateServerUrl,
} from '../utils/serverConfig';
import { performServerSwitch } from '../utils/serverSwitch';

export function useServerSetup() {
  // Review mode (reached from Login) has a configured server: prefill it so
  // the user can inspect or change it. First launch falls back to the baked
  // URL as before; the user must still press Connect either way.
  const currentUrl = useServerStore((s) => s.serverUrl);
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
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function setUrl(next: string) {
    setUrlState(next);
    setFieldError(null);
  }

  const showLocalhostHint = useMemo(() => isLocalHostUrl(url), [url]);

  // True only when the input holds the already-verified, configured URL
  // (Login review mode, untouched): the CTA continues with it instead of
  // re-validating.
  const isUrlUnchanged =
    currentUrl !== null && normalizeServerUrl(url) === currentUrl;

  async function handleConnect() {
    if (isUrlUnchanged) {
      // Nothing changed: back to Login without touching server state.
      router.back();
      return;
    }

    setFieldError(null);

    const validationError = validateServerUrl(url);
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    const attempt = ++attemptRef.current;
    const isCurrent = () =>
      mountedRef.current && attempt === attemptRef.current;

    setIsConnecting(true);
    try {
      const result = await checkServerConnection(url);
      if (!isCurrent()) return;
      if (!result.ok) {
        setFieldError(result.message);
        return;
      }
      if (currentUrl && result.serverUrl !== currentUrl) {
        // A different server was confirmed from the Login review path: run
        // the shared atomic switch (session reset + apply + player re-point)
        // so no old-server state leaks into the new session.
        await performServerSwitch(result.serverUrl, {
          queryClient,
          stopPlayback: stop,
        });
        toastImperative.show({
          type: 'success',
          text1: 'Server updated. Please sign in.',
          visibilityTime: 4000,
        });
      } else {
        await setServer(result.serverUrl);
      }
      if (currentUrl && isCurrent()) {
        // Review mode: back to Login. First launch stays put — the
        // ServerGuard advances automatically on 'configured'.
        router.back();
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
