# ADR 0003: Playback behavior across server changes

- Status: proposed
- Date: 2026-11-21

## Context and problem

Playback state is deeply server-coupled: stream URLs + `playbackToken`s are server-issued,
`playPlaylist()` reuses one token for all tracks, job polling runs against the old base URL with
no cancellation, smart radio depends on `/recommend`, and the native progress-sync URL is baked at
`setupPlayer()` time. Only progress-sync *headers* are updatable today
(`updateProgressSyncHeaders`); no URL-update API has been verified in `@rntp/player`.

## Decision

1. Server switch always stops playback first (per ADR 0002) — playback never migrates mid-stream.
2. Queue rebuild on the new server requires re-resolution: queued intents re-resolve via
   `POST /song/play` against the new backend; raw stream URLs and `playbackToken`s are never
   carried over (they are server-issued capabilities).
3. Before implementing the switch, verify how to re-point native progress sync: either an
   `@rntp/player` URL-update API, or teardown + `setupPlayer()` with the new URL (the module has
   an `isSetup` guard that would need a supported reset path). If neither exists, progress sync
   stays pointed at the old server until app restart — which must then be a documented limitation,
   not a silent bug.
4. `pollJobStatus()` gains cancellation (AbortSignal or server-generation token) so old-server
   polls cannot complete into new-server state.

## Alternatives considered

1. Let current playback finish, switch lazily. Rejected: progress sync, recovery (`PlaybackError`
   re-resolution), and queue extension would all hit the wrong server; the mixed state is worse
   than a clean stop.
2. Persist and replay the exact native queue. Rejected: same as (1) plus token-scope violations.
3. Restart the app on server switch (e.g. `Updates.reloadAsync()`). Partially viable as a fallback
   if native reconfiguration proves impossible — but it is a blunt tool and still requires the JS
   state reset; keep as fallback, not the plan.

## Consequences

- Positive: no cross-server token/URL leaks; every playback edge (recovery, radio, sync, sleep)
  operates on one consistent server.
- Negative: depends on an unverified native API; the fallback (restart) hurts UX and must be an
  explicit product decision, not an accident.
