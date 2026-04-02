/**
 * YouTube Data API v3 — Service Layer
 * All data fetching for the Explore screen goes through here.
 */

const API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? "";
const BASE_URL = "https://www.googleapis.com/youtube/v3";

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  viewCount?: string;
  publishedAt?: string;
  duration: number; // In seconds
}

export interface YouTubeResponse {
  items: YouTubeVideo[];
  nextPageToken?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUrl(endpoint: string, params: Record<string, string>): string {
  const query = new URLSearchParams({ ...params, key: API_KEY }).toString();
  return `${BASE_URL}/${endpoint}?${query}`;
}

export const getThumbnailUrl = (youtubeId?: string) =>
  youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : undefined;

function parseSearchItems(items: any[]): YouTubeVideo[] {
  return items
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet?.title ?? "",
      channelTitle: item.snippet?.channelTitle ?? "",
      duration: 0, // Duration is not available in search results; will fetch details later
      thumbnail:
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url ??
        "",
      publishedAt: item.snippet?.publishedAt ?? "",
    }));
}

function parseVideoItems(items: any[]): YouTubeVideo[] {
  return items
    .filter((item) => item.id)
    .map((item) => ({
      videoId: typeof item.id === "string" ? item.id : (item.id?.videoId ?? ""),
      title: item.snippet?.title ?? "",
      channelTitle: item.snippet?.channelTitle ?? "",
      thumbnail:
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url ??
        "",
      viewCount: item.statistics?.viewCount,
      publishedAt: item.snippet?.publishedAt ?? "",
      duration: parseDuration(item.contentDetails.duration),
    }));
}

function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1]?.slice(0, -1) ?? "0", 10);
  const minutes = parseInt(match[2]?.slice(0, -1) ?? "0", 10);
  const seconds = parseInt(match[3]?.slice(0, -1) ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatViewCount(count?: string): string {
  if (!count) return "";
  const n = parseInt(count, 10);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export { formatDuration, formatViewCount };

// ─── API Calls ────────────────────────────────────────────────────────────────

/** Search music videos by query. */
export async function searchVideos(
  query: string,
  pageToken?: string,
): Promise<YouTubeResponse> {
  const params: Record<string, string> = {
    part: "snippet",
    q: query,
    type: "video",
    videoCategoryId: "10",
    regionCode: "IN",
    maxResults: "20",
  };
  if (pageToken) params.pageToken = pageToken;

  const res = await fetch(buildUrl("search", params));
  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`);
  const data = await res.json();

  return {
    items: parseSearchItems(data.items ?? []),
    nextPageToken: data.nextPageToken,
  };
}

/** Fetch trending music videos (popular + music category) with duration. */
export async function fetchTrendingVideos(
  pageToken?: string,
): Promise<YouTubeResponse> {
  const params: Record<string, string> = {
    part: "snippet,statistics,contentDetails",
    chart: "mostPopular",
    videoCategoryId: "10",
    regionCode: "IN",
    maxResults: "20",
  };
  if (pageToken) params.pageToken = pageToken;

  const res = await fetch(buildUrl("videos", params));
  if (!res.ok) throw new Error(`YouTube trending failed: ${res.status}`);
  const data = await res.json();

  return {
    items: parseVideoItems(data.items ?? []),
    nextPageToken: data.nextPageToken,
  };
}

/** Fetch video details by list of IDs. */
export async function fetchVideosBatchDetails(
  videoIds: string[],
): Promise<YouTubeVideo[]> {
  if (!videoIds.length) return [];
  const params: Record<string, string> = {
    part: "snippet,statistics,contentDetails",
    id: videoIds.join(","),
  };

  const res = await fetch(buildUrl("videos", params));
  if (!res.ok) throw new Error(`YouTube batch details failed: ${res.status}`);
  const data = await res.json();
  return parseVideoItems(data.items ?? []);
}

/** Fetch video details by ID (including duration). */
export async function fetchVideoDetails(
  videoId: string,
): Promise<YouTubeVideo | null> {
  const params: Record<string, string> = {
    part: "snippet,statistics,contentDetails",
    id: videoId,
  };

  const res = await fetch(buildUrl("videos", params));
  if (!res.ok) throw new Error(`YouTube details failed: ${res.status}`);
  const data = await res.json();

  if (!data.items?.length) return null;
  return parseVideoItems(data.items)[0];
}

/** Fetch videos for a specific genre. */
export async function fetchGenreVideos(
  genre: string,
): Promise<YouTubeResponse> {
  return searchVideos(`${genre} music`);
}

/**
 * Search videos with regionCode=IN — used for user-added dynamic sections.
 */
export async function searchVideosIN(
  query: string,
  pageToken?: string,
): Promise<YouTubeResponse> {
  const params: Record<string, string> = {
    part: "snippet",
    q: query,
    type: "video",
    videoCategoryId: "10",
    regionCode: "IN",
    maxResults: "20",
  };
  if (pageToken) params.pageToken = pageToken;

  const res = await fetch(buildUrl("search", params));
  if (!res.ok) throw new Error(`YouTube search (IN) failed: ${res.status}`);
  const data = await res.json();

  return {
    items: parseSearchItems(data.items ?? []),
    nextPageToken: data.nextPageToken,
  };
}

/** Extract playlistId from a YouTube playlist URL. Returns null if not a valid playlist URL. */
export function extractPlaylistId(url: string): string | null {
  try {
    const u = new URL(url);
    const listParam = u.searchParams.get("list");
    if (listParam) return listParam;
  } catch {
    // not a URL
  }
  // handle bare PL... IDs
  if (/^PL[A-Za-z0-9_-]{10,}$/.test(url.trim())) return url.trim();
  return null;
}

/** Fetch videos from a YouTube playlist (regionCode=IN). */
export async function fetchPlaylistItems(
  playlistId: string,
  pageToken?: string,
): Promise<YouTubeResponse> {
  const params: Record<string, string> = {
    part: "snippet",
    playlistId,
    regionCode: "IN",
    maxResults: "20",
  };
  if (pageToken) params.pageToken = pageToken;

  const res = await fetch(buildUrl("playlistItems", params));
  if (!res.ok) throw new Error(`YouTube playlist failed: ${res.status}`);
  const data = await res.json();

  const items: YouTubeVideo[] = (data.items ?? [])
    .map((item: any) => ({
      videoId: item.snippet?.resourceId?.videoId ?? "",
      title: item.snippet?.title ?? "",
      channelTitle:
        item.snippet?.videoOwnerChannelTitle ??
        item.snippet?.channelTitle ??
        "",
      thumbnail:
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url ??
        "",
      publishedAt: item.snippet?.publishedAt ?? "",
    }))
    .filter((v: YouTubeVideo) => v.videoId);

  return {
    items,
    nextPageToken: data.nextPageToken,
  };
}
