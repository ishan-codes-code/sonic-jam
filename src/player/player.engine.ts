import { AudioStatus, createAudioPlayer } from "expo-audio";
import { Song } from "../api/musicApi";
import { YouTubeVideo } from "../services/youtube";
import { safelyRemovePlayer } from "./player.helpers";
import { Track } from "./player.types";

export const playVideoStream = async (
  get: () => any,
  set: (state: any) => void,
  video: YouTubeVideo,
  resolvedDuration: number,
  streamUrl: string,
) => {
  const state = get();
  safelyRemovePlayer(state.player);

  set({
    currentVideo: video,
    currentSong: null,
    status: "loading",
    progress: 0,
    duration: resolvedDuration * 1000,
    error: null,
    player: null,
    streamUrl: null,
  });

  set({ streamUrl, lastFetchTime: Date.now() });

  const player = createAudioPlayer(streamUrl);
  player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
    if (get().currentVideo?.videoId !== video.videoId) {
      try {
        player.remove();
      } catch {}
      return;
    }

    set({
      progress: status.currentTime * 1000,
      duration:
        typeof status.duration === "number"
          ? status.duration * 1000
          : resolvedDuration * 1000,
      status: status.playing
        ? "playing"
        : status.didJustFinish
          ? "idle"
          : "paused",
    });

    // if (status.didJustFinish) {
    //   get().stop();
    // }
    if (status.didJustFinish) {
      const { isTransitioning } = get();

      if (!isTransitioning) {
        get().next();
      }
    }
  });

  player.play();
  set({ player, status: "playing" });
};

export const playSongDirect = async (
  get: () => any,
  set: (state: any) => void,
  song: Song,
  streamUrl: string,
) => {
  const state = get();
  safelyRemovePlayer(state.player);

  set({
    currentSong: song,
    currentVideo: null,
    status: "loading",
    progress: 0,
    duration: song.duration * 1000,
    error: null,
    player: null,
    streamUrl: null,
  });

  set({ streamUrl, lastFetchTime: Date.now() });

  const player = createAudioPlayer(streamUrl);
  player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
    if (get().currentSong?.songId !== song.songId) {
      try {
        player.remove();
      } catch {}
      return;
    }

    set({
      progress: status.currentTime * 1000,
      duration:
        typeof status.duration === "number"
          ? status.duration * 1000
          : song.duration * 1000,
      status: status.playing
        ? "playing"
        : status.didJustFinish
          ? "idle"
          : "paused",
    });

    // if (status.didJustFinish) get().stop();
    if (status.didJustFinish) {
      const { isTransitioning } = get();

      if (!isTransitioning) {
        get().next();
      }
    }
  });

  player.play();
  set({ player, status: "playing" });
};

export const playTrack = async (
  get: () => any,
  set: (state: any) => void,
  track: Track,
  streamUrl: string,
) => {
  const video: YouTubeVideo = {
    videoId: track.youtubeId,
    title: track.title,
    channelTitle: "", // Default empty for pending tracks
    thumbnail: "", // Default empty for pending tracks
    duration: track.duration,
  };

  await playVideoStream(get, set, video, track.duration, streamUrl);
};
