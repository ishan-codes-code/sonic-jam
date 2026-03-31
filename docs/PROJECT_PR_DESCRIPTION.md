# Sonic PR Description

_Generated automatically by `scripts/generate-project-docs.js` on 2026-03-31T22:12:14.221Z._

## Project Overview

Sonic is an Expo/React Native music application prototype that combines three product layers:

- authenticated account access against a custom backend
- YouTube-powered discovery and search for music videos
- backend-mediated audio playback and library management

The current product emphasis is strongest on the Explore and playback flows. Home and parts of Profile are intentionally more showcase-oriented than backend-driven.

## Purpose

This document is the single source of truth for onboarding, debugging, and future changes. Another engineer or agent should be able to understand the app shell, data flow, route map, major modules, and current tradeoffs without re-reading the entire codebase.

## Architecture and Key Components

- `app/_layout.tsx` bootstraps the app shell, auth guard, React Query provider, flash-message provider, stack navigation, and the persistent global player.
- `app/(tabs)/_layout.tsx` defines the main four-tab shell: Home, Explore, Library, and Profile.
- Auth is checked on boot through `useAuth()`/`authStore`; authenticated users are redirected away from login/signup, while unauthenticated users are blocked from tabs and the player sheet.
- Explore content comes from YouTube service functions plus an `exploreStore` that manages dynamic sections, pagination, refreshes, and deletion.
- Library data is fetched from the backend with React Query (`useMusic`), while playback state is shared through `playerStore` so mini-player and full-player stay in sync.
- Cross-cutting providers currently enabled: React Query = yes, custom flash messages = yes, persistent mini-player = yes.

### Stores

- `src/store/authStore.ts`: Handles login, signup, logout, boot-time auth checks, error extraction, and auth reset after interceptor refresh failures.
- `src/store/exploreStore.ts`: Owns default Explore sections, user-added sections, pagination, refresh, deletion, loading state, and error/flash handling.
- `src/store/playerStore.ts`: Re-exports the modular player store from `src/player/player.store.ts` for backward compatibility.
- `src/player/player.store.ts`: Main Zustand store for global playback lifecycle, current item, library and YouTube playback resolution, job polling, queue state, progress, duration, player cleanup, pending tracks, and notifications.
- `src/player/player.types.ts`: TypeScript interfaces and types for player state, tracks, jobs, and notifications.
- `src/player/player.engine.ts`: Playback engine functions for handling audio streams and player management.
- `src/player/player.jobs.ts`: Job-related logic including polling, status handling, and job synchronization.
- `src/player/player.helpers.ts`: Pure helper functions for player utilities and cleanup.

### API and service layers

- `src/api/apiClient.ts`: Shared Axios client with bearer-token injection and queued token refresh on `401`.
- `src/api/authApi.ts`: Backend auth calls for signup, login, refresh, logout, and `getMe`.
- `src/api/musicApi.ts`: Backend library/playback calls for add-song, get-library, saved-song play URLs, direct play, and job-status polling.
- `src/services/youtube.ts`: YouTube Data API wrapper for search, trending, batch details, playlist fetches, genre search, and formatting helpers.

### Feature modules

- `AddSection`: Modal/form-sheet flow for creating extra Explore sections from a keyword or playlist-like input.
- `Explore`: Primary dynamic discovery surface backed by YouTube search/trending APIs and custom user-created sections.
- `GlobalPlayer`: Persistent mini-player rendered from the root layout so playback controls remain available across screens.
- `Home`: Presentational landing tab with curated/stubbed content blocks, hero artwork, mixes, and artist sections.
- `Library`: Authenticated library view backed by the backend `getLibrary` endpoint and connected to the shared player store.
- `Login`: Auth entry screen that submits credentials through the auth store.
- `MediaCard`: Reusable media-card building block used by feature surfaces.
- `Player`: Expanded playback sheet driven by the global player store for both library songs and YouTube-origin playback.
- `Processing`: Feature module in the current app.
- `Profile`: Mostly presentational account/settings screen with logout and a flash-message demo route entry point.
- `Signup`: Registration screen that creates an account through the auth store.

## Navigation and Route Map

- `app/index.tsx`: Default entry route. Redirects to `/login`; the root auth guard decides the final destination.
- `app/login.tsx`: Unauthenticated login screen.
- `app/signup.tsx`: Unauthenticated signup screen.
- `app/player.tsx`: Player form-sheet route for the full-screen playback experience.
- `app/addSection.tsx`: Explore add-section form-sheet route.
- `app/(tabs)/index.tsx`: Home tab.
- `app/(tabs)/library.tsx`: Library tab.
- `app/(tabs)/profile.tsx`: Profile tab.
- `app/(tabs)/explore/index.tsx`: Explore tab landing screen.
- `app/(tabs)/explore/demo.tsx`: Flash-message showcase/demo screen reached from Profile.

## File and Folder Structure

### Top-level structure

- `app/`: Expo Router file-based routes. Most files are thin wrappers that render feature modules from `src/components/features`.
- `assets/`: Static images and Stitch design references used by the visual UI and design handoff.
- `src/`: Application source code: features, stores, hooks, APIs, theme tokens, services, and shared UI.

### Key source-code subfolders

- `src/api/`: Typed backend clients and shared Axios configuration.
- `src/components/features/`: Screen-level UI split by feature, usually as `Component.tsx + logic + styles + index`.
- `src/components/ui/`: Shared visual primitives such as cards, flash messages, gradients, and playback visuals.
- `src/constants/`: Static app constants such as Explore genre definitions.
- `src/hooks/`: Shared hooks for auth, debounce, music/library queries, and flash-message orchestration.
- `src/services/`: Non-backend external integration layer, currently YouTube Data API helpers.
- `src/store/`: Global Zustand state containers.
- `src/theme/`: Centralized design tokens for color, spacing, typography, elevation, radius, glass effects, and gradients.
- `src/types/`: Cross-feature TypeScript types, including Explore section/video shape modeling.
- `src/utils/`: Utility modules such as secure token persistence.

### Repository snapshot

```text
|-- android/
|   |-- app/
|   |   |-- src/
|   |   |   |-- debug/
|   |   |   |   `-- AndroidManifest.xml
|   |   |   |-- debugOptimized/
|   |   |   |   `-- AndroidManifest.xml
|   |   |   `-- main/
|   |   |       |-- java/
|   |   |       |   `-- com/
|   |   |       |       `-- itsishandev/
|   |   |       |           `-- sonic/
|   |   |       |               |-- MainActivity.kt
|   |   |       |               `-- MainApplication.kt
|   |   |       |-- res/
|   |   |       |   |-- drawable/
|   |   |       |   |   |-- ic_launcher_background.xml
|   |   |       |   |   `-- rn_edit_text_material.xml
|   |   |       |   |-- drawable-hdpi/
|   |   |       |   |   `-- splashscreen_logo.png
|   |   |       |   |-- drawable-mdpi/
|   |   |       |   |   `-- splashscreen_logo.png
|   |   |       |   |-- drawable-xhdpi/
|   |   |       |   |   `-- splashscreen_logo.png
|   |   |       |   |-- drawable-xxhdpi/
|   |   |       |   |   `-- splashscreen_logo.png
|   |   |       |   |-- drawable-xxxhdpi/
|   |   |       |   |   `-- splashscreen_logo.png
|   |   |       |   |-- mipmap-anydpi-v26/
|   |   |       |   |   |-- ic_launcher_round.xml
|   |   |       |   |   `-- ic_launcher.xml
|   |   |       |   |-- mipmap-hdpi/
|   |   |       |   |   |-- ic_launcher_background.webp
|   |   |       |   |   |-- ic_launcher_foreground.webp
|   |   |       |   |   |-- ic_launcher_monochrome.webp
|   |   |       |   |   |-- ic_launcher_round.webp
|   |   |       |   |   `-- ic_launcher.webp
|   |   |       |   |-- mipmap-mdpi/
|   |   |       |   |   |-- ic_launcher_background.webp
|   |   |       |   |   |-- ic_launcher_foreground.webp
|   |   |       |   |   |-- ic_launcher_monochrome.webp
|   |   |       |   |   |-- ic_launcher_round.webp
|   |   |       |   |   `-- ic_launcher.webp
|   |   |       |   |-- mipmap-xhdpi/
|   |   |       |   |   |-- ic_launcher_background.webp
|   |   |       |   |   |-- ic_launcher_foreground.webp
|   |   |       |   |   |-- ic_launcher_monochrome.webp
|   |   |       |   |   |-- ic_launcher_round.webp
|   |   |       |   |   `-- ic_launcher.webp
|   |   |       |   |-- mipmap-xxhdpi/
|   |   |       |   |   |-- ic_launcher_background.webp
|   |   |       |   |   |-- ic_launcher_foreground.webp
|   |   |       |   |   |-- ic_launcher_monochrome.webp
|   |   |       |   |   |-- ic_launcher_round.webp
|   |   |       |   |   `-- ic_launcher.webp
|   |   |       |   |-- mipmap-xxxhdpi/
|   |   |       |   |   |-- ic_launcher_background.webp
|   |   |       |   |   |-- ic_launcher_foreground.webp
|   |   |       |   |   |-- ic_launcher_monochrome.webp
|   |   |       |   |   |-- ic_launcher_round.webp
|   |   |       |   |   `-- ic_launcher.webp
|   |   |       |   |-- values/
|   |   |       |   |   |-- colors.xml
|   |   |       |   |   |-- strings.xml
|   |   |       |   |   `-- styles.xml
|   |   |       |   `-- values-night/
|   |   |       |       `-- colors.xml
|   |   |       `-- AndroidManifest.xml
|   |   |-- build.gradle
|   |   |-- debug.keystore
|   |   `-- proguard-rules.pro
|   |-- gradle/
|   |   `-- wrapper/
|   |       |-- gradle-wrapper.jar
|   |       `-- gradle-wrapper.properties
|   |-- .gitignore
|   |-- build.gradle
|   |-- gradle.properties
|   |-- gradlew
|   |-- gradlew.bat
|   `-- settings.gradle
|-- app/
|   |-- (tabs)/
|   |   |-- explore/
|   |   |   |-- _layout.tsx
|   |   |   |-- demo.tsx
|   |   |   `-- index.tsx
|   |   |-- _layout.tsx
|   |   |-- index.tsx
|   |   |-- library.tsx
|   |   `-- profile.tsx
|   |-- _layout.tsx
|   |-- addSection.tsx
|   |-- index.tsx
|   |-- login.tsx
|   |-- player.tsx
|   |-- processing.tsx
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
|-- scripts/
|   `-- generate-project-docs.js
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
|   |   |   |   |-- index.ts
|   |   |   |   |-- MediaSection.tsx
|   |   |   |   |-- SectionItem.tsx
|   |   |   |   `-- VideoCard.tsx
|   |   |   |-- GlobalPlayer/
|   |   |   |   |-- GlobalPlayer.logic.ts
|   |   |   |   |-- GlobalPlayer.styles.ts
|   |   |   |   |-- GlobalPlayer.tsx
|   |   |   |   `-- index.ts
|   |   |   |-- Home/
|   |   |   |   |-- Home.constants.tsx
|   |   |   |   |-- Home.styles.ts
|   |   |   |   |-- Home.tsx
|   |   |   |   `-- index.ts
|   |   |   |-- Library/
|   |   |   |   |-- index.ts
|   |   |   |   |-- Library.logic.ts
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
|   |   |   |-- Player/
|   |   |   |   |-- index.ts
|   |   |   |   |-- Player.logic.ts
|   |   |   |   |-- Player.styles.ts
|   |   |   |   `-- Player.tsx
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
|   |       |-- AppHeader.tsx
|   |       |-- AudioWave.tsx
|   |       |-- Fakeprogressflashmessage.tsx
|   |       |-- FlashMessage.tsx
|   |       |-- GlassCard.tsx
|   |       |-- GradientText.tsx
|   |       |-- MovingLine.tsx
|   |       `-- SpinnerBadge.tsx
|   |-- constants/
|   |   `-- genres.ts
|   |-- hooks/
|   |   |-- useAuth.ts
|   |   |-- useDebounce.ts
|   |   |-- useFlashMessage.tsx
|   |   `-- useMusic.ts
|   |-- player/
|   |   |-- player.engine.ts
|   |   |-- player.helpers.ts
|   |   |-- player.jobs.ts
|   |   |-- player.store.ts
|   |   `-- player.types.ts
|   |-- services/
|   |   `-- youtube.ts
|   |-- store/
|   |   |-- authStore.ts
|   |   |-- exploreStore.ts
|   |   `-- playerStore.ts
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
3. Search input is debounced and resolved through `searchVideos()`.
4. Genre chips call `fetchGenreVideos()` and render inline vertical cards.
5. Users can add up to three extra sections through the add-section sheet.
6. Section cards support refresh, pagination, deletion, and direct playback.

### Library workflow

1. `useMusic()` fetches the saved library with React Query.
2. The Library screen renders backend songs and highlights the currently playing item.
3. Tapping a saved song delegates playback to `playerStore.playSong()`.

### Playback workflow

1. Playback can begin from a backend library song or directly from a YouTube video result.
2. For library songs, the app requests `GET /songs/play/:songId` and plays the returned stream URL immediately.
3. For YouTube-origin playback, the app calls `POST /songs/play`, which may return either an immediate stream URL or a background job ID.
4. If an immediate stream URL is returned, playback starts immediately and any pending track is cleared.
5. If a job ID is returned, the app sets a pending track for the requested song and starts background job polling without interrupting current playback.
6. When a job completes:
   - If it matches the current pending track, playback switches to the completed song and the pending track is cleared.
   - If it doesn't match (e.g., an older job), a notification is shown allowing the user to play the completed song manually.
7. `expo-audio` is used to create a player instance and stream status updates back into the store.
8. The mini-player and full player screen both read from the same store, so controls remain synchronized.
9. If a stream URL is older than roughly 4.5 minutes, playback resumes by re-fetching a fresh stream URL.

### Add-to-library workflow

1. A YouTube video ID is passed into `useMusic().addSong`.
2. The app first fetches full video details so title and duration are available.
3. The backend `/library/addSong` endpoint is called with YouTube metadata.
4. The library query is invalidated so the saved-track list refreshes.

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

- `expo-audio` (~1.1.1)
- `expo-av` (^16.0.8)
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
- Zustand stores hold app-level state for auth, discovery sections, and playback so multiple routes/components can react without prop drilling.
- React Query is used for backend library data and mutations, while transient YouTube discovery/search state is managed locally plus in `exploreStore`.
- Auth tokens are stored with `expo-secure-store`; Axios interceptors attach access tokens and transparently refresh on `401` responses.
- Playback is centralized in `playerStore` using `expo-audio`, with direct-ready playback for saved songs plus queued job polling for YouTube-origin requests.
- Theme primitives are centralized under `src/theme` to keep the highly stylized visual direction consistent across screens.

### Assumptions

- The backend exposed by `EXPO_PUBLIC_API_URL` provides working auth, library, streaming, and direct-play endpoints compatible with the current request shapes.
- The app targets Indian-region YouTube discovery (`regionCode=IN`) for trending/search/playlist flows.
- Most custom-section state is expected to live only in memory for now; there is no persistence layer for user-created Explore sections.
- Home and parts of Profile are currently product/UI prototypes rather than fully backend-driven features.

## Debugging Guide

### Where to look first

- Auth problems: `src/store/authStore.ts`, `src/api/apiClient.ts`, `src/api/authApi.ts`, `src/utils/tokenStorage.ts`
- Explore/search/trending issues: `src/components/features/Explore/Explore.logic.ts`, `src/store/exploreStore.ts`, `src/services/youtube.ts`
- Library fetch/add issues: `src/hooks/useMusic.ts`, `src/api/musicApi.ts`
- Playback issues: `src/store/playerStore.ts`, `src/components/features/GlobalPlayer/`, `src/components/features/Player/`
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
- Search failures in Explore are mostly silent; users get little feedback when YouTube search or genre fetches fail.
- The two default Explore sections both call the same trending endpoint, so the distinction between `Trending Now` and `YouTube Trending` is presentation-level rather than data-level.
- Home and several Profile values are hard-coded placeholders (user name, avatars, version copy, mixes, artists) and should not be treated as authoritative user data.
- The repository references `scripts/reset-project.js` in `package.json`, but that file is currently absent from the checked-in tree.

## Maintenance and Auto-Update Behavior

- The canonical file is `docs/PROJECT_PR_DESCRIPTION.md`.
- It is generated by `npm run docs:generate`.
- It can stay live during development with `npm run docs:watch`, which watches the repository and regenerates the document after file changes.
- Standard workflows also refresh the document automatically through npm pre-scripts wired into `start`, `android`, `ios`, `web`, and `lint`.
- If the architecture changes meaningfully, update the curated summaries inside `scripts/generate-project-docs.js` so the generated narrative remains accurate in addition to the automatically refreshed file tree and dependency snapshot.
