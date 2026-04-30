import React, { useCallback, useRef, useMemo } from 'react';
import {
    View,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    ListRenderItemInfo,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

import { useGenreTracks } from '../hooks/useGenreTracks';
import { usePlayer } from '@/playbackCore/usePlayer';
import { Text } from '@/components/ui/text';
import SongListCard from '../../../components/RemoteSongListCard';
import { CleanedSearchResult } from '../types';
import { formatDuration } from '../utils/itunesHelpers';

const ITEM_HEIGHT = 64;

export default function GenreScreen() {
    const { genre } = useLocalSearchParams<{ genre: string }>();
    const router = useRouter();
    const { play } = usePlayer();

    const {
        data: tracks = [],
        isLoading: loading,
        error,
        refetch: refetchGenre
    } = useGenreTracks(genre);


    const handleTrackPress = useCallback((track: any) => {
        play({
            trackName: track.trackName,
            artistName: track.artistName || track.artist,
            // Removed 'artwork' and 'url' as they are not in PlaySongDto
        });
    }, [play]);

    const renderItem = useCallback(({ item }: ListRenderItemInfo<any>) => {
        // Map musicApi track to CleanedSearchResult format
        // Note: musicApi returns seconds, formatDuration expects ms
        const cleanedTrack: CleanedSearchResult = {
            id: item.id || item._id,
            title: item.trackName || 'Unknown',
            artist: item.artistName || item.artist || 'Unknown',
            album: item.collectionName || '',
            artwork: item.image || undefined,
            preview: item.previewUrl || '',
            duration: formatDuration((item.duration || 0) * 1000),
            year: '',
            genre: genre || '',
            type: 'song'
        };


        return (
            <SongListCard
                song={cleanedTrack}
                onPress={() => handleTrackPress(item)}
            />
        );
    }, [genre, handleTrackPress]);

    const keyExtractor = useCallback((item: any) =>
        item.id || item._id || item.trackName + (item.artistName || item.artist), []);

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    }), []);

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            <LinearGradient
                colors={['rgba(79, 70, 229, 0.25)', 'rgba(147, 51, 234, 0.1)', 'transparent']}
                className="absolute top-0 left-0 right-0 h-[300px]"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            <View className="flex-row items-center px-5 pt-3 pb-8 gap-4 z-10">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-11 h-11 rounded-xl bg-secondary/90 items-center justify-center border border-white/10 shadow-sm"
                >
                    <ArrowLeft color="#ffffff" size={24} />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-3xl font-extrabold text-foreground tracking-tight">
                        {genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : 'Genre'}
                    </Text>
                    {!loading && !error && (
                        <Text className="text-sm text-muted-foreground font-medium opacity-80">
                            {tracks.length} hand-picked tracks
                        </Text>
                    )}
                </View>
            </View>



            {/* Content */}
            <View className="flex-1">
                {loading ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <ActivityIndicator size="large" color="#6366f1" />
                        <Text className="mt-4 text-muted-foreground">
                            Fetching the best of {genre}...
                        </Text>
                    </View>
                ) : error ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Text className="text-muted-foreground text-center mb-5">
                            {error instanceof Error ? error.message : 'Failed to load tracks'}
                        </Text>
                        <TouchableOpacity
                            className="px-6 py-2.5 rounded-full bg-primary"
                            onPress={() => refetchGenre()}
                        >
                            <Text className="text-white font-medium">Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : tracks.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Text className="text-muted-foreground text-center">
                            No tracks found for this genre.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={tracks}
                        renderItem={renderItem}
                        keyExtractor={keyExtractor}
                        getItemLayout={getItemLayout}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={10}
                        maxToRenderPerBatch={5}
                        windowSize={5}
                        removeClippedSubviews={true}
                        scrollEventThrottle={16}
                    />

                )}
            </View>
        </SafeAreaView>
    );
}