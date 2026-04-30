import React, { useCallback, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { CleanedSearchResult } from '@/features/search/types';
import { useTopSongs, useTopAlbums } from '../hooks/useFeedSections';
import FeedSection from '../components/FeedSection';
import HomeFeedHeader from '../components/HomeFeedHeader';
import { FeedSectionId } from '../types';
import { useRouter } from 'expo-router';
import { ContinueListeningCard } from '../components/ContinueListeningCard';

// ─── Section metadata ─────────────────────────────────────────────────────────

interface SectionMeta {
    id: FeedSectionId;
    title: string;
    subtitle: string;
    horizontal: boolean;
}

const SECTIONS: SectionMeta[] = [
    {
        id: 'top-songs',
        title: 'Trending Songs',
        subtitle: 'The most played tracks in India today',
        horizontal: true,
    },
    {
        id: 'top-albums',
        title: 'Top Albums',
        subtitle: "India's most popular records right now",
        horizontal: true,
    },
    {
        id: 'suggested-songs',
        title: 'You Might Also Like',
        subtitle: 'Hand-picked Songs based on charts',
        horizontal: false,
    },
    {
        id: 'trending-albums',
        title: 'Trending Now',
        subtitle: 'Albums climbing the charts this week',
        horizontal: true,
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface HomeFeedProps {
    onSongPress?: (song: CleanedSearchResult) => void;
}

const HomeFeedScreen = React.memo(({ onSongPress }: HomeFeedProps) => {
    const router = useRouter();
    const topSongs = useTopSongs();
    const topAlbums = useTopAlbums();

    // Distribute 100 songs & 100 albums into subsets
    const subsets = useMemo(() => {
        const songs = topSongs.data ?? [];
        const albums = topAlbums.data ?? [];

        return {
            trendingSongs: songs.slice(0, 20),
            topAlbums: albums.slice(0, 20),
            suggestedSongs: songs.slice(20, 30), // Vertical section
            trendingAlbums: albums.slice(20, 50),
        };
    }, [topSongs.data, topAlbums.data]);

    // Map section id → data & status
    const sectionDataMap = useMemo(() => ({
        'top-songs': {
            data: subsets.trendingSongs,
            isLoading: topSongs.isLoading,
            isError: topSongs.isError,
            refetch: topSongs.refetch,
        },
        'top-albums': {
            data: subsets.topAlbums,
            isLoading: topAlbums.isLoading,
            isError: topAlbums.isError,
            refetch: topAlbums.refetch,
        },
        'suggested-songs': {
            data: subsets.suggestedSongs,
            isLoading: topSongs.isLoading,
            isError: topSongs.isError,
            refetch: topSongs.refetch,
        },
        'trending-albums': {
            data: subsets.trendingAlbums,
            isLoading: topAlbums.isLoading,
            isError: topAlbums.isError,
            refetch: topAlbums.refetch,
        },
    }), [topSongs, topAlbums, subsets]);

    const handleSongPress = useCallback(
        (item: CleanedSearchResult) => {
            if (item.type === 'album') {
                router.push({
                    pathname: '/collections/[id]',
                    params: { id: item.id, isRemote: 'true' }
                });
                return;
            }
            onSongPress?.(item);
        },
        [onSongPress, router],
    );

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            bounces
            overScrollMode="always"
        >
            <HomeFeedHeader />

            <ContinueListeningCard />

            {/* Divider */}
            <View className="h-px bg-border/40 mx-4 mb-1" />

            {SECTIONS.map(({ id, title, subtitle, horizontal }) => {
                const section = sectionDataMap[id];

                return (
                    <FeedSection
                        key={id}
                        title={title}
                        subtitle={subtitle}
                        songs={section.data}
                        isLoading={section.isLoading}
                        isError={section.isError}
                        horizontal={horizontal}
                        onRetry={section.refetch}
                        onSongPress={handleSongPress}
                    />
                );
            })}
        </ScrollView>
    );
});

HomeFeedScreen.displayName = 'HomeFeedScreen';

export default HomeFeedScreen;
