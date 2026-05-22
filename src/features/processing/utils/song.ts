import type { CleanedSearchResult } from "@/features/search/types";
import type { Song } from "@/features/playback";

export function getArtistsText(song?: Pick<Song, "artists"> | null) {
  return song?.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || "Unknown Artist";
}

export function toRemoteSong(song: Song): CleanedSearchResult {
  return {
    id: song.id,
    title: song.trackName,
    artist: getArtistsText(song),
    album: song.albumName ?? "",
    artwork: song.image ?? undefined,
    preview: "",
    duration: String(song.duration ?? 0),
    year: song.createdAt ? String(new Date(song.createdAt).getFullYear()) : "",
    genre: "",
    type: "song",
  };
}

export function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
