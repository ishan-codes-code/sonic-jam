import React from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useCollection } from '../hooks/useCollection';
import { CollectionAlbumHeader } from '../components/CollectionAlbumHeader';
import { StickyCollectionHeader } from '../components/StickyCollectionHeader';
import RemoteSongListCard from '@/components/RemoteSongListCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CleanedSearchResult } from '@/features/search/types';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useBackgroundGradient, pickHeroGradientFromImageColors } from '../hooks/useBackgroundGradients';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { theme } from '@/theme';
import { StyleSheet } from 'react-native';

const HEADER_THRESHOLD = 200;

export const CollectionScreen = () => {
    const { id, isRemote } = useLocalSearchParams<{ id: string; isRemote: string }>();
    const insets = useSafeAreaInsets();
    const scrollY = useSharedValue(0);

    const { data: collection, isLoading, isError, refetch } = useCollection(
        id,
        isRemote === 'true'
    );

    const { imageColors } = useBackgroundGradient(collection?.artwork ?? '');
    const hero = useMemo(() => pickHeroGradientFromImageColors(imageColors), [imageColors]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const handleSongPress = (song: CleanedSearchResult) => {
        console.log('Playing song:', song.title);
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="#6366f1" />
                <Text className="text-muted-foreground mt-4 font-medium font-display">
                    Loading collection...
                </Text>
            </View>
        );
    }

    if (isError || !collection) {
        return (
            <View className="flex-1 bg-background items-center justify-center px-6">
                <Text className="text-foreground text-xl font-bold mb-2 font-display">Oops!</Text>
                <Text className="text-muted-foreground text-center mb-6">
                    We couldn't load this collection. It might be unavailable or there's a connection issue.
                </Text>
                <TouchableOpacity
                    onPress={() => refetch()}
                    className="bg-indigo-500 px-8 py-3 rounded-full"
                >
                    <Text className="text-white font-bold">Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <LinearGradient
                colors={hero.colors}
                locations={hero.locations}
                style={StyleSheet.absoluteFill}
            />
            <StickyCollectionHeader
                scrollY={scrollY}
                title={collection.title}
                insets={insets}
                threshold={HEADER_THRESHOLD}
                tracksLength={collection.tracks.length}
            />

            <Animated.FlatList
                data={collection.tracks}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <RemoteSongListCard
                        song={item}
                        onPress={handleSongPress}
                    />
                )}
                ListHeaderComponent={
                    <CollectionAlbumHeader collection={collection} baseColor={hero.base} />
                }
                ListHeaderComponentStyle={{ marginBottom: 8 }}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingTop: insets.top + 20,
                    paddingBottom: 120
                }}
            />
        </View>
    );
};
