# Contract: Playback

Implementation: `src/features/playback/api/playback.api.ts`, `src/features/playback/api/playbackApi.ts`,
`src/features/playback/services/pollingResolver.ts`, `src/features/playback/utils/playbackHelpers.ts`,
`src/features/playback/api/recommendationApi.ts`, `src/features/playback/services/playerSetup.ts`.
All endpoints require Bearer auth unless noted.

## Shared shapes — **[Confirmed]** (client types)

- `Song`: `{ id, trackName, albumName?, duration: number (seconds), image: string, externalId?, lastfmId?,
  youtubeId: string, artists: [{ id, name }], createdAt, streamUrl: string }`.
  Note: `createdAt` is typed `Date` but arrives over JSON (no runtime parsing observed) — treat as ISO string at runtime.
- `PlaybackTrack` (client-only): RNTP `MediaItem` + `song: Song` + optional `isManualAdd`/`source`/`mimeType`.

## `POST /song/play` — **[Confirmed]**

- Body — one of:
  - `{ songId: string }`, or
  - `{ trackName, artistName, duration?, image?, externalId }` (external/iTunes-origin), or
  - `{ trackName, artistName, duration?, image?, lastfmId }` (recommendation-origin).
  The client validates these shapes before sending (`resolveStream()`).
- Response — one of:
  - Ready: `{ type: "ready", song: Song, playbackToken: string }`
  - Job: `{ type: "job", jobId: string }` → client registers the job and polls.
- Audio playback uses `song.streamUrl` with header `Authorization: Bearer <playbackToken>`.
  (`GET {BASE_URL}/song/:id` exists only as a display helper client-side; it is NOT the audio source.)

## `GET /song/job/:jobId` — **[Confirmed]** (as handled by the client)

- Response fields read by the client: `status: string`, `retryAfter?: number`,
  `song?: Song`, `playbackToken?: string`, `progress?: number`, `message?: string`.
- Statuses handled: `busy` (sleep `retryAfter` seconds, default 5, then resume rapid polling),
  `completed`/`finished` (requires `song` + `playbackToken`, else client throws),
  `failed` (throws `message`), anything else is treated as pending with staged backoff.
- Client polling caps at 5 minutes total, then throws `Job timeout`. Network drops retry silently;
  HTTP error statuses fail the job immediately.

## `POST /listening/event` — **[Partial]**

- Body: `{ id?, songId?, durationListenedSeconds?, completed?, isManualAdd? }` (all optional client-side).
- Response shape is untyped in the client.

## Native progress sync — **[Partial]**

- The native player POSTs to `{BASE_URL}/listening/progress-sync` every 30s (configured at setup).
  `Authorization: Bearer <accessToken>` headers are pushed from JS on login/refresh/mount and cleared on logout.
- Request body and response shapes are owned by the native module and were not verified — do not document
  further without reading `@rntp/player` or backend code.

## `GET /recommend?limit=` — **[Confirmed]** (as consumed)

- Response: array of `{ trackName, artistName, image, duration, lastfmId, score }`, mapped by the
  client to `{ title, artist, image, duration, lastfmId, score }`.
- Default `limit` is 20. 429 or any error → client returns `[]` (radio silently starves).
