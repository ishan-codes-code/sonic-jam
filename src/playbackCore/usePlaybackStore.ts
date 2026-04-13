import { create } from 'zustand';
import type { QueueType, PlaybackState, PlaybackStatus, PlaybackTrack, Song, TrackColors } from './types';

type PlaybackActions = {
    // Mode
    setQueueType: (type: QueueType) => void;
    setPlaylistMeta: (meta: { playlistId: string; total: number }) => void;
    clearPlaylistMeta: () => void;

    // Shuffle
    setShuffling: (isShuffling: boolean) => void;
    setOriginalQueue: (queue: PlaybackTrack[]) => void;

    // Status
    setStatus: (status: PlaybackStatus) => void;
    setError: (error: string | null) => void;

    // Current song & track
    setCurrentSong: (song: Song, track: PlaybackTrack) => void;
    clearCurrentSong: () => void;

    // Stream
    setStream: (streamUrl: string, streamUrlExpiresAt: number) => void;
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

    // Reset everything
    reset: () => void;
};

const initialState: PlaybackState = {
    queueType: 'manual',
    playlistMeta: null,
    isShuffling: false,
    originalQueue: [],
    manualInsertIndex: null,
    queueRevision: 0,
    currentSong: null,
    currentTrack: null,
    status: 'idle',
    position: 0,
    duration: 0,
    error: null,
    streamUrl: null,
    streamUrlExpiresAt: null,
    pendingJobId: null,
    trackColors: null,
};

export const usePlaybackStore = create<PlaybackState & PlaybackActions>((set) => ({
    ...initialState,

    setQueueType: (queueType) => set({ queueType }),

    setPlaylistMeta: (playlistMeta) => set({ playlistMeta }),

    clearPlaylistMeta: () => set({ playlistMeta: null }),

    setShuffling: (isShuffling) => set({ isShuffling }),

    setOriginalQueue: (originalQueue) => set({ originalQueue }),

    setStatus: (status) => set({ status, error: null }),

    setError: (error) => set({ error, status: 'error' }),

    setCurrentSong: (song, track) => set({
        currentSong: song,
        currentTrack: track,
    }),

    clearCurrentSong: () => set({
        currentSong: null,
        currentTrack: null,
    }),

    setStream: (streamUrl, streamUrlExpiresAt) => set({
        streamUrl,
        streamUrlExpiresAt,
    }),

    clearStream: () => set({
        streamUrl: null,
        streamUrlExpiresAt: null,
    }),

    setPosition: (position) => set({ position }),

    setDuration: (duration) => set({ duration }),

    setManualInsertIndex: (manualInsertIndex) => set({ manualInsertIndex }),

    notifyQueueUpdate: () => set((state) => ({ queueRevision: state.queueRevision + 1 })),

    setPendingJobId: (pendingJobId) => set({ pendingJobId }),

    setTrackColors: (trackColors) => set({ trackColors }),

    reset: () => set(initialState),
}));