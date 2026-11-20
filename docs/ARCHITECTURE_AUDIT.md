# Sonic Jam — Architecture & Codebase Audit

- Date: 2026-11-21. Method: read-only source audit. No files modified during investigation.
- Labels: **[Verified]** = read in source. **[Assumption]** = inferred, not proven. **[Recommendation]** = suggested next step.
- Companion files: `AGENTS.md` (agent entry point), `docs/SELF_HOST_IMPACT.md` (self-host work list).
- Scope: `src/`, `package.json`, `app.json`, `eas.json`, `.env` (local), `tailwind/babel/metro/tsconfig`, `assets/version.json`.

## 1. Executive overview

Sonic Jam is an Expo + React Native music app: authenticated accounts against a custom backend,
iTunes/RSS discovery, backend-mediated playback with async job fallback, playlists, history, and recommendations.

Findings that shape everything else:

- **F1. Real stack differs from docs. [Verified]** `package.json` shows Expo 54, React 19, RN 0.81,
  `expo-router`, `@rntp/player`, Axios, Zustand, React Query. `PR_DESCRIPTION.md` instead describes
  `src/store`, `src/player`, `expo-audio`, Explore/YouTube flows that do not exist in `src/`.
  Evidence: `package.json`, `PR_DESCRIPTION.md`, `src/` listing.
  Why it matters: agents following that doc will edit nonexistent paths. **[Recommendation]** Treat it as stale.
- **F2. Backend URL is build-time hardcoded. [Verified]** `src/api/apiClient.ts` sets
  `BASE_URL = process.env.EXPO_PUBLIC_API_URL`; local `.env` holds `https://backend-sonic.onrender.com`.
  Why it matters: a generic APK cannot target a self-hosted server without a rebuild. This is the central blocker.
- **F3. Playback is backend-mediated with job fallback. [Verified]** `resolveStream()` in
  `src/features/playback/api/playbackApi.ts` calls `playbackApi.play()` (`src/features/playback/api/playback.api.ts`),
  then `resolveJob()` (`services/jobResolver.ts`) and `pollJobStatus()` (`services/pollingResolver.ts`).
  Why it matters: server changes must reset polling, queue tokens, and the native queue. No such reset exists.
- **F4. No committed tests. [Verified]** No test files, test scripts, or test config found in the repo.
  Why it matters: verification must be manual/route-based until a suite is added.

## 2. Actual architecture map

### Entry and shell [Verified]

- `package.json` main is `expo-router/entry`.
- `src/app/_layout.tsx` (`RootLayout`) wires: `QueryClient` (no default options), `ThemeProvider`,
  `GestureHandlerRootView`, `SafeAreaProvider`, `ToastProvider`, `BottomSheetProvider`,
  `VersionGuard`, `AuthGuard`, `Stack`.
- Module scope calls `TrackPlayer.registerBackgroundEventHandler(() => PlaybackService)`.
  Mount effect calls `setupPlayer()`. Fonts (Inter/Satoshi/ClashDisplay) gate `SplashScreen.hideAsync()`.
  Dark mode is forced via NativeWind (`nativewindColorScheme.set('dark')`).
- `src/app/index.tsx` redirects to `/login`, but `AuthGuard` decides the final destination.
- `src/app/(auth)/_layout.tsx`: login + signup stack. `src/app/(tabs)/_layout.tsx`: 4 visible tabs
  (home, search, library, processing) + hidden `profile/index`, `collections/[id]`, `song/[id]`, `about/developers`.
- `src/app/player.tsx`: full-screen modal player (`slide_from_bottom`, transparent).
  `src/app/notification.click.tsx`: `sonic://notification.click` bounce to `/player`.
- `AuthGuard` behavior: `checkAuth()` on boot; `authenticated` + auth path → `/home`;
  `unauthenticated` + non-auth path → `/login`; calls `stop()` on logout. While `idle/loading`, shows a loader.
- `VersionGuard` priority: Maintenance → native force → OTA force → OTA updating → first-check gate →
  native optional → OTA optional. Uses `useVersionCheck()` + `useVersionStore`.

### Layers

- `src/api/`: one shared Axios client. `src/app/`: thin route wrappers. `src/components/`: shared UI.
  `src/features/`: vertical slices. `src/lib/`: `theme.ts` (`NAV_THEME`), `utils.ts` (`cn()`).
- Cross-feature imports are direct and frequent; playback is the hub, auth is imported by API/playback/UI.
  See section 8 for coupling risks.

### State and data [Verified]

- Zustand: auth (`useAuthStore`), playback (`usePlaybackStore`, `useSmartQueueStore`, `useJobStore`),
  version (`useVersionStore`), drawer (`useDrawerStore`). No Redux; Context only for toast/bottom-sheet/theme/query.
- React Query keys observed: `userPlaylists`, `playlistSongs`, `playlistIdsBySong`, `collection`,
  `listening-history`, `search`, `genreSongs`, `home/top-songs`, `home/top-albums`. Invalidation lives mainly in
  `src/features/library/hooks/useLibrary.ts` and `src/features/history/hooks/useHistory.ts`.
- Native player queue is the source of truth for order. Zustand `trackMap` mirrors full `PlaybackTrack`
  objects because RNTP v5 strips custom props (stated in `trackPlayerService.ts` and `PlaybackSync.tsx`).
## 3. Folder-by-folder responsibilities

- `src/api/apiClient.ts`: creates `apiClient` (baseURL `BASE_URL`, 300s timeout, JSON), exports `BASE_URL` /
  `MEDIA_URL`, attaches `Authorization` + `x-device-id` (SecureStore `sonic_device_id`), 401 refresh queue
  (`isRefreshing` + `failedQueue`), global success/error toasts, benign-404 bypass for double playlist-song deletes.
- `src/app/`: routing only; no business logic except guards/providers.
- `src/components/ui/`: shadcn-style primitives over `@rn-primitives` (`text`, `button`, `input`, `dialog`,
  `progress`, `tabs`, etc.). `icon.tsx` wraps `lucide-react-native` with NativeWind `cssInterop`.
- `src/components/AnimatedPressable.tsx`, `AudioWave.tsx`, `GradientText.tsx`, `RemoteSongListCard.tsx`:
  shared interactive primitives. `GradientText` is used by library headers; `RemoteSongListCard` uses
  gesture-handler + reanimated + haptics.
- `src/features/Toast/`: `ToastProvider` + `toastSingleton.tsx` (`toastImperative`) + `useToast()`/`withToast()`.
  Lets interceptors and services toast outside React.
- `src/features/auth/`: `api/auth.api.ts` + `auth.types.ts`, `hooks/useAuth|useLogin|useSignup`,
  `screens/LoginScreen|SignupScreen`, `components/AuthHeader|AuthFooter|SocialAuthButtons` (last is dead, see §8),
  `store/authStore.ts`, `utils/tokenStorage|tokenManager|validation`.
- `src/features/playback/`: largest slice — `api/`, `components/` (controls, artwork, seek, queue/sleep/song-info
  drawers, `PlaybackSync`), `hooks/usePlayer|useSmartQueue|useProgressSyncAuth`, `screens/PlayerScreen`,
  `services/playerSetup|trackPlayerService|jobResolver|pollingResolver|smartQueueService|repeatManager`,
  `store/usePlaybackStore|useSmartQueueStore|useJobStore`, `types/`, `utils/playbackHelpers`.
- `src/features/miniplayer/screens/MiniplayerScreen.tsx`: global mini player, rendered only when authenticated.
  Reads `usePlaybackStore`, uses `usePlayer`, `useBottomSheet`, `useArtworkColors`, `AddToPlaylistDrawer`.
- `src/features/drawer/`: global bottom sheet. `store/drawerStore.ts` holds `content`/`snapPoint` with a 350ms
  `closeTimer`; `components/GlobalBottomSheet.tsx` wraps `@gorhom/bottom-sheet`; `hooks/useDrawer.ts`
  exposes `useBottomSheet()`; `index.tsx` exports `BottomSheetProvider`.
- `src/features/library/`: playlists CRUD + songs (`api/library.api.ts`); `hooks/useLibrary.ts` (React Query +
  invalidation of `userPlaylists`, `playlistSongs`, `collection`, `playlistIdsBySong`); components for
  modals, drawers, grid/list items, skeletons.
- `src/features/collections/`: unifies remote iTunes albums (`api/collections.api.ts` → `fetchRemoteAlbum`)
  and local playlists (`libraryApi.getPlaylistWithSongs`) into one `Collection` via `hooks/useCollection.ts`.
- `src/features/history/`: `GET /listening/history` + `DELETE /listening/history/:id` (`api/historyApi.ts`);
  `useHistory()` infinite query + `useDeleteHistory()` invalidation.
- `src/features/home/`: iTunes RSS charts (`api/feed.api.ts` → `fetchTopSongs`/`fetchTopAlbums`, 10-min stale).
- `src/features/search/`: `api/itunes.api.ts` (`searchItunes`), `api/genre.api.ts` (`GET /discovery/genre`);
  `useSearchQuery` (300ms debounce, 5-min stale), `useGenreTracks`, `useSearchHistory`/`useRecentSongs` (AsyncStorage).
- `src/features/processing/`: read-only view over playback `useJobStore` (`hooks/useProcessingJobs.ts` groups
  processing/completed/failed). No own fetching.
- `src/features/profile/screens/ProfileScreen.tsx`: account display + logout. No server settings today.
- `src/features/song/`: `/song/[id]` deep-link resolver (`screens/SongDeepLinkRouteScreen.tsx`: `isRemote=true`
  via iTunes lookup, else `play({songId})`) and `utils/shareSong.ts` (`MEDIA_URL`-based share links).
- `src/features/app-validations/`: GitHub Raw config (`services/versionService.ts`), `checkAppVersion()`,
  `hooks/useVersionCheck.ts` (re-check on foreground), `store/versionStore.ts`, Maintenance/Update/OTA screens.
  OTA uses `expo-updates` (`checkForUpdateAsync`/`fetchUpdateAsync`/`reloadAsync`) with a dev-mode simulation.
- `src/features/artwork-colors/`: `extractArtworkColors()`/`getCachedArtworkColors()` (module LRU, 150 entries)
  + `useArtworkColors()` (cache-seeded, stale-URL guard).
- `src/features/about/`: developer screens + social links.
- `src/lib/theme.ts`, `src/lib/utils.ts`: `NAV_THEME` (forced dark in practice) and `cn()` (clsx + tailwind-merge).

## 4. Authentication and API data flows

- **Login. [Verified]** `LoginScreen` → `useLogin` (field validation via `validateLogin`) → `useAuth().login` →
  `authStore.login` → `authApi.login` (`POST /auth/login`) → `tokenStorage.saveTokens()` (SecureStore) →
  `authApi.getMe()` (`GET /auth/me`) → `status: authenticated`. 401 with `contactEmail` yields an
  unverified-email message. `extractErrorMessage()` handles string/array messages and no-response
  ("Cannot reach the server…").
- **Signup. [Verified]** `useSignup` → `authStore.signup` → `POST /auth/signup` → stays `unauthenticated`,
  toasts "Registration successful! Please login.", pushes `/login`. No auto-login; email verification expected.
- **Boot rehydration. [Verified]** `checkAuth()` reads refresh token; if absent → `unauthenticated`; else
  `POST /auth/refresh` → save → `getMe()` → `authenticated`; any failure clears tokens → `unauthenticated`.
- **Logout. [Verified]** `logout()` best-effort `POST /auth/logout` with refresh token, then clears tokens and
  sets `unauthenticated`. `AuthGuard` observes the status flip and calls `stop()` (native stop/clear + store reset).
  `resetAuth()` (interceptor path) only clears in-memory state; tokens are cleared by the caller.
- **Token storage. [Verified]** `tokenStorage.ts`: SecureStore keys `sonic_access_token`, `sonic_refresh_token`.
  Device ID `sonic_device_id` in SecureStore via `getOrInitDeviceId()` in `apiClient.ts`, sent as `x-device-id`.
  Device IDs use `Math.random()` (see §8 security note).
- **Refresh path A — 401 interceptor. [Verified]** `apiClient.ts` response interceptor: non-401 or retried →
  toast-if-mutation-or-5xx (except `/auth/refresh`) and reject; first 401 → if `isRefreshing`, queue on
  `failedQueue`, else `_retry = true`, direct `axios.post(BASE_URL/auth/refresh)` (bypasses interceptors),
  save tokens, lazy `setProgressSyncToken(newAccessToken)`, drain queue, retry original request. Refresh failure →
  clear tokens + lazy `resetAuth()`.
- **Refresh path B — pre-flight. [Verified]** `tokenManager.ts` `ensureFreshToken()`: reads access token,
  decodes JWT `exp` (no deps, `atob`), 60s buffer via `isTokenExpired()`; undecodable → trust; fresh → return;
  expired → deduped `doRefresh()` (`fetch(BASE_URL/auth/refresh)`), save, lazy `setProgressSyncToken()`.
  Failure → lazy `resetAuth()` + clear, return null. `useProgressSyncAuth()` calls this on mount.
- **Endpoint inventory. [Verified]** Auth: `/auth/signup|login|refresh|logout`, `GET /auth/me`. Playback:
  `POST /song/play`, `GET /song/job/:jobId`, `POST /listening/event`, native `POST {BASE_URL}/listening/progress-sync`.
  Library: `/playlist/getAll|create`, `/playlist/:id` (get/patch/delete), `/playlist/:id/songs`,
  `/playlist/song/add`, `DELETE /playlist/:playlistId/song/:songId`, `/playlist/song/:songId`.
  History/recommend/discovery: `/listening/history` (get/delete), `/recommend?limit=`, `/discovery/genre?genre=&limit=`.
  External: iTunes Search/Lookup, Apple RSS charts, direct iTunes fetch in smart queue + deep-link screen,
  GitHub Raw app-config. No `/health` client exists.
- **Env usage. [Verified]** Only `EXPO_PUBLIC_API_URL` is set locally; `EXPO_PUBLIC_MEDIA_URL` is unset so
  `MEDIA_URL` falls back to `BASE_URL`. Both are build-time constants; no runtime override exists.
## 5. Playback architecture and data flow

- **Setup. [Verified]** `services/playerSetup.ts` builds `PLAYER_CONFIG` (music, 200MB cache, preload window 2,
  Android `wakeMode: network`, notification channel `com.sonic.audio`, `progressSync` every 30s to
  `{BASE_URL}/listening/progress-sync`) and calls `TrackPlayer.setupPlayer()` + `setCommands()`
  (PlayPause/Next/Previous/Stop/Seek). `isSetup` module guard. Invoked once from `RootLayout`.
- **Stream resolution. [Verified]** `resolveStream(payload)` validates `{songId}` or `{trackName+artistName}`,
  calls `POST /song/play` → `ready {song, playbackToken}` returns directly; `job {jobId}` → `resolveJob()` →
  `pollJobStatus()`. `createPlaybackTrack()` builds `{url: {uri: song.streamUrl, headers: {Authorization:
  Bearer playbackToken}}, mediaId: song.id, title/artist/artworkUrl/duration, mimeType audio/aac, song, source}`.
  `getPlaybackUrl()` (`{BASE_URL}/song/:id`) is display state only, not the audio source.
- **Job polling. [Verified]** `pollingResolver.ts`: 5-min cap, staged backoff (2s/2s/11s dead-zone, then +2s to 10s
  cap), `busy` + `retryAfter` handling (shifts timeout, resets poll count), network-drop retry vs server-error fail,
  `useJobStore` updates (`waiting/active/completed/failed`). No `AbortSignal`.
- **Queue ops. [Verified]** `hooks/usePlayer.ts` (`usePlayer()`): `play` (optimistic song + `pendingJobId`,
  force-replace when playlist active or `preserveQueue: false`, `clear/setMediaItems/insert/skip/play`,
  `ensureSmartQueueActive()`), `playPlaylist` (single pre-resolved token for ALL tracks, `setMediaItems(tracks,
  clampedIndex)`), `enqueue`, `playNext` (insert after current), `addToQueue` (append), `removeFromQueue[_BySongId]`
  (live-queue reads, never removes active), `seek` (with debug logs), `stop` (native stop/clear + `reset()`),
  `skipToNext/Previous/Index`, `toggleShuffle`, `toggleRepeatMode`, `syncSleepTimer`. `queueOpLock` is reset on
  hard queue replacement but never actually chains ops; `findAddToQueueInsertIndex` is defined but uncalled.
- **Stores. [Verified]** `usePlaybackStore`: `queueType` (playlist/radio/manual), `playlistMeta`,
  `currentSong/Track`, `status/position/duration/error`, `streamUrl`, `pendingJobId`, `trackColors`,
  `repeatMode/repeatOnceUsed`, `shuffleEnabled`, `sleepTimer`, `trackMap`. `useSmartQueueStore`: `tracks`,
  `isActive`, `viewMode`, `cancelledIds`, init/append/update/cancel/remove. `useJobStore`: `jobs` map + add/update/remove.
- **Foreground sync. [Verified]** `components/PlaybackSync.tsx`: mounts `useSmartQueue()` + `useProgressSyncAuth()`;
  `useProgress(1)` → `setPosition/setDuration` (duration guarded `> 0`); status mapping
  (Error → pendingJobId-loading → playing → buffering-loading → ended-stopped → paused/idle);
  `PlaybackError` recovery (rate-limited 2/30s per song: re-`resolveStream`, `replaceMediaItem`, play, seek-back);
  `MediaItemTransition` → repeat-mode sync, `trackMap` recovery, `setStream()`, `extractArtworkColors()`.
- **Background service. [Verified]** `services/trackPlayerService.ts` (`PlaybackService`): `RemotePlay/Pause/Next/
  Previous/Seek`, `MediaItemTransition` (no-op `RepeatManager.handlePlaybackEnd()` + `trackMap` recovery +
  `handleSmartQueueMediaTransition()`), `PlaybackStateChanged.Ended` → repeat handler, `PlaybackError` log,
  `SleepTimerTriggered` → `setSleepTimer(null)`. Uses lazy `usePlaybackStore` import (required headless).
- **Smart radio. [Verified]** `services/smartQueueService.ts`: `start/ensureSmartQueueActive` set `queueType: radio`,
  fetch `/recommend`, `enrichTrack()` via iTunes Search (soft token match), `processBatch()` serially resolves via
  `resolveStream()`, `tryFillRNTPQueue()` appends ready tracks, `ensureSmartQueueWindow()` keeps ≥5 native-ahead and
  ≥10 prepared. Module-level singletons (`hasStartedPlayback`, `resolvingBatch`, flags) reset only by
  `resetSmartQueueRadio()`. `getRecommendations()` swallows all errors → `[]`.
- **Progress sync. [Verified]** Two systems: UI poll (`useProgress(1)` in `PlaybackSync`) and native HTTP
  (`progressSync.intervalSeconds: 30`). Headers updated by `setProgressSyncToken()` (`useProgressSyncAuth.ts`):
  on mount via `ensureFreshToken()`, on every token refresh (both refresh paths), cleared on `unauthenticated`.
- **Repeat/shuffle/sleep. [Verified]** `services/repeatManager.ts` toggles off↔track (`RepeatMode.One/Off`);
  queue/once modes exist in types but `toggleRepeatMode` collapses them to off and end-handlers are no-ops.
  Shuffle delegates to `TrackPlayer.setShuffleEnabled()`. Sleep timer uses `sleepAfterTime/sleepAfterMediaItemAtIndex`
  with store mirror + dual listeners (foreground `PlaybackSync` and background service).

## 6. Important dependencies and integration points

- **Framework. [Verified]** `expo ~54.0.33`, `react 19.1.0`, `react-native 0.81.5`, `expo-router ~6.0.23`,
  `typedRoutes` + `reactCompiler` on, `scheme: sonic`, Android `com.itsishandev.sonic`, intent filter
  `https://music-sonic.vercel.app`, plugins `expo-router/splash-screen/secure-store/font/navigation-bar`,
  `runtimeVersion: appVersion`, OTA `https://u.expo.dev/7cefc623…`, `checkAutomatically: NEVER`.
- **Build. [Verified]** `eas.json`: development (devClient, internal), preview/production APK (internal,
  production channel). No `android/`/`ios/` (managed prebuild). Scripts: `expo start`, `expo run:android/ios`.
  **Broken scripts. [Verified]** `docs:generate`/`prestart`/`preandroid`/`preios`/`preweb`/`prelint` reference
  missing `scripts/generate-project-docs.js`; `postinstall` runs `patch-package` with no `patches/` dir.
- **Native boundary. [Verified]** Dev build required (`@rntp/player`, reanimated, gesture-handler, bottom-sheet,
  image-colors, slider, masked-view, screens, safe-area-context, svg, Expo modules). Expo Go assumed unusable
  **[Assumption]** (not executed).
- **Data/state. [Verified]** `@tanstack/react-query ^5.95.2`, `axios ^1.13.6`, `zustand ^5.0.12`.
- **UI. [Verified]** `nativewind`, `tailwindcss`, `@rn-primitives/*`, `lucide-react-native`,
  `@expo/vector-icons`, `expo-image/linear-gradient/blur/haptics/font`, `react-native-svg`.
- **Potentially unused deps. [Verified no imports in src]** `react-hook-form`, `lottie-react-native`,
  `expo-system-ui`; `expo-navigation-bar` only in commented code despite the plugin entry;
  `prettier-plugin-tailwindcss` sits in `dependencies` instead of `devDependencies`.
  `@react-navigation/bottom-tabs|native-stack` are likely transitive-only (direct usage is `ThemeProvider` + expo-router).
  **[Recommendation]** Confirm with a graph pass before removing.
- **External services. [Verified]** Backend `EXPO_PUBLIC_API_URL`; iTunes Search/Lookup/RSS; GitHub Raw
  `app-config-sonic/app-config.json`; EAS updates project `7cefc623…`; YouTube image URLs as artwork fallback.
## 7. Self-host migration impact (summary)

Full checklist lives in `docs/SELF_HOST_IMPACT.md`. Key points:

- No runtime server layer exists: no stored URL, no `/health` check, no QR/manual input, no Profile switcher.
- 12 static touchpoints must change (`apiClient`, `tokenManager`, `playerSetup` progressSync URL,
  `playbackHelpers`, 4 share-link sites, `app.json` intent filter + updates URL, deep-link resolver, version config).
- Server switch must atomically clear tokens, user, React Query cache, native queue, `trackMap`, jobs,
  smart-queue (+ module singletons), polling loops, `pendingJobId`/`streamUrl`, and progress-sync URL/headers.
- New backend contract required: `/health`, `/auth/*`, `/song/play`, `/song/job/:id`, `/recommend`,
  `/playlist/*`, `/listening/*`, `/discovery/genre`, `song.streamUrl` + `playbackToken` semantics.

## 8. Technical debt and identified risks

- **R1. Playback barrel invites cycles. [Verified]** `src/features/playback/index.ts` re-exports
  `api/components/hooks/services/store/types` while members import each other. Cycles are masked by lazy imports.
  **[Recommendation]** Never import the barrel from inside itself; keep background-path imports lazy.
- **R2. Auth/playback circularity is fragile but contained. [Verified]** Lazy imports in `apiClient.ts`,
  `tokenManager.ts`, `trackPlayerService.ts`. **[Recommendation]** Keep them lazy.
- **R3. Cross-feature cache-key coupling. [Verified]** `useLibrary.ts` invalidates `["collection", …]` owned by
  `useCollection.ts`. **[Recommendation]** Export key factories from the owning feature.
- **R4. iTunes logic duplicated ×4. [Verified]** `itunes.api.ts`, `feed.api.ts`, `collections.api.ts`, inline fetch in
  `smartQueueService.ts` + `SongDeepLinkRouteScreen.tsx` (plus duration/artwork variants).
  **[Recommendation]** Centralize under `search/`.
- **R5. Confusing `playback.api.ts` vs `playbackApi.ts`. [Verified]** Endpoints vs `resolveStream()` + re-export.
  **[Recommendation]** Rename to `endpoints` / `resolver`.
- **R6. Dead/no-op code. [Verified]** `findAddToQueueInsertIndex` (uncalled), `extendQueue` (empty),
  `syncQueueTokens` (no-op, imported but uncalled), `RepeatManager.handlePlaybackEnd/resetOnceState` (empty),
  `manualInsertIndex` (write-only), `SocialAuthButtons` (no handlers, unimported), `queueOpLock` (never chains).
- **R7. Per-hook setup mutex. [Verified]** `isSettingUp` is a `useRef` in `usePlayer()`; concurrent hook instances
  race and can surface spurious "Player setup failed". **[Recommendation]** Module-global in-flight promise.
- **R8. Unbounded maps. [Verified]** `trackMap` and `recoveryAttempts` only grow; smart-queue singletons survive
  logout. **[Recommendation]** Evict on logout/server-change/queue-clear.
- **R9. Logout leaks caches. [Verified]** `logout`/`resetAuth` clear tokens/user only — no `queryClient.clear()`,
  no smart-queue/job reset. Next user/server can see stale data. **[Recommendation]** Central `clearSessionCaches()`.
- **R10. Polling has no cancellation. [Verified]** `pollJobStatus()` loops 5 min with no signal.
  **[Recommendation]** Add `AbortSignal` or server-generation guard.
- **R11. Dual transition handling. [Verified]** `MediaItemTransition` handled in both `PlaybackSync` and
  `PlaybackService` (+ `useSmartQueue`). **[Recommendation]** Keep idempotent; document ownership.
- **R12. Inconsistent errors. [Verified]** Global toast for mutations/5xx but silent 4xx GETs; `recommendationApi`
  and smart-queue swallow errors → `[]`; playback mixes store-error + toast + `console.error`; `seek()` has debug logs.
- **R13. Validation mismatch. [Verified]** Login min password 6 vs signup min 8 (`validation.ts`).
- **R14. Weak device IDs. [Verified]** `Math.random()` in `getOrInitDeviceId()`. **[Recommendation]** `expo-crypto`
  UUID with migration preserving existing IDs.
- **R15. Unsigned update config. [Verified]** GitHub Raw JSON trusted for `native.updateUrl`, opened via
  `Linking.openURL` without validation. **[Recommendation]** Pin host, enforce HTTPS, consider signing.
- **R16. OTA progress leak. [Verified]** Fake-progress `setInterval` in `OTAUpdateScreen.tsx` is cleared only after
  fetch; unmount mid-fetch leaks the timer. Minor.
- **R17. Stale docs + missing scripts. [Verified]** `PR_DESCRIPTION.md` describes a dead architecture; `README.md`
  is the Expo template; `docs/` + `scripts/` referenced by `package.json` do not exist (until this audit added `docs/`).

## 9. Conventions worth preserving

- Feature-first slices (`api/components/hooks/screens/store/types/utils`) + thin routes + shared `components/` + `lib/`.
- `tokenStorage` as the sole SecureStore wrapper for auth; `toastImperative` for non-React call sites.
- Global bottom sheet via `useBottomSheet().open(node, snapPoints)` across queue/sleep/song-info/playlists.
- `usePlaybackStore` equality guards, `PlaybackSync` `duration > 0` guard, polling backoff with `busy/retryAfter`.
- Artwork service (LRU + stale-URL guard) and deep-link ID validation (`UUID/CUID/safe-ID`).

## 10. Documentation and agent-rule requirements

1. Read `AGENTS.md`, then this file, then `docs/SELF_HOST_IMPACT.md` before auth/network/playback/server work.
2. Read the must-read file lists in `AGENTS.md` for the touched area; keep lazy imports lazy (R1/R2).
3. No new `BASE_URL`/`MEDIA_URL` imports or hardcoded hosts; route through the future runtime server module.
4. Session resets (logout/server change) must clear query cache + queue + `trackMap` + jobs + smart-queue + polling
   + progress-sync together (R8–R10).
5. Keep duplicated pairs in sync: `PlaybackSync` + `PlaybackService`; interceptor refresh + `ensureFreshToken()`.
6. Put new iTunes/search helpers in `search/`; do not copy fetch/mapping blocks (R4).
7. Update this audit + `AGENTS.md` + `SELF_HOST_IMPACT.md` whenever routes, endpoints, stores, or native config change.
8. Verify self-host work against the real backend contract (§7); never assume web host == API host.



