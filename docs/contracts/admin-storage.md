# Contract: Admin Storage Settings — **[Implemented]**

Authenticated admin screen (Settings → Storage) for switching the backend's
storage mode and updating its R2/playback credentials after first-launch
setup. The mobile app only consumes these endpoints; it never migrates songs
(the backend leaves existing files where they are, and missing songs download
again on demand).

Implementation: `src/features/server/api/adminStorageApi.ts`
(`getAdminStorage()`, `saveAdminStorage()`),
`src/features/server/hooks/useAdminStorage.ts`,
`src/features/server/screens/AdminStorageScreen.tsx` (reuses the wizard's
`SetupStorageStep` + `SetupPlaybackStep` and its validation), route
`src/app/(tabs)/settings/storage.tsx` (admin-guarded), same-server reset
`src/features/server/utils/adminStorageReset.ts`.

## `GET /auth/me` role — **[Implemented]**

- `User` now carries `role?: "user" | "admin"`. A missing role (older
  backends) always means a non-admin: the Storage row stays hidden and the
  route bounces to Settings.

## `GET /admin/storage` — **[Implemented]**

- Auth: `Authorization: Bearer <accessToken>` via the shared apiClient
  (token attach, 401 refresh, device ID as usual). No setup token.
- Response: `{ mode: "local" | "r2", modeLocked: boolean,
  storageModes: ("local" | "r2")[], configured: Record<string, boolean>,
  envLocked: string[], playbackSecretRequired: boolean }`. `configured`
  flags the six credential keys (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY`,
  `R2_SECRET_KEY`, `R2_BUCKET`, `WORKER_STREAM_URL`,
  `JWT_PLAYBACK_SECRET`); missing keys read as unconfigured. `envLocked`
  lists environment-managed keys that are shown as managed and never sent.
  `playbackSecretRequired` forces the playback secret to be re-entered even
  though it shows as configured. Unknown `storageModes` entries are dropped;
  a missing list reads as R2-only (same parsing as the wizard).
- Errors: 401 → session invalid; 403 → admin access required (shown inline,
  covers demote-mid-session); 404 → backend too old, must be updated;
  network/timeout → retryable. Malformed shapes read as unexpected.

## `POST /admin/storage` — **[Implemented]**

- Auth: same Bearer client. No setup token, and `DATABASE_URL` is never
  collected or sent.
- Body: `STORAGE_MODE` (`"local"` or `"r2"`) is always sent — the current
  mode when `modeLocked` — plus, for an effective r2 mode only, any of the
  six credential keys. Values go out trimmed; blanks and env-locked keys are
  omitted, so settings-only r2 updates (same mode + entered values) are a
  normal patch and local sends the mode alone.
- Success: `{ saved: true, storageMode: "local" | "r2",
  restartRequired?: boolean, generatedKeys?: string[] }` (`generatedKeys`
  names, never values). The API restarts after responding, so success alone
  never completes the flow (see the poll below).
- Failure: 400 carries a `message` shown inline (redacted against submitted
  secrets — an echo could otherwise unmask a hidden value); 401/403/404 as
  above; timeout/connection loss is an UNKNOWN result (the save may have
  landed), never a rejection.

## Readiness: waits + public `GET /health` poll — **[Implemented]**

- After a save the app stops playback, cancels job polling / playlist
  resolution / smart-queue work, and clears jobs, playback recovery state,
  queue, and the React Query cache — while KEEPING tokens, auth state, and
  the server URL (`resetPlaybackForStorageChange()`; never
  `performServerSwitch()`).
- Then: ~3s wait (the old API may still answer) → poll `GET /health`
  (plain fetch, `pollHealthUntilReady()` with `expectStorage` set to the
  saved mode) → ~10s wait for the worker restart → success toast + back to
  Settings, still logged in. Readiness never uses `checkAuth()` (it clears
  tokens on any error).
- Unknown POST: the same reset runs, then one authenticated settings check
  decides the retry — a demonstrably landed mode change continues to the
  poll; anything else (including every settings-only update, whose values
  leave no verifiable trace) says so and offers a resubmit plus a way out.
- Poll timeout offers "Check again" without resubmitting, plus a way out.
- A restart must not log the user out: token refresh preserves the session
  on network-level failures (see `authentication.md`); only a refresh the
  server explicitly rejects clears it.

## Client-side flow

1. Settings shows the Storage row only for `role === "admin"`; the route
   redirects signed-in non-admins to Settings.
2. The screen shows the current mode, the mode selector (disabled while
   `modeLocked`), and the R2 + playback fields (playback hidden for local).
   Blank configured fields keep saved values; unconfigured fields are
   required; Save is disabled until the mode or a value changes.
3. Save validates (wizard rules + worker-URL format), confirms inline
   ("Songs aren't moved. Missing songs download again when played. Playback
   and active downloads will stop."), then POSTs. Rejects keep every value.
4. Busy phases (saving, unknown-check, poll, worker wait) block Back
   (header, gesture, Android) and repeat taps; a dead session is never
   blocked so AuthGuard can still route to login. All secrets stay in memory
   only.
