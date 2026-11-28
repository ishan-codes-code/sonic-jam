# Skill: Playback / Queue Operation

Use when adding or changing a player or queue operation. Assumes `AGENTS.md` (hard rules 1–5)
and the playback must-read list have been read.

## Invariants (why operations look the way they do)

- The NATIVE queue is the source of truth for order; Zustand `trackMap` mirrors full
  `PlaybackTrack` objects because RNTP v5 strips custom props. Touch both, always.
- Two transition handlers exist: foreground `PlaybackSync.tsx` and headless
  `trackPlayerService.ts`. Keep them idempotent and in sync — never fix one side only.
- Real audio comes from `song.streamUrl` + `playbackToken` header, attached up front on the
  RNTP `MediaItem` (`createPlaybackTrack()` throws on an empty URL — pending playlist tracks
  resolve through `playlistPendingService.ts` first; see `utils/streamHelpers.ts` predicates).

## Steps

1. Add the operation to `usePlayer()` in `src/features/playback/hooks/usePlayer.ts` (the single
   command surface), following the existing shape: `ensureSetup()` → resolve (`resolveStream()` for
   new audio) → `store.addTrackToMap()` → native call → `store.notifyQueueUpdate()`.
2. Read the LIVE native queue at call time (`getQueue()` / `getActiveMediaItemIndex()`); never trust
   a stored index across awaits (see `removeFromQueueBySongId` for the pattern). Never remove the
   active item.
3. If the operation changes what is playing or the queue order, update `currentSong`/`currentTrack`,
   `duration`, and `queueType`/`playlistMeta` consistently — and check whether smart radio needs
   `ensureSmartQueueActive()` or `resetSmartQueueRadio()`.
4. If tokens or auth are involved, remember BOTH refresh paths (401 interceptor + pre-flight) and
   push new tokens via `setProgressSyncToken()` like the existing paths do.
5. If the operation can run while a job is resolving or polling, define its interaction with
   `pendingJobId`/`useJobStore` explicitly (cancel, ignore, or queue) — do not leave the race implicit.
6. Background behavior (lock screen, notification, headphones) flows through `PlaybackService`;
   foreground-only changes still need a background sanity pass for the affected events.
7. After landing: exercise play → pause → seek → next/prev → queue edit → background → notification
   tap on a dev build, and report exactly which of those were actually run.
