# Sonic PR Description

_Generated automatically by `scripts/generate-project-docs.js` on 2026-04-09T22:35:36.937Z._

## Project Overview

Sonic is an Expo/React Native music application prototype that combines three product layers:

- authenticated account access against a custom backend
- YouTube-powered discovery plus backend-driven direct song search
- backend-mediated audio playback, processing jobs, playlists, and library management

The current product emphasis is strongest on the Explore, playback, and processing flows. Home and parts of Profile remain more showcase-oriented than backend-driven.

## Purpose

This document is the single source of truth for onboarding, debugging, and future changes. Another engineer or agent should be able to understand the app shell, data flow, route map, major modules, and current tradeoffs without re-reading the entire codebase.

## Architecture and Key Components

- `app/_layout.tsx` bootstraps the app shell, auth guard, React Query provider, global toast system, stack navigation, and the persistent global player.
- `app/(tabs)/_layout.tsx` defines the current five-tab shell: Home, Explore, Library, Processing, and Profile.
- Auth is checked on boot through `useAuth()`/`authStore`; authenticated users are redirected away from login/signup, while unauthenticated users are blocked from tabs and the player sheet.
- Explore is now split into two surfaces: the main discovery screen for genres/custom sections and a nested `/explore/search` route for direct song search and playback.
- Library and playlist data are fetched from the backend with React Query (`useMusic`), while playback state is shared through `playerStore` so mini-player, processing tab, and player sheet stay in sync.
- Add Section still opens as a root form-sheet modal from inside the tab tree via `app/addSection.tsx`.
- Cross-cutting providers currently enabled: React Query = yes, global toast system (pill-style) = yes, persistent mini-player = yes.

### Stores
- `src/store/authStore.ts`: Handles login, signup, logout, boot-time auth checks, error extraction, and auth reset after interceptor refresh failures.
- `src/store/exploreStore.ts`: Owns default Explore sections, user-added sections, pagination, refresh, deletion, loading state, and discovery-surface data used by the main Explore tab.
- `src/store/playerStore.ts`: Re-exports the active player store from `src/player/player.store.ts` so legacy imports keep working.

### Playback internals
- `src/player/player.store.ts`: Owns the global playback lifecycle, current item, direct-ready playback, background job polling, queue state, progress, duration, and player cleanup.
- `src/player/player.jobs.ts`: Keeps the in-memory job registry, polling intervals, and completed/failed playback-job transitions in sync with the visible Processing tab.
- `src/player/player.engine.ts`: Creates and tears down `expo-audio` players, updates stream timestamps, and reports playback progress back into Zustand state.

### API and service layers
- `src/api/apiClient.ts`: Shared Axios client with bearer-token injection and queued token refresh on `401`.
- `src/api/authApi.ts`: Backend auth calls for signup, login, refresh, logout, and `getMe`.
- `src/api/musicApi.ts`: Backend playlist, library, direct-play, and job-status client that normalizes playback-ready responses into `streamUrl + song` pairs.
- `src/services/searchService.ts`: Backend `/search` client used by the dedicated Explore search route for title/artist result lists.
- `src/services/youtube.ts`: YouTube Data API wrapper for trending, batch details, playlist fetches, genre search, and thumbnail helpers.

### Feature modules
- `AddSection`: Modal/form-sheet flow for creating extra Explore sections from a keyword or playlist-like input.
- `Explore`: Primary discovery surface for trending/genre-driven YouTube exploration, custom sections, and navigation into the dedicated Explore search screen.
- `GlobalPlayer`: Persistent mini-player rendered from the root layout so playback controls remain available across screens.
- `Home`: Presentational landing tab with curated/stubbed content blocks, hero artwork, mixes, and artist sections.
- `Library`: Authenticated playlist and collection view backed by backend playlist/song endpoints and connected to the shared player store.
- `Login`: Auth entry screen that submits credentials through the auth store.
- `MediaCard`: Reusable media-card building block used by feature surfaces.
- `Playlist`: Reusable playlist and song-row building blocks used by Library, search results, and playlist detail routes.
- `Processing`: Dedicated processing/downloads tab that shows playback jobs, progress, and completed or failed conversion states.
- `Profile`: Account/settings screen with logout, preference toggles, and a flash-message demo trigger.
- `Signup`: Registration screen that creates an account through the auth store.

## Navigation and Route Map

- `app/index.tsx`: Default entry route. Redirects to `/login`; the root auth guard decides the final destination.
- `app/login.tsx`: Unauthenticated login screen.
- `app/signup.tsx`: Unauthenticated signup screen.
- `app/addSection.tsx`: Explore add-section form-sheet route.
- `app/(tabs)/index.tsx`: Home tab.
- `app/(tabs)/library/index.tsx`: Library tab.
- `app/(tabs)/processing.tsx`: Processing tab for background playback/conversion jobs.
- `app/(tabs)/profile.tsx`: Profile tab.
- `app/(tabs)/explore/index.tsx`: Explore tab landing screen.
- `app/(tabs)/explore/search.tsx`: Dedicated Explore search screen with song-result playback.

## File and Folder Structure

### Top-level structure
- `app/`: Expo Router file-based routes. Most files are thin wrappers that render feature modules from `src/components/features`.
- `assets/`: Static images and Stitch design references used by the visual UI and design handoff.
- `src/`: Application source code: features, stores, hooks, APIs, theme tokens, services, and shared UI.

### Key source-code subfolders
- `src/api/`: Typed backend clients and shared Axios configuration.
- `src/components/features/`: Screen-level UI split by feature, usually as `Component.tsx + logic + styles + index`.
- `src/components/ui/`: Shared visual primitives such as cards, bottom sheets, gradients, placeholders, and playback visuals.
- `src/constants/`: Static app constants such as Explore genre definitions.
- `src/hooks/`: Shared hooks for auth, debounce, drawer control, React Query-powered music data, and toast orchestration.
- `src/services/`: Integration clients for backend search plus YouTube discovery helpers.
- `src/store/`: Global Zustand state containers and compatibility re-exports.
- `src/player/`: Playback engine, job polling, helpers, types, and the canonical Zustand playback store.
- `src/theme/`: Centralized design tokens for color, spacing, typography, elevation, radius, glass effects, and gradients.
- `src/types/`: Cross-feature TypeScript types, including Explore section/video shape modeling.
- `src/utils/`: Utility modules such as secure token persistence.

### Repository snapshot
```text
|-- app/
|   |-- (tabs)/
|   |   |-- explore/
|   |   |   |-- _layout.tsx
|   |   |   |-- index.tsx
|   |   |   `-- search.tsx
|   |   |-- library/
|   |   |   |-- _layout.tsx
|   |   |   |-- [playlistId].tsx
|   |   |   `-- index.tsx
|   |   |-- _layout.tsx
|   |   |-- index.tsx
|   |   |-- processing.tsx
|   |   `-- profile.tsx
|   |-- _layout.tsx
|   |-- addSection.tsx
|   |-- index.tsx
|   |-- login.tsx
|   `-- signup.tsx
|-- assets/
|   |-- images/
|   |   |-- album_analog_dreams.png
|   |   |-- album_star_gazer.png
|   |   |-- android-icon-background.png
|   |   |-- android-icon-foreground.png
|   |   |-- android-icon-monochrome.png
|   |   |-- artist_1.png
|   |   |-- artist_2.png
|   |   |-- artist_3.png
|   |   |-- favicon.png
|   |   |-- hero_midnight_synth.png
|   |   |-- icon.png
|   |   |-- partial-react-logo.png
|   |   |-- react-logo.png
|   |   |-- react-logo@2x.png
|   |   |-- react-logo@3x.png
|   |   `-- splash-icon.png
|   `-- stitch/
|       |-- explore_screen/
|       |   |-- code.html
|       |   `-- screen.png
|       |-- home_screen/
|       |   |-- code.html
|       |   `-- screen.png
|       |-- library/
|       |   |-- code.html
|       |   `-- screen.png
|       |-- login/
|       |   |-- code.html
|       |   `-- screen.png
|       |-- music_player/
|       |   |-- code.html
|       |   `-- screen.png
|       |-- profile/
|       |   |-- code.html
|       |   `-- screen.png
|       |-- signup/
|       |   |-- code.html
|       |   `-- screen.png
|       `-- sonicjam_midnight/
|           `-- DESIGN.md
|-- ditched/
|   |-- library-old/
|   |   `-- src/
|   |       `-- components/
|   |           `-- features/
|   |               `-- Library/
|   |                   |-- index.ts
|   |                   |-- Library.logic.ts
|   |                   |-- Library.styles.ts
|   |                   `-- Library.tsx
|   `-- youtube-search/
|       |-- explore-search.archived.ts
|       `-- explore-search.ts
|-- scripts/
|   `-- generate-project-docs.js
|-- skills/
|   `-- ui-ux-pro-max/
|       |-- data/
|       |   |-- stacks/
|       |   |   |-- angular.csv
|       |   |   |-- astro.csv
|       |   |   |-- flutter.csv
|       |   |   |-- html-tailwind.csv
|       |   |   |-- jetpack-compose.csv
|       |   |   |-- laravel.csv
|       |   |   |-- nextjs.csv
|       |   |   |-- nuxt-ui.csv
|       |   |   |-- nuxtjs.csv
|       |   |   |-- react-native.csv
|       |   |   |-- react.csv
|       |   |   |-- shadcn.csv
|       |   |   |-- svelte.csv
|       |   |   |-- swiftui.csv
|       |   |   |-- threejs.csv
|       |   |   `-- vue.csv
|       |   |-- app-interface.csv
|       |   |-- charts.csv
|       |   |-- colors.csv
|       |   |-- design.csv
|       |   |-- draft.csv
|       |   |-- google-fonts.csv
|       |   |-- icons.csv
|       |   |-- landing.csv
|       |   |-- products.csv
|       |   |-- react-performance.csv
|       |   |-- styles.csv
|       |   |-- typography.csv
|       |   |-- ui-reasoning.csv
|       |   `-- ux-guidelines.csv
|       |-- references/
|       |   |-- checklist.md
|       |   |-- quick-reference.md
|       |   `-- stacks.md
|       |-- scripts/
|       |   |-- __pycache__/
|       |   |   |-- core.cpython-314.pyc
|       |   |   `-- design_system.cpython-314.pyc
|       |   |-- core.py
|       |   |-- design_system.py
|       |   `-- search.py
|       `-- SKILL.md
|-- src/
|   |-- api/
|   |   |-- apiClient.ts
|   |   |-- authApi.ts
|   |   `-- musicApi.ts
|   |-- components/
|   |   |-- features/
|   |   |   |-- AddSection/
|   |   |   |   |-- AddSection.logic.ts
|   |   |   |   |-- AddSection.styles.ts
|   |   |   |   |-- AddSection.tsx
|   |   |   |   `-- index.ts
|   |   |   |-- Explore/
|   |   |   |   |-- Explore.logic.ts
|   |   |   |   |-- Explore.styles.ts
|   |   |   |   |-- Explore.tsx
|   |   |   |   |-- ExploreSearch.logic.ts
|   |   |   |   |-- ExploreSearch.styles.ts
|   |   |   |   |-- ExploreSearch.tsx
|   |   |   |   |-- index.ts
|   |   |   |   |-- MediaSection.tsx
|   |   |   |   |-- RecentSongPlaylistDrawer.tsx
|   |   |   |   |-- SectionItem.tsx
|   |   |   |   `-- VideoCard.tsx
|   |   |   |-- GlobalPlayer/
|   |   |   |   |-- GlobalPlayer.tsx
|   |   |   |   `-- index.ts
|   |   |   |-- Home/
|   |   |   |   |-- Home.constants.tsx
|   |   |   |   |-- Home.styles.ts
|   |   |   |   |-- Home.tsx
|   |   |   |   `-- index.ts
|   |   |   |-- Library/
|   |   |   |   |-- AddPlaylistModal.tsx
|   |   |   |   |-- index.ts
|   |   |   |   |-- Library.styles.ts
|   |   |   |   `-- Library.tsx
|   |   |   |-- Login/
|   |   |   |   |-- index.ts
|   |   |   |   |-- Login.logic.ts
|   |   |   |   |-- Login.styles.ts
|   |   |   |   `-- Login.tsx
|   |   |   |-- MediaCard/
|   |   |   |   |-- index.ts
|   |   |   |   |-- MediaCard.styles.ts
|   |   |   |   |-- MediaCard.tsx
|   |   |   |   `-- MediaCard.types.ts
|   |   |   |-- Playlist/
|   |   |   |   |-- PlaylistCard.tsx
|   |   |   |   `-- SongListCard.tsx
|   |   |   |-- Processing/
|   |   |   |   |-- index.ts
|   |   |   |   |-- Processing.styles.ts
|   |   |   |   `-- Processing.tsx
|   |   |   |-- Profile/
|   |   |   |   |-- index.ts
|   |   |   |   |-- Profile.logic.ts
|   |   |   |   |-- Profile.styles.ts
|   |   |   |   `-- Profile.tsx
|   |   |   `-- Signup/
|   |   |       |-- index.ts
|   |   |       |-- Signup.logic.ts
|   |   |       |-- Signup.styles.ts
|   |   |       `-- Signup.tsx
|   |   `-- ui/
|   |       |-- AnimatedPressable.tsx
|   |       |-- AudioWave.tsx
|   |       |-- ConfirmDialog.tsx
|   |       |-- GlassCard.tsx
|   |       |-- GradientText.tsx
|   |       |-- MovingLine.tsx
|   |       |-- MusicOptionsDrawer.tsx
|   |       |-- SongPlaceholder.tsx
|   |       `-- SpinnerBadge.tsx
|   |-- constants/
|   |   `-- genres.ts
|   |-- context/
|   |   `-- ConfirmProvider.tsx
|   |-- hooks/
|   |   |-- useAuth.ts
|   |   |-- useConfirm.ts
|   |   |-- useDebounce.ts
|   |   |-- useDrawer.tsx
|   |   |-- useMusic.ts
|   |   `-- useToast.tsx
|   |-- playbackCore/
|   |   |-- audioEngine.ts
|   |   |-- mapper.ts
|   |   |-- playbackController.ts
|   |   |-- playbackResolver.ts
|   |   |-- playbackStore.ts
|   |   |-- setupPlayer.ts
|   |   `-- types.ts
|   |-- services/
|   |   |-- recommendationService.ts
|   |   |-- searchService.ts
|   |   `-- youtube.ts
|   |-- store/
|   |   |-- authStore.ts
|   |   `-- exploreStore.ts
|   |-- theme/
|   |   |-- colors.ts
|   |   |-- elevation.ts
|   |   |-- glass.ts
|   |   |-- gradients.ts
|   |   |-- index.ts
|   |   |-- radius.ts
|   |   |-- spacing.ts
|   |   `-- typography.ts
|   |-- types/
|   |   `-- explore.ts
|   `-- utils/
|       |-- recentSongsStorage.ts
|       |-- songsActions.tsx
|       `-- tokenStorage.ts
|-- .env
|-- .gitignore
|-- app.json
|-- eslint.config.js
|-- expo-env.d.ts
|-- package-lock.json
|-- package.json
|-- README.md
`-- tsconfig.json
```

## Core Features and Workflows

### Authentication workflow
1. The app boots through `app/_layout.tsx`.
2. `AuthGuard` calls `checkAuth()` from `useAuth()`.
3. `authStore` checks secure storage for a refresh token.
4. If present, the backend refresh endpoint issues new tokens and `getMe` populates the current user.
5. Route access is then enforced: unauthenticated users are redirected to `/login`, authenticated users are redirected into the tabs shell.

### Explore workflow
1. Explore mounts and triggers `exploreStore.loadInitial()` when default sections are empty.
2. Two default trending sections are hydrated from the YouTube trending endpoint.
3. The visible search field on the Explore tab is now a dummy trigger that routes into `app/(tabs)/explore/search.tsx`.
4. Genre chips call `fetchGenreVideos()` and render inline vertical cards beneath the discovery surface.
5. Users can add up to three extra sections through the add-section form-sheet modal.
6. Section cards support refresh, pagination, deletion, and direct playback.

### Explore search workflow
1. The dedicated Explore search route owns query text, debounce, empty states, and result rendering through `ExploreSearch.logic.ts`.
2. Queries are resolved through the backend `/search` endpoint via `searchService.searchTracks()`, returning title/artist/image results.
3. Tapping a result calls `playerStore.playFromSearchResult()`, which sends `{ title, artist }` to `POST /songs/play`.
4. If playback is immediately ready, the returned `song + streamUrl` pair is played directly; otherwise the request enters the shared processing-job flow.

### Library workflow
1. `useMusic()` fetches user playlists, playlist songs, and the global song catalog with React Query.
2. The Library tab is primarily playlist-driven: users can create/delete playlists, inspect playlist detail screens, and remove songs from playlists.
3. Tapping a saved song delegates playback to `playerStore.playSong()`.

### Processing workflow
1. Processing is now a first-class tab instead of a standalone route.
2. The screen reads `songJobs` from the shared player store and groups them into active, waiting, failed, and completed states.
3. Completed and failed jobs can be dismissed from the UI, while active jobs surface progress and metadata from the backend-returned song records when available.

### Playback workflow
1. Playback can begin from a backend song record, an Explore YouTube card, or a search result that only knows `title + artist`.
2. For saved songs, the app requests `GET /songs/play/:songId`, which now returns both `streamUrl` and the full `song` record.
3. For YouTube-origin playback, the app calls `POST /songs/play` with `{ youtubeId }`; for search-origin playback, it calls the same endpoint with `{ title, artist }`.
4. Any response that includes `streamUrl` is treated as a playback-ready `streamUrl + song` pair and is played without additional metadata fetches.
5. When a job ID is returned, `playerStore` polls `GET /songs/job/:jobId`; when the job completes, the response includes both `streamUrl` and the completed `song` record.
6. `expo-audio` is used to create a player instance and stream status updates back into the store.
7. The mini-player, Processing tab, and full player screen all read from the same store, so controls and job state remain synchronized.
8. If a stream URL is older than roughly 4.5 minutes, playback resumes by re-fetching a fresh playable response through `playSong()`, `playFromYouTube()`, or `playFromSearchResult()`.

### Playlist/library mutation workflow
1. A YouTube video ID is passed into `useMusic().addSong`.
2. The app first fetches full video details so title and duration are available.
3. The backend `/library/addSong` endpoint is called with YouTube metadata.
4. Playlist create/delete and remove-song actions invalidate the relevant React Query caches so library screens refresh after mutations.

## Important Dependencies and Integrations

### Framework and runtime
- `expo` (~54.0.33)
- `react` (19.1.0)
- `react-native` (0.81.5)
- `expo-router` (~6.0.23)

### Navigation and screen infrastructure
- `@react-navigation/native` (^7.1.8)
- `@react-navigation/bottom-tabs` (^7.15.7)
- `@react-navigation/native-stack` (^7.14.8)
- `react-native-safe-area-context` (~5.6.0)
- `react-native-screens` (~4.16.0)

### Data, networking, and state
- `@tanstack/react-query` (^5.95.2)
- `axios` (^1.13.6)
- `zustand` (^5.0.12)

### Media and playback
- `@react-native-community/slider` (5.0.1)

### UI and interaction
- `expo-linear-gradient` (~15.0.8)
- `expo-blur` (~15.0.8)
- `expo-image` (~3.0.11)
- `expo-haptics` (~15.0.8)
- `@expo/vector-icons` (^15.0.3)
- `lucide-react-native` (^1.6.0)
- `react-native-flash-message` (^0.4.2)

### Storage and auth support
- `expo-secure-store` (~15.0.8)
- `expo-constants` (~18.0.13)

### External services
- Backend API base URL: `EXPO_PUBLIC_API_URL (declared via .env)`
- YouTube Data API key: `EXPO_PUBLIC_YOUTUBE_API_KEY`
- Secure token storage: `expo-secure-store`
- Audio runtime: `expo-audio`

## Key Design Decisions and Assumptions

### Design decisions
- Expo Router owns navigation. Route files stay intentionally thin and delegate real logic to feature modules under `src/components/features`.
- Zustand stores hold app-level state for auth, Explore discovery sections, and playback so multiple routes/components can react without prop drilling.
- React Query is used for backend library and playlist data, while transient Explore discovery state is managed in `exploreStore` and dedicated feature-local logic hooks.
- Auth tokens are stored with `expo-secure-store`; Axios interceptors attach access tokens and transparently refresh on `401` responses.
- Playback is centralized in `playerStore` using `expo-audio`, with every playback-ready backend response treated as a `streamUrl + song` pair.
- Theme primitives are centralized under `src/theme` to keep the highly stylized visual direction consistent across screens.
- A global `ConfirmProvider` (React Context + Promise-based hook) provides a Spotify-style confirmation dialog accessible anywhere via `useConfirm()` without prop drilling.
- A global `BottomSheetProvider` (React Context + hook) exposes `useBottomSheet()` for rendering reusable bottom drawers including `MusicOptionsDrawer` from any screen.
- Each tab screen now owns its own top safe-area handling instead of relying on a shared tab-header component.

### Assumptions
- The backend exposed by `EXPO_PUBLIC_API_URL` provides working auth, library, streaming, playlist, and direct-play endpoints compatible with the current request shapes.
- The app targets Indian-region YouTube discovery (`regionCode=IN`) for trending/search/playlist flows.
- Most custom-section state is expected to live only in memory for now; there is no persistence layer for user-created Explore sections.
- Home and parts of Profile are currently product/UI prototypes rather than fully backend-driven features.

## Debugging Guide

### Where to look first
- Auth problems: `src/store/authStore.ts`, `src/api/apiClient.ts`, `src/api/authApi.ts`, `src/utils/tokenStorage.ts`
- Explore discovery issues: `src/components/features/Explore/Explore.logic.ts`, `src/store/exploreStore.ts`, `src/services/youtube.ts`
- Explore search issues: `src/components/features/Explore/ExploreSearch.logic.ts`, `src/services/searchService.ts`, `src/player/player.store.ts`
- Library fetch/add issues: `src/hooks/useMusic.ts`, `src/api/musicApi.ts`
- Playback issues: `src/player/player.store.ts`, `src/player/player.jobs.ts`, `src/components/features/GlobalPlayer/`, `src/components/features/Player/`
- Route or redirect issues: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, route wrapper files in `app/`
- Styling consistency issues: `src/theme/` and the relevant feature `.styles.ts` file

### Runtime configuration
- Expo app name: `sonic`
- Expo slug: `sonic`
- Typed routes: `enabled`
- React Compiler experiment: `enabled`
- Environment keys found in repository root `.env`: `EXPO_PUBLIC_YOUTUBE_API_KEY`, `EXPO_PUBLIC_API_URL`

## Known Issues and Limitations

- Playlist detection exists in `AddSection.logic`, but the submitted payload always uses `type: 'keyword'`, so playlist URLs are not actually handled as playlist sections.
- Custom Explore sections are stored only in Zustand memory and disappear after a full reload/app restart.
- Search failures in the dedicated Explore search screen are mostly silent; users get little feedback when `/search` fails beyond an empty state.
- The two default Explore sections both call the same trending endpoint, so the distinction between `Trending Now` and `YouTube Trending` is presentation-level rather than data-level.
- Home and several Profile values are hard-coded placeholders (user name, avatars, version copy, mixes, artists) and should not be treated as authoritative user data.
- The repository references `scripts/reset-project.js` in `package.json`, but that file is currently absent from the checked-in tree.
- Queue navigation currently routes `next()` and `prev()` through `playFromYouTube()` even for tracks originally derived from backend song records, which keeps playback working but does not fully preserve library/search provenance.

## Maintenance and Auto-Update Behavior

- The canonical file is `docs/PROJECT_PR_DESCRIPTION.md`.
- It is generated by `npm run docs:generate`.
- It can stay live during development with `npm run docs:watch`, which watches the repository and regenerates the document after file changes.
- Standard workflows also refresh the document automatically through npm pre-scripts wired into `start`, `android`, `ios`, `web`, and `lint`.
- If the architecture changes meaningfully, update the curated summaries inside `scripts/generate-project-docs.js` so the generated narrative remains accurate in addition to the automatically refreshed file tree and dependency snapshot.
