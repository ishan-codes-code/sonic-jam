# Sonic Jam — Agent Guide

> Read this file before modifying anything. It is the entry point for AI-assisted development.
> Docs: architecture `docs/ARCHITECTURE.md` + `docs/FILE_INVENTORY.md` · audit `docs/ARCHITECTURE_AUDIT.md` ·
> self-host `docs/SELF_HOST_IMPACT.md` · protocol `docs/TASK_PROTOCOL.md` · contracts `docs/contracts/` ·
> decisions `docs/decisions/` · skills `docs/skills/` · tooling `docs/TOOLING.md`.
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

## Architecture lock

The structure in `docs/ARCHITECTURE.md` (baseline commit `00a4fad`: 183 files, 15,855 lines) is the
architectural baseline. These rules are non-negotiable:

1. The existing folder structure is the project's architectural baseline.
2. Agents must preserve the existing feature-based organization.
3. Do not create new top-level architectural directories without explicit justification and approval.
4. Do not move or rename existing files simply to improve aesthetics.
5. Place new files inside the appropriate existing feature or shared directory.
6. Preserve existing module responsibilities and feature boundaries (`docs/ARCHITECTURE.md` §5).
7. Any necessary architectural deviation must be explained before implementation and documented.
8. Update the architecture reference whenever an approved structural change occurs (tree + stats in
   `docs/ARCHITECTURE.md`, rows in `docs/FILE_INVENTORY.md`, new baseline commit hash).

## File size and maintainability

- Avoid excessively large source files. Do not accumulate unrelated responsibilities in one file.
- Follow existing conventions for separating components, hooks, services, utilities and types.
- Prefer focused modules with clear responsibilities.
- Before substantially increasing a file's size, consider whether its responsibilities should be separated.
- Do not split files artificially just to satisfy a line limit.
- Do not perform large-scale file splitting without approval.
- Use the baseline counts in `docs/FILE_INVENTORY.md` to detect unusual growth. Current largest:
  `usePlayer.ts` (554), `CollectionScreen.tsx` (483), `smartQueueService.ts` (422),
  `RemoteSongListCard.tsx` (375). Growth beyond ~20% in any file should prompt a baseline refresh.

## Task execution protocol

Follow `docs/TASK_PROTOCOL.md` on every task. The short version:

- Before: understand the task, read the docs for the touched area (map below), inspect the files
  and their dependencies, state the scope, and explain substantial changes before making them.
- During: focused changes only, preserve functionality, follow naming/typing/architecture conventions,
  never invent API contracts or backend behavior, ask when ambiguous.
- After: review the full diff, run lightweight verification, report modified files + decisions +
  what could not be verified. Never claim manual verification that did not happen.

## Testing philosophy

Lightweight only. This repo has no test suite and we are not building one now.

- Routine checks: `npx tsc --noEmit` (clean baseline) and `npx expo lint` (red baseline: 26 errors,
  105 warnings — see `docs/TOOLING.md`). Invoke both directly; the `npm run` wrappers are broken.
- Do not add test infrastructure, extensive tests, or CI unless explicitly requested.
- Manual verification is done separately by the project owner.

## Documentation map

| Before you… | Read |
|-------------|------|
| Change structure (add/move/rename) | `docs/ARCHITECTURE.md` + `docs/FILE_INVENTORY.md` |
| Touch auth/network/playback/server code | `docs/ARCHITECTURE_AUDIT.md` + must-read list above |
| Integrate an API | The relevant `docs/contracts/` file |
| Make an architecture-level choice | `docs/decisions/` (check for an applicable ADR first) |
| Do self-host work | `docs/SELF_HOST_IMPACT.md` (the migration is NOT implemented) |
| Run dev commands | `docs/TOOLING.md` (several npm scripts are broken) |
| Repeat specialized work | `docs/skills/` (feature slice, API integration, playback queue) |

## Documentation maintenance

- Keep docs factual, concise and maintainable. Never invent endpoints, shapes, or line counts.
- Update the architecture reference + inventory when an approved structural change lands.
- Update contracts when an endpoint changes; update/retire ADRs when a decision changes.
- If a doc contradicts the source, the source wins — then fix the doc in the same task.

## Key gotchas

- Real audio URL is `song.streamUrl` + `playbackToken` header, NOT `BASE_URL/song/:id` (`getPlaybackUrl()` is display state only).
- `trackMap` mirrors full tracks because RNTP v5 strips custom props. Clearing the native queue without clearing `trackMap` resurrects stale songs.
- `getRecommendations()` returns `[]` on any error, so radio fails silently if `/recommend` is missing.
- `package.json` pre-hooks reference missing `scripts/generate-project-docs.js`, so `npm start` / `npm run android|ios|web|lint` fail before running; invoke `npx expo …` / `npx tsc` directly. `postinstall` runs `patch-package` with no `patches/` dir (harmless noise). Full report: `docs/TOOLING.md`.
- `SocialAuthButtons` renders nothing functional. `validateLogin` (min 6) and `validateSignup` (min 8) disagree on password length.
