import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Image } from 'expo-image';
import { EllipsisVertical, Mic2 } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import * as Haptics from 'expo-haptics';
import { CollectionTrack } from '../types';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { cn } from '@/lib/utils';
import AudioWave from '@/components/AudioWave';
import { usePlaybackStore } from '@/features/playback';

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
    const handleOpenOptions = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }, []);
    const isPlaying = usePlaybackStore((s) => s.status === "playing");

    return (
        <View className="w-full relative overflow-hidden" style={{ height: 64 }}>
            <AnimatedPressable
                onPress={() => onPress?.(track)}
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
