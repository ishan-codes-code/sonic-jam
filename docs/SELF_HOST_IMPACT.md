# Self-Host Migration — Impact Checklist

Target: runtime-configurable backend URL, SecureStore storage, manual + QR input, `/health` validation,
Profile server switching, correct auth/playback handling, no hardcoded deployment URLs in the generic APK.

Status today: NONE of this exists. Everything below is build-time static. Do not assume any of it is implemented.

## 1. Server-URL storage and config (to build)

- New SecureStore key for server URL, beside `sonic_access_token` / `sonic_refresh_token` in `src/features/auth/utils/tokenStorage.ts`.
- New runtime server module (single source of truth). Must support get/set/clear, trailing-slash normalization, `http(s)` validation.
- Migration: existing installs have no stored URL and must fall back to `EXPO_PUBLIC_API_URL` once, then persist.
- `docs/ARCHITECTURE_AUDIT.md` section 7 has the full rationale.

## 2. Every static implementation point to change (verified)

| # | File | Symbol | Current behavior |
|---|------|--------|------------------|
| 1 | `src/api/apiClient.ts` | `BASE_URL`, `MEDIA_URL`, `axios.create({baseURL})` | Baked at import; refresh uses `axios.post(BASE_URL/auth/refresh)` |
| 2 | `src/features/auth/utils/tokenManager.ts` | `doRefresh()` | `fetch(BASE_URL/auth/refresh)` |
| 3 | `src/features/playback/services/playerSetup.ts` | `PLAYER_CONFIG.progressSync.http.url` | Baked `${BASE_URL}/listening/progress-sync` at boot |
| 4 | `src/features/playback/utils/playbackHelpers.ts` | (removed) `getPlaybackUrl()` | Gone: playback state holds the backend `streamUrl` directly; no `BASE_URL`-derived playback URL remains |
| 5 | `src/features/song/utils/shareSong.ts` | `shareSong()` | Share links from `MEDIA_URL` |
| 6 | `src/features/collections/screens/CollectionScreen.tsx` | share handler | Share links from `MEDIA_URL` |
| 7 | `src/features/collections/components/CollectionAlbumHeader.tsx` | share handler | Share links from `MEDIA_URL` |
| 8 | `src/features/home/components/HorizontalSongCard.tsx` | share link | Share links from `MEDIA_URL` |
| 9 | `app.json` | `android.intentFilters` | Host `music-sonic.vercel.app` |
| 10 | `src/features/song/screens/SongDeepLinkRouteScreen.tsx` | comment + resolver | Assumes backend ID shapes + iTunes fallback |
| 11 | `src/features/app-validations/services/versionService.ts` | `CONFIG_URL` | GitHub Raw app-config URL (update/maintenance gate) |
| 12 | `app.json` | `updates.url`, `extra.eas.projectId` | Expo update channel (deployment-owned; decide if generic APK keeps it) |

Also: `MEDIA_URL` currently falls back to `BASE_URL` when `EXPO_PUBLIC_MEDIA_URL` is unset (it is unset in local `.env`).
Web share host and API host may need to split after self-host; do not assume they stay identical.

## 3. Auth handling on server change (to build)

- `src/features/auth/store/authStore.ts`: `login`, `signup`, `checkAuth`, `logout`, `resetAuth` all assume the current `apiClient` base URL.
- Server switch MUST: clear both tokens, clear `user`, clear React Query cache (`queryClient.clear()`), stop playback via the same path `AuthGuard` uses (`stop()` in `src/app/_layout.tsx`).
- Device ID (`sonic_device_id` in `src/api/apiClient.ts`) is per-device, not per-server. Decide: keep global or namespace per server.
- `/health` validation client does not exist. Must add with timeout, error states, and no double-toast with the global interceptor.

## 4. Playback handling on server change (to build)

- Clear: native queue (`TrackPlayer.clear()`), `trackMap` (`usePlaybackStore.reset()`), `useJobStore` jobs, `useSmartQueueStore.reset()` + module singletons in `smartQueueService.ts`, `pendingJobId`, `streamUrl`.
- Cancel: `pollJobStatus()` loops in `src/features/playback/services/pollingResolver.ts` (no AbortSignal today; must add or gate on server-generation token).
- Re-point: native `progressSync` URL + auth headers. Today only headers are updatable (`updateProgressSyncHeaders` in `src/features/playback/hooks/useProgressSyncAuth.ts`); URL update needs an RNTP API check.
- `playPlaylist()` reuses one server-issued `playbackToken` for all tracks (`src/features/playback/hooks/usePlayer.ts`). Tokens must never cross servers.
- Backend contract the new server must satisfy: `POST /song/play`, `GET /song/job/:id`, `GET /recommend`, `/playlist/*`, `/listening/*`, `/discovery/genre`, `/auth/*`, plus `song.streamUrl` + `playbackToken` semantics. Missing `/recommend` silently disables radio (`getRecommendations()` returns `[]`).

## 5. UI to build

- Server input: manual URL field + QR scan. No camera/barcode dependency installed today; adding one needs permissions and EAS config.
- Entry points: first-run / login screen affordance + Profile settings row (`src/features/profile/screens/ProfileScreen.tsx` has no server UI today).
- Validation UX: checking → reachable (`/health` OK) → saved; unreachable → inline error, keep old server.

## 6. Verification checklist for the migration

- [ ] Fresh install with no stored URL falls back to baked URL once, then persists.
- [ ] Invalid URL (typo, non-HTTP, timeout, non-Sonic host) is rejected before save.
- [ ] Server switch clears tokens, user, caches, queue, jobs, smart-queue, polling.
- [ ] Playback stops on switch; no audio continues against the old server.
- [ ] Login → play → background → lock-screen controls work against the NEW server.
- [ ] Progress sync posts to the NEW `/listening/progress-sync` with a fresh token.
- [ ] Share links and deep links resolve against the correct host.
- [ ] Old-server data never flashes after switch (no stale playlists/history).
