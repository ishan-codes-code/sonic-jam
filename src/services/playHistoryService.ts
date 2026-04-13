import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Song } from '@/src/playbackCore/types';

const HISTORY_KEY = '@sonic_play_history_';
const MAX_HISTORY = 10;

export type HistoryEntry = {
    song: Song;
    playedAt: number; // Unix timestamp ms
};

/**
 * Play History Service
 *
 * Persists the user's play history in AsyncStorage.
 * - Stores the full Song object for offline display.
 * - Maintains most-recent-first order.
 * - Deduplicates: replaying a song moves it to the top with a new timestamp.
 * - Caps at 10 entries as requested.
 */
export const PlayHistoryService = {
    /**
     * Record a song being played. If it already exists in history,
     * it gets moved to the top (most recent).
     */
    async addToHistory(song: Song): Promise<void> {
        try {
            const history = await this.getHistory();

            // Remove existing entry for this song (dedup by song.id)
            const filtered = history.filter(entry => entry.song.id !== song.id);

            // Prepend as the most recent
            const newEntry: HistoryEntry = {
                song,
                playedAt: Date.now(),
            };

            const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY);
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('[PlayHistoryService] Failed to add to history:', error);
        }
    },

    /**
     * Get the full play history, most recent first.
     */
    async getHistory(): Promise<HistoryEntry[]> {
        try {
            const raw = await AsyncStorage.getItem(HISTORY_KEY);
            if (!raw) return [];
            return JSON.parse(raw) as HistoryEntry[];
        } catch (error) {
            console.error('[PlayHistoryService] Failed to read history:', error);
            return [];
        }
    },

    /**
     * Clear all play history.
     */
    async clearHistory(): Promise<void> {
        try {
            await AsyncStorage.removeItem(HISTORY_KEY);
        } catch (error) {
            console.error('[PlayHistoryService] Failed to clear history:', error);
        }
    },
};
