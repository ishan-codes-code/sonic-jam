# Sonic Jam — Agent Guide

> Read this file before modifying anything. It is the entry point for AI-assisted development.
> Full evidence-backed audit: `docs/ARCHITECTURE_AUDIT.md`. Self-host work list: `docs/SELF_HOST_IMPACT.md`.
> `PR_DESCRIPTION.md` at repo root is STALE (describes old `src/store`, `expo-audio`, Explore/YouTube code that no longer exists). Do not trust it.

## What this is

Expo + React Native music app. Single-backend client today: backend URL is baked at build time via `EXPO_PUBLIC_API_URL`.
File-based routing (expo-router), one Axios client, Zustand for client state, React Query for server cache, `@rntp/player` v5 for native audio.

## Stack (verified in package.json / app.json)

- `expo ~54.0.33`, `react 19.1.0`, `react-native 0.81.5`, `expo-router ~6.0.23`
- `@rntp/player ^5.0.0`, `axios`, `zustand`, `@tanstack/react-query`, `nativewind`, `tailwindcss`
- Requires a development build (`expo-dev-client`). Expo Go will not work (native player + other native modules).
- No `android/` or `ios/` folders (managed prebuild). EAS profiles build APKs (`eas.json`).

## Entry points

- `src/app/_layout.tsx` — `RootLayout`: providers, `VersionGuard`, `AuthGuard`, `Stack`, `setupPlayer()`, `TrackPlayer.registerBackgroundEventHandler`.
- `src/app/index.tsx` — redirects to `/login`; `AuthGuard` decides the real destination.
- `src/app/(auth)/` — login, signup. `src/app/(tabs)/` — home, search, library, processing + hidden profile, collections/[id], song/[id], about/developers.
- `src/app/player.tsx` — full-screen modal player. `src/app/notification.click.tsx` — notification tap bounce to `/player`.

## Must-read before changing an area

- Auth/networking: `src/api/apiClient.ts`, `src/features/auth/store/authStore.ts`, `src/features/auth/utils/tokenManager.ts`, `src/features/auth/utils/tokenStorage.ts`
- Playback: `src/features/playback/services/playerSetup.ts`, `src/features/playback/hooks/usePlayer.ts`, `src/features/playback/components/PlaybackSync.tsx`, `src/features/playback/services/trackPlayerService.ts`, `src/features/playback/utils/playbackHelpers.ts`, `src/features/playback/services/smartQueueService.ts`
- Data cache: `src/app/_layout.tsx` (QueryClient), `src/features/library/hooks/useLibrary.ts`, `src/features/collections/hooks/useCollection.ts`

## Hard rules

1. Do NOT convert lazy `await import()` of `authStore` / `usePlaybackStore` / `useProgressSyncAuth` in `apiClient.ts`, `tokenManager.ts`, `trackPlayerService.ts` to static imports. They exist to avoid cycles and background-thread breakage.
2. Do NOT add new `BASE_URL` / `MEDIA_URL` imports. All server-URL access must eventually go through one runtime server module (see self-host doc). No new hardcoded hosts.
3. Do NOT trust React Query cache across logout or server change. Any session reset must clear `queryClient`, native queue, `trackMap`, `useJobStore`, `useSmartQueueStore`, polling, and progress-sync state together.
4. Do NOT edit only one side of a duplicated pair: foreground `PlaybackSync` + background `trackPlayerService` both handle `MediaItemTransition`; `apiClient` 401-refresh + `tokenManager.ensureFreshToken()` both refresh tokens.
5. Do NOT build on dead code: `findAddToQueueInsertIndex`, `extendQueue`, `syncQueueTokens`, `RepeatManager.handlePlaybackEnd`, `SocialAuthButtons` (no handlers, unused).
6. Keep routes thin. Business logic lives in `src/features/`, shared UI in `src/components/`, theme in `src/lib/`.
7. Verify with the repo's own flows: boot gate (`VersionGuard` + `AuthGuard`), login → feed → play → queue → playlist → logout. There is no committed test suite (verified: no tests found in repo).

## Key gotchas

- Real audio URL is `song.streamUrl` + `playbackToken` header, NOT `BASE_URL/song/:id` (`getPlaybackUrl()` is display state only).
- `trackMap` mirrors full tracks because RNTP v5 strips custom props. Clearing the native queue without clearing `trackMap` resurrects stale songs.
- `getRecommendations()` returns `[]` on any error, so radio fails silently if `/recommend` is missing.
- `package.json` pre-hooks reference missing `scripts/generate-project-docs.js` and `postinstall` runs `patch-package` with no `patches/` dir. Expect noise on `npm start` / `npm run lint` until fixed.
- `SocialAuthButtons` renders nothing functional. `validateLogin` (min 6) and `validateSignup` (min 8) disagree on password length.
