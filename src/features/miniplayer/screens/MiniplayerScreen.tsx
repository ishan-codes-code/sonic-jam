import { BlurView } from 'expo-blur';
import { useRouter, usePathname } from 'expo-router';
import { Music, Pause, Play, Plus } from 'lucide-react-native';
import React, { useMemo } from 'react';
import tinycolor from 'tinycolor2';
import { Image, Platform, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { RecentSongPlaylistDrawer } from '@/components/features/Search/RecentSongPlaylistDrawer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useBottomSheet } from '@/hooks/useDrawer';
import { cn } from '@/lib/utils';
import { useBackgroundGradient, getBaseColor } from '@/features/collections/hooks/useBackgroundGradients';
import { usePlaybackStore, usePlayer } from '@/playbackCore';
import { theme } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * MiniplayerScreen
 * 
 * Migrated from GlobalPlayer. Re-architected for the miniplayer feature module.
 * Uses Tailwind (NativeWind) and React Native Reusables for a modern, optimized UI.
 */
export default function MiniplayerScreen() {
    const router = useRouter();
    const pathname = usePathname();
    const { pause, resume } = usePlayer();
    const { open } = useBottomSheet();

    // Playback State
    const currentSong = usePlaybackStore((s) => s.currentSong);
    const status = usePlaybackStore((s) => s.status);
    const position = usePlaybackStore((s) => s.position);
    const duration = usePlaybackStore((s) => s.duration);

    // Derived State
    const isVisible = useMemo(() => currentSong !== null && status !== 'idle' && pathname !== '/player', [currentSong, status, pathname]);
    const isPlaying = status === 'playing';
    const progressPercent = useMemo(() => (duration > 0 ? (position / duration) * 100 : 0), [position, duration]);

    const artworkUri = useMemo(() => {
        if (!currentSong) return null;
        return currentSong.image ?? (currentSong.youtubeId ? `https://img.youtube.com/vi/${currentSong.youtubeId}/hqdefault.jpg` : null);
    }, [currentSong]);

    // Dynamic Background Color — darkened if not already dark
    const { imageColors } = useBackgroundGradient(artworkUri ?? '');
    const baseColor = useMemo(() => {
        if (!imageColors) return theme.colors.backgroundCard;
        const raw = getBaseColor(imageColors);
        const color = tinycolor(raw);
        // If already dark (luminance <= 0.15), use as-is; otherwise darken it
        return color.getLuminance() <= 0.15
            ? raw
            : color.darken(20).saturate(10).toHexString();
    }, [imageColors]);

    const handleToggle = () => {
        if (isPlaying) {
            pause();
        } else {
            resume();
        }
    };

    const handleOpenPlaylist = (e: any) => {
        e.stopPropagation();
        if (currentSong) {
            open(
                <RecentSongPlaylistDrawer
                    songId={currentSong.id}
                    songTitle={currentSong.trackName}
                />,
                ['55%', '82%']
            );
        }
    };

    const handleNavigateToPlayer = () => {
        router.push('/player' as any);
    };

    if (!isVisible) return null;

    return (
        <Animated.View
            entering={FadeInDown.duration(300)}
            exiting={FadeOutDown.duration(200)}
            className={cn(
                "absolute left-2.5 right-2.5 z-50",
                Platform.OS === 'ios' ? "bottom-[96px]" : "bottom-[78px]"
            )}
        >
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={handleNavigateToPlayer}
                className="h-[62px] rounded-xl overflow-hidden border border-white/5 shadow-2xl"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 12,
                }}
            >
                {/* Background Layer */}
                <View
                    style={{ backgroundColor: baseColor }}
                    className="absolute inset-0"
                />

                <View className="flex-1">
                    {/* Content Layer */}
                    <View className="flex-1 flex-row items-center px-3">
                        {/* Artwork */}
                        <View className="w-11 h-11 rounded-lg overflow-hidden bg-white/5 justify-center items-center mr-3">
                            {artworkUri ? (
                                <Image
                                    source={{ uri: artworkUri }}
                                    className="absolute inset-0"
                                    resizeMode="cover"
                                />
                            ) : (
                                <>
                                    <LinearGradient
                                        colors={[theme.colors.backgroundInteractive, theme.colors.backgroundCard]}
                                        className="absolute inset-0"
                                    />
                                    <Music color={theme.colors.textMuted} size={18} />
                                </>
                            )}
                        </View>

                        {/* Text Metadata */}
                        <View className="flex-1 justify-center">
                            <Text
                                className="text-[13px] font-semibold text-white leading-tight"
                                numberOfLines={1}
                            >
                                {currentSong?.trackName}
                            </Text>
                            <Text
                                className="text-[11px] text-white/60 mt-0.5"
                                numberOfLines={1}
                            >
                                {currentSong?.artists?.map((a: any) => a.name).join(', ')}
                            </Text>
                        </View>

                        {/* Controls Group */}
                        <View className="flex-row items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-10 h-10"
                                onPress={handleOpenPlaylist}
                            >
                                <Plus color="white" size={24} />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-10 h-10"
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleToggle();
                                }}
                            >
                                {isPlaying ? (
                                    <Pause color="white" fill="white" size={22} />
                                ) : (
                                    <Play color="white" fill="white" size={22} />
                                )}
                            </Button>
                        </View>
                    </View>

                    {/* Optimized Progress Indicator */}
                    <View className="px-2 pb-0.5">
                        <Progress
                            value={progressPercent}
                            className="h-[2px] bg-white/10 rounded-full"
                            indicatorClassName="bg-white"
                        />
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}