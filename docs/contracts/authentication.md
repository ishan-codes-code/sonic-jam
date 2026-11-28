# Contract: Authentication

Implementation: `src/features/auth/api/auth.api.ts`, `src/features/auth/api/auth.types.ts`,
`src/features/auth/store/authStore.ts`. Types below are the client types (all **[Confirmed]** as
client expectations; backend field names beyond these are unverified).

## `POST /auth/signup` — **[Confirmed]**

- Body: `{ name: string, email: string, password: string }` (client trims name/email, lowercases email).
- Client validation first: name required, valid email, password ≥ 8 chars (`validation.ts`).
- Response consumed as `{ message: string }`. Client does NOT auto-login; it stays `unauthenticated`
  and routes to `/login` with a success toast.
- Errors: `response.data.message` string/array shown in-form; request carries no auth token.

## `POST /auth/login` — **[Confirmed]**

- Body: `{ email: string, password: string }` (email trimmed + lowercased; password ≥ 6 client-side).
- Response: `{ accessToken: string, refreshToken: string }`. Both are persisted to SecureStore,
  then the client calls `GET /auth/me` before marking the session `authenticated`.
- Errors: 401 with `contactEmail` in the body means unverified email → client shows
  "Email not verified…" instead of the generic message.

## `POST /auth/refresh` — **[Confirmed]**

- Body: `{ refreshToken: string }`. Response: `{ accessToken, refreshToken }` (rotation).
- Used by: boot `checkAuth()`, the 401 interceptor (direct `axios.post`, bypassing interceptors),
  and the pre-flight `ensureFreshToken()` (`fetch`). All three persist the rotated pair and push the
  new access token into the native progress-sync headers.
- Failure: no token or a refresh the server answers with an error status clears tokens +
  `resetAuth()` → `unauthenticated`. A network-level failure (no HTTP response: backend restart,
  outage, client timeout — `isNetworkRefreshError()`) PRESERVES the session instead, so a backend
  restart never logs the user out; the failed request rejects retryably.

## `POST /auth/logout` — **[Partial]**

- Body: `{ refreshToken: string }`. Response shape is untyped in the client (`r.data` ignored).
- Best-effort: server failure still clears local tokens and ends the session.

## `GET /auth/me` — **[Confirmed]**

- Auth: Bearer access token required. Response: `{ user: User }`.
- `User`: `{ id: string, name?: string, email: string, createdAt: string, favoritesPlaylistId: string, role?: "user" | "admin" }`.
  A missing `role` (older backends) always means a non-admin: admin UI (Settings → Storage) stays hidden.
- Called after login, after boot refresh, and never cached in React Query (lives in `useAuthStore`).
- Without a token the backend answers `401` + JSON (`{ statusCode: 401, … }`, verified live
  2026-11-21). The server-setup validator previously depended on this identity probe; it now
  validates via `GET /health` (see `docs/contracts/server-health.md`).

## Session notes

- Token storage keys: `sonic_access_token`, `sonic_refresh_token` (SecureStore). No other session
  persistence exists; the refresh token alone rehydrates the session at boot.
- Access tokens are JWTs with an `exp` claim — the client decodes it for pre-flight refresh with a
  60s buffer. Undecodable tokens are trusted as-is (graceful degradation).
