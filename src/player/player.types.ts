import { AudioPlayer } from "expo-audio";
import { Song } from "../api/musicApi";
import { YouTubeVideo } from "../services/youtube";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type SongJob = {
  jobId: string;
  title: string;
  youtubeId: string;
  status: string;
  progress: number;
  duration: number;
  createdAt: number;
};

export type InternalJob = {
  jobId: string;
  video: YouTubeVideo;
  duration: number;
  status: string;
  progress: number;
  streamUrl?: string;
  createdAt: number;
};

export type Track = {
  id: string;
  title: string;
  youtubeId: string;
  duration: number;
};

export type SongPayload = {
  youtubeId: string;
  title: string;
  duration: number;
};

export interface PlayerState {
  currentSong: Song | null;
  currentVideo: YouTubeVideo | null;
  status: PlayerStatus;
  progress: number;
  duration: number;
  streamUrl: string | null;
  lastFetchTime: number;
  error: string | null;
  isPlayPending: boolean;
  player: AudioPlayer | null;
  songJobs: SongJob[];
  pendingTrack: Track | null;
  toast: {
    title: string;
    subtitle?: string;
    action?: { label: string; onPress: () => void };
  } | null;

  queue: Track[];
  currentIndex: number;

  isTransitioning: boolean;

  setQueue: (tracks: Track[], startIndex?: number) => void;
  next: () => Promise<void>;
  prev: () => Promise<void>;

  playSong: (song: Song) => Promise<void>;
  playFromYouTube: (video: YouTubeVideo) => Promise<void>;
  togglePlayback: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  stop: () => Promise<void>;
  dismissSongJob: (jobId: string) => void;
  cleanupSongJobs: () => void;
  playCompletedJob: (jobId: string) => void;
  showToast: (data: {
    title: string;
    subtitle?: string;
    action?: { label: string; onPress: () => void };
  }) => void;

  // Helper selectors
  getJobsByStatus: (status: string) => SongJob[];
  getProcessingJobs: () => SongJob[];
  getFailedJobs: () => SongJob[];
  getCompletedJobs: () => SongJob[];
}
