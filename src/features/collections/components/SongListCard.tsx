import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Image } from 'expo-image';
import { EllipsisVertical, Mic2, Play, SkipForward, ListMusic, Share2 } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import * as Haptics from 'expo-haptics';
import { CollectionTrack } from '../types';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { cn } from '@/lib/utils';
import AudioWave from '@/components/AudioWave';
import { usePlaybackStore } from '@/features/playback';
import { usePlayer } from '@/features/playback/hooks/usePlayer';
import { useBottomSheet } from '@/features/drawer';
import { OptionsDrawer } from '@/features/drawer/components/OptionsDrawer';
import { shareSong } from '@/features/song/utils/shareSong';

const areEqual = (prev: SongListCardProps, next: SongListCardProps) =>
    prev.track.id === next.track.id &&
    prev.track.title === next.track.title &&
    prev.track.artist === next.track.artist &&
    prev.track.artwork === next.track.artwork &&
    prev.isActive === next.isActive &&
    prev.onPress === next.onPress;

interface SongListCardProps {
    track: CollectionTrack;
    onPress?: (track: CollectionTrack) => void;
    isActive?: boolean
}

const SongListCard = React.memo(({ track, onPress, isActive = false }: SongListCardProps) => {
    const { open } = useBottomSheet();
    const { playNext, addToQueue } = usePlayer();
    const isPlaying = usePlaybackStore((s) => s.status === "playing");

    // Latest Ref Pattern to avoid unnecessary re-renders
    const onPressRef = useRef(onPress);
    useEffect(() => {
        onPressRef.current = onPress;
    });

    const handlePress = useCallback(() => {
        onPressRef.current?.(track);
    }, [track]);

    const handlePlayNext = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        await playNext({
            externalId: track.id,
            trackName: track.title,
            artistName: track.artist,
            image: track.artwork,
            duration: typeof track.duration === 'string' ? parseInt(track.duration, 10) : track.duration,
        });
    }, [playNext, track]);

    const handleAddToQueue = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        await addToQueue({
            externalId: track.id,
            trackName: track.title,
            artistName: track.artist,
            image: track.artwork,
            duration: typeof track.duration === 'string' ? parseInt(track.duration, 10) : track.duration,
        });
    }, [addToQueue, track]);

    const isRemoteTrack = !track.songId;

    const actions = useMemo(() => {
        if (!onPressRef.current) return [];

        return [
            {
                label: 'Play',
                icon: <Icon as={Play} size={18} className="mr-2" />,
                onPress: handlePress,
            },
            {
                label: 'Play Next',
                icon: <Icon as={SkipForward} size={18} className="mr-2" />,
                onPress: handlePlayNext,
            },
            {
                label: 'Add to Queue',
                icon: <Icon as={ListMusic} size={18} className="mr-2" />,
                onPress: handleAddToQueue,
            },
            {
                label: 'Share',
                icon: <Icon as={Share2} size={18} className="mr-2" />,
                onPress: () => {
                    shareSong(track.id, track.title, isRemoteTrack);
                },
            },
        ];
    }, [handlePress, handlePlayNext, handleAddToQueue, track.id, track.title, isRemoteTrack]);

    const handleOpenOptions = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

        requestAnimationFrame(() => {
            open(
                <OptionsDrawer
                    image={track.artwork}
                    title={track.title}
                    subtitle={track.artist}
                    actions={actions}
                />
            );
        });
    }, [actions, open, track.artwork, track.artist, track.title]);

    return (
        <View className="w-full relative overflow-hidden" style={{ height: 64 }}>
            <AnimatedPressable
                onPress={() => onPress?.(track)}
                onLongPress={handleOpenOptions}
                scaleTo={0.98}
                feedback="timing"
                pressedOpacity={0.7}
                delayPressIn={80}
                pressableStyle={{ flexDirection: 'row', alignItems: 'center', height: 64 }}
            >
                {/* Artwork */}
                <View className="w-12 h-12 bg-secondary/50 overflow-hidden ml-4 mr-3 rounded-md">
                    {track.artwork ? (
                        <Image
                            source={{ uri: track.artwork }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                            transition={0}
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <View className="flex-1 items-center justify-center">
                            <Mic2 size={20} color="#9ca3af" />
                        </View>
                    )}
                </View>

                {/* Text */}
                <View className="flex-1 justify-center mr-2 py-2">
                    {/* <Text numberOfLines={1} className="text-base text-foreground font-display">
                        {track.title}
                    </Text> */}
                    <View className="min-w-0 flex-row items-end gap-2">
                        {isActive && (
                            <AudioWave
                                isPlaying={isPlaying}
                                barColor="#FCD34D"
                                barWidth={2}
                                maxHeight={16}
                                minHeight={2}
                            />
                        )}
                        <Text
                            numberOfLines={1}
                            className={cn(
                                "min-w-0 flex-1 text-[16px] font-display leading-5",
                                isActive ? "text-amber-300" : "text-foreground",
                            )}
                        >
                            {track.title}
                        </Text>
                    </View>
                    <Text numberOfLines={1} className="text-sm text-muted-foreground mt-0.5">
                        {`Song • ${track.artist}`}
                    </Text>
                </View>

                {/* More options */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full mr-1"
                    onPress={(e) => {
                        e.stopPropagation?.();
                        handleOpenOptions();
                    }}
                >
                    <Icon as={EllipsisVertical} className="text-muted-foreground" size={20} />
                </Button>
            </AnimatedPressable>
        </View>
    );
}, areEqual);

SongListCard.displayName = 'SongListCard';

export default SongListCard;
