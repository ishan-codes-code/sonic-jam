import TrackPlayer from "@rntp/player";
import { BASE_URL } from "@/api/apiClient";
import { ensureFreshToken } from "@/features/auth/utils/tokenManager";
import { PlaybackTrack, Song } from "../types";

export function getPlaybackUrl(song: Song): string {
  if (!BASE_URL) {
    throw new Error("BASE_URL is not configured");
  }
  return `${BASE_URL}/song/${song.id}`;
}

export async function createPlaybackTrack(
  song: Song,
  playbackToken: string,
  options?: { isManualAdd?: boolean },
): Promise<PlaybackTrack> {
  if (!song.id) {
    throw new Error("Song is missing id");
  }

  const headers = {
    Authorization: `Bearer ${playbackToken}`,
  };
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
  };
}

export async function syncQueueTokens(freshToken: string) {
  // No-op: Proactive access token syncing is no longer needed with the playback-token system.
}
