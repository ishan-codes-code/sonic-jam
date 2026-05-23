import type { MediaItem } from "@rntp/player";
import { RecommendationTrack } from "../api/recommendationApi";
import type { CleanedSearchResult } from "@/features/search";

// ─────────────────────────────────────────
// Backend Types (mirror your backend exactly)
// ─────────────────────────────────────────

export interface Artist {
  id: string;
  name: string;
}

export type Song = {
  id: string;
  trackName: string;
  albumName?: string | null;
  duration: number;
  image: string;
  externalId?: string | null;
  lastfmId?: string | null;
  youtubeId: string;
  artists: Artist[];
  createdAt: Date;
  streamUrl: string;
};

// type PlaySongMetadata = {
//   trackName: string;
//   artistName: string;
//   image?: string | null;
//   externalId?: string;
//   lastfmId?: string;
//   duration?: number;
// };

type BaseMetadata = {
  trackName: string;
  artistName: string;
  duration?: number;
};

export type PlaySongMetadata =
  | (BaseMetadata & {
      externalId: string;
      image?: string | null;
      lastfmId?: string;
    })
  | (BaseMetadata & {
      lastfmId: string;
      externalId?: undefined;
      image?: string | null;
    });

export type PlaySongDto = { songId: string } | PlaySongMetadata;

export type PlayResponseDto =
  | { type: "ready"; song: Song; playbackToken: string }
  | { type: "job"; jobId: string };

// ─────────────────────────────────────────
// RNTP Types
// ─────────────────────────────────────────

export type TrackSource =
  | "play"
  | "playNext"
  | "addToQueue"
  | "enqueue"
  | "playlist";

// Extends RNTP's Track so the player always has your Song attached
export type PlaybackTrack = MediaItem & {
  song: Song; // full Song object, always accessible from queue
  isManualAdd?: boolean;
  source?: TrackSource;
  mimeType?: string;
};

// ─────────────────────────────────────────
// Zustand Store State
// ─────────────────────────────────────────

export type PlaybackStatus =
  | "idle" // nothing loaded
  | "loading" // API call in flight
  | "playing"
  | "paused"
  | "stopped"
  | "error";

export type TrackColors = {
  primary: string;
  secondary: string;
};

export type ExtendedRepeatMode = "off" | "queue" | "track" | "once";

export type QueueType = "playlist" | "radio" | "manual";

export type SleepTimer = {
  type: "time" | "track";
  seconds?: number; // Original duration in seconds selected by user
  remainingSeconds?: number; // Native active remaining seconds
} | null;

export type PlaybackState = {
  // Mode
  queueType: QueueType;
  playlistMeta: {
    playlistId: string;
    total: number;
  } | null;

  // Queue Pointer for "Add to Queue"
  manualInsertIndex: number | null;
  queueRevision: number;

  // Current song
  currentSong: Song | null;
  currentTrack: PlaybackTrack | null;

  // Player state
  status: PlaybackStatus;
  position: number; // seconds
  duration: number; // seconds
  error: string | null;

  // Future: job polling support
  pendingJobId: string | null;

  // Stream state (direct playable URL returned on Song)
  streamUrl: string | null;

  // Dynamic gradient colors extracted from artwork
  trackColors: TrackColors | null;

  // Repeat mode
  repeatMode: ExtendedRepeatMode;
  repeatOnceUsed: boolean; // Tracking if the "once" repeat has been triggered for the current track

  // Shuffle
  shuffleEnabled: boolean;

  // Sleep Timer
  sleepTimer: SleepTimer;

  // Map to keep track of full PlaybackTrack objects
  trackMap: Record<string, PlaybackTrack>;
};

export type ResolvedStream = {
  song: Song;
  playbackToken: string;
};

export type PlayJobResponse = {
  status: string;
  retryAfter?: number;
  song?: Song;
  playbackToken?: string;
  progress?: number;
  message?: string;
};

export type SmartQueueStatus = "enriching" | "resolving" | "ready" | "failed";

export type SmartQueueTrack = {
  id: string;
  recommendation: RecommendationTrack;
  status: SmartQueueStatus;
  song: Song | null;
  playbackToken?: string;
  enrichedTrack?: CleanedSearchResult | null;
  jobId: string | null;
  mediaId: string | null;
};
