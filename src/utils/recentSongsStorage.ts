import * as SecureStore from 'expo-secure-store';
import { Song } from '../playbackCore/types';

const RECENT_SONGS_KEY = 'sonic_recent_songs';

export interface RecentSong extends Partial<Song> {
  id: string;
  trackName?: string;
  artistName?: string;
  title?: string;   // Deprecated: used in older search results
  artist?: string;  // Deprecated: used in older search results
  image: string | null;
  youtubeId: string;
  duration?: number;
}

export const recentSongsStorage = {
  async get(): Promise<RecentSong[]> {
    try {
      const data = await SecureStore.getItemAsync(RECENT_SONGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading recent songs:', error);
      return [];
    }
  },

  async set(songs: RecentSong[]): Promise<void> {
    try {
      await SecureStore.setItemAsync(RECENT_SONGS_KEY, JSON.stringify(songs));
    } catch (error) {
      console.error('Error saving recent songs:', error);
    }
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(RECENT_SONGS_KEY);
  }
};
