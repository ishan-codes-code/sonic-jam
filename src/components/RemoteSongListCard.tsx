import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { View, InteractionManager } from 'react-native';
import { Text } from '@/components/ui/text';
import { Image } from 'expo-image';
import { EllipsisVertical, Play, ListMusic, Mic2 } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { CleanedSearchResult } from '../features/search/types';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AnimatedPressable from './AnimatedPressable';

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
import { useBottomSheet } from '@/features/drawer';
import { OptionsDrawer } from '../features/drawer/components/OptionsDrawer';

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
    onPress?: () => void;
    menuActions?: RemoteSongListCardAction[];
}

export type RemoteSongListCardAction = {
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
};

const SongListCard = React.memo(({ song, onPress, menuActions }: SongListCardProps) => {
    const translateX = useSharedValue(0);
    const hasTriggered = useSharedValue(false);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    const { open } = useBottomSheet();

    const toast = useToast();
    const toastRef = useRef(toast);
    toastRef.current = toast;

    // Latest Ref Pattern to avoid unnecessary re-renders of list items while preventing stale closures
    const onPressRef = useRef(onPress);
    const menuActionsRef = useRef(menuActions);

    useEffect(() => {
        onPressRef.current = onPress;
        menuActionsRef.current = menuActions;
    });

    const showToast = useCallback((title: string) => {
        toastRef.current.success(`Added ${title} to queue`);
    }, []);

    const handlePress = useCallback(() => {
        onPressRef.current?.();
    }, []);

    const handleOpenOptions = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

        // Lazy action array creation only when drawer opens
        const currentActions = menuActionsRef.current ?? (onPressRef.current ? [
            {
                label: 'Play',
                icon: <Icon as={Play} size={18} className="mr-2" />,
                onPress: handlePress,
            },
        ] : []);

        // Defer until press animation and FlatList render cycle settles
        InteractionManager.runAfterInteractions(() => {
            open(
                <OptionsDrawer
                    image={song.artwork}
                    title={song.title}
                    subtitle={song.artist}
                    actions={currentActions}
                />
            );
        });
    }, [handlePress, open, song.artwork, song.artist, song.title]);

    // Natively run strict diagonal gesture activation on the UI thread to play perfectly with vertical list scroll
    const pan = useMemo(
        () =>
            Gesture.Pan()
                .manualActivation(true)
                .onBegin((event) => {
                    'worklet';
                    startX.value = event.x;
                    startY.value = event.y;
                })
                .onTouchesMove((event, state) => {
                    'worklet';
                    const touch = event.changedTouches[0];
                    if (!touch) return;

                    const dx = touch.x - startX.value;
                    const dy = touch.y - startY.value;
                    const absDx = Math.abs(dx);
                    const absDy = Math.abs(dy);

                    // 1. Fail immediately if swiping left (since we only support swipe-to-queue on the right)
                    if (dx < -6) {
                        state.fail();
                        return;
                    }

                    // 2. Fail immediately if vertical movement is dominant or starts moving vertically
                    if (absDy > 6 && absDy > absDx * 0.6) {
                        state.fail();
                        return;
                    }

                    // 3. Fail immediately on any substantial vertical movement to ensure list scrolling is never blocked
                    if (absDy > 10) {
                        state.fail();
                        return;
                    }

                    // 4. Activate horizontal swipe only if horizontal movement is distinct and highly dominant
                    if (dx > 25 && dx > absDy * 2.5) {
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
                }),
        [hasTriggered, showToast, song.title, startX, startY, translateX]
    );

    const cardStyle = useAnimatedStyle(() => {
        'worklet';
        // Bypass compositor layer creation completely when not active
        if (translateX.value === 0) {
            return {};
        }
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    // GPU accelerated translate style using only composite-only opacity and offscreen positioning when idle
    const bgStyle = useAnimatedStyle(() => {
        'worklet';
        if (translateX.value === 0) {
            return {
                opacity: 0,
                transform: [{ translateX: -MAX_TRANSLATE - 100 }],
            };
        }
        return {
            opacity: interpolate(translateX.value, [0, 12], [0, 1], Extrapolation.CLAMP),
            transform: [{ translateX: translateX.value - MAX_TRANSLATE }],
        };
    });

    // Hide Lucide icon wrapper completely when idle using composite-only properties
    const iconStyle = useAnimatedStyle(() => {
        'worklet';
        if (translateX.value === 0) {
            return {
                opacity: 0,
                transform: [{ scale: 0.85 }],
            };
        }
        const p = Math.min(1, Math.max(0, translateX.value / MAX_TRANSLATE));
        const e = Math.pow(p, 0.8);
        return {
            opacity: interpolate(e, [0.1, 0.6], [0, 1], Extrapolation.CLAMP),
            transform: [{ scale: interpolate(e, [0.1, 1], [0.85, 1], Extrapolation.CLAMP) }],
        };
    });

    return (
        <View className="w-full relative overflow-hidden" style={{ height: 64 }}>
            {/* Swipe-right background: Add to Queue */}
            <Animated.View
                className="absolute inset-y-0 left-0 flex-row items-center pl-6 bg-amber-400 overflow-hidden"
                style={[{ width: MAX_TRANSLATE }, bgStyle]}
                pointerEvents="none"
            >
                <Animated.View style={iconStyle}>
                    <ListMusic color="black" size={22} />
                </Animated.View>
            </Animated.View>

            <GestureDetector gesture={pan}>
                <Animated.View style={cardStyle}>
                    <AnimatedPressable
                        onPress={handlePress}
                        scaleTo={0.98}
                        feedback="timing"
                        pressedOpacity={0.7}
                        delayPressIn={80}
                        pressableStyle={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                        {/* Artwork */}
                        <View className="w-12 h-12 bg-secondary/50 overflow-hidden ml-4 mr-3 rounded-md">
                            {song.artwork ? (
                                <Image
                                    source={{ uri: song.artwork }}
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
                            <Text numberOfLines={1} className="text-base text-foreground font-display">
                                {song.title}
                            </Text>
                            <Text numberOfLines={1} className="text-sm text-muted-foreground mt-0.5">
                                {`Song • ${song.artist}`}
                            </Text>
                        </View>

                        {/* More options — stops event propagation via its own onPress */}
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
                </Animated.View>
            </GestureDetector>
        </View>
    );
}, areEqual);

SongListCard.displayName = 'SongListCard';

export default SongListCard;
