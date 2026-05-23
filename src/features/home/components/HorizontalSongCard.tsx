import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, ViewStyle, Share } from 'react-native';
import { Text } from '@/components/ui/text';
import { Image } from 'expo-image';
import { CleanedSearchResult } from '@/features/search/types';
import { cn } from '@/lib/utils';
import { Play, SkipForward, ListMusic, Share2 } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useBottomSheet } from '@/features/drawer';
import { OptionsDrawer } from '@/features/drawer/components/OptionsDrawer';
import { usePlayer } from '@/features/playback/hooks/usePlayer';
import { shareSong } from '@/features/song/utils/shareSong';
import { MEDIA_URL } from '@/api/apiClient';
import { toastImperative } from '@/features/Toast/utils/toastSingleton';
import * as Haptics from 'expo-haptics';

interface HorizontalSongCardProps {
    song: CleanedSearchResult;
    onPress?: (song: CleanedSearchResult) => void;
    style?: ViewStyle;
}

const HorizontalSongCard = React.memo(({ song, onPress, style }: HorizontalSongCardProps) => {
    const { open, close } = useBottomSheet();
    const { playNext, addToQueue } = usePlayer();

    const onPressRef = useRef(onPress);
    useEffect(() => {
        onPressRef.current = onPress;
    });

    const handlePress = useCallback(() => {
        onPressRef.current?.(song);
    }, [song]);

    const handlePlayNext = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        await playNext({
            externalId: song.id,
            trackName: song.title,
            artistName: song.artist,
            image: song.artwork,
            duration: typeof song.duration === 'string' ? parseInt(song.duration, 10) : song.duration,
        });
    }, [playNext, song]);

    const handleAddToQueue = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        await addToQueue({
            externalId: song.id,
            trackName: song.title,
            artistName: song.artist,
            image: song.artwork,
            duration: typeof song.duration === 'string' ? parseInt(song.duration, 10) : song.duration,
        });
    }, [addToQueue, song]);

    const actions = useMemo(() => {
        if (!onPressRef.current) return [];

        if (song.type === 'album') {
            // Albums — only show share; full collection actions are in CollectionScreen
            return [
                {
                    label: 'Share Album',
                    icon: <Icon as={Share2} size={18} className="mr-2" />,
                    onPress: () => {
                        try {
                            const url = `${MEDIA_URL}/collection/${song.id}?isRemote=true`;
                            Share.share({
                                title: 'Sonic',
                                message: `Check out ${song.title} album on Sonic 🎵\n${url}`,
                                url,
                            }).catch(() => { });
                        } catch {
                            toastImperative.show({
                                type: 'error',
                                text1: 'Something went wrong',
                                visibilityTime: 4000,
                            });
                        }
                        close();
                    },
                },
            ];
        }

        // Songs — full set of actions
        return [
            {
                label: 'Play',
                icon: <Icon as={Play} size={18} className="mr-2" />,
                onPress: handlePress,
            },
            {
                label: 'Play Next',
                icon: <Icon as={SkipForward} size={18} className="mr-2" />,
                onPress: () => {
                    handlePlayNext();
                    close();
                },
            },
            {
                label: 'Add to Queue',
                icon: <Icon as={ListMusic} size={18} className="mr-2" />,
                onPress: () => {
                    handleAddToQueue();
                    close();
                },
            },
            {
                label: 'Share',
                icon: <Icon as={Share2} size={18} className="mr-2" />,
                onPress: () => {
                    shareSong(song.id, song.title, true);
                    close();
                },
            },
        ];
    }, [handlePress, handlePlayNext, handleAddToQueue, close, song.id, song.title, song.type]);

    const handleLongPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        requestAnimationFrame(() => {
            open(
                <OptionsDrawer
                    image={song.artwork}
                    title={song.title}
                    subtitle={song.artist}
                    actions={actions}
                />
            );
        });
    }, [actions, open, song.artwork, song.artist, song.title]);

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPress?.(song)}
            onLongPress={handleLongPress}
            delayLongPress={400}
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