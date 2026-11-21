import { useMemo, useState } from 'react';
import { checkServerConnection } from '../api/serverValidation';
import { useServerStore } from '../store/serverStore';
import {
  BAKED_SERVER_URL,
  isLocalHostUrl,
  validateServerUrl,
} from '../utils/serverConfig';

export function useServerSetup() {
  // Prefill the known backend as a convenience; the user must still press
  // Connect, so setup is never silently bypassed.
  const [url, setUrlState] = useState(BAKED_SERVER_URL ?? '');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const setServer = useServerStore((s) => s.setServer);

  function setUrl(next: string) {
    setUrlState(next);
    setFieldError(null);
  }

  const showLocalhostHint = useMemo(() => isLocalHostUrl(url), [url]);

  async function handleConnect() {
    setFieldError(null);

    const validationError = validateServerUrl(url);
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setIsConnecting(true);
    try {
      const result = await checkServerConnection(url);
      if (!result.ok) {
        setFieldError(result.message);
        return;
      }
      await setServer(result.serverUrl);
    } catch {
      setFieldError(
        "Couldn't save the server address on this device. Please try again.",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  return {
    url,
    setUrl,
    fieldError,
    isConnecting,
    showLocalhostHint,
    handleConnect,
  };
}
