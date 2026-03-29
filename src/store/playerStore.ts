import { create } from 'zustand';
import { Song, musicApi } from '../api/musicApi';
import { YouTubeVideo, fetchVideoDetails } from '../services/youtube';
import { createAudioPlayer, AudioPlayer, AudioStatus } from 'expo-audio';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------
export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface PlayerState {
  currentSong: Song | null;
  /** Track currently being played from YouTube (no library dependency) */
  currentVideo: YouTubeVideo | null;
  status: PlayerStatus;
  progress: number;
  duration: number;
  streamUrl: string | null;
  lastFetchTime: number;
  error: string | null;
  isPlayPending: boolean;

  player: AudioPlayer | null;

  // Actions
  playSong: (song: Song) => Promise<void>;
  playFromYouTube: (video: YouTubeVideo) => Promise<void>;
  togglePlayback: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  stop: () => Promise<void>;
}

// --------------------------------------------------------------------------
// Store
// --------------------------------------------------------------------------
export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  currentVideo: null,
  status: 'idle',
  progress: 0,
  duration: 0,
  streamUrl: null,
  lastFetchTime: 0,
  error: null,
  isPlayPending: false,
  player: null,

  // ── Play from Library Song object (existing flow) ────────────────────────
  playSong: async (song: Song) => {
    const state = get();
    if (state.player) {
      try { 
        state.player.pause(); 
        state.player.remove(); 
      } catch (err) {
        console.warn('Error cleanup player', err);
      }
    }

    set({
      currentSong: song,
      currentVideo: null,
      status: 'loading',
      progress: 0,
      duration: song.duration * 1000,
      error: null,
      player: null,
      streamUrl: null,
    });

    try {
      const { streamUrl } = await musicApi.getStreamUrl(song.songId);

      if (get().currentSong?.songId !== song.songId) return;

      set({ streamUrl, lastFetchTime: Date.now() });

      const player = createAudioPlayer(streamUrl);
      player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (get().currentSong?.songId !== song.songId) {
          try { player.remove(); } catch {}
          return;
        }
        set({
          progress: status.currentTime * 1000,
          duration: typeof status.duration === 'number' ? status.duration * 1000 : song.duration * 1000,
          status: status.playing ? 'playing' : (status.didJustFinish ? 'idle' : 'paused'),
        });
        if (status.didJustFinish) get().stop();
      });

      player.play();
      set({ player, status: 'playing' });
    } catch (err: any) {
      console.error('[playerStore] playSong error detailing:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        stack: err.stack,
      });
      if (get().currentSong?.songId === song.songId) {
        let errorMessage = 'Failed to start playback';
        if (err.response?.status === 403) {
          errorMessage = 'Access Denied: You must add this song to your library first.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        set({ status: 'error', error: errorMessage });
      }
    }
  },

  // ── Play directly from YouTube video (no library) ────────────────────────
  playFromYouTube: async (video: YouTubeVideo) => {
    const state = get();

    // Guard against rapid double-taps
    if (state.isPlayPending) return;

    // Cleanup previous player
    if (state.player) {
      try { 
        state.player.pause(); 
        state.player.remove(); 
      } catch (err) {
        console.warn('Error cleanup player', err);
      }
    }

    set({
      isPlayPending: true,
      status: 'loading',
      progress: 0,
      error: null,
      player: null,
      currentVideo: video,
      currentSong: null,
      streamUrl: null,
    });

    try {
      // Resolve duration if not already available (search results lack it)
      let duration = video.duration;
      if (!duration) {
        const details = await fetchVideoDetails(video.videoId);
        duration = details?.duration ?? 180;
      }

      // POST /songs/play → returns streamUrl
      const { streamUrl } = await musicApi.play({
        youtubeId: video.videoId,
        title: video.title,
        duration: duration ?? 180,
      });

      // Concurrency check — user may have tapped another song
      if (get().currentVideo?.videoId !== video.videoId) return;

      set({ streamUrl, lastFetchTime: Date.now() });

      const player = createAudioPlayer(streamUrl);
      player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (get().currentVideo?.videoId !== video.videoId) {
          try { player.remove(); } catch {}
          return;
        }
        set({
          progress: status.currentTime * 1000,
          duration: typeof status.duration === 'number' ? status.duration * 1000 : (duration ?? 180) * 1000,
          status: status.playing ? 'playing' : (status.didJustFinish ? 'idle' : 'paused'),
        });
        if (status.didJustFinish) get().stop();
      });

      player.play();
      set({ player, status: 'playing', isPlayPending: false });
    } catch (err: any) {
      console.error('[playerStore] playFromYouTube error detailing:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        stack: err.stack,
      });
      if (get().currentVideo?.videoId === video.videoId) {
        set({ status: 'error', error: err?.message ?? 'Playback failed', isPlayPending: false });
      }
    }
  },

  // ── Toggle play/pause ────────────────────────────────────────────────────
  togglePlayback: async () => {
    const { player, status, lastFetchTime, currentSong, currentVideo } = get();
    if (!player || (!currentSong && !currentVideo)) return;

    try {
      if (status === 'playing') {
        player.pause();
        set({ status: 'paused' });
      } else if (status === 'paused') {
        const isExpired = Date.now() - lastFetchTime > 270_000; // 4.5 min

        if (isExpired && currentSong) {
          await get().playSong(currentSong);
        } else if (isExpired && currentVideo) {
          await get().playFromYouTube(currentVideo);
        } else {
          player.play();
          set({ status: 'playing' });
        }
      }
    } catch (err: any) {
      console.error('[playerStore] togglePlayback error detailing:', {
        message: err.message,
        stack: err.stack,
      });
      if (currentSong) await get().playSong(currentSong);
      else if (currentVideo) await get().playFromYouTube(currentVideo);
    }
  },

  seek: async (positionMillis: number) => {
    const { player } = get();
    if (player) {
      player.seekTo(positionMillis / 1000);
      set({ progress: positionMillis });
    }
  },

  stop: async () => {
    const { player } = get();
    if (player) {
      try { 
        player.pause();
        player.remove(); 
      } catch (err) {
        console.warn('Error cleanup player during stop', err);
      }
    }
    set({
      player: null,
      currentSong: null,
      currentVideo: null,
      status: 'idle',
      progress: 0,
      duration: 0,
      streamUrl: null,
      isPlayPending: false,
    });
  },
}));
