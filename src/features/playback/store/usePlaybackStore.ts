import { create } from "zustand";
import type {
  QueueType,
  PlaybackState,
  PlaybackStatus,
  PlaybackTrack,
  Song,
  TrackColors,
  ExtendedRepeatMode,
  SleepTimer,
} from "../types";

type PlaybackActions = {
  // Mode
  setQueueType: (type: QueueType) => void;
  setPlaylistMeta: (meta: { playlistId: string; total: number }) => void;
  clearPlaylistMeta: () => void;

  // Status
  setStatus: (status: PlaybackStatus) => void;
  setError: (error: string | null) => void;

  // Current song & track
  setCurrentSong: (song: Song, track: PlaybackTrack) => void;
  setOptimisticSong: (
    song: Partial<Song> & { id: string; trackName: string },
  ) => void;
  clearCurrentSong: () => void;

  // Stream
  setStream: (streamUrl: string) => void;
  clearStream: () => void;

  // Progress
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;

  // Queue Pointer
  setManualInsertIndex: (index: number | null) => void;
  notifyQueueUpdate: () => void;

  // Future: job support
  setPendingJobId: (jobId: string | null) => void;

  // Track colors for dynamic gradient
  setTrackColors: (colors: TrackColors | null) => void;

  // Repeat
  setRepeatMode: (mode: ExtendedRepeatMode) => void;
  setRepeatOnceUsed: (used: boolean) => void;

  // Shuffle
  setShuffleEnabled: (enabled: boolean) => void;

  // Sleep Timer
  setSleepTimer: (timer: SleepTimer) => void;

  // Reset everything
  reset: () => void;

  // Map to keep track of full PlaybackTrack objects (since RNTP strips custom properties)
  addTrackToMap: (track: PlaybackTrack) => void;
};

const initialState: PlaybackState = {
  queueType: "manual",
  playlistMeta: null,
  manualInsertIndex: null,
  queueRevision: 0,
  currentSong: null,
  currentTrack: null,
  status: "idle",
  position: 0,
  duration: 0,
  error: null,
  streamUrl: null,
  pendingJobId: null,
  trackColors: null,
  repeatMode: "off",
  repeatOnceUsed: false,
  shuffleEnabled: false,
  sleepTimer: null,
  trackMap: {},
};

export const usePlaybackStore = create<PlaybackState & PlaybackActions>(
  (set) => ({
    ...initialState,

    setQueueType: (queueType) =>
      set((state) => (state.queueType === queueType ? state : { queueType })),

    setPlaylistMeta: (playlistMeta) =>
      set((state) =>
        state.playlistMeta?.playlistId === playlistMeta.playlistId &&
        state.playlistMeta?.total === playlistMeta.total
          ? state
          : { playlistMeta },
      ),

    clearPlaylistMeta: () =>
      set((state) =>
        state.playlistMeta === null ? state : { playlistMeta: null },
      ),

    setStatus: (status) =>
      set((state) =>
        state.status === status && state.error === null
          ? state
          : { status, error: null },
      ),

    setError: (error) =>
      set((state) =>
        state.error === error && state.status === "error"
          ? state
          : { error, status: "error" },
      ),

    setCurrentSong: (song, track) =>
      set({
        currentSong: song,
        currentTrack: track,
      }),

    setOptimisticSong: (song) =>
      set({
        currentSong: song as Song,
        currentTrack: null,
        status: "loading",
        error: null,
      }),

    clearCurrentSong: () =>
      set((state) =>
        state.currentSong === null && state.currentTrack === null
          ? state
          : {
              currentSong: null,
              currentTrack: null,
            },
      ),

    setStream: (streamUrl: string) =>
      set({
        streamUrl,
      }),

    clearStream: () =>
      set((state) => (state.streamUrl === null ? state : { streamUrl: null })),

    setPosition: (position) =>
      set((state) => (state.position === position ? state : { position })),

    setDuration: (duration) =>
      set((state) => (state.duration === duration ? state : { duration })),

    setManualInsertIndex: (manualInsertIndex) =>
      set((state) =>
        state.manualInsertIndex === manualInsertIndex
          ? state
          : { manualInsertIndex },
      ),

    notifyQueueUpdate: () =>
      set((state) => ({ queueRevision: state.queueRevision + 1 })),

    setPendingJobId: (pendingJobId) =>
      set((state) =>
        state.pendingJobId === pendingJobId ? state : { pendingJobId },
      ),

    setTrackColors: (trackColors) => set({ trackColors }),

    addTrackToMap: (track) =>
      set((state) => {
        if (!track.mediaId) return state;
        return {
          trackMap: {
            ...state.trackMap,
            [track.mediaId]: track,
          },
        };
      }),

    setRepeatMode: (repeatMode) => set({ repeatMode }),
    setRepeatOnceUsed: (repeatOnceUsed) => set({ repeatOnceUsed }),
    setShuffleEnabled: (shuffleEnabled) =>
      set((state) =>
        state.shuffleEnabled === shuffleEnabled ? state : { shuffleEnabled },
      ),
    setSleepTimer: (sleepTimer) => set({ sleepTimer }),
    reset: () => set(initialState),
  }),
);
