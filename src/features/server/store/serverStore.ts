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

  /**
   * Memory-only: the configured server still needs first-launch backend
   * setup. Committed atomically with the URL by `setServer()` from the
   * fresh `/health` result, cleared when the wizard completes. While true,
   * AuthGuard yields (no Login redirect) and ServerGuard routes to the
   * wizard. Never persisted: a restart re-verifies via the setup screen.
   */
  setupPending: boolean;
  /**
   * Memory-only: increments on every `setServer()` commit. Lets ServerGuard
   * route each connect commit exactly once (one-shot per id) without
   * re-arming, and tells a fresh commit apart from a boot with a stored URL.
   */
  setupRequestId: number;

  /** Boot-time load: stored URL → migration → unconfigured. Idempotent. */
  loadServer: () => Promise<void>;
  /** Persist + apply a validated server URL (post-validation only). */
  setServer: (
    serverUrl: string,
    opts?: { setupPending?: boolean },
  ) => Promise<void>;
  /** Drop the stored server (reserved for future server switching). */
  clearServer: () => Promise<void>;
  /** Mark backend setup done (wizard completion). Commits no navigation. */
  clearSetupPending: () => void;
}

let loadPromise: Promise<void> | null = null;

async function doLoad(): Promise<void> {
  const set = useServerStore.setState;

  let stored: string | null;
  try {
    stored = await getStoredServerUrl();
  } catch {
    // Storage is unreadable: the stored URL may still exist, so never run the
    // migration below — persisting the baked URL now could overwrite the
    // user's real server. Stay unconfigured without writing anything.
    set({ serverUrl: null, status: 'unconfigured' });
    return;
  }
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
  setupPending: false,
  setupRequestId: 0,

  loadServer: () => {
    if (!loadPromise) {
      loadPromise = doLoad().finally(() => {
        loadPromise = null;
      });
    }
    return loadPromise;
  },

  setServer: async (serverUrl: string, opts?: { setupPending?: boolean }) => {
    const normalized = normalizeServerUrl(serverUrl);
    if (!normalized) {
      throw new Error('Invalid server URL.');
    }
    if (useServerStore.getState().serverUrl === null) {
      // First-time setup: any stored tokens predate this server — they linger
      // from a previous install/session whose server record is gone — so drop
      // them before applying the new server instead of letting the boot auth
      // check offer them to a stranger. The upgrade migration never passes
      // through here (doLoad persists directly), and switches arrive already
      // configured after performServerSwitch cleared the old session, so
      // valid credentials are never cleared by this branch.
      await tokenStorage.clearTokens();
      // Lazy import: the server store already sits below apiClient, so a
      // static authStore import would risk a cycle (authApi -> apiClient).
      const { useAuthStore } = await import(
        '@/features/auth/store/authStore'
      );
      useAuthStore.getState().resetAuth();
    }
    // Persist first: a save failure must not leave the app pointed at a
    // server it will forget on restart.
    await setStoredServerUrl(normalized);
    setApiServerUrl(normalized);
    // One atomic commit: the URL, the setup flag from the fresh /health
    // result, and a bumped request id so ServerGuard routes this exact
    // commit once. Splitting these across commits would let a guard effect
    // observe a half-committed state and misroute (e.g. Login before wizard).
    set((s) => ({
      serverUrl: normalized,
      status: 'configured',
      setupPending: opts?.setupPending ?? false,
      setupRequestId: s.setupRequestId + 1,
    }));
  },

  clearServer: async () => {
    await clearStoredServerUrl();
    set({ serverUrl: null, status: 'unconfigured', setupPending: false });
  },

  clearSetupPending: () => {
    // No request-id bump: completion commits no navigation by itself — the
    // wizard replaces to Login directly after calling this.
    set({ setupPending: false });
  },
}));
