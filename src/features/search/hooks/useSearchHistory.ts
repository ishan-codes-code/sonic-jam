import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = '@sonic_search_history';
const MAX_HISTORY_ITEMS = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load search history', err);
    }
  }, []);

  const addToHistory = useCallback(async (query: string) => {
    if (!query.trim()) return;

    try {
      const newHistory = [
        query.trim(),
        ...history.filter((item) => item.toLowerCase() !== query.trim().toLowerCase()),
      ].slice(0, MAX_HISTORY_ITEMS);

      setHistory(newHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (err) {
      console.error('Failed to save search history', err);
    }
  }, [history]);

  const removeFromHistory = useCallback(async (query: string) => {
    try {
      const newHistory = history.filter((item) => item !== query);
      setHistory(newHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (err) {
      console.error('Failed to remove from search history', err);
    }
  }, [history]);

  const clearHistory = useCallback(async () => {
    try {
      setHistory([]);
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (err) {
      console.error('Failed to clear search history', err);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return { history, addToHistory, removeFromHistory, clearHistory };
}
