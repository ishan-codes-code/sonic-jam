import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { GENRES } from '../../../constants/genres';
import { useDebounce } from '../../../hooks/useDebounce';
import { useFlashMessage } from '../../../hooks/useFlashMessage';
import { fetchGenreVideos, searchVideos, YouTubeVideo } from '../../../services/youtube';
import { useExploreStore } from '../../../store/exploreStore';
import { usePlayerStore } from '../../../store/playerStore';
import { DynamicSection } from '../../../types/explore';

const ACTIVE_JOB_STATUSES = new Set([
  'processing',
  'queued',
  'pending',
  'in_progress',
  'waiting',
  'active',
  'delayed',
  'prioritized',
  'waiting-children',
  'paused',
]);

export const useExploreLogic = () => {
  const router = useRouter();
  const {
    playFromYouTube,
    songJobs,
    cleanupSongJobs,
    dismissSongJob,
    error: playbackError,
  } = usePlayerStore();
  const { show } = useFlashMessage();

  const {
    sections,
    isLoading: loading,
    error: exploreError,
    loadInitial,
    refreshSection,
    loadMoreSection,
    deleteSection
  } = useExploreStore();

  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [genreResults, setGenreResults] = useState<YouTubeVideo[]>([]);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [searchToken, setSearchToken] = useState<string | undefined>();

  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [genreLoading, setGenreLoading] = useState(false);
  const [loadingMoreSearch, setLoadingMoreSearch] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const debouncedQuery = useDebounce(query, 450);
  const activeSongJob =
    songJobs.find((job) => ACTIVE_JOB_STATUSES.has(job.status.toLowerCase())) ??
    songJobs[songJobs.length - 1] ??
    null;

  const handlePlay = async (item: YouTubeVideo) => {
    try {
      await playFromYouTube(item);
    } catch {
      // Playback failed silent handling
    }
  };

  useEffect(() => {
    if (sections.length > 0 && sections[0].data.length === 0) {
      loadInitial();
    }
  }, [sections, loadInitial]);

  useEffect(() => () => {
    cleanupSongJobs();
  }, [cleanupSongJobs]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setSearchToken(undefined);
      return;
    }
    runSearch(debouncedQuery);
  }, [debouncedQuery]);

  async function runSearch(q: string) {
    setSearchLoading(true);
    try {
      const res = await searchVideos(q);
      setSearchResults(res.items);
      setSearchToken(res.nextPageToken);
    } catch {
      // silently fail
    } finally {
      setSearchLoading(false);
    }
  }

  async function loadMoreSearch() {
    if (!searchToken || loadingMoreSearch || !debouncedQuery.trim()) return;
    setLoadingMoreSearch(true);
    try {
      const res = await searchVideos(debouncedQuery, searchToken);
      setSearchResults((prev) => [...prev, ...res.items]);
      setSearchToken(res.nextPageToken);
    } finally {
      setLoadingMoreSearch(false);
    }
  }

  async function handleGenrePress(genre: typeof GENRES[number]) {
    if (activeGenre === genre.query) {
      setActiveGenre(null);
      setGenreResults([]);
      return;
    }
    setActiveGenre(genre.query);
    setGenreLoading(true);
    try {
      const res = await fetchGenreVideos(genre.query);
      setGenreResults(res.items);
    } finally {
      setGenreLoading(false);
    }
  }

  const handleAddSection = () => {
    const userSections = sections.filter(
      (s: DynamicSection) => s.id !== 'default_trending' && s.id !== 'default_yt_trending'
    );
    if (userSections.length >= 3) {
      setMenuVisible(false);
      show({ message: "Maximum 3 custom sections allowed.", type: "warning", autoDismissMs: 2000, dismissible: true })
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning), 600);
      return;
    }
    setMenuVisible(false);
    router.push("/addSection");
  };

  const isSearchMode = debouncedQuery.trim().length > 0;

  return {
    query,
    setQuery,
    debouncedQuery,
    isSearchMode,
    sections,
    loading,
    error: exploreError,
    searchResults,
    searchLoading,
    loadingMoreSearch,
    genreResults,
    genreLoading,
    activeGenre,
    menuVisible,
    setMenuVisible,
    loadInitial,
    refreshSection,
    loadMoreSection,
    deleteSection,
    handlePlay,
    loadMoreSearch,
    handleGenrePress,
    handleAddSection,
    GENRES,
    activeSongJob,
    playbackError,
    dismissSongJob,
  };
};
