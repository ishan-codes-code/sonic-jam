import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CleanedSearchResult } from '@/features/search/types';

const RECENT_SONGS_KEY = '@sonic_recent_songs';
const MAX_RECENT_SONGS = 20; // can be adjusted via user settings

type UseRecentSongsReturn = {
  recentSongs: CleanedSearchResult[];
  addSong: (song: CleanedSearchResult) => Promise<void>;
  removeSong: (id: string) => Promise<void>;
  clearRecent: () => Promise<void>;
};

export function useRecentSongs(): UseRecentSongsReturn {
  const [recentSongs, setRecentSongs] = useState<CleanedSearchResult[]>([]);

  // Load persisted recent songs on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_SONGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CleanedSearchResult[];
          setRecentSongs(parsed);
        }
      } catch (e) {
        console.error('Failed to load recent songs', e);
      }
    })();
  }, []);

  const persist = useCallback(async (songs: CleanedSearchResult[]) => {
    try {
      await AsyncStorage.setItem(RECENT_SONGS_KEY, JSON.stringify(songs));
    } catch (e) {
      console.error('Failed to persist recent songs', e);
    }
  }, []);

  const addSong = useCallback(async (song: CleanedSearchResult) => {
    setRecentSongs(prev => {
      const filtered = prev.filter(item => item.id !== song.id);
      const updated = [song, ...filtered].slice(0, MAX_RECENT_SONGS);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const removeSong = useCallback(async (id: string) => {
    setRecentSongs(prev => {
      const updated = prev.filter(item => item.id !== id);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const clearRecent = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SONGS_KEY);
    } catch (e) {
      console.error('Failed to clear recent songs', e);
    }
    setRecentSongs([]);
  }, []);

  return { recentSongs, addSong, removeSong, clearRecent };
}
