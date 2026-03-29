import { create } from 'zustand';
import { authApi, LoginPayload, SignupPayload, User } from '../api/authApi';
import { tokenStorage } from '../utils/tokenStorage';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  /** Called by the Axios interceptor to reset auth state on refresh failure */
  resetAuth: () => void;
}

// --------------------------------------------------------------------------
// Store
// --------------------------------------------------------------------------
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  error: null,

  // ── Login ────────────────────────────────────────────────────────────────
  login: async (payload) => {
    set({ status: 'loading', error: null });
    try {
      const data = await authApi.login(payload);
      await tokenStorage.saveTokens(data.accessToken, data.refreshToken);
      const user = await authApi.getMe();
      set({ user, status: 'authenticated', error: null });
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Login failed. Please check your credentials.');
      set({ status: 'unauthenticated', error: message });
      throw err;
    }
  },

  // ── Signup ───────────────────────────────────────────────────────────────
  signup: async (payload) => {
    set({ status: 'loading', error: null });
    try {
      const data = await authApi.signup(payload);
      await tokenStorage.saveTokens(data.accessToken, data.refreshToken);
      const user = await authApi.getMe();
      set({ user, status: 'authenticated', error: null });
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Signup failed. Please try again.');
      set({ status: 'unauthenticated', error: message });
      throw err;
    }
  },

  // ── Logout ───────────────────────────────────────────────────────────────
  logout: async () => {
    set({ status: 'loading' });
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Best-effort: continue clearing local state even if server call fails
    } finally {
      await tokenStorage.clearTokens();
      set({ user: null, status: 'unauthenticated', error: null });
    }
  },

  // ── Boot-time auth check ─────────────────────────────────────────────────
  checkAuth: async () => {
    set({ status: 'loading' });
    try {
      const storedRefreshToken = await tokenStorage.getRefreshToken();
      if (!storedRefreshToken) {
        set({ status: 'unauthenticated' });
        return;
      }

      const { accessToken, refreshToken } = await authApi.refresh(storedRefreshToken);
      await tokenStorage.saveTokens(accessToken, refreshToken);

      const user = await authApi.getMe();
      set({ user, status: 'authenticated' });
    } catch {
      await tokenStorage.clearTokens();
      set({ user: null, status: 'unauthenticated' });
    }
  },

  clearError: () => set({ error: null }),

  resetAuth: () => set({ user: null, status: 'unauthenticated', error: null }),
}));

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    // Server responded with an error status (4xx / 5xx)
    if ('response' in err) {
      const response = (err as { response?: { data?: { message?: string | string[] } } }).response;
      const msg = response?.data?.message;
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg)) return msg[0];
      return fallback;
    }
    // Request was made but no response received (server down / wrong IP)
    if ('request' in err) {
      return 'Cannot reach the server. Check your connection or API URL.';
    }
  }
  return fallback;
}
