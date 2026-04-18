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

    setQueueType: (queueType) => set((state) => (
        state.queueType === queueType ? state : { queueType }
    )),

    setPlaylistMeta: (playlistMeta) => set((state) => (
        state.playlistMeta?.playlistId === playlistMeta.playlistId &&
        state.playlistMeta?.total === playlistMeta.total
            ? state
            : { playlistMeta }
    )),

    clearPlaylistMeta: () => set((state) => (
        state.playlistMeta === null ? state : { playlistMeta: null }
    )),

    setShuffling: (isShuffling) => set((state) => (
        state.isShuffling === isShuffling ? state : { isShuffling }
    )),

    setOriginalQueue: (originalQueue) => set({ originalQueue }),

    setStatus: (status) => set((state) => (
        state.status === status && state.error === null
            ? state
            : { status, error: null }
    )),

    setError: (error) => set((state) => (
        state.error === error && state.status === 'error'
            ? state
            : { error, status: 'error' }
    )),

    setCurrentSong: (song, track) => set({
        currentSong: song,
        currentTrack: track,
    }),

    clearCurrentSong: () => set((state) => (
        state.currentSong === null && state.currentTrack === null
            ? state
            : {
                currentSong: null,
                currentTrack: null,
            }
    )),

    setStream: (streamUrl, streamUrlExpiresAt) => set({
        streamUrl,
        streamUrlExpiresAt,
    }),

    clearStream: () => set((state) => (
        state.streamUrl === null && state.streamUrlExpiresAt === null
            ? state
            : {
                streamUrl: null,
                streamUrlExpiresAt: null,
            }
    )),

    setPosition: (position) => set((state) => (
        state.position === position ? state : { position }
    )),

    setDuration: (duration) => set((state) => (
        state.duration === duration ? state : { duration }
    )),

    setManualInsertIndex: (manualInsertIndex) => set((state) => (
        state.manualInsertIndex === manualInsertIndex ? state : { manualInsertIndex }
    )),

    notifyQueueUpdate: () => set((state) => ({ queueRevision: state.queueRevision + 1 })),

    setPendingJobId: (pendingJobId) => set((state) => (
        state.pendingJobId === pendingJobId ? state : { pendingJobId }
    )),

    setTrackColors: (trackColors) => set({ trackColors }),

    reset: () => set(initialState),
}));
