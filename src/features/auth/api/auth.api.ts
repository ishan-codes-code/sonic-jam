import { apiClient } from '@/api/apiClient';
import type { AuthTokens, LoginPayload, SignupPayload, User } from './auth.types';

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
    apiClient.get<{ user: User }>('/auth/me').then((r) => r.data.user),
};
