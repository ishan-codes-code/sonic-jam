import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
    ListRenderItemInfo,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, Clock, ArrowLeft } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSearchQuery } from '../hooks/useSearchQuery';
import { SearchScreenState, CleanedSearchResult } from '../types';
import SongListCard from '../../../components/RemoteSongListCard';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { Icon } from '@/components/ui/icon';

// ─── Fixed item height — must match SongListCard exactly ──────────────────────
const ITEM_HEIGHT = 64;

// ─── Static styles — never re-created on render ───────────────────────────────
const styles = StyleSheet.create({
    listContent: { paddingBottom: 20 },
});

// ─── Stable history row component ─────────────────────────────────────────────
const HistoryItem = React.memo(({
    item,
    onSelect,
    onRemove,
}: {
    item: string;
    onSelect: (item: string) => void;
    onRemove: (item: string) => void;
}) => (
    <View className="flex-row items-center py-3">
        <Clock size={18} color="#9ca3af" />
        <TouchableOpacity
            className="flex-1 px-3"
            onPress={() => onSelect(item)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <Text className="text-base text-foreground">{item}</Text>
        </TouchableOpacity>
        <TouchableOpacity
            onPress={() => onRemove(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <X size={18} color="#9ca3af" />
        </TouchableOpacity>
    </View>
));
HistoryItem.displayName = 'HistoryItem';

export default function SearchFocusScreen({ setSearchFocus }: SearchScreenState) {
    const [localQuery, setLocalQuery] = useState('');
    const { data: results = [], isLoading, error } = useSearchQuery(localQuery);
    const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();



    // The useSearchQuery hook handles debouncing internally.
    const handleQueryChange = useCallback((text: string) => {
        setLocalQuery(text);
    }, []);

    const handleClear = useCallback(() => setLocalQuery(''), []);
    const handleCancel = useCallback(() => setSearchFocus(false), [setSearchFocus]);
    const handleSubmit = useCallback(() => {
        if (localQuery.trim().length > 2) addToHistory(localQuery);
    }, [localQuery, addToHistory]);

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
            onPress={(song) => console.log('Playing:', song.title)}
        />
    ), []);


    // ─── History list callbacks ────────────────────────────────────────────────
    const historyKeyExtractor = useCallback((item: string) => item, []);
    const handleHistorySelect = useCallback((item: string) => {
        setLocalQuery(item);
    }, []);

    const renderHistoryItem = useCallback(({ item }: ListRenderItemInfo<string>) => (
        <HistoryItem item={item} onSelect={handleHistorySelect} onRemove={removeFromHistory} />
    ), [handleHistorySelect, removeFromHistory]);

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* ── Search Header ──────────────────────────────────────────────── */}
            <View className="flex-row items-center gap-3">
                <View className="flex-1 flex-row items-center bg-[#282828] h-12 px-4 ">
                    <TouchableOpacity onPress={handleCancel} activeOpacity={0.7}>
                        <Icon as={ArrowLeft} color="#9ca3af" className='h-6 w-6' />
                    </TouchableOpacity>
                    {/* <Search size={18} color="#9ca3af" /> */}
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
                {/* <TouchableOpacity onPress={handleCancel} activeOpacity={0.7}>
                    <Text className="text-white text-sm font-medium">Cancel</Text>
                </TouchableOpacity> */}
            </View>

            {/* ── Content ────────────────────────────────────────────────────── */}
            <View className="flex-1">
                {isLoading && results.length === 0 ? (
                    <View className="flex-1 items-center justify-center pt-10">
                        <ActivityIndicator size="large" color="#6366f1" />
                        <Text className="mt-4 text-muted-foreground">Searching iTunes...</Text>
                    </View>

                ) : error ? (
                    <View className="flex-1 items-center justify-center pt-10">
                        <Text className="text-destructive text-center mb-2">Oops! Something went wrong.</Text>
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
                        <Text className="text-lg font-medium text-foreground mb-2">No results found</Text>
                        <Text className="text-muted-foreground text-center">
                            We couldn't find anything for "{localQuery}".
                        </Text>
                    </View>

                ) : (
                    <View className="flex-1 px-4 pt-4">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-semibold text-foreground">Recent searches</Text>
                            {history.length > 0 && (
                                <TouchableOpacity onPress={clearHistory} activeOpacity={0.7}>
                                    <Text className="text-sm text-primary font-medium">Clear all</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {history.length > 0 ? (
                            <FlatList<string>
                                data={history}
                                keyExtractor={historyKeyExtractor}
                                renderItem={renderHistoryItem}
                                showsVerticalScrollIndicator={false}
                                initialNumToRender={10}
                                removeClippedSubviews={true}
                            />
                        ) : (
                            <Text className="text-sm text-muted-foreground">
                                Your recent searches will appear here.
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}