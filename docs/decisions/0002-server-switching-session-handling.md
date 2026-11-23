# ADR 0002: Server switching and session handling

- Status: proposed
- Date: 2026-11-21

## Context and problem

Auth state (SecureStore tokens, `useAuthStore.user`) and server data caches (React Query,
history/playlists) all assume one permanent backend. Switching servers without a full reset would
send Server A's refresh token to Server B and flash Server A's data. Today even logout does not
clear React Query or playback-side state (audit R9).

## Decision

Server switching performs an atomic session reset, reusing the logout path:

1. Stop playback via the same path `AuthGuard` uses (`stop()` in `src/app/_layout.tsx`).
2. Clear tokens + user (`tokenStorage.clearTokens()`, `resetAuth()` or equivalent).
3. Clear ALL server-derived caches together: `queryClient.clear()`, native queue, `trackMap`,
   `useJobStore`, `useSmartQueueStore` (+ module singletons), `pendingJobId`/`streamUrl`,
   in-flight `pollJobStatus()` loops, and progress-sync URL/headers.
4. Persist the new URL, then route to login (fresh session on the new server).
5. Device ID (`sonic_device_id`) stays global per device unless the backend requires per-server
   identity — open question, default is unchanged behavior.

## Alternatives considered

1. Keep the session and re-authenticate silently. Rejected: credentials/tokens are server-scoped;
   silent carryover is both insecure and incorrect.
2. Partial reset (tokens only). Rejected: stale queues, jobs, tokens, and cached playlists would
   leak across servers; the failure modes are silent.
3. Per-server data profiles (keep both sessions). Rejected: large scope, no product requirement;
   revisit only if multi-server support is requested.

## Consequences

- Positive: switching is always safe and predictable; the same reset also fixes the logout cache
  leak by sharing one `clearSessionCaches()` path.
- Negative: switching is destructive to in-flight playback and cached data by design — the UI must
  say so before confirming.
- Requires: `AbortSignal`/generation guard for polling loops, and the progress-sync URL update from ADR 0003.

## Implementation note (2026-11-22, Settings hub + Server Management)

Implemented in `src/features/server/hooks/useServerSwitch.ts` (`ServerManagementScreen`,
route `/settings/server`), following the decision's 5 steps with two refinements:

- Step 2 uses local `tokenStorage.clearTokens()` + `resetAuth()` (the 401-interceptor
  sequence) with NO best-effort server logout call, so a dead previous server cannot stall
  the switch. Device ID stays global per the default.
- Step 1 additionally bumps the session generation (`invalidateSession()` in
  `src/features/server/utils/sessionGeneration.ts`): an in-flight token refresh
  for the old server detects the bump and skips every write (save/clear tokens,
  progress-sync headers, `resetAuth()`) instead of touching the new session.
- Step 3 is implemented as ordered calls in the hook rather than a shared
  `clearSessionCaches()` helper: `stop()` (AuthGuard's path), `cancelAllJobPolling()` +
  `cancelSmartQueueWork()` (generation guards), `resetSmartQueueRadio()`,
  `useJobStore.clearJobs()` (new), `resetPlaybackRecovery()` (new),
  `setProgressSyncToken(null)`, `queryClient.clear()` (via `useQueryClient`, so the
  `_layout.tsx` singleton is untouched). Logout itself is unchanged and still does not
  clear React Query — extracting a shared reset for both paths remains future work.
- The UI warns (sign-out + playback stop) on-screen and requires explicit confirmation
  after successful validation; validation failure, cancel, and same-URL input perform
  no reset. `AuthGuard` routes to `/login` on the resulting unauthenticated status.
