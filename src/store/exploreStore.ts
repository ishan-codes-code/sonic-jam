import * as Haptics from 'expo-haptics';
import { showMessage } from 'react-native-flash-message';
import { create } from 'zustand';
import {
  extractPlaylistId,
  fetchPlaylistItems,
  fetchTrendingVideos,
  fetchVideosBatchDetails,
  searchVideosIN
} from '../services/youtube';
import { DynamicSection } from '../types/explore';

interface ExploreState {
  sections: DynamicSection[];
  isLoading: boolean;
  error: string | null;

  setSections: (sections: DynamicSection[]) => void;
  loadInitial: () => Promise<void>;
  addSection: (config: {
    value: string;
    type: 'keyword' | 'playlist' | 'trending';
    title: string;
    layout: 'horizontal' | 'vertical';
    variant: 'large' | 'compact';
  }, reorderedSections?: DynamicSection[]) => Promise<void>;
  deleteSection: (sectionId: string) => void;
  refreshSection: (sectionId: string) => Promise<void>;
  loadMoreSection: (sectionId: string) => Promise<void>;
}

export const SECTION_TRENDING_ID = 'default_trending';
export const SECTION_YT_TRENDING_ID = 'default_yt_trending';

function buildDefaultSections(): DynamicSection[] {
  return [
    {
      id: SECTION_TRENDING_ID,
      title: 'Trending Now',
      type: 'trending',
      value: '',
      layout: 'horizontal',
      variant: 'large',
      data: [],
      isLoading: true,
    },
    {
      id: SECTION_YT_TRENDING_ID,
      title: 'YouTube Trending',
      type: 'trending',
      value: '',
      layout: 'vertical',
      variant: 'compact',
      data: [],
      isLoading: true,
    },
  ];
}

export const useExploreStore = create<ExploreState>((set, get) => ({
  sections: buildDefaultSections(),
  isLoading: true,
  error: null,

  setSections: (sections) => set({ sections }),

  loadInitial: async () => {
    set({ isLoading: true, error: null });
    try {
      const [trendRes, ytRes] = await Promise.all([
        fetchTrendingVideos(),
        fetchTrendingVideos(),
      ]);

      set((state) => ({
        isLoading: false,
        sections: state.sections.map((s) => {
          if (s.id === SECTION_TRENDING_ID) {
            return {
              ...s,
              data: trendRes.items,
              nextPageToken: trendRes.nextPageToken,
              hasMore: !!trendRes.nextPageToken,
              isLoading: false
            };
          }
          if (s.id === SECTION_YT_TRENDING_ID) {
            return {
              ...s,
              data: ytRes.items,
              nextPageToken: ytRes.nextPageToken,
              hasMore: !!ytRes.nextPageToken,
              isLoading: false,
            };
          }
          return s;
        }),
      }));
    } catch (e: any) {
      set({
        isLoading: false,
        error: e?.message ?? 'Something went wrong. Check your API key.'
      });
      showMessage({
        message: 'Error Loading Data',
        description: e?.message ?? 'Check your connection or API key.',
        type: 'danger',
      });
    }
  },

  addSection: async (config) => {
    const state = get();
    const userSections = state.sections.filter(
      (s) => s.id !== SECTION_TRENDING_ID && s.id !== SECTION_YT_TRENDING_ID
    );

    if (userSections.length >= 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showMessage({
        message: 'Maximum 3 custom sections allowed',
        type: 'warning',
      });
      return;
    }

    const newId = `sec_${Date.now()}`;
    const playlistId =
      config.type === 'playlist'
        ? (extractPlaylistId(config.value) ?? config.value)
        : '';

    const newSection: DynamicSection = {
      id: newId,
      title: config.title,
      type: config.type,
      value: config.type === 'playlist' ? playlistId : config.value,
      layout: 'horizontal',
      variant: 'large',
      data: [],
      isLoading: true,
      hasMore: false,
    };

    // ── Insert into position: after Trending, before YT Trending ──
    set((state) => {
      const nextSections = [...state.sections];
      const ytIdx = nextSections.findIndex((s) => s.id === SECTION_YT_TRENDING_ID);

      if (ytIdx !== -1) {
        nextSections.splice(ytIdx, 0, newSection);
      } else {
        nextSections.push(newSection);
      }

      return { sections: nextSections };
    });

    try {
      const searchRes =
        config.type === 'playlist'
          ? await fetchPlaylistItems(playlistId)
          : await searchVideosIN(config.value);

      // fetch rich details (views + duration) for search results
      const videoIds = searchRes.items.map(v => v.videoId);
      const detailedVideos = await fetchVideosBatchDetails(videoIds);

      set((state) => ({
        sections: state.sections.map((s) =>
          s.id === newId
            ? {
              ...s,
              data: detailedVideos,
              nextPageToken: searchRes.nextPageToken,
              hasMore: !!searchRes.nextPageToken,
              isLoading: false
            }
            : s,
        ),
      }));
      showMessage({
        message: 'Section Added',
        type: 'success',
        icon: 'success',
      });
    } catch (e: any) {
      set((state) => ({
        sections: state.sections.map((s) => (s.id === newId ? { ...s, isLoading: false } : s)),
      }));
      showMessage({
        message: 'Failed to add section',
        description: e?.message,
        type: 'danger',
      });
    }
  },

  deleteSection: (sectionId) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    set((state) => ({
      sections: state.sections.filter((s) => s.id !== sectionId),
    }));
    showMessage({
      message: 'Section Deleted',
      type: 'info',
      icon: 'success',
    });
  },

  refreshSection: async (sectionId) => {
    const section = get().sections.find((s) => s.id === sectionId);
    if (!section) return;

    set((state) => ({
      sections: state.sections.map((s) => (s.id === sectionId ? { ...s, isLoading: true, data: [] } : s)),
    }));

    try {
      let searchRes;
      if (section.id === SECTION_TRENDING_ID || section.id === SECTION_YT_TRENDING_ID) {
        searchRes = await fetchTrendingVideos();
      } else if (section.type === 'playlist') {
        searchRes = await fetchPlaylistItems(section.value);
      } else {
        searchRes = await searchVideosIN(section.value);
      }

      // ── Enrich with details if not trending (trending already has details) ──
      let finalData = searchRes.items;
      if (section.type !== 'trending' && section.id !== SECTION_TRENDING_ID && section.id !== SECTION_YT_TRENDING_ID) {
        const videoIds = searchRes.items.map(v => v.videoId);
        finalData = await fetchVideosBatchDetails(videoIds);
      }

      set((state) => ({
        sections: state.sections.map((s) =>
          s.id === sectionId
            ? {
              ...s,
              data: finalData,
              nextPageToken: searchRes.nextPageToken,
              hasMore: !!searchRes.nextPageToken,
              isLoading: false,
            }
            : s,
        ),
      }));
      showMessage({
        message: 'Section Refreshed',
        type: 'success',
        icon: 'success',
      });
    } catch (e: any) {
      set((state) => ({
        sections: state.sections.map((s) => (s.id === sectionId ? { ...s, isLoading: false } : s)),
      }));
      showMessage({
        message: 'Refresh Failed',
        description: e?.message,
        type: 'danger',
      });
    }
  },

  loadMoreSection: async (sectionId) => {
    const section = get().sections.find((s) => s.id === sectionId);
    if (!section || !section.nextPageToken || section.isLoadingMore) return;

    // Set loading more state
    set((state) => ({
      sections: state.sections.map((s) => (s.id === sectionId ? { ...s, isLoadingMore: true } : s)),
    }));

    try {
      let searchRes;
      if (section.id === SECTION_TRENDING_ID || section.type === 'trending') {
        searchRes = await fetchTrendingVideos(section.nextPageToken);
      } else if (section.type === 'playlist') {
        searchRes = await fetchPlaylistItems(section.value, section.nextPageToken);
      } else {
        searchRes = await searchVideosIN(section.value, section.nextPageToken);
      }

      // Enrich with details if needed
      let finalItems = searchRes.items;
      if (section.type !== 'trending') {
        const videoIds = searchRes.items.map(v => v.videoId);
        finalItems = await fetchVideosBatchDetails(videoIds);
      }

      set((state) => ({
        sections: state.sections.map((s) =>
          s.id === sectionId
            ? {
              ...s,
              data: [...s.data, ...finalItems],
              nextPageToken: searchRes.nextPageToken,
              hasMore: !!searchRes.nextPageToken,
              isLoadingMore: false
            }
            : s,
        ),
      }));
    } catch (e: any) {
      set((state) => ({
        sections: state.sections.map((s) => (s.id === sectionId ? { ...s, isLoadingMore: false } : s)),
      }));
      showMessage({
        message: 'Load More Failed',
        description: e?.message,
        type: 'danger',
      });
    }
  },
}));
