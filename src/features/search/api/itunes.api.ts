import { CleanedSearchResult, ItunesSongResult } from "../types";
import {
  formatDuration,
  upgradeArtwork,
  extractYear,
} from "../utils/itunesHelpers";

const ITUNES_BASE_URL = "https://itunes.apple.com/search";

export const searchItunes = async (
  query: string,
  signal?: AbortSignal,
): Promise<CleanedSearchResult[]> => {
  if (!query.trim()) return [];

  const response = await fetch(
    `${ITUNES_BASE_URL}?term=${encodeURIComponent(query)}&media=music&entity=song&country=in&limit=20`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch from iTunes API");
  }

  const data = await response.json();

  return data.results.map((item: ItunesSongResult) => ({
    id: item.trackId.toString(),
    title: item.trackName,
    artist: item.artistName,
    album: item.collectionName,
    artwork: upgradeArtwork(item.artworkUrl100),
    preview: item.previewUrl,
    duration: formatDuration(item.trackTimeMillis),
    year: extractYear(item.releaseDate),
    genre: item.primaryGenreName,
    type: "song",
  }));
};
