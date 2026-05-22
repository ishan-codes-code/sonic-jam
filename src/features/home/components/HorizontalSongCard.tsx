import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/text';
import { Image } from 'expo-image';
import { CleanedSearchResult } from '@/features/search/types';
import { cn } from '@/lib/utils';

interface HorizontalSongCardProps {
    song: CleanedSearchResult;
    onPress?: (song: CleanedSearchResult) => void;
    style?: ViewStyle;
}

const HorizontalSongCard = React.memo(({ song, onPress, style }: HorizontalSongCardProps) => {
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPress?.(song)}
            style={style}
            className="w-40 mr-4"
        >
            <View className="w-40 h-40 rounded-xl overflow-hidden bg-secondary/30 shadow-lg">
                {song.artwork ? (
                    <Image
                        source={{ uri: song.artwork }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View className="flex-1 items-center justify-center bg-indigo-500/20">
                        <Text className="text-indigo-400 font-bold">SONIC</Text>
                    </View>
                )}

                {/* Subtle Overlay for better text readability if needed, but here it's below */}
            </View>

            <View className="mt-3 px-1">
                <Text
                    numberOfLines={1}
                    className="text-sm text-foreground leading-tight font-display"
                >
                    {song.title}
                </Text>
                <Text
                    numberOfLines={1}
                    className="text-xs text-muted-foreground mt-1"
                >
                    {song.type.charAt(0).toUpperCase() + song.type.slice(1)} • {song.artist}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

HorizontalSongCard.displayName = 'HorizontalSongCard';

export default HorizontalSongCard;
