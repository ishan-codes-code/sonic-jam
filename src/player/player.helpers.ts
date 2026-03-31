import { AudioPlayer } from "expo-audio";
import { Song } from "../api/musicApi";
import { YouTubeVideo } from "../services/youtube";
import { Track } from "./player.types";

export const isProcessingJobStatus = (status: string) =>
  status === "waiting" || status === "active" || status === "delayed";

export const isCompletedJobStatus = (status: string) => status === "completed";

export const isFailedJobStatus = (status: string) => status === "failed";

export const safelyRemovePlayer = (player: AudioPlayer | null) => {
  if (!player) return;

  try {
    player.pause();
    player.remove();
  } catch (err) {
    console.warn("Error cleanup player", err);
  }
};

export const createTrackFromSong = (song: Song): Track => ({
  id: song.songId,
  title: song.title,
  youtubeId: song.youtubeId,
  //   songId: song.songId,
  duration: song.duration,
});

export const createTrackFromVideo = (video: YouTubeVideo): Track => ({
  id: video.videoId,
  title: video.title,
  youtubeId: video.videoId,
  duration: video.duration,
});
