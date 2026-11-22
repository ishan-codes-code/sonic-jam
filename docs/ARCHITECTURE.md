# Sonic Jam — Locked Architecture Reference

> This is the project's architectural baseline. It records the repository structure AS IT EXISTS.
> Agents must preserve this structure (see `AGENTS.md` preservation rules) and update this file
> whenever an approved structural change makes it inaccurate.

- Baseline commit: `00a4fad` (`00a4fad285c3cbf0f5ac8d4079a970bc643dddd2`, 2026-11-20).
- Baseline stats: `src/` holds **183 files, 15,855 lines** (method: `wc -l`; per-file table in `docs/FILE_INVENTORY.md`).
- Structural delta (uncommitted, 2026-11-21): +`src/features/server/` slice (7 files, 598 lines)
  plus `ServerGuard` in `src/app/_layout.tsx` (+39), runtime URL support in `src/api/apiClient.ts`
  (+20), lazy config in `playerSetup.ts` (+5). Working tree: **190 files, 16,517 lines**.
  Re-baseline the commit hash on commit.
- Structural delta (uncommitted, 2026-11-22, Settings hub + Server Management):
  +`src/features/settings/` slice (3 files, 155 lines), +`src/app/(tabs)/settings/` routes
  (3 files, 15 lines) replacing `src/app/(tabs)/profile/index.tsx`, +server-switch UI in
  `src/features/server/` (`ServerManagementScreen`, `useServerSwitch`; 2 files, 415 lines),
  +playback session-reset primitives (+106). Working tree: **197 files, 17,208 lines**.
  Re-baseline the commit hash on commit.
- Structural delta (uncommitted, 2026-11-22, Login → Server Setup review):
  +`src/app/(auth)/server-setup.tsx` route (5 lines) + shared `performServerSwitch()`
  (`src/features/server/utils/serverSwitch.ts`, 67 lines) extracted from `useServerSwitch`;
  also records the earlier race-fix drift (+32 playback). Working tree:
  **199 files, 17,341 lines**. Re-baseline the commit hash on commit.
- Structural delta (uncommitted, 2026-11-22, contextual setup CTA):
  `useServerSetup` 89→105 + `ServerSetupScreen` 171→180 (Login/Continue label).
  Working tree: **199 files, 17,366 lines**. Re-baseline the commit hash on commit.
- Structural delta (uncommitted, 2026-11-22, setup CTA + keyboard polish):
  no back button, Continue + green check when the configured URL is untouched,
  focus scrolls the input above the keyboard. `useServerSetup` 105→103,
  `ServerSetupScreen` 180→176. Working tree: **199 files, 17,360 lines**.
  Re-baseline the commit hash on commit.
- Structural delta (uncommitted, 2026-11-22, Android keyboard-aware scroll):
  +`src/components/useKeyboardAwareScroll.ts` (65 lines, shared by auth +
  server) replaces the setup screen's blind `scrollToEnd` hack; Login 141→146,
  Signup 149→155, ServerSetupScreen 176→170. Working tree:
  **200 files, 17,430 lines**. Re-baseline the commit hash on commit.
- Structural delta (uncommitted, 2026-11-22, keyboard-scroll geometry fix):
  compensate the scroll API's full-screen assumption with the live safe-area
  top inset (`useKeyboardAwareScroll` 65→79). Working tree:
  **200 files, 17,444 lines**. Re-baseline the commit hash on commit.
- Structural delta (uncommitted, 2026-11-22, dynamic keyboard bottom padding):
  hook tracks keyboard height and exposes bottom padding (79→126); scrolling
  is sequenced after the range grows via onContentSizeChange. Login 146→155,
  Signup 155→164, ServerSetupScreen 170→176. Working tree:
  **200 files, 17,515 lines**. Re-baseline the commit hash on commit.
- Structural delta (uncommitted, 2026-11-22, PR #10 review races):
  +`utils/sessionGeneration.ts` (23); refresh guards (`apiClient` 225→260,
  `tokenManager` 121→144), pre-request polling capture (`pollingResolver`
  208→231, `playbackApi` 42→56, `jobResolver` 13→16), `serverStore` 97→122
  (first-time stale-token clear, storage-failure safe load), `serverStorage`
  47→45, `serverValidation` 97→112, `useServerSetup` 103→124, hook 126→137,
  `serverSwitch` 67→71, `index` 35→39. Working tree:
  **201 files, 17,714 lines**. Re-baseline the commit hash on commit.
- Scope note: `node_modules/`, `.git/`, `.expo/` are excluded. `.env` is local and gitignored (1 line).
- Companion docs: `AGENTS.md`, `docs/ARCHITECTURE_AUDIT.md`, `docs/SELF_HOST_IMPACT.md`, `docs/contracts/`, `docs/decisions/`.

## 1. Top-level layout

| Path | Responsibility |
|------|---------------|
| `src/` | All application source (routes, features, shared UI, API client, styles) |
| `assets/` | Fonts (`ClashDisplay`, `Satoshi`), images (auth/maintenance art), platform icons, `version.json` (OTA version) |
| `docs/` | Agent + architecture documentation (audit, impact list, this reference, inventory, contracts, decisions, skills, tooling) |
| `app.json` | Expo config: name/slug/version, scheme, icons, splash, plugins, Android intent filters, OTA channel |
| `package.json` | Deps, Expo scripts (several pre-hooks broken — see `docs/TOOLING.md`) |
| `eas.json` | EAS build profiles (development / preview / production APK) |
| `tsconfig.json` | Strict TS, `@/*` → `src/*`, excludes `ditched/` |
| `babel.config.js` | `babel-preset-expo` + NativeWind + Reanimated plugin; strips `console` in production |
| `metro.config.js` | Expo Metro + NativeWind (`src/global.css`, `inlineRem: 16`) |
| `tailwind.config.js` | NativeWind preset, shadcn-style tokens, font families |
| `components.json` | shadcn registry aliases (`@/components`, `@/lib/utils`, …) |
| `eslint.config.js` | Expo flat ESLint config, ignores `dist/*` |
| `AGENTS.md` | Primary agent entry point |
| `PR_DESCRIPTION.md` | STALE. Describes a dead architecture. Do not use. |
| `README.md` | Unmodified Expo template. Not authoritative. |

Directories that intentionally DO NOT exist: `android/`, `ios/` (managed prebuild via `expo run:*` / EAS),
`scripts/` (referenced by broken npm hooks), `patches/` (referenced by `postinstall`), any test directory.

## 2. Entry points

| Entry | File | Role |
|-------|------|------|
| JS entry | `package.json` main `expo-router/entry` | Expo Router bootstrap |
| Root layout | `src/app/_layout.tsx` | Providers, `VersionGuard`, `ServerGuard`, `AuthGuard`, `Stack`, `setupPlayer()` (via `ServerGuard`), background handler registration |
| Default route | `src/app/index.tsx` | Redirects to `/login`; guard decides final destination |
| Auth group | `src/app/(auth)/_layout.tsx` + `login.tsx` + `signup.tsx` + `server-setup.tsx` | Unauthenticated stack |
| Tabs group | `src/app/(tabs)/_layout.tsx` | Custom tab bar (Home, Search, Library, Processing) + hidden routes |
| Home nested | `src/app/(tabs)/home/_layout.tsx` | Feed/Recents header + nested stack (`index`, `recents`) |
| Search nested | `src/app/(tabs)/search/_layout.tsx` | Nested stack (`index`, `[genre]`) |
| Player modal | `src/app/player.tsx` | Full-screen modal player |
| Notification tap | `src/app/notification.click.tsx` | Bounces `sonic://notification.click` to `/player` |
| OTA version | `assets/version.json` | `otaVersion` compared against remote config |

## 3. Configuration and native project locations

| Concern | Location | Notes |
|---------|----------|-------|
| App identity/icons/splash | `app.json` | Version `3.0.0`, Android `versionCode` 5 / package `com.itsishandev.sonic`, iOS `buildNumber` 5 |
| Deep links | `app.json` `android.intentFilters` + `scheme: sonic` | Host `music-sonic.vercel.app`; in-app resolver `src/features/song/` |
| OTA updates | `app.json` `updates.url` + `assets/version.json` | Channel via `extra.eas.projectId`; gate logic in `src/features/app-validations/` |
| Build profiles | `eas.json` | No local credentials in repo |
| Env (build-time) | `.env` (gitignored) | `EXPO_PUBLIC_API_URL` only; `EXPO_PUBLIC_MEDIA_URL` unset → falls back to API URL |
| TS paths | `tsconfig.json` | `@/*` alias; strict mode |
| Native projects | ABSENT (generated) | `expo run:android` / `expo run:ios` prebuild; `android/` + `ios/` gitignored |
| Icons/splash art | `assets/images/sonicIcons/{android,ios,web}/` | `xxxhdpi` foreground used for splash; `AppIcon~ios-marketing.png` for iOS |

## 4. Complete `src` tree (baseline)

Line counts per file are in `docs/FILE_INVENTORY.md`. Structure:
```text
src/
├── api/                          # shared network layer (1 file)
│   └── apiClient.ts              # axios instance, BASE_URL/MEDIA_URL (runtime-settable), token + device interceptors, 401 queue, toasts
├── app/                          # expo-router routes: thin wrappers + layouts (20 files)
│   ├── _layout.tsx               # RootLayout: providers, guards (Version/Server/Auth), Stack, player setup
│   ├── index.tsx                 # default → /login redirect
│   ├── player.tsx                # → PlayerScreen (full-screen modal)
│   ├── notification.click.tsx    # notification tap → /player redirect
│   ├── (auth)/
│   │   ├── _layout.tsx           # auth stack (login, signup)
│   │   ├── login.tsx             # → LoginScreen
│   │   ├── signup.tsx            # → SignupScreen
│   │   └── server-setup.tsx      # → ServerSetupScreen (review mode)
│   └── (tabs)/
│       ├── _layout.tsx           # custom tab bar + hidden-route registration
│       ├── library.tsx           # → LibraryScreen
│       ├── processing.tsx        # → ProcessingScreen
│       ├── home/
│       │   ├── _layout.tsx       # feed/recents TabHeader + nested stack
│       │   ├── index.tsx         # → HomeFeedScreen (+ play wiring)
│       │   └── recents.tsx       # → HistoryScreen
│       ├── search/
│       │   ├── _layout.tsx       # nested stack shell
│       │   ├── index.tsx         # SearchScreen ↔ SearchFocusScreen switch
│       │   └── [genre].tsx       # → GenreScreen
│       ├── settings/
│       │   ├── index.tsx         # → SettingsScreen (hub, hidden tab)
│       │   ├── account.tsx       # → ProfileScreen (existing, hidden tab)
│       │   └── server.tsx        # → ServerManagementScreen (hidden tab)
│       ├── collections/
│       │   └── [id].tsx          # → CollectionScreen (hidden tab)
│       ├── song/
│       │   └── [id].tsx          # → SongDeepLinkRouteScreen (hidden tab)
│       └── about/
│           └── developers.tsx    # → DeveloperScreen (hidden tab)
├── components/                   # shared UI (18 files)
│   ├── AnimatedPressable.tsx     # reanimated pressable primitive
│   ├── AudioWave.tsx             # audio waveform visual
│   ├── useKeyboardAwareScroll.ts # Android focus-scroll hook (auth + server)
│   ├── GradientText.tsx          # masked-view gradient text (used by library headers)
│   ├── RemoteSongListCard.tsx    # swipeable song row (gesture-handler + haptics)
│   └── ui/                       # shadcn-style primitives over @rn-primitives (14 files)
│       ├── accordion.tsx  alert-dialog.tsx  avatar.tsx  button.tsx  card.tsx
│       ├── dialog.tsx  dropdown-menu.tsx  icon.tsx  input.tsx
│       ├── native-only-animated-view.tsx  progress.tsx  skeleton.tsx  tabs.tsx  text.tsx
├── lib/                          # cross-cutting helpers (2 files)
│   ├── theme.ts                  # THEME + NAV_THEME (dark forced in practice)
│   └── utils.ts                  # cn() (clsx + tailwind-merge)
├── global.css                    # NativeWind entry (59 lines)
└── features/                     # vertical feature slices (18 features, 153 files)
```
```text
src/features/
├── Toast/                        # global toast system (3 files)
│   ├── components/ToastProvider.tsx   # pill-style provider + useToastContext
│   ├── hooks/useToast.tsx             # useToast() + withToast() helpers
│   └── utils/toastSingleton.tsx       # toastImperative singleton for non-React call sites
├── about/                        # developer info (2 files)
│   ├── screens/DeveloperScreens.tsx
│   └── utils/developersSocials.tsx    # SOCIALS link list
├── app-validations/              # version/maintenance/OTA gates (6 files)
│   ├── hooks/useVersionCheck.ts
│   ├── screens/MaintenanceScreen.tsx  screens/OTAUpdateScreen.tsx  screens/UpdateScreen.tsx
│   ├── services/versionService.ts     # GitHub Raw config, checkAppVersion()
│   └── store/versionStore.ts
├── artwork-colors/               # artwork palette extraction (3 files)
│   ├── index.ts  hooks/useArtworkColors.ts  services/artworkColorService.ts
├── auth/                         # authentication (15 files)
│   ├── index.ts
│   ├── api/auth.api.ts  api/auth.types.ts
│   ├── components/AuthFooter.tsx  components/AuthHeader.tsx  components/SocialAuthButtons.tsx (dead)
│   ├── hooks/useAuth.ts  hooks/useLogin.ts  hooks/useSignup.ts
│   ├── screens/LoginScreen.tsx  screens/SignupScreen.tsx
│   ├── store/authStore.ts
│   └── utils/tokenManager.ts  utils/tokenStorage.ts  utils/validation.ts
├── collections/                  # unified album/playlist detail (8 files)
│   ├── index.ts  types.ts
│   ├── api/collections.api.ts         # fetchRemoteAlbum (iTunes lookup)
│   ├── components/CollectionAlbumHeader.tsx  components/SongListCard.tsx
│   ├── components/StickyCollectionHeader.tsx
│   ├── hooks/useCollection.ts         # remote-vs-local unification + mapping
│   └── screens/CollectionScreen.tsx
├── drawer/                       # global bottom sheet (5 files)
│   ├── index.tsx                      # BottomSheetProvider + re-exports
│   ├── components/GlobalBottomSheet.tsx  components/OptionsDrawer.tsx
│   ├── hooks/useDrawer.ts             # useBottomSheet()
│   └── store/drawerStore.ts
├── history/                      # listening history (5 files)
│   ├── types.ts  api/historyApi.ts  hooks/useHistory.ts
│   ├── components/HistorySongCard.tsx  screens/HistoryScreen.tsx
├── home/                         # home feed tab (11 files)
│   ├── index.ts  types/index.ts  api/feed.api.ts  hooks/useFeedSections.ts
│   ├── screens/HomeFeedScreen.tsx
│   └── components/ContinueListeningCard.tsx  components/FeedSection.tsx
│       components/FeedSkeleton.tsx  components/HomeFeedHeader.tsx
│       components/HorizontalSongCard.tsx  components/TabHeader.tsx
├── library/                      # playlists (15 files)
│   ├── index.ts  types/index.ts  api/library.api.ts  hooks/useLibrary.ts
│   ├── screens/LibraryScreen.tsx
│   └── components/AddPlaylistModal.tsx  components/AddToPlaylistDrawer.tsx
│       components/DeletePlaylistDialog.tsx  components/LibraryEmptyState.tsx
│       components/LibraryFavoritesCard.tsx  components/LibraryHeader.tsx
│       components/LibrarySkeleton.tsx  components/PlaylistArtwork.tsx
│       components/PlaylistGridItem.tsx  components/PlaylistListItem.tsx
├── miniplayer/                   # persistent mini player (1 file)
│   └── screens/MiniplayerScreen.tsx
├── playback/                     # audio engine + queue + radio (39 files, largest slice)
│   ├── index.ts  types/index.ts  utils/playbackHelpers.ts
│   ├── api/index.ts  api/playback.api.ts  api/playbackApi.ts  api/recommendationApi.ts
│   ├── hooks/index.ts  hooks/usePlayer.ts  hooks/useProgressSyncAuth.ts  hooks/useSmartQueue.ts
│   ├── screens/PlayerScreen.tsx
│   ├── services/index.ts  services/jobResolver.ts  services/playerSetup.ts
│   ├── services/pollingResolver.ts  services/repeatManager.ts
│   ├── services/smartQueueService.ts  services/trackPlayerService.ts
│   ├── store/index.ts  store/useJobStore.ts  store/usePlaybackStore.ts  store/useSmartQueueStore.ts
│   └── components/index.ts  components/PlaybackSync.tsx  components/PlaybackLoadingIndicator.tsx
│       components/PlayerArtwork.tsx  components/PlayerBackground.tsx  components/PlayerControls.tsx
│       components/PlayerHeader.tsx  components/PlayerQueueDrawer.tsx  components/PlayerQueueFooter.tsx
│       components/PlayerQueueHeader.tsx  components/PlayerQueueItem.tsx  components/PlayerSeek.tsx
│       components/SleepTimerDrawer.tsx  components/SmartQueueEmpty.tsx  components/SmartQueueItem.tsx
│       components/SongInfoDrawer.tsx
├── processing/                   # job-center tab: read-only view over playback jobs (10 files)
│   ├── index.ts  types/index.ts  hooks/useJobActions.tsx  hooks/useJobProgress.ts
│   ├── hooks/useProcessingJobs.ts  screens/ProcessingScreen.tsx
│   ├── components/ProcessingJobCard.tsx  components/SectionTabs.tsx
│   └── utils/progress.ts  utils/song.ts
├── profile/                      # account screen (3 files)
│   ├── components/index.ts  components/ProfileAvatar.tsx  screens/ProfileScreen.tsx
├── search/                       # search + genres (13 files)
│   ├── index.ts  types/index.ts  api/genre.api.ts  api/itunes.api.ts  utils/itunesHelpers.ts
│   ├── hooks/useGenreTracks.ts  hooks/useRecentSongs.ts
│   ├── hooks/useSearchHistory.ts  hooks/useSearchQuery.ts
│   ├── screens/GenreScreen.tsx  screens/SearchFocusScreen.tsx  screens/SearchScreen.tsx
│   └── components/ExploreGenres.tsx
├── server/                       # runtime server config + setup/switch UI (11 files)
│   ├── index.ts  api/serverValidation.ts
│   ├── hooks/useServerSetup.ts  hooks/useServerSwitch.ts
│   ├── screens/ServerSetupScreen.tsx  screens/ServerManagementScreen.tsx
│   ├── store/serverStore.ts  utils/serverConfig.ts  utils/serverStorage.ts
│   ├── utils/serverSwitch.ts  # shared performServerSwitch()
│   └── utils/sessionGeneration.ts  # refresh invalidation counter
├── settings/                     # Settings hub (3 files)
│   ├── index.ts  components/SettingsRow.tsx  screens/SettingsScreen.tsx
└── song/                         # deep links + sharing (2 files)
    ├── screens/SongDeepLinkRouteScreen.tsx  utils/shareSong.ts
```

## 5. Feature boundaries and responsibilities

| Feature | Owns | Must NOT own |
|---------|------|--------------|
| `Toast` | Toast UI + imperative singleton | Business logic; feature-specific copy lives at call sites |
| `about` | Developer/about content | App settings |
| `app-validations` | Version/maintenance/OTA gating, remote config fetch | Backend music data |
| `artwork-colors` | Palette extraction + cache | Any playback or queue state |
| `auth` | Login/signup/logout/session, token storage + refresh, user object | Playback, navigation decisions (guard lives in `app/`) |
| `collections` | Unified collection detail (remote album OR local playlist) | Playlist mutation (owned by `library`) |
| `drawer` | Global bottom-sheet host + store | Drawer content (owned by callers) |
| `history` | Listening-history queries + screen | Progress reporting (owned by `playback`) |
| `home` | Feed charts + continue-listening surface | Playback engine (calls `usePlayer`) |
| `library` | Playlist CRUD + playlist screens | Collection detail rendering (owned by `collections`) |
| `miniplayer` | Persistent mini-player UI | Playback state (reads `playback` store) |
| `playback` | Player setup, queue, jobs, smart radio, sync, player screens | Playlist persistence, search |
| `processing` | Job-center UI over `playback` job store | Job creation/polling (owned by `playback`) |
| `profile` | Account display + logout entry | Auth mechanics (owned by `auth`) |
| `search` | iTunes search, genre surface, search history/recents | Playback (calls `usePlayer`) |
| `settings` | Settings hub list UI only (`SettingsScreen` + `SettingsRow`); links out to owning features | Account UI (owned by `profile`), server UI/logic (owned by `server`) |
| `server` | Runtime server URL: normalize/validate, AsyncStorage persistence, connection validation, setup screen + gate state, Server Management screen + switch orchestration (`performServerSwitch` + session generation, incl. the atomic session reset) | Auth session mechanics, playback engine internals (both called, not owned) |
| `song` | Deep-link resolution + share-link building | Player UI |

Known boundary crossings (do not widen without an ADR): `library` invalidates `collections` query keys;
`processing` reads `playback` job store; `playback/smartQueue` imports `search` utils; `collections` calls
`libraryApi`; `miniplayer` opens `library` drawers; `apiClient` imports the Toast singleton.

## 6. Shared module locations

| Shared need | Location | Rule |
|-------------|----------|------|
| Network client | `src/api/apiClient.ts` | Only Axios instance; feature APIs wrap it, never create their own backend client (sole exception: the `server` validator's unauthenticated bootstrap `fetch`, which must run pre-config) |
| UI primitives | `src/components/ui/` | shadcn-style; new primitives go here, not in features |
| Shared interactive UI | `src/components/*.tsx` | Only when used by ≥2 features |
| Theme/tokens | `src/lib/theme.ts` | `NAV_THEME`; NativeWind classes reference `tailwind.config.js` tokens |
| Class merging | `src/lib/utils.ts` | `cn()`; use everywhere instead of manual joins |
| Global styles | `src/global.css` | NativeWind entry; keep minimal |
| Toast access | `src/features/Toast/` | `useToast()` in React, `toastImperative` outside React |
| Bottom sheet | `src/features/drawer/` | `useBottomSheet().open(node, snapPoints)` |
| Route alias | `@/*` → `src/*` | `tsconfig.json`; use for cross-feature imports |

## 7. Baseline size stats (generated, `wc -l`)

| Area | Files | Lines |
|------|------:|------:|
| `src/api` | 1 | 260 |
| `src/app` | 23 | 656 |
| `src/components` | 19 | 2,285 |
| `src/features/Toast` | 3 | 314 |
| `src/features/about` | 2 | 143 |
| `src/features/app-validations` | 6 | 809 |
| `src/features/artwork-colors` | 3 | 243 |
| `src/features/auth` | 15 | 959 |
| `src/features/collections` | 8 | 1,364 |
| `src/features/drawer` | 5 | 231 |
| `src/features/history` | 5 | 495 |
| `src/features/home` | 11 | 929 |
| `src/features/library` | 15 | 1,216 |
| `src/features/miniplayer` | 1 | 194 |
| `src/features/playback` | 39 | 4,097 |
| `src/features/processing` | 10 | 630 |
| `src/features/profile` | 3 | 197 |
| `src/features/search` | 13 | 933 |
| `src/features/server` | 11 | 1,206 |
| `src/features/settings` | 3 | 155 |
| `src/features/song` | 2 | 254 |
| `src/lib` | 2 | 85 |
| `src/global.css` | 1 | 59 |
| **Total** | **201** | **17,714** |

Largest files (watch for growth): `playback/hooks/usePlayer.ts` (562), `collections/screens/CollectionScreen.tsx`
(483), `playback/services/smartQueueService.ts` (445), `components/RemoteSongListCard.tsx` (375),
`components/AnimatedPressable.tsx` (337), `components/ui/dropdown-menu.tsx` (300).

## 8. Reference maintenance

- This file is updated only when an approved structural change lands (new/renamed/moved directories or files,
  new routes, new stores, new entry points).
- After such a change: regenerate the tree (`find`, excluding `node_modules/.git/.expo`), refresh §7 stats,
  refresh `docs/FILE_INVENTORY.md`, and record the new baseline commit hash at the top.
- Content-only edits (no structural change) do not require touching this file, but line-count drift beyond
  ~20% in any file should prompt a baseline refresh so the reference stays useful.


