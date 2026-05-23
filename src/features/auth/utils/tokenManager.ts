import { tokenStorage } from './tokenStorage';
import { BASE_URL } from '@/api/apiClient';

// Buffer time (in ms) before actual expiry to treat the token as expired.
// This prevents edge cases where the token expires mid-request.
const EXPIRY_BUFFER_MS = 60_000; // 1 minute

// --------------------------------------------------------------------------
// JWT Decoder (no dependencies — just base64 decode the payload)
// --------------------------------------------------------------------------

/**
 * Extracts the expiration timestamp (in ms) from a raw JWT string.
 * Returns null if the token is malformed or has no `exp` claim.
 */
export function getTokenExpiryMs(token: string): number | null {
  try {
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return null;

    // atob is available on React Native's Hermes engine (>= 0.71)
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { exp?: number };

    if (typeof payload.exp !== 'number') return null;

    return payload.exp * 1000; // JWT exp is in seconds; convert to ms
  } catch {
    return null;
  }
}

/**
 * Returns true if the given expiry timestamp (ms) is expired,
 * accounting for the safety buffer.
 */
export function isTokenExpired(expiryMs: number): boolean {
  return Date.now() >= expiryMs - EXPIRY_BUFFER_MS;
}

// --------------------------------------------------------------------------
// Token Refresh (thin wrapper — avoids importing the full apiClient to
// prevent circular deps; mirrors what the Axios interceptor does)
// --------------------------------------------------------------------------

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) return null;

    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed — force logout via authStore
      const { useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().resetAuth();
      await tokenStorage.clearTokens();
      return null;
    }

    const data = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
    };

    await tokenStorage.saveTokens(data.accessToken, data.refreshToken);

    // Keep the native player's progressSync headers up to date
    const { setProgressSyncToken } = await import(
      '@/features/playback/hooks/useProgressSyncAuth'
    );
    await setProgressSyncToken(data.accessToken);

    return data.accessToken;
  } catch {
    return null;
  } finally {
    refreshPromise = null;
  }
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * The single "pre-flight" guard used before any native player action.
 *
 * - Reads the stored access token.
 * - Decodes its expiry from the JWT payload.
 * - If expired (or within the 1-minute safety buffer), proactively refreshes.
 * - Deduplicates concurrent refresh calls so only one network request is made.
 *
 * Returns the freshest valid access token, or null if the user is logged out.
 */
export async function ensureFreshToken(): Promise<string | null> {
  const token = await tokenStorage.getAccessToken();

  if (!token) return null;

  const expiryMs = getTokenExpiryMs(token);

  // If we can't decode expiry, assume token is valid (degrade gracefully)
  if (expiryMs === null) return token;

  // Token is still fresh — no work needed
  if (!isTokenExpired(expiryMs)) return token;

  // Token is expired. Deduplicate concurrent refresh calls.
  if (!refreshPromise) {
    refreshPromise = doRefresh();
  }

  return refreshPromise;
}
