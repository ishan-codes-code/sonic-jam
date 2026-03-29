import { useMusic } from '../../../hooks/useMusic';
import { usePlayerStore } from '../../../store/playerStore';

export const useLibraryLogic = () => {
  const { library, isLoadingLibrary, libraryError } = useMusic();
  const { playSong, currentSong, status } = usePlayerStore();

  const handlePlay = (song: any) => {
    playSong(song);
  };

  return {
    library,
    isLoadingLibrary,
    libraryError,
    currentSong,
    status,
    handlePlay,
  };
};
