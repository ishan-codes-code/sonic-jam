import { useEffect } from 'react';
import TrackPlayer from '@rntp/player';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ensureFreshToken } from '@/features/auth/utils/tokenManager';

/**
 * Pushes the current JWT into the native TrackPlayer's progressSync headers.
 * Pass null/undefined to clear the header (on logout).
 */
export async function setProgressSyncToken(token?: string | null) {
  try {
    if (token) {
      TrackPlayer.updateProgressSyncHeaders({ Authorization: `Bearer ${token}` });
    } else {
      TrackPlayer.updateProgressSyncHeaders({});
    }
  } catch (error) {
    console.error('[progressSyncAuth] Failed to update progressSync headers:', error);
  }
}

/**
 * React hook to manage native progressSync authentication state.
 * Should be mounted when the user is authenticated (e.g., in PlaybackSync).
 *
 * On mount it calls ensureFreshToken() — if the stored token is expired
 * (e.g. app was backgrounded for hours) it will proactively refresh it
 * before handing it to the native layer, eliminating the stale-token edge case.
 */
export function useProgressSyncAuth() {
  const status = useAuthStore((s) => s.status);

  // 1. Initial mount — ensure token is valid before giving it to native player
  useEffect(() => {
    async function initializeHeaders() {
      const token = await ensureFreshToken();
      await setProgressSyncToken(token);
    }

    initializeHeaders();
  }, []);

  // 2. React to logout / unauthenticated events
  useEffect(() => {
    if (status === 'unauthenticated') {
      setProgressSyncToken(null);
    }
  }, [status]);
}

