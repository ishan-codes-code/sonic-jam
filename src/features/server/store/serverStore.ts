import { create } from 'zustand';
import { setApiServerUrl } from '@/api/apiClient';
import { tokenStorage } from '@/features/auth/utils/tokenStorage';
import {
  BAKED_SERVER_URL,
  normalizeServerUrl,
} from '../utils/serverConfig';
import {
  clearStoredServerUrl,
  getStoredServerUrl,
  setStoredServerUrl,
} from '../utils/serverStorage';

// --------------------------------------------------------------------------
// Server configuration state (deliberately separate from auth state).
//
// - `loading`: persisted config not read yet — the startup gate waits.
// - `unconfigured`: no server known — the setup screen takes over.
// - `configured`: apiClient is pointed at `serverUrl` — normal boot proceeds.
// --------------------------------------------------------------------------

export type ServerStatus = 'loading' | 'unconfigured' | 'configured';

interface ServerState {
  status: ServerStatus;
  serverUrl: string | null;

  /** Boot-time load: stored URL → migration → unconfigured. Idempotent. */
  loadServer: () => Promise<void>;
  /** Persist + apply a validated server URL (post-validation only). */
  setServer: (serverUrl: string) => Promise<void>;
  /** Drop the stored server (reserved for future server switching). */
  clearServer: () => Promise<void>;
}

let loadPromise: Promise<void> | null = null;

async function doLoad(): Promise<void> {
  const set = useServerStore.setState;

  const stored = await getStoredServerUrl();
  if (stored) {
    setApiServerUrl(stored);
    set({ serverUrl: stored, status: 'configured' });
    return;
  }

  // Migration: an install that is already signed in was working against the
  // baked URL, so adopt it once instead of forcing setup on upgrade.
  const baked = BAKED_SERVER_URL
    ? normalizeServerUrl(BAKED_SERVER_URL)
    : null;
  if (baked) {
    const refreshToken = await tokenStorage
      .getRefreshToken()
      .catch(() => null);
    if (refreshToken) {
      await setStoredServerUrl(baked).catch(() => {});
      setApiServerUrl(baked);
      set({ serverUrl: baked, status: 'configured' });
      return;
    }
  }

  set({ serverUrl: null, status: 'unconfigured' });
}

export const useServerStore = create<ServerState>((set) => ({
  status: 'loading',
  serverUrl: null,

  loadServer: () => {
    if (!loadPromise) {
      loadPromise = doLoad().finally(() => {
        loadPromise = null;
      });
    }
    return loadPromise;
  },

  setServer: async (serverUrl: string) => {
    const normalized = normalizeServerUrl(serverUrl);
    if (!normalized) {
      throw new Error('Invalid server URL.');
    }
    // Persist first: a save failure must not leave the app pointed at a
    // server it will forget on restart.
    await setStoredServerUrl(normalized);
    setApiServerUrl(normalized);
    set({ serverUrl: normalized, status: 'configured' });
  },

  clearServer: async () => {
    await clearStoredServerUrl();
    set({ serverUrl: null, status: 'unconfigured' });
  },
}));
