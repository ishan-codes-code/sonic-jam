import React, { useCallback } from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { ChevronRight, AlertCircle, RefreshCw } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { CleanedSearchResult } from '@/features/search/types';
import RemoteSongListCard from '@/components/RemoteSongListCard';
import HorizontalSongCard from './HorizontalSongCard';
import FeedSkeleton from './FeedSkeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedSectionProps {
    title: string;
    subtitle: string;
    songs: CleanedSearchResult[];
    isLoading: boolean;
    isError: boolean;
    horizontal?: boolean;
    onRetry?: () => void;
    onSeeAll?: () => void;
    onSongPress?: (song: CleanedSearchResult) => void;
}

// ─── Error state ──────────────────────────────────────────────────────────────

const ErrorState = React.memo(({ onRetry }: { onRetry?: () => void }) => (
    <View className="items-center justify-center py-10 gap-y-3">
        <Icon as={AlertCircle} className="text-destructive" size={32} />
        <Text className="text-muted-foreground text-sm text-center">
            Couldn't load this section
        </Text>
        {onRetry && (
            <TouchableOpacity
                onPress={onRetry}
                activeOpacity={0.7}
                className="flex-row items-center gap-x-1.5 px-4 py-2 rounded-full bg-secondary/60"
            >
                <Icon as={RefreshCw} className="text-foreground" size={14} />
                <Text className="text-foreground text-sm font-medium">Retry</Text>
            </TouchableOpacity>
        )}
    </View>
));

ErrorState.displayName = 'ErrorState';

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = React.memo(
    ({
        title,
        subtitle,
        onSeeAll,
    }: Pick<FeedSectionProps, 'title' | 'subtitle' | 'onSeeAll'>) => (
        <View className="flex-row items-end justify-between px-4 pt-6 pb-3">
            <View className="flex-1 mr-2">
                <Text className="text-xl text-foreground tracking-tight font-display">
                    {title}
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">{subtitle}</Text>
            </View>
            {onSeeAll && (
                <TouchableOpacity
                    onPress={onSeeAll}
                    activeOpacity={0.6}
                    className="flex-row items-center gap-x-0.5"
                >
                    <Text className="text-sm text-indigo-400 font-medium">See all</Text>
                    <Icon as={ChevronRight} className="text-indigo-400" size={16} />
                </TouchableOpacity>
            )}
        </View>
    ),
);

SectionHeader.displayName = 'SectionHeader';

// ─── FeedSection ─────────────────────────────────────────────────────────────

const keyExtractor = (item: CleanedSearchResult) => item.id;

const FeedSection = React.memo(
    ({
        title,
        subtitle,
        songs,
        isLoading,
        isError,
        horizontal = false,
        onRetry,
        onSeeAll,
        onSongPress,
    }: FeedSectionProps) => {
        const renderItem = useCallback(
            ({ item }: { item: CleanedSearchResult }) => {
                if (horizontal) {
                    return <HorizontalSongCard song={item} onPress={onSongPress} />;
                }
                return <RemoteSongListCard song={item} onPress={onSongPress} />;
            },
            [onSongPress, horizontal],
        );

        return (
            <View>
                <SectionHeader title={title} subtitle={subtitle} onSeeAll={onSeeAll} />

                {isLoading ? (
                    <FeedSkeleton rows={horizontal ? 4 : 5} horizontal={horizontal} />
                ) : isError ? (
                    <ErrorState onRetry={onRetry} />
                ) : horizontal ? (
                    <FlatList
                        data={songs}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: 16 }}
                        removeClippedSubviews={false}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        initialNumToRender={8}
                    />
                ) : (
                    <View className="px-1">
                        {songs.map((item) => (
                            <View key={item.id}>
                                {renderItem({ item })}
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    },
);

FeedSection.displayName = 'FeedSection';

export default FeedSection;
