import { apiClient } from './apiClient';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  name?: string;
  email: string;
  createdAt?: string;
  favoritesPlaylistId?: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// --------------------------------------------------------------------------
// Auth API calls
// --------------------------------------------------------------------------
export const authApi = {
  signup: (payload: SignupPayload) =>
    apiClient.post<{ message: string }>('/auth/signup', payload).then((r) => r.data),

  login: (payload: LoginPayload) =>
    apiClient.post<AuthTokens>('/auth/login', payload).then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<AuthTokens>('/auth/refresh', { refreshToken })
      .then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }).then((r) => r.data),

  getMe: () =>
    apiClient.get<{ message: string; user: User }>('/protected').then((r) => r.data.user),
};
