import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeServerUrl } from './serverConfig';

// --------------------------------------------------------------------------
// Server URL persistence.
//
// AsyncStorage, not SecureStore: the server address is non-secret
// configuration (same class as the cached remote config in versionService),
// while SecureStore holds session secrets (tokens, device ID). Keeping them
// apart also means a server switch can wipe tokens without losing the URL.
// --------------------------------------------------------------------------

const SERVER_URL_KEY = '@sonic_server_url';

/**
 * Read the persisted server URL. Returns null when nothing is stored, the
 * value is malformed (self-heals by clearing it), or storage is unavailable.
 */
export async function getStoredServerUrl(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(SERVER_URL_KEY);
    if (!raw) return null;

    const normalized = normalizeServerUrl(raw);
    if (!normalized) {
      await AsyncStorage.removeItem(SERVER_URL_KEY).catch(() => {});
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}

/** Persist the (already normalized) server URL. Throws when storage fails. */
export async function setStoredServerUrl(serverUrl: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_URL_KEY, serverUrl);
}

/** Remove the persisted server URL. Never throws. */
export async function clearStoredServerUrl(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SERVER_URL_KEY);
  } catch {
    // Best-effort: a stale URL simply resolves as "no stored server" on read.
  }
}
