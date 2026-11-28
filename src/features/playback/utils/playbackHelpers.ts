import { PlaybackTrack, Song, TrackSource } from "../types";
import {
  buildPlaybackHeaders,
  hasUsableStreamUrl,
} from "./streamHelpers";

export async function createPlaybackTrack(
  song: Song,
  playbackToken: string,
  options?: { isManualAdd?: boolean; source?: TrackSource },
): Promise<PlaybackTrack> {
  if (!song.id) {
    throw new Error("Song is missing id");
  }
  // The native queue must never hold an unplayable URL: pending playlist
  // tracks (streamUrl '') resolve through the job endpoint first, and every
  // caller routes through this choke point.
  if (!hasUsableStreamUrl(song.streamUrl)) {
    throw new Error("Song has no playable stream URL yet");
  }

  // The backend-provided stream URL goes to the native player verbatim —
  // never rebuilt, never appended to — with the playback token (not the
  // user's access token) attached up front in the track headers, so the
  // headers are present before the native player starts loading.
  const headers = buildPlaybackHeaders(playbackToken);
  return {
    url: { uri: song.streamUrl, headers },
    mediaId: song.id,
    title: song.trackName,
    artist: song.artists?.map((a: any) => a.name).join(", "),
    artworkUrl:
      song.image ||
      (song.youtubeId
        ? `https://img.youtube.com/vi/${song.youtubeId}/maxresdefault.jpg`
        : undefined),
    duration: song.duration,
    mimeType: "audio/aac",
    song,
    isManualAdd: options?.isManualAdd,
    source: options?.source,
  };
}

export async function syncQueueTokens(freshToken: string) {
  // No-op: Proactive access token syncing is no longer needed with the playback-token system.
}
