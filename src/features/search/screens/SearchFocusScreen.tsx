import React, { useState, useCallback } from 'react';
import {
    View,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
    ListRenderItemInfo,
    StyleSheet,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ArrowLeft, Music } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useSearchQuery } from '../hooks/useSearchQuery';
import { useRecentSongs } from '../hooks/useRecentSongs';
import { HistorySongCard } from '@/features/history/components/HistorySongCard';
import { SearchScreenState, CleanedSearchResult } from '../types';
import SongListCard from '../../../components/RemoteSongListCard';
import { Icon } from '@/components/ui/icon';
import { usePlayer } from '@/features/playback';

// ─── Fixed item height — must match SongListCard exactly ──────────────────────
const ITEM_HEIGHT = 64;

// ─── Static styles — never re-created on render ───────────────────────────────
const styles = StyleSheet.create({
    listContent: { paddingBottom: 20 },
});

export default function SearchFocusScreen({ setSearchFocus }: SearchScreenState) {
    const [localQuery, setLocalQuery] = useState('');
    const { data: results = [], isLoading, error } = useSearchQuery(localQuery);
    const { recentSongs, addSong, removeSong, clearRecent } = useRecentSongs();
    const { play } = usePlayer();

    const handleSongPlay = useCallback((song: CleanedSearchResult) => {
        addSong(song);
        play({
            trackName: song.title,
            artistName: song.artist,
            image: song.artwork,
            externalId: song.id,
            duration: Number(song.duration),
        });
    }, [addSong, play]);

    // The useSearchQuery hook handles debouncing internally.
    const handleQueryChange = useCallback((text: string) => {
        setLocalQuery(text);
    }, []);

    const handleClear = useCallback(() => setLocalQuery(''), []);
    const handleCancel = useCallback(() => setSearchFocus(false), [setSearchFocus]);
    const handleSubmit = useCallback(() => {
        Keyboard.dismiss();
    }, []);

    // ─── FlatList callbacks — all stable, zero inline arrows in JSX ───────────
    const keyExtractor = useCallback((item: CleanedSearchResult) => item.id, []);

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    }), []);

    const renderItem = useCallback(({ item }: ListRenderItemInfo<CleanedSearchResult>) => (
        <SongListCard
            song={item}
            onPress={() => handleSongPlay(item)}
        />
    ), [handleSongPlay]);

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* ── Search Header ──────────────────────────────────────────────── */}
            <View className="flex-row items-center gap-3">
                <View className="flex-1 flex-row items-center bg-[#282828] h-12 px-4 ">
                    <TouchableOpacity onPress={handleCancel} activeOpacity={0.7}>
                        <Icon as={ArrowLeft} color="#9ca3af" className='h-6 w-6' />
                    </TouchableOpacity>
                    <TextInput
                        autoFocus
                        value={localQuery}
                        onChangeText={handleQueryChange}
                        placeholder="Search Songs..."
                        placeholderTextColor="#9ca3af"
                        className="flex-1 text-white text-md h-full px-2"
                        keyboardType="default"
                        returnKeyType="search"
                        autoCorrect={false}
                        autoCapitalize="none"
                        onSubmitEditing={handleSubmit}
                    />
                    {localQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={handleClear}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <X size={16} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── Content ────────────────────────────────────────────────────── */}
            <View className="flex-1">
                {isLoading && results.length === 0 ? (
                    <View className="flex-1 items-center pt-20 px-6">
                        <ActivityIndicator size="large" color="#FFD54F" />
                        <Text className="mt-4 text-muted-foreground text-center">Scanning the internet for your next 3-day obsession...</Text>
                    </View>

                ) : error ? (
                    <View className="flex-1 items-center justify-center pt-10">
                        <Text className="text-destructive text-center mb-2">
                            Something broke. Probably not your fault. Probably.
                        </Text>
                        <Text className="text-muted-foreground text-center text-sm px-4">
                            {error instanceof Error ? error.message : 'An unknown error occurred'}
                        </Text>
                    </View>

                ) : results.length > 0 ? (
                    <FlatList<CleanedSearchResult>
                        data={results}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        getItemLayout={getItemLayout}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        keyboardDismissMode="on-drag"
                        keyboardShouldPersistTaps="handled"
                        initialNumToRender={10}
                        maxToRenderPerBatch={5}
                        updateCellsBatchingPeriod={30}
                        windowSize={5}
                        removeClippedSubviews={true}
                        scrollEventThrottle={16}
                        overScrollMode="never"
                    />

                ) : localQuery.trim().length > 0 && !isLoading ? (
                    <View className="flex-1 items-center pt-20 px-6">
                        <Text className="text-lg font-medium text-foreground mb-2 text-center"> Your next 3-day obsession escaped our grasp.</Text>
                        <Text className="text-muted-foreground text-center">
                            We couldn't find anything for "{localQuery}".
                        </Text>
                    </View>

                ) : (
                    <>
                        {recentSongs.length > 0 ? (
                            <View className="flex-1 pt-4">
                                <View className="flex-row items-center justify-between mb-2 px-4">
                                    <Text className="text-lg font-display text-foreground">Recent songs</Text>
                                    <TouchableOpacity onPress={clearRecent} activeOpacity={0.7}>
                                        <Text className="text-sm text-primary font-heading">Clear all</Text>
                                    </TouchableOpacity>
                                </View>

                                <FlatList
                                    data={recentSongs}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <HistorySongCard
                                            song={item}
                                            onPress={() => handleSongPlay(item)}
                                            onRemove={() => removeSong(item.id)}
                                        />
                                    )}
                                    showsVerticalScrollIndicator={false}
                                    initialNumToRender={10}
                                    removeClippedSubviews={true}
                                />
                            </View>
                        ) : (
                            <View className="flex-1 items-center justify-center px-6">
                                <View className="w-16 h-16 bg-[#282828] rounded-full items-center justify-center mb-4">
                                    <Icon as={Music} className="text-muted-foreground w-8 h-8" />
                                </View>
                                <Text className="text-lg font-medium text-foreground mb-2">No recent songs</Text>
                                <Text className="text-muted-foreground text-center text-sm">
                                    Songs you search and play will appear here.
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}