# Sonic Jam — Source File Inventory (Baseline)

> Baseline commit `00a4fad` (2026-11-20). Counts generated with `wc -l` on that tree.
> Total: **183 files, 15,855 lines** under `src/`.
> Structural delta (uncommitted, 2026-11-21): +`src/features/server/` (7 files, 598 lines);
> `apiClient.ts` 205→225, `_layout.tsx` 281→320, `playerSetup.ts` 61→66.
> Working tree: **190 files, 16,517 lines**. Re-baseline on commit.
> Legend: rows ending in `†` describe files not individually read end-to-end; the responsibility
> is inferred from the file path plus its verified exported symbols. All other rows were read during
> the audit. Line counts are exact in every row.

## `src/api` — 1 file, 225 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/api/apiClient.ts` | 225 | Shared Axios client: `BASE_URL`/`MEDIA_URL` (runtime-settable via `setApiServerUrl`), auth + device-ID interceptors, 401 refresh queue, global toasts |

## `src/app` — 20 files, 638 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/app/_layout.tsx` | 320 | `RootLayout`: providers, `VersionGuard`/`ServerGuard`/`AuthGuard`, `Stack`, `setupPlayer()` (via `ServerGuard`), background handler |
| `src/app/index.tsx` | 9 | Default route redirect to `/login` |
| `src/app/player.tsx` | 4 | Route wrapper rendering `PlayerScreen` as full-screen modal |
| `src/app/notification.click.tsx` | 7 | Notification-tap bounce route redirecting to `/player` |
| `src/app/(auth)/_layout.tsx` | 10 | Auth stack layout (`login`, `signup`) |
| `src/app/(auth)/login.tsx` | 5 | Route wrapper rendering `LoginScreen` |
| `src/app/(auth)/signup.tsx` | 5 | Route wrapper rendering `SignupScreen` |
| `src/app/(tabs)/_layout.tsx` | 154 | Custom tab bar (Home/Search/Library/Processing) + hidden-route registration |
| `src/app/(tabs)/library.tsx` | 4 | Route wrapper rendering `LibraryScreen` |
| `src/app/(tabs)/processing.tsx` | 5 | Route wrapper rendering `ProcessingScreen` |
| `src/app/(tabs)/about/developers.tsx` | 4 | Route wrapper rendering `DeveloperScreen` |
| `src/app/(tabs)/collections/[id].tsx` | 5 | Route wrapper rendering `CollectionScreen` |
| `src/app/(tabs)/home/_layout.tsx` | 42 | Feed/Recents `TabHeader` + nested stack (`index`, `recents`) |
| `src/app/(tabs)/home/index.tsx` | 20 | Feed tab: renders `HomeFeedScreen` with `play()` wiring |
| `src/app/(tabs)/home/recents.tsx` | 6 | Recents tab: renders `HistoryScreen` |
| `src/app/(tabs)/profile/index.tsx` | 5 | Route wrapper rendering `ProfileScreen` |
| `src/app/(tabs)/search/_layout.tsx` | 14 | Search nested-stack shell |
| `src/app/(tabs)/search/index.tsx` | 11 | Toggles `SearchScreen` ↔ `SearchFocusScreen` on focus state |
| `src/app/(tabs)/search/[genre].tsx` | 4 | Route wrapper rendering `GenreScreen` |
| `src/app/(tabs)/song/[id].tsx` | 4 | Route wrapper rendering `SongDeepLinkRouteScreen` |

## `src/components` — 18 files, 2,148 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/components/AnimatedPressable.tsx` | 337 | Reanimated pressable primitive with scale/opacity feedback † |
| `src/components/AudioWave.tsx` | 94 | Audio waveform visual component † |
| `src/components/GradientText.tsx` | 50 | Masked-view gradient text (used by library headers) † |
| `src/components/RemoteSongListCard.tsx` | 375 | Swipeable song row with gesture-handler + haptics † |
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

## `src/features/app-validations` — 6 files, 809 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/app-validations/hooks/useVersionCheck.ts` | 33 | Runs version check on mount + app foreground |
| `src/features/app-validations/screens/MaintenanceScreen.tsx` | 104 | Maintenance gate screen † |
| `src/features/app-validations/screens/OTAUpdateScreen.tsx` | 297 | Foreground OTA download/install/restart flow (`expo-updates`) |
| `src/features/app-validations/screens/UpdateScreen.tsx` | 157 | Native/OTA update prompt (force + optional variants) † |
| `src/features/app-validations/services/versionService.ts` | 164 | Remote config fetch/cache + `checkAppVersion()` comparison |
| `src/features/app-validations/store/versionStore.ts` | 54 | Version/OTA status + update-progress state |

## `src/features/artwork-colors` — 3 files, 243 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/artwork-colors/index.ts` | 8 | Public barrel (service + hook) |
| `src/features/artwork-colors/hooks/useArtworkColors.ts` | 75 | Cache-seeded hook with stale-URL guard |
| `src/features/artwork-colors/services/artworkColorService.ts` | 160 | Palette extraction + 150-entry LRU cache + fallback |

## `src/features/auth` — 15 files, 893 lines

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
| `src/features/auth/screens/LoginScreen.tsx` | 127 | Login form UI |
| `src/features/auth/screens/SignupScreen.tsx` | 149 | Signup form UI † |
| `src/features/auth/store/authStore.ts` | 134 | Session state: login/signup/logout/`checkAuth`/`resetAuth` |
| `src/features/auth/utils/tokenManager.ts` | 121 | JWT expiry decode + `ensureFreshToken()` pre-flight refresh |
| `src/features/auth/utils/tokenStorage.ts` | 32 | SecureStore token get/save/clear |
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

## `src/features/playback` — 39 files, 3,919 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/playback/index.ts` | 6 | Barrel re-exporting api/components/hooks/services/store/types |
| `src/features/playback/types/index.ts` | 177 | `Song`, `PlaySongDto`, `PlayResponseDto`, `PlaybackTrack`, store-state types |
| `src/features/playback/utils/playbackHelpers.ts` | 45 | `createPlaybackTrack()`, display-only `getPlaybackUrl()`, no-op `syncQueueTokens()` |
| `src/features/playback/api/index.ts` | 1 | Re-exports `playbackApi` resolver module |
| `src/features/playback/api/playback.api.ts` | 25 | Endpoints: `POST /song/play`, `GET /song/job/:id`, `POST /listening/event` |
| `src/features/playback/api/playbackApi.ts` | 42 | `resolveStream()`: ready-vs-job dispatch + payload validation |
| `src/features/playback/api/recommendationApi.ts` | 51 | `getRecommendations()` mapping + silent `[]` on error |
| `src/features/playback/hooks/index.ts` | 2 | Re-exports `usePlayer`, `useSmartQueue` |
| `src/features/playback/hooks/usePlayer.ts` | 554 | Playback command center: play/queue/seek/shuffle/repeat/sleep (largest file) |
| `src/features/playback/hooks/useProgressSyncAuth.ts` | 50 | Native progress-sync header auth (`setProgressSyncToken` + hook) |
| `src/features/playback/hooks/useSmartQueue.ts` | 26 | Transition listener + `loadRecommendations()` trigger |
| `src/features/playback/screens/PlayerScreen.tsx` | 148 | Full player screen composition (memoized, shallow store select) |
| `src/features/playback/services/index.ts` | 11 | Service barrel (named exports) |
| `src/features/playback/services/jobResolver.ts` | 13 | `resolveJob()` abstraction over polling |
| `src/features/playback/services/playerSetup.ts` | 66 | `buildPlayerConfig()` (lazy, uses runtime server) + `setupPlayer()` (cache, notification, progressSync URL) |
| `src/features/playback/services/pollingResolver.ts` | 162 | `pollJobStatus()` backoff loop with busy/retryAfter handling |
| `src/features/playback/services/repeatManager.ts` | 44 | Off↔track repeat toggle; end-handlers are no-ops |
| `src/features/playback/services/smartQueueService.ts` | 422 | Radio pipeline: recommend → enrich → resolve → fill native queue |
| `src/features/playback/services/trackPlayerService.ts` | 84 | Headless `PlaybackService`: remote controls + background transition |
| `src/features/playback/store/index.ts` | 3 | Re-exports the three playback stores |
| `src/features/playback/store/useJobStore.ts` | 71 | Job registry (`waiting/active/completed/failed`) |
| `src/features/playback/store/usePlaybackStore.ts` | 195 | Core playback state + `trackMap` mirror |
| `src/features/playback/store/useSmartQueueStore.ts` | 122 | Smart-queue tracks + cancel/init/append state |
| `src/features/playback/components/index.ts` | 1 | Re-exports `PlaybackSync` |
| `src/features/playback/components/PlaybackSync.tsx` | 291 | Foreground native→store sync + error recovery + transition handling |
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

## `src/features/server` — 7 files, 598 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/server/index.ts` | 30 | Barrel (screen, hook, store, validation, config/storage utils) |
| `src/features/server/api/serverValidation.ts` | 97 | `checkServerConnection()`: unauthenticated `/auth/me` 401-probe with timeout, inline failure codes |
| `src/features/server/hooks/useServerSetup.ts` | 59 | Setup form state + validate → check → save connect flow |
| `src/features/server/screens/ServerSetupScreen.tsx` | 153 | First-launch "Connect your server" screen (Sonic dark/amber idiom) |
| `src/features/server/store/serverStore.ts` | 97 | `useServerStore`: loading/unconfigured/configured, boot load + baked-URL migration, `setApiServerUrl` apply |
| `src/features/server/utils/serverConfig.ts` | 115 | Pure URL normalize/validate, localhost check, `BAKED_SERVER_URL` |
| `src/features/server/utils/serverStorage.ts` | 47 | AsyncStorage `@sonic_server_url` get/set/clear with self-healing reads |

## `src/features/song` — 2 files, 254 lines

| File | Lines | Responsibility |
|------|------:|----------------|
| `src/features/song/screens/SongDeepLinkRouteScreen.tsx` | 213 | `/song/[id]` resolver: ID validation, iTunes-vs-local paths, play + redirect |
| `src/features/song/utils/shareSong.ts` | 41 | `shareSong()` native share sheet with `MEDIA_URL` link |

---

Regenerate with `find src -type f | sort | xargs wc -l` after any approved structural change,
and update the baseline commit hash at the top.




