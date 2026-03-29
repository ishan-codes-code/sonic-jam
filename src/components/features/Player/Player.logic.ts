import { useRouter } from 'expo-router';
import { usePlayerStore } from '../../../store/playerStore';

export const usePlayerLogic = () => {
  const router = useRouter();
  const { currentSong, currentVideo, status, error, progress, duration, togglePlayback, seek } = usePlayerStore();

  const activeItem = currentSong || currentVideo;

  const formatTime = (millis: number) => {
    const totalSeconds = millis / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const youtubeId = currentSong?.youtubeId || currentVideo?.videoId;
  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

  return {
    router,
    activeItem,
    status,
    error,
    progress,
    duration,
    togglePlayback,
    seek,
    formatTime,
    youtubeId,
    thumbnailUrl,
  };
};
