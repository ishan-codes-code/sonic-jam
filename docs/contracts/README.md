# API Contracts

Contracts are documented ONLY from what the frontend implementation proves, plus backend facts
verified with the project owner. Labels:

- **[Confirmed]** — request/response shape is pinned by client types or client parsing code.
- **[Partial]** — the call is confirmed but some fields are untyped (`r.data` passthrough) or built natively.
- **[Proposed]** — does not exist in the client; needed for planned work. Do not implement against it
  until the backend confirms the shape.

Files:

- `authentication.md` — signup/login/refresh/logout/me, token + device-ID headers, 401 behavior.
- `playback.md` — song play, job polling, listening events, progress sync, recommendations.
- `library-search.md` — playlists, history, discovery/genre, plus third-party (iTunes/RSS) notes.
- `server-health.md` — **[Implemented]** `/health` validation + first-launch routing for self-hosted servers.
- `backend-setup.md` — **[Implemented]** first-launch setup wizard endpoints (`/setup/status`, `/setup/config`) + readiness poll.

Global rules (all backend calls, confirmed in `src/api/apiClient.ts`):

- Base URL is build-time `EXPO_PUBLIC_API_URL` (see `docs/SELF_HOST_IMPACT.md` for the runtime-URL plan).
- Every request carries `x-device-id` (SecureStore `sonic_device_id`) and, when a token is stored,
  `Authorization: Bearer <accessToken>`. Timeout is 300s.
- Errors: message lives in `response.data.message` (string or string array; first element wins) or
  `response.data.error`. Mutations and 5xx surface a global toast; other GET failures are silent at this layer.
- 401: one automatic refresh (`POST /auth/refresh`) + single retry; concurrent 401s queue behind the refresh.
  If refresh fails, tokens are cleared and the session resets to `unauthenticated`.
