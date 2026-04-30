import React, { useCallback, useRef } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Image } from 'expo-image';
import { EllipsisVertical, Play, Plus, ListMusic, Mic2 } from 'lucide-react-native';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { CleanedSearchResult } from '../features/search/types';
import { Gesture, GestureDetector, NativeViewGestureHandler } from 'react-native-gesture-handler';

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    runOnJS,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { useToast } from '@/hooks/useToast';
import * as Haptics from 'expo-haptics';

// ─── Module-level constants ────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 60;
const MAX_TRANSLATE = 120;
const VELOCITY_THRESHOLD = 800;
const SPRING_CONFIG = { damping: 18, stiffness: 260, mass: 0.7 } as const;
const SNAP_SPRING = { damping: 20, stiffness: 300, mass: 0.6 } as const;

const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
};

const areEqual = (prev: SongListCardProps, next: SongListCardProps) =>
    prev.song.id === next.song.id &&
    prev.song.title === next.song.title &&
    prev.song.artist === next.song.artist &&
    prev.song.artwork === next.song.artwork;

interface SongListCardProps {
    song: CleanedSearchResult;
    onPress?: (song: CleanedSearchResult) => void;
}

const SongListCard = React.memo(({ song, onPress }: SongListCardProps) => {
    const translateX = useSharedValue(0);
    const hasTriggered = useSharedValue(false);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    const toast = useToast();
    const toastRef = useRef(toast);
    toastRef.current = toast; // always up-to-date, no useEffect needed

    const showToast = useCallback((title: string) => {
        toastRef.current.success(`Added ${title} to queue`);
    }, []);

    const handlePress = useCallback(() => {
        onPress?.(song);
    }, [onPress, song]);

    const pan = Gesture.Pan()
        .manualActivation(true)

        .onBegin((event) => {
            startX.value = event.x;
            startY.value = event.y;
        })
        .onTouchesMove((event, state) => {
            const touch = event.changedTouches[0];
            const dx = touch.x - startX.value;
            const dy = Math.abs(touch.y - startY.value);

            // If they've moved vertically too much before horizontal threshold, fail
            if (dy > 8 && dx < 20) {
                state.fail();
                return;
            }

            // Activate only if horizontal movement is significant and strictly "flatter" than vertical
            // dx > 40px AND dx is at least 2.5x the vertical movement
            if (dx > 40 && dx > dy * 2.5) {
                state.activate();
            }
        })

        .onUpdate((event) => {
            'worklet';
            if (hasTriggered.value) return;
            if (event.translationX > 0) {
                if (event.translationX <= MAX_TRANSLATE) {
                    translateX.value = event.translationX;
                } else {
                    const extra = event.translationX - MAX_TRANSLATE;
                    translateX.value = Math.min(MAX_TRANSLATE + extra * 0.1, MAX_TRANSLATE + 18);
                }
            }
        })
        .onEnd((event) => {
            'worklet';
            if (hasTriggered.value) return;

            const triggered =
                event.translationX > SWIPE_THRESHOLD ||
                (event.velocityX > VELOCITY_THRESHOLD && event.translationX > 20) ||
                (event.translationX > 40 && event.velocityX > 400);

            if (triggered) {
                hasTriggered.value = true;
                runOnJS(triggerHaptic)();
                translateX.value = withSpring(MAX_TRANSLATE, { ...SNAP_SPRING, velocity: event.velocityX }, (done) => {
                    'worklet';
                    if (done) {
                        runOnJS(showToast)(song.title);
                        translateX.value = withDelay(60, withSpring(0, SPRING_CONFIG, (f) => {
                            'worklet';
                            if (f) hasTriggered.value = false;
                        }));
                    }
                });
            } else {
                translateX.value = withSpring(0, { ...SNAP_SPRING, velocity: event.velocityX });
            }
        });

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        backfaceVisibility: 'hidden',
    }));

    const bgStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, 12], [0, 1], Extrapolation.CLAMP),
        width: translateX.value,
    }));

    const iconStyle = useAnimatedStyle(() => {
        const p = Math.min(1, Math.max(0, translateX.value / MAX_TRANSLATE));
        const e = Math.pow(p, 0.8);
        return {
            opacity: interpolate(e, [0.1, 0.6], [0, 1], Extrapolation.CLAMP),
            transform: [{ scale: interpolate(e, [0.1, 1], [0.85, 1], Extrapolation.CLAMP) }],
        };
    });

    return (
        <View className="w-full relative overflow-hidden">
            {/* Background — Now with dynamic width to prevent bleeding under transparent cards */}
            <Animated.View
                className="absolute inset-y-0 left-0 flex-row items-center pl-6 bg-[#6366f1] overflow-hidden"
                style={bgStyle}
                pointerEvents="none"
            >
                <Animated.View style={iconStyle}>
                    <ListMusic color="white" size={22} />
                </Animated.View>
            </Animated.View>

            <GestureDetector gesture={pan}>
                <Animated.View style={cardStyle}>
                    <View className="flex-row items-center bg-transparent">
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={handlePress}
                            className="flex-1 flex-row items-center px-4 py-2"
                        >
                            <View className="w-12 h-12 bg-secondary/50 overflow-hidden mr-3 rounded-md">
                                {song.artwork ? (
                                    <Image
                                        source={{ uri: song.artwork }}
                                        style={{ width: '100%', height: '100%' }}
                                        contentFit="cover"
                                        transition={150}
                                        cachePolicy="memory-disk"
                                        recyclingKey={song.id}
                                    />
                                ) : (
                                    <View className="flex-1 items-center justify-center">
                                        <Mic2 size={20} color="#9ca3af" />
                                    </View>
                                )}
                            </View>

                            <View className="flex-1 justify-center mr-2">
                                <Text numberOfLines={1} className="text-base text-foreground font-display ">
                                    {song.title}
                                </Text>
                                <Text numberOfLines={1} className="text-sm text-muted-foreground mt-0.5">
                                    {`Song • ${song.artist}`}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View className="pr-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                                        <Icon as={EllipsisVertical} className="text-muted-foreground" size={20} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end">
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem onPress={handlePress}>
                                            <Icon as={Play} size={18} className="mr-2" />
                                            <Text>Play</Text>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onPress={() => console.log('Add to queue:', song.title)}>
                                            <Icon as={ListMusic} size={18} className="mr-2" />
                                            <Text>Add to queue</Text>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onPress={() => console.log('Add to playlist:', song.title)}>
                                            <Icon as={Plus} size={18} className="mr-2" />
                                            <Text>Add to playlist</Text>
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </View>
                    </View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}, areEqual);

SongListCard.displayName = 'SongListCard';

export default SongListCard;