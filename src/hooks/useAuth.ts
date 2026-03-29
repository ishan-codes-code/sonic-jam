import { useCallback } from 'react';
import type { LoginPayload, SignupPayload } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

/**
 * Thin hook that exposes auth state + actions with stable references.
 * Components should use this hook rather than reading from the store directly.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const _login = useAuthStore((s) => s.login);
  const _signup = useAuthStore((s) => s.signup);
  const _logout = useAuthStore((s) => s.logout);
  const _checkAuth = useAuthStore((s) => s.checkAuth);
  const _clearError = useAuthStore((s) => s.clearError);

  const login = useCallback((payload: LoginPayload) => _login(payload), [_login]);
  const signup = useCallback((payload: SignupPayload) => _signup(payload), [_signup]);
  const logout = useCallback(() => _logout(), [_logout]);
  const checkAuth = useCallback(() => _checkAuth(), [_checkAuth]);
  const clearError = useCallback(() => _clearError(), [_clearError]);

  return {
    // State
    user,
    status,
    error,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading' || status === 'idle',
    // Actions
    login,
    signup,
    logout,
    checkAuth,
    clearError,
  };
}
