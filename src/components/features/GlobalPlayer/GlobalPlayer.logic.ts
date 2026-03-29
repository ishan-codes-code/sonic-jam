import * as Haptics from 'expo-haptics';
import { usePathname, useRouter } from 'expo-router';
import { usePlayerStore } from '../../../store/playerStore';

export const useGlobalPlayerLogic = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentSong, currentVideo, status, progress, duration, togglePlayback } = usePlayerStore();

  const displayTitle = currentSong?.title ?? currentVideo?.title ?? '';
  const displayYoutubeId = currentSong?.youtubeId ?? currentVideo?.videoId ?? '';
  const isVisible = (currentSong || currentVideo) && status !== 'idle' && pathname !== '/player';

  const handleToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await togglePlayback();
  };

  const openFullPlayer = () => {
    router.push('/player');
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return {
    displayTitle,
    displayYoutubeId,
    isVisible,
    status,
    progressPercent,
    handleToggle,
    openFullPlayer,
  };
};
