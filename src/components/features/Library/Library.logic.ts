import { useMusic } from "../../../hooks/useMusic";
import { usePlayerStore } from "../../../store/playerStore";

export const useLibraryLogic = () => {
  const {
    allSongs,
    isLoadingAllSongs,
    libraryError,
    refetchAllSongs,
    isFetchingSongs,
  } = useMusic();
  const { playSong, currentSong, status } = usePlayerStore();

  const handlePlay = (song: any) => {
    playSong(song);
  };

  return {
    allSongs,
    isLoadingAllSongs,
    refetchAllSongs,
    isFetchingSongs,
    libraryError,
    currentSong,
    status,
    handlePlay,
  };
};
