import { useEffect, useState } from 'react';
import { useDebounce } from '../../../hooks/useDebounce';
import { searchTracks, SearchTrack } from '../../../services/searchService';
import { recentSongsStorage, RecentSong } from '../../../utils/recentSongsStorage';

export const useSearchLogic = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSongs, setRecentSongs] = useState<RecentSong[]>([]);

  const debouncedQuery = useDebounce(query, 450);
  const showRecentSongs = query.trim().length === 0;

  // Load recents on mount
  useEffect(() => {
    recentSongsStorage.get().then(setRecentSongs);
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const runSearch = async () => {
      setIsLoading(true);
      try {
        const response = await searchTracks(debouncedQuery);
        if (!isCancelled) {
          setResults(response);
        }
      } catch {
        if (!isCancelled) {
          setResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void runSearch();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  const clearQuery = () => {
    setQuery('');
  };

  const addToRecent = async (song: RecentSong) => {
    // Prevent duplicates: match by database ID or YouTube ID
    const filtered = recentSongs.filter(s => 
      s.id !== song.id && 
      s.youtubeId !== song.youtubeId
    );
    const updated = [song, ...filtered].slice(0, 50); // Keep last 50
    setRecentSongs(updated);
    await recentSongsStorage.set(updated);
  };

  const removeRecentSong = async (id: string) => {
    const updated = recentSongs.filter(s => s.id !== id);
    setRecentSongs(updated);
    await recentSongsStorage.set(updated);
  };

  return {
    query,
    setQuery,
    results,
    recentSongs,
    showRecentSongs,
    isLoading,
    debouncedQuery,
    clearQuery,
    addToRecent,
    removeRecentSong,
  };
};
