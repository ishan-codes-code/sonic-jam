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
