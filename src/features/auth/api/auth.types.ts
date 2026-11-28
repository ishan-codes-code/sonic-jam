export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  name?: string;
  email: string;
  createdAt: string;
  favoritesPlaylistId: string;
  /**
   * Account role from GET /auth/me. Absent on older backends — a missing
   * role always means a non-admin (admin UI stays hidden).
   */
  role?: 'user' | 'admin';
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
