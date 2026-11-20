# Contract: Library, History, Discovery

Backend implementation: `src/features/library/api/library.api.ts`, `src/features/library/types/index.ts`,
`src/features/history/api/historyApi.ts`, `src/features/search/api/genre.api.ts`,
`src/features/collections/hooks/useCollection.ts`. All backend endpoints require Bearer auth.

## Playlists — **[Confirmed]**

- `Playlist`: `{ id, name, description: string|null, thumbnailUrl: string[]|null, isPublic: boolean,
  createdAt: string, isSystem: boolean, songCount?: number }`.
- `GET /playlist/getAll` → `Playlist[]`.
- `GET /playlist/:playlistId` → `Playlist`.
- `POST /playlist/create` body `{ name, description: string|null, isPublic }` → `Playlist`.
- `PATCH /playlist/:playlistId` body partial create-payload → `Playlist`.
- `DELETE /playlist/:playlistId` → `{ message: string }`.
- `GET /playlist/:playlistId/songs` → `PlaylistWithSongs`: playlist fields + `user: { id, name, email }`
  + `tracks: Song[]` + **`playbackToken: string`** (scoped token the client reuses for every track it queues)
  + `createdAt`/`updatedAt`. NOTE: `thumbnailUrl` here is typed `string | string[] | null`, while base
  `Playlist` types it `string[] | null` — inconsistent, do not assume one shape.
- `POST /playlist/song/add` body `{ playlistId, songId }` → `{ message: string }`.
- `DELETE /playlist/:playlistId/song/:songId` → `{ message: string }`.
  404 `"Song not found in playlist"` is benign (double-tap/race) and intentionally un-toasted.
- `GET /playlist/song/:songId` → `string[]` (playlist IDs containing the song).

## Listening history — **[Confirmed]**

- `GET /listening/history?limit=&offset=` → `ListeningEvent[]` (client pages 20 at a time, offset-based).
- `ListeningEvent`: `{ id, userId, songId, playedAt: string, durationListenedSeconds: number,
  completed: boolean, song: HistorySong }`.
- `HistorySong`: `{ id, trackName, albumName, image, duration, youtubeId, artists: [{ id, name, normalizedName }] }`.
- `DELETE /listening/history/:id` → response ignored by the client; invalidates the history query.

## Discovery — **[Confirmed]**

- `GET /discovery/genre?genre=<name>&limit=<n>` → `Song[]` (default limit 20). Client caches 10 minutes.

## Third-party (NOT backend contracts)

- iTunes Search (`itunes.apple.com/search`), iTunes Lookup (`itunes.apple.com/lookup`), and Apple RSS
  charts (`rss.marketingtools.apple.com/api/v2/in/music/…`) are called directly with `fetch`/`axios`
  (no auth headers). Response mapping lives in `search/api/itunes.api.ts`, `collections/api/collections.api.ts`,
  `home/api/feed.api.ts`, plus inline copies in `smartQueueService.ts` and `SongDeepLinkRouteScreen.tsx`.
  Region is hardcoded to `in` (India) on search/enrichment calls.
- Version/update config comes from a GitHub Raw JSON (`app-config-sonic`) — shape `VersionConfig` in
  `app-validations/services/versionService.ts`. This gates maintenance/force/OTA screens, not music data.
