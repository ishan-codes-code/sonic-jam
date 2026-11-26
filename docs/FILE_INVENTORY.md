# Sonic Jam — Source File Inventory (Baseline)

> Baseline commit `00a4fad` (2026-11-20). Counts generated with `wc -l` on that tree.
> Total: **183 files, 15,855 lines** under `src/`.
> Structural delta (uncommitted, 2026-11-21): +`src/features/server/` (7 files, 598 lines);
> `apiClient.ts` 205→225, `_layout.tsx` 281→320, `playerSetup.ts` 61→66.
> Structural delta (uncommitted, 2026-11-22, Settings hub + Server Management):
> +`src/features/settings/` (3 files, 155 lines), +`src/app/(tabs)/settings/` (3 files, 15 lines)
> replacing `src/app/(tabs)/profile/index.tsx`, +`ServerManagementScreen` (241) +
> `useServerSwitch` (174) in `src/features/server/`, +playback reset primitives (+106).
> Structural delta (uncommitted, 2026-11-22, Login → Server Setup review):
> +`src/app/(auth)/server-setup.tsx` (5) +`utils/serverSwitch.ts` (67, extracted from
> `useServerSwitch` 174→138); also records earlier race-fix drift (+32 playback).
> Structural delta (uncommitted, 2026-11-22, contextual setup CTA):
> `useServerSetup` 89→105 + `ServerSetupScreen` 171→180 (Login/Continue label).
> Structural delta (uncommitted, 2026-11-22, setup CTA + keyboard polish):
> no back button, Continue + green check when untouched, focus scrolls input up.
> `useServerSetup` 105→103, `ServerSetupScreen` 180→176.
> Structural delta (uncommitted, 2026-11-22, Android keyboard-aware scroll):
> +`useKeyboardAwareScroll.ts` (65, shared auth + server); Login 141→146,
> Signup 149→155, ServerSetupScreen 176→170 (blind scrollToEnd removed).
> Structural delta (uncommitted, 2026-11-22, keyboard-scroll geometry fix):
> safe-area-top compensation in the hook (65→79).
> Structural delta (uncommitted, 2026-11-22, dynamic keyboard bottom padding):
> hook tracks keyboard height + exposes padding (79→126), scroll sequenced via
> onContentSizeChange; Login 146→155, Signup 155→164, Setup 170→176.
> Structural delta (uncommitted, 2026-11-22, PR #10 review races):
> +`utils/sessionGeneration.ts` (23); `apiClient` 225→260 + `tokenManager`
> 121→144 (session-generation refresh guards); `pollingResolver` 208→231 +
> `playbackApi` 42→56 + `jobResolver` 13→16 (pre-request generation capture);
> `serverStore` 97→122 (first-time stale-token clear, storage-failure safe
> load); `serverStorage` 47→45 (reads throw on failure); `serverValidation`
> 97→112 (NestJS-shape identity check); `useServerSetup` 103→124 (attempt
> guards); hook 126→137 (focus re-sync); `serverSwitch` 67→71, `index` 35→39.
> Working tree: **201 files, 17,714 lines** (committed as f7166a0 without re-baseline).
> Structural delta (uncommitted, PR #10 follow-up: token-refresh race close):
> generation-tagged refresh queue + ownership (`apiClient` 260→327),
> `tokenManager` 144→161 (takeover + guarded finally), `sessionGeneration`
> 23→53 (invalidation listeners), `index` 39→40.
> Working tree: **201 files, 17,829 lines**.
> Structural delta (uncommitted, PR #10 audit fixes: storage race close):
> serialized + stamped token storage (`tokenStorage` 32→95); captured-URL +
> `saveTokensIfCurrent` refreshes (`apiClient` 327→349, `tokenManager`
> 161→186); radio guards (`smartQueueService` 444→491); `playPlaylist`
> cancellation return (`usePlayer` 562→566).
> Working tree: **201 files, 17,990 lines**. Re-baseline on commit.
> Structural delta (uncommitted, foreground playback resync):
> +`services/nativeSync.ts` (142, shared native→store resync); `PlaybackSync`
> 318→316 (extracted metadata/status mapping, AppState foreground resync);
> `trackPlayerService` 84→90 (headless resync call).
> Working tree: **202 files, 18,136 lines**. Re-baseline on commit.
> Structural delta (uncommitted, resync optimistic-song guard):
> `nativeSync` 142→149 (skip track sync while a stream request is pending).
> Working tree: **202 files, 18,143 lines**. Re-baseline on commit.
> Structural delta (uncommitted, resync error-priority fix):
> `nativeSync` 149→152 (native errors applied before the pending-job guard).
> Working tree: **202 files, 18,146 lines**. Re-baseline on commit.
> Structural delta (uncommitted, headless full-metadata fix):
> `trackPlayerService` 90→91 (transition applies `syncTrackMetadata` directly).
> Working tree: **202 files, 18,147 lines**. Re-baseline on commit.
> Structural delta (uncommitted, server wizard finalize):
> `/health` validation (`serverValidation` 112→147), bounded remote-config
> fetch (`versionService` 164→187, 10s timeout), first-connect success toast
> (`useServerSetup` 124→133), "Configured" management label (copy-only),
> +`serverConfig.test` (177) +`serverValidation.test` (251)
> +`versionService.test` (224, `node:test` via tsc + node runner, no runner dep).
> Working tree: **205 files, 19,098 lines**. Re-baseline on commit.
> Structural delta (uncommitted, backend setup wizard):
> authoritative `/health` identity + `setupRequired` routing
> (`serverValidation` 147→200), +`setupApi` (514) +`setupApi.test` (484) +
> `useSetupWizard` (371) +`components/` (5 files, 643) +`SetupWizardScreen`
> (142) +`(auth)/setup-wizard` route (5); `useServerSetup` 133→143 (wizard
> routing), `useServerSwitch` 138→148 (setup-target block), `index` 40→71,
> `serverValidation.test` 251→327.
> Working tree: **215 files, 21,438 lines**. Re-baseline on commit.
> Structural delta (uncommitted, setup navigation race fix):
> guards keep the root Stack mounted (overlay loaders, routed setup) +
> commit-driven wizard routing (`serverStore` 122→159: `setupPending` +
> `setupRequestId`, atomic `setServer`), +`setupNavigation` (296, pure guard
> decisions shared by `_layout` + `useServerSetup` + tests)
> +`setupNavigation.test` (933, 33 node:test regressions); `_layout` 320→382
> (always-mounted Stack, `checkAuth` gated on configured server),
> `index.tsx` 9→10 (renders null, guards own boot routing),
> `useServerSetup` 143→161 (commit-driven, review-mode fix),
> `useSetupWizard` 371→375 (clear pending on completion),
> `serverSwitch` 71→75 (setup-flag plumb-through), `index` 71→94.
> Working tree: **217 files, 22,816 lines**. Re-baseline on commit.
> Structural delta (uncommitted, setup wizard 5-step + boot discovery):
> -`components/SetupDatabaseStep.tsx` (124),
> `SetupInitializeStep.tsx`→`SetupFinishStep.tsx` (112),
> +`SetupPlaybackStep` (123) +`SetupApiKeysStep` (113) +`SetupField` (96,
> shared step fields); `useSetupWizard` 375→427 (one-shot save,
> session-validating completion), `setupApi` 514→579 (storage/playback/key
> registries, required-field + worker-URL validation), `serverValidation`
> 200→210 (setupRequired+unconfigured Termux branch), `setupNavigation`
> 296→330 (review-aware follow-ups, no unchanged shortcut), `useServerSetup`
> 161→156 (always re-validates), `serverStore` 159→175
> (`markSetupPending`), `_layout` 382→462 (background boot /health
> discovery); suites 19/27/36/19 green.
> Working tree: **219 files, 23,365 lines**. Re-baseline on commit.
> Legend: rows ending in `†` describe files not individually read end-to-end; the responsibility
> is inferred from the file path plus its verified exported symbols. All other rows were read during
> the audit. Line counts are exact in every row.

## `src/api` — 1 file, 349 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/api/apiClient.ts` | 349 | Shared Axios client: `BASE_URL`/`MEDIA_URL` (runtime-settable via `setApiServerUrl`), auth + device-ID interceptors, 401 refresh queue (generation-tagged, takeover, ownership-guarded, captured-URL + stamped save) |

## `src/app` — 24 files, 725 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/app/_layout.tsx` | 462 | `RootLayout`: providers, `VersionGuard`/`ServerGuard`/`AuthGuard`, always-mounted `Stack` (guards overlay loaders + redirect via `setupNavigation`), `setupPlayer()` (via `ServerGuard`), background boot `/health` setup discovery (one-shot per URL, stale-safe), background handler |
| `src/app/index.tsx` | 10 | Default route renders null; guards own boot routing (single owner per redirect) |
| `src/app/player.tsx` | 4 | Route wrapper rendering `PlayerScreen` as full-screen modal |
| `src/app/notification.click.tsx` | 7 | Notification-tap bounce route redirecting to `/player` |
| `src/app/(auth)/_layout.tsx` | 12 | Auth stack layout (`login`, `signup`, `server-setup`, `setup-wizard`) |
| `src/app/(auth)/login.tsx` | 5 | Route wrapper rendering `LoginScreen` |
| `src/app/(auth)/signup.tsx` | 5 | Route wrapper rendering `SignupScreen` |
| `src/app/(auth)/server-setup.tsx` | 5 | Route wrapper rendering `ServerSetupScreen` (first-launch entry + Login review mode) |
| `src/app/(auth)/setup-wizard.tsx` | 5 | Route wrapper rendering `SetupWizardScreen` (first-launch backend setup) |
| `src/app/(tabs)/_layout.tsx` | 156 | Custom tab bar (Home/Search/Library/Processing) + hidden-route registration |
| `src/app/(tabs)/library.tsx` | 4 | Route wrapper rendering `LibraryScreen` |
| `src/app/(tabs)/processing.tsx` | 5 | Route wrapper rendering `ProcessingScreen` |
| `src/app/(tabs)/about/developers.tsx` | 4 | Route wrapper rendering `DeveloperScreen` |
| `src/app/(tabs)/collections/[id].tsx` | 5 | Route wrapper rendering `CollectionScreen` |
| `src/app/(tabs)/home/_layout.tsx` | 42 | Feed/Recents `TabHeader` + nested stack (`index`, `recents`) |
| `src/app/(tabs)/home/index.tsx` | 20 | Feed tab: renders `HomeFeedScreen` with `play()` wiring |
| `src/app/(tabs)/home/recents.tsx` | 6 | Recents tab: renders `HistoryScreen` |
| `src/app/(tabs)/settings/index.tsx` | 5 | Route wrapper rendering `SettingsScreen` (hub) |
| `src/app/(tabs)/settings/account.tsx` | 5 | Route wrapper rendering `ProfileScreen` |
| `src/app/(tabs)/settings/server.tsx` | 5 | Route wrapper rendering `ServerManagementScreen` |
| `src/app/(tabs)/search/_layout.tsx` | 14 | Search nested-stack shell |
| `src/app/(tabs)/search/index.tsx` | 11 | Toggles `SearchScreen` ↔ `SearchFocusScreen` on focus state |
| `src/app/(tabs)/search/[genre].tsx` | 4 | Route wrapper rendering `GenreScreen` |
| `src/app/(tabs)/song/[id].tsx` | 4 | Route wrapper rendering `SongDeepLinkRouteScreen` |

## `src/components` — 19 files, 2,274 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/components/AnimatedPressable.tsx` | 337 | Reanimated pressable primitive with scale/opacity feedback † |
| `src/components/AudioWave.tsx` | 94 | Audio waveform visual component † |
| `src/components/GradientText.tsx` | 50 | Masked-view gradient text (used by library headers) † |
| `src/components/RemoteSongListCard.tsx` | 375 | Swipeable song row with gesture-handler + haptics † |
| `src/components/useKeyboardAwareScroll.ts` | 137 | Android-only keyboard hook: live keyboard-height bottom padding + measured focus scroll sequenced after range growth (auth + server) + focus-time metrics re-sync |
| `src/components/ui/accordion.tsx` | 141 | Accordion primitive over `@rn-primitives/accordion` † |
| `src/components/ui/alert-dialog.tsx` | 158 | Alert-dialog primitive over `@rn-primitives/alert-dialog` † |
| `src/components/ui/avatar.tsx` | 38 | Avatar/Image/Fallback primitives † |
| `src/components/ui/button.tsx` | 106 | Button + text variants (`cva`) † |
| `src/components/ui/card.tsx` | 52 | Card + header/title/description/content/footer † |
| `src/components/ui/dialog.tsx` | 140 | Dialog primitive over `@rn-primitives/dialog` † |
| `src/components/ui/dropdown-menu.tsx` | 300 | Dropdown-menu primitive over `@rn-primitives/dropdown-menu` † |
| `src/components/ui/icon.tsx` | 57 | Lucide-icon wrapper with NativeWind `className` support |
| `src/components/ui/input.tsx` | 29 | Styled `TextInput` wrapper † |
| `src/components/ui/native-only-animated-view.tsx` | 23 | Reanimated view for native-only animation † |
| `src/components/ui/progress.tsx` | 81 | Progress bar with web/native indicators † |
| `src/components/ui/skeleton.tsx` | 11 | Skeleton placeholder † |
| `src/components/ui/tabs.tsx` | 68 | Tabs primitives over `@rn-primitives/tabs` † |
| `src/components/ui/text.tsx` | 88 | Text variants (`cva`) + class context † |

## `src/lib` + `src/global.css` — 3 files, 144 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/lib/theme.ts` | 80 | `THEME` + `NAV_THEME` color tokens |
| `src/lib/utils.ts` | 5 | `cn()` class-name merger |
| `src/global.css` | 59 | NativeWind global stylesheet entry |

## `src/features/Toast` — 3 files, 314 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/Toast/components/ToastProvider.tsx` | 223 | Pill-style toast provider + `useToastContext` |
| `src/features/Toast/hooks/useToast.tsx` | 57 | `useToast()` typed wrapper + `withToast()` async helper |
| `src/features/Toast/utils/toastSingleton.tsx` | 34 | `toastImperative` singleton for non-React call sites |

## `src/features/about` — 2 files, 143 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/about/screens/DeveloperScreens.tsx` | 107 | Developer/about screen with contact + social links † |
| `src/features/about/utils/developersSocials.tsx` | 36 | `SOCIALS` link list (LinkedIn/X/Instagram/GitHub) † |

## `src/features/app-validations` — 7 files, 1,056 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/app-validations/hooks/useVersionCheck.ts` | 33 | Runs version check on mount + app foreground |
| `src/features/app-validations/screens/MaintenanceScreen.tsx` | 104 | Maintenance gate screen † |
| `src/features/app-validations/screens/OTAUpdateScreen.tsx` | 297 | Foreground OTA download/install/restart flow (`expo-updates`) |
| `src/features/app-validations/screens/UpdateScreen.tsx` | 157 | Native/OTA update prompt (force + optional variants) † |
| `src/features/app-validations/services/versionService.ts` | 187 | Remote config fetch (10s timeout)/cache + `checkAppVersion()` comparison |
| `src/features/app-validations/services/versionService.test.ts` | 224 | `node:test`: fetch timeout + cached fallback + fail-open |
| `src/features/app-validations/store/versionStore.ts` | 54 | Version/OTA status + update-progress state |

## `src/features/artwork-colors` — 3 files, 243 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/artwork-colors/index.ts` | 8 | Public barrel (service + hook) |
| `src/features/artwork-colors/hooks/useArtworkColors.ts` | 75 | Cache-seeded hook with stale-URL guard |
| `src/features/artwork-colors/services/artworkColorService.ts` | 160 | Palette extraction + 150-entry LRU cache + fallback |

## `src/features/auth` — 15 files, 1064 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/auth/index.ts` | 15 | Public barrel (screens, hooks, API, validation) |
| `src/features/auth/api/auth.api.ts` | 21 | `authApi`: signup/login/refresh/logout/`getMe` |
| `src/features/auth/api/auth.types.ts` | 23 | `AuthTokens`, `User`, login/signup payloads |
| `src/features/auth/components/AuthFooter.tsx` | 23 | Auth screen footer link row † |
| `src/features/auth/components/AuthHeader.tsx` | 38 | Auth screen header art + title † |
| `src/features/auth/components/SocialAuthButtons.tsx` | 49 | DEAD: Google/Apple buttons with no handlers, unimported |
| `src/features/auth/hooks/useAuth.ts` | 39 | Stable-reference wrapper over `useAuthStore` |
| `src/features/auth/hooks/useLogin.ts` | 44 | Login form state + validation + submit |
| `src/features/auth/hooks/useSignup.ts` | 62 | Signup form state + validation + submit + redirect |
| `src/features/auth/screens/LoginScreen.tsx` | 155 | Login form UI + back button to Server Setup review + dynamic keyboard padding/scroll wiring |
| `src/features/auth/screens/SignupScreen.tsx` | 164 | Signup form UI + dynamic keyboard padding/scroll wiring |
| `src/features/auth/store/authStore.ts` | 134 | Session state: login/signup/logout/`checkAuth`/`resetAuth` |
| `src/features/auth/utils/tokenManager.ts` | 186 | JWT expiry decode + `ensureFreshToken()` pre-flight refresh (generation-guarded, takeover, ownership-guarded finally, captured-URL + stamped save) |
| `src/features/auth/utils/tokenStorage.ts` | 95 | Serialized SecureStore token get/save/clear + generation-stamped `saveTokensIfCurrent` |
| `src/features/auth/utils/validation.ts` | 16 | `validateLogin`/`validateSignup` field rules |
## `src/features/collections` — 8 files, 1,364 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/collections/index.ts` | 4 | Barrel (screen, types, hook, API) |
| `src/features/collections/types.ts` | 83 | `Collection`/`CollectionTrack` unified shapes + raw iTunes shapes |
| `src/features/collections/api/collections.api.ts` | 46 | `fetchRemoteAlbum()` via iTunes lookup |
| `src/features/collections/components/CollectionAlbumHeader.tsx` | 231 | Album/playlist hero header + share † |
| `src/features/collections/components/SongListCard.tsx` | 211 | Memoized track row with active/remove states † |
| `src/features/collections/components/StickyCollectionHeader.tsx` | 196 | Collapsing blur header on scroll † |
| `src/features/collections/hooks/useCollection.ts` | 110 | Remote-vs-local fetch + mapping into `Collection` |
| `src/features/collections/screens/CollectionScreen.tsx` | 483 | Collection detail screen (largest non-playback file) † |

## `src/features/drawer` — 5 files, 231 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/drawer/index.tsx` | 17 | `BottomSheetProvider` + hook/store re-exports |
| `src/features/drawer/components/GlobalBottomSheet.tsx` | 100 | BottomSheet host: back-button, backdrop, snap handling |
| `src/features/drawer/components/OptionsDrawer.tsx` | 70 | Generic action-list drawer content † |
| `src/features/drawer/hooks/useDrawer.ts` | 9 | `useBottomSheet()` open/close accessor |
| `src/features/drawer/store/drawerStore.ts` | 35 | Drawer open state + content + snap points |

## `src/features/history` — 5 files, 495 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/history/types.ts` | 25 | `ListeningEvent`/`HistorySong`/`HistoryArtist` |
| `src/features/history/api/historyApi.ts` | 22 | `fetchHistory()` paged GET + `deleteHistoryEvent()` |
| `src/features/history/hooks/useHistory.ts` | 32 | Infinite history query + delete mutation |
| `src/features/history/components/HistorySongCard.tsx` | 276 | History row card with played-at formatting † |
| `src/features/history/screens/HistoryScreen.tsx` | 140 | History list screen (also the Recents tab) † |

## `src/features/home` — 11 files, 929 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/home/index.ts` | 17 | Barrel (screens, components, hooks, API, types) |
| `src/features/home/types/index.ts` | 47 | iTunes RSS V2 feed types + `FeedSection` shape |
| `src/features/home/api/feed.api.ts` | 36 | `fetchTopSongs()`/`fetchTopAlbums()` from Apple RSS |
| `src/features/home/hooks/useFeedSections.ts` | 19 | `useTopSongs()`/`useTopAlbums()` cached queries |
| `src/features/home/screens/HomeFeedScreen.tsx` | 150 | Home feed composition root † |
| `src/features/home/components/ContinueListeningCard.tsx` | 178 | Resume card driven by listening history † |
| `src/features/home/components/FeedSection.tsx` | 142 | Chart section list with error state † |
| `src/features/home/components/FeedSkeleton.tsx` | 61 | Feed loading skeletons † |
| `src/features/home/components/HomeFeedHeader.tsx` | 46 | Greeting header † |
| `src/features/home/components/HorizontalSongCard.tsx` | 180 | Horizontal song card + share link † |
| `src/features/home/components/TabHeader.tsx` | 53 | Feed/Recents tab switcher † |
## `src/features/library` — 15 files, 1,216 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/library/index.ts` | 19 | Barrel (screen, hook, components, API, types) |
| `src/features/library/types/index.ts` | 48 | `Playlist`, payloads, `PlaylistWithSongs` (+`playbackToken`) |
| `src/features/library/api/library.api.ts` | 71 | `libraryApi`: playlist CRUD + song add/remove + lookups |
| `src/features/library/hooks/useLibrary.ts` | 116 | Playlists query + all playlist mutations with invalidation |
| `src/features/library/screens/LibraryScreen.tsx` | 265 | Library tab screen † |
| `src/features/library/components/AddPlaylistModal.tsx` | 197 | Create-playlist modal † |
| `src/features/library/components/AddToPlaylistDrawer.tsx` | 131 | Bottom-sheet song→playlist picker † |
| `src/features/library/components/DeletePlaylistDialog.tsx` | 79 | Delete confirmation dialog † |
| `src/features/library/components/LibraryEmptyState.tsx` | 35 | Empty-library placeholder † |
| `src/features/library/components/LibraryFavoritesCard.tsx` | 54 | Favorites/system-playlist card † |
| `src/features/library/components/LibraryHeader.tsx` | 34 | Library header with add action † |
| `src/features/library/components/LibrarySkeleton.tsx` | 33 | Library loading skeleton † |
| `src/features/library/components/PlaylistArtwork.tsx` | 48 | Playlist cover art (single/multi-thumb) † |
| `src/features/library/components/PlaylistGridItem.tsx` | 46 | Grid tile for a playlist † |
| `src/features/library/components/PlaylistListItem.tsx` | 40 | List row for a playlist † |

## `src/features/miniplayer` — 1 file, 194 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/miniplayer/screens/MiniplayerScreen.tsx` | 194 | Persistent mini player (artwork, toggle, progress, playlist shortcut) |

## `src/features/playback` — 40 files, 4,305 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/playback/index.ts` | 6 | Barrel re-exporting api/components/hooks/services/store/types |
| `src/features/playback/types/index.ts` | 177 | `Song`, `PlaySongDto`, `PlayResponseDto`, `PlaybackTrack`, store-state types |
| `src/features/playback/utils/playbackHelpers.ts` | 45 | `createPlaybackTrack()`, display-only `getPlaybackUrl()`, no-op `syncQueueTokens()` |
| `src/features/playback/api/index.ts` | 1 | Re-exports `playbackApi` resolver module |
| `src/features/playback/api/playback.api.ts` | 25 | Endpoints: `POST /song/play`, `GET /song/job/:id`, `POST /listening/event` |
| `src/features/playback/api/playbackApi.ts` | 56 | `resolveStream()`: ready-vs-job dispatch + payload validation + pre-request polling-generation capture |
| `src/features/playback/api/recommendationApi.ts` | 51 | `getRecommendations()` mapping + silent `[]` on error |
| `src/features/playback/hooks/index.ts` | 2 | Re-exports `usePlayer`, `useSmartQueue` |
| `src/features/playback/hooks/usePlayer.ts` | 566 | Playback command center: play/queue/seek/shuffle/repeat/sleep (largest file); resolve sites ignore switch-cancellation |
| `src/features/playback/hooks/useProgressSyncAuth.ts` | 50 | Native progress-sync header auth (`setProgressSyncToken` + hook) |
| `src/features/playback/hooks/useSmartQueue.ts` | 26 | Transition listener + `loadRecommendations()` trigger |
| `src/features/playback/screens/PlayerScreen.tsx` | 148 | Full player screen composition (memoized, shallow store select) |
| `src/features/playback/services/index.ts` | 17 | Service barrel (named exports) |
| `src/features/playback/services/jobResolver.ts` | 16 | `resolveJob()` abstraction over polling (passes expected generation through) |
| `src/features/playback/services/nativeSync.ts` | 152 | Shared native→store resync (`syncPlayerFromNative` + `syncTrackMetadata` + `resolveStoreStatus`); lazy store imports for headless use |
| `src/features/playback/services/playerSetup.ts` | 89 | `buildPlayerConfig()` (lazy, uses runtime server) + `setupPlayer()` (cache, notification, progressSync URL) + `recreatePlayer()` for server switch |
| `src/features/playback/services/pollingResolver.ts` | 231 | `pollJobStatus()` backoff loop with busy/retryAfter handling + generation-guarded `cancelAllJobPolling()` (incl. error/timeout paths) + expected-generation entry check |
| `src/features/playback/services/repeatManager.ts` | 44 | Off↔track repeat toggle; end-handlers are no-ops |
| `src/features/playback/services/smartQueueService.ts` | 491 | Radio pipeline: recommend → enrich → resolve → fill native queue; consistent radio-generation checks on every async path |
| `src/features/playback/services/trackPlayerService.ts` | 91 | Headless `PlaybackService`: remote controls + background transition + native resync |
| `src/features/playback/store/index.ts` | 3 | Re-exports the three playback stores |
| `src/features/playback/store/useJobStore.ts` | 77 | Job registry (`waiting/active/completed/failed`) + `clearJobs()` for session reset |
| `src/features/playback/store/usePlaybackStore.ts` | 195 | Core playback state + `trackMap` mirror |
| `src/features/playback/store/useSmartQueueStore.ts` | 122 | Smart-queue tracks + cancel/init/append state |
| `src/features/playback/components/index.ts` | 1 | Re-exports `PlaybackSync` |
| `src/features/playback/components/PlaybackSync.tsx` | 316 | Foreground native→store sync + generation-guarded error recovery + transition handling + foreground resync + `resetPlaybackRecovery()` |
| `src/features/playback/components/PlaybackLoadingIndicator.tsx` | 73 | Circular/job progress loading indicators † |
| `src/features/playback/components/PlayerArtwork.tsx` | 38 | Hero artwork view † |
| `src/features/playback/components/PlayerBackground.tsx` | 25 | Dynamic gradient background † |
| `src/features/playback/components/PlayerControls.tsx` | 185 | Transport controls (play/pause/next/prev/repeat) † |
| `src/features/playback/components/PlayerHeader.tsx` | 32 | Player top bar (back + more) † |
| `src/features/playback/components/PlayerQueueDrawer.tsx` | 249 | Queue drawer: reorder/skip/remove via native calls † |
| `src/features/playback/components/PlayerQueueFooter.tsx` | 32 | Queue drawer footer † |
| `src/features/playback/components/PlayerQueueHeader.tsx` | 40 | Queue drawer header † |
| `src/features/playback/components/PlayerQueueItem.tsx` | 165 | Queue row (`RNTPQueueItem`) with active control † |
| `src/features/playback/components/PlayerSeek.tsx` | 99 | Seek slider + time labels † |
| `src/features/playback/components/SleepTimerDrawer.tsx` | 164 | Sleep-timer options drawer † |
| `src/features/playback/components/SmartQueueEmpty.tsx` | 30 | Empty smart-queue placeholder † |
| `src/features/playback/components/SmartQueueItem.tsx` | 83 | Smart-queue track row † |
| `src/features/playback/components/SongInfoDrawer.tsx` | 92 | Song metadata drawer † |
## `src/features/processing` — 10 files, 630 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/processing/index.ts` | 2 | Barrel (`ProcessingScreen` + types) |
| `src/features/processing/types/index.ts` | 7 | `ProcessingSectionKey` + section-option shape |
| `src/features/processing/hooks/useJobActions.tsx` | 81 | Job actions (retry/dismiss/play) for job cards † |
| `src/features/processing/hooks/useJobProgress.ts` | 28 | Per-job fake-progress ticker (500ms) |
| `src/features/processing/hooks/useProcessingJobs.ts` | 49 | Groups `useJobStore` jobs by active section |
| `src/features/processing/screens/ProcessingScreen.tsx` | 131 | Job-center list screen † |
| `src/features/processing/components/ProcessingJobCard.tsx` | 193 | Job card with status icon + progress copy † |
| `src/features/processing/components/SectionTabs.tsx` | 67 | Processing/Completed/Failed tab switcher † |
| `src/features/processing/utils/progress.ts` | 42 | `getDisplayStatus()` + time-based `getFakeProgress()` |
| `src/features/processing/utils/song.ts` | 30 | `getArtistsText()`, `toRemoteSong()`, `formatDuration()` |

## `src/features/profile` — 3 files, 197 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/profile/components/index.ts` | 1 | Re-exports `ProfileAvatar` |
| `src/features/profile/components/ProfileAvatar.tsx` | 49 | Memoized avatar button † |
| `src/features/profile/screens/ProfileScreen.tsx` | 147 | Account display + logout + version footer |

## `src/features/search` — 13 files, 933 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/search/index.ts` | 5 | Barrel (types, screens, search/history hooks) |
| `src/features/search/types/index.ts` | 46 | `CleanedSearchResult` + raw iTunes shapes + focus state |
| `src/features/search/api/genre.api.ts` | 7 | `getGenreTracks()` (`GET /discovery/genre`) |
| `src/features/search/api/itunes.api.ts` | 39 | `searchItunes()` + result cleaning |
| `src/features/search/utils/itunesHelpers.ts` | 16 | `formatDuration()`, `upgradeArtwork()`, `extractYear()` |
| `src/features/search/hooks/useGenreTracks.ts` | 11 | Cached genre-tracks query |
| `src/features/search/hooks/useRecentSongs.ts` | 68 | AsyncStorage recent-songs list (max 20) |
| `src/features/search/hooks/useSearchHistory.ts` | 61 | AsyncStorage query history (max 10) |
| `src/features/search/hooks/useSearchQuery.ts` | 24 | Debounced (300ms) iTunes search query |
| `src/features/search/screens/GenreScreen.tsx` | 157 | Genre detail screen † |
| `src/features/search/screens/SearchFocusScreen.tsx` | 193 | Focused search-results screen † |
| `src/features/search/screens/SearchScreen.tsx` | 50 | Search landing screen † |
| `src/features/search/components/ExploreGenres.tsx` | 256 | Genre card grid (press/large/small/wide cards) † |

## `src/features/server` — 26 files, 5,827 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/server/index.ts` | 101 | Barrel (screens, hooks, store, validation, setup API + key registries, config/storage/switch/session-generation utils, setup navigation decisions) |
| `src/features/server/api/serverValidation.ts` | 210 | `checkServerConnection()`: unauthenticated `GET /health` probe (Sonic identity + `setupRequired` routing only with a healthy db, `db` ok/down/unconfigured incl. the setupRequired+unconfigured Termux-installer branch, informational `features.storage`), 15s timeout, inline failure codes |
| `src/features/server/api/serverValidation.test.ts` | 338 | `node:test` (19): /health routing (ready/setup/down/Termux-unconfigured/invalid), malformed/non-Sonic, network/timeout, no-auth probe |
| `src/features/server/api/setupApi.ts` | 579 | Setup API: `GET /setup/status`, `POST /setup/config` (`X-Setup-Token`, plain fetch), storage/playback/API-key registries, required-field + worker-URL validation, patch builder, secret redaction, readiness poll |
| `src/features/server/api/setupApi.test.ts` | 546 | `node:test` (27): token validation, headers/payload, locked/configured fields, worker URL, restart polling, redaction |
| `src/features/server/components/SecretInput.tsx` | 90 | Labeled credential field, masked by default with visibility toggle |
| `src/features/server/components/SetupTokenStep.tsx` | 97 | Wizard step 1: setup-token explainer + secure input + validate CTA |
| `src/features/server/components/SetupStorageStep.tsx` | 139 | Wizard step 2: required R2 fields (locked/configured variants) + continue CTA |
| `src/features/server/components/SetupPlaybackStep.tsx` | 123 | Wizard step 3: worker stream URL + playback secret (locked/configured variants, worker-match note) + continue CTA |
| `src/features/server/components/SetupApiKeysStep.tsx` | 113 | Wizard step 4: YouTube + Last.fm keys (locked/configured variants) + save CTA |
| `src/features/server/components/SetupFinishStep.tsx` | 112 | Wizard step 5: one-shot save/poll progress, retry + back-to-edit on failure |
| `src/features/server/components/SetupField.tsx` | 96 | Shared wizard field idioms: plain text field, environment-managed note, keep-saved-value note |
| `src/features/server/hooks/useServerSetup.ts` | 156 | Setup form state + validate → check → atomic commit connect flow (every Continue re-validates via /health; Login review mode prefills current with Continue/Connect CTA; ServerGuard owns wizard/first-launch routing, hook owns same-URL ready follow-ups; attempt/mounted guards; success toasts) |
| `src/features/server/hooks/useServerSwitch.ts` | 148 | Switch form state + validate → confirm → shared `performServerSwitch()` (unconfigured targets blocked with inline guidance) |
| `src/features/server/hooks/useSetupWizard.ts` | 427 | Wizard state machine: token → storage → playback → API keys → finish; local-only step validation, one-shot save + saved-patch-aware retry, memory-only secrets, stale-async guards, poll cancellation; validates the kept session on completion (home/login) |
| `src/features/server/screens/ServerManagementScreen.tsx` | 241 | In-app server switching screen: current server ("Configured" label), prefilled edit, validate → confirm, inline states |
| `src/features/server/screens/ServerSetupScreen.tsx` | 176 | "Connect your server" screen (Sonic dark/amber idiom); green verified check + Continue/Connect CTA + dynamic keyboard padding/scroll wiring |
| `src/features/server/screens/SetupWizardScreen.tsx` | 148 | Wizard shell: back button, 5-step progress, per-step content wiring |
| `src/features/server/store/serverStore.ts` | 175 | `useServerStore`: loading/unconfigured/configured, boot load + baked-URL migration (storage-failure safe), first-time stale-token clear, `setApiServerUrl` apply; atomic `setServer` commits `setupPending` + `setupRequestId` for guard routing; idempotent `markSetupPending()` for boot discovery |
| `src/features/server/utils/serverConfig.ts` | 115 | Pure URL normalize/validate, localhost check, `BAKED_SERVER_URL` |
| `src/features/server/utils/serverConfig.test.ts` | 177 | `node:test` (19): URL normalization/validation edge cases + localhost detection |
| `src/features/server/utils/serverStorage.ts` | 45 | AsyncStorage `@sonic_server_url` get/set/clear; reads throw on storage failure (missing ≠ unreadable) |
| `src/features/server/utils/serverSwitch.ts` | 75 | Shared `performServerSwitch()`: session invalidate + atomic session reset → `setServer` (setup-flag plumb-through) → player recreate |
| `src/features/server/utils/setupNavigation.ts` | 330 | Pure guard/connect routing decisions (single owner per redirect, one-shot commit routing, AuthGuard setup yield, review-aware connect follow-ups, stale-attempt guard); shared by `_layout` guards, `useServerSetup`, and tests |
| `src/features/server/utils/setupNavigation.test.ts` | 1017 | `node:test` (36): wizard-over-login, unmount-proof commits, login-once, loading silence, no competing redirects, pending yield, retryable failures, superseded attempts, review re-commit routing, boot discovery, completion landing, startup sequences |
| `src/features/server/utils/sessionGeneration.ts` | 53 | Dependency-free session generation: `getSessionGeneration()` / `invalidateSession()` for refresh guards + `onSessionInvalidated()` settle hook |

## `src/features/settings` — 3 files, 155 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/settings/index.ts` | 6 | Barrel (screen + row component) |
| `src/features/settings/components/SettingsRow.tsx` | 83 | Reusable settings row: icon tile, label, description, chevron |
| `src/features/settings/screens/SettingsScreen.tsx` | 66 | Settings hub: Account & Profile + Server Management entries |

## `src/features/song` — 2 files, 254 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/song/screens/SongDeepLinkRouteScreen.tsx` | 213 | `/song/[id]` resolver: ID validation, iTunes-vs-local paths, play + redirect |
| `src/features/song/utils/shareSong.ts` | 41 | `shareSong()` native share sheet with `MEDIA_URL` link |

---

Regenerate with `find src -type f | sort | xargs wc -l` after any approved structural change,
and update the baseline commit hash at the top.




