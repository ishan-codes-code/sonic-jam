import type { Track } from 'react-native-track-player';

// ─────────────────────────────────────────
// Backend Types (mirror your backend exactly)
// ─────────────────────────────────────────

export type Song = {
    duration: number;
    id: string;
    youtubeId: string;
    r2Key: string;
    trackName: string;
    artistName: string;
    albumName: string | null;
    image: string | null;
    lastfmId: string | null;
    normalizedTrackName: string;
    normalizedArtistName: string;
    youtubeTitle: string | null;
    createdAt: Date;
};

export type PlaySongDto =
    | { songId: string }
    | { trackName: string; artistName: string; duration?: number };

export type PlayResponseDto =
    | { type: 'ready'; streamUrl: string; song: Song }
    | { type: 'job'; jobId: string };  // future use

// ─────────────────────────────────────────
// RNTP Types
// ─────────────────────────────────────────

// Extends RNTP's Track so the player always has your Song attached
export type PlaybackTrack = Track & {
    songId: string;       // = song.id, used to detect "is this already playing?"
    song: Song;           // full Song object, always accessible from queue
};

// ─────────────────────────────────────────
// Zustand Store State
// ─────────────────────────────────────────

export type PlaybackStatus =
    | 'idle'        // nothing loaded
    | 'loading'     // API call in flight
    | 'playing'
    | 'paused'
    | 'stopped'
    | 'error';

export type TrackColors = {
    primary: string;
    secondary: string;
};

export type QueueType = 'playlist' | 'radio' | 'manual';

export type PlaybackState = {
    // Mode
    queueType: QueueType;
    playlistMeta: {
        playlistId: string;
        total: number;
    } | null;

    // Shuffle
    isShuffling: boolean;
    originalQueue: PlaybackTrack[];

    // Queue Pointer for "Add to Queue"
    manualInsertIndex: number | null;
    queueRevision: number;

    // Current song
    currentSong: Song | null;
    currentTrack: PlaybackTrack | null;

    // Player state
    status: PlaybackStatus;
    position: number;       // seconds
    duration: number;       // seconds
    error: string | null;

    // Future: job polling support
    pendingJobId: string | null;

    // Stream expiry
    streamUrl: string | null;
    streamUrlExpiresAt: number | null;

    // Dynamic gradient colors extracted from artwork
    trackColors: TrackColors | null;
};


export type ResolvedStream = {
    streamUrl: string;
    streamUrlExpiresAt: number;   // Unix ms
    song: Song;
};


export type PlayJobResponse =
    | {
        status: "completed";
        progress: number;
        streamUrl: string;
        message?: string;
        song: Song;
    }
    | { status: string; progress?: number; message?: string; };



