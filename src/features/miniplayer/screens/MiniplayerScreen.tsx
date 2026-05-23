import { useRouter, usePathname } from 'expo-router';
import { Music, Pause, Play, Plus } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';


import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useBottomSheet } from '@/features/drawer';
import { useArtworkColors } from '@/features/artwork-colors';
import { usePlaybackStore, usePlayer } from '@/features/playback';
import { LinearGradient } from 'expo-linear-gradient';
import AddToPlaylistDrawer from '@/features/library/components/AddToPlaylistDrawer';
import { PlaybackLoadingIndicator } from '@/features/playback/components/PlaybackLoadingIndicator';
import { Icon } from '@/components/ui/icon';

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
    const insets = useSafeAreaInsets();

    // Tab bar height = pt-2.5(10) + tabItem(~47) + paddingBottom(max safeArea, 8)
    // Updated height to account for the taller pt-14 (56px) tab bar padding
    const TAB_BAR_CONTENT_HEIGHT = 56;
    const bottomOffset = TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 8);

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

    // Dynamic Background Color — extracted, saturated, and darkened by the service
    const { colors: artworkColors } = useArtworkColors(artworkUri);
    const baseColor = artworkColors?.primary ?? "#000000";

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
                <AddToPlaylistDrawer
                    songId={currentSong.id}
                    title={currentSong.trackName}
                    subtitle={currentSong.artists?.map((a: any) => a.name).join(', ')}
                    image={currentSong.image}
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
            className="absolute left-2.5 right-2.5 z-50"
            style={{ bottom: bottomOffset }}
        >
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={handleNavigateToPlayer}
                className="h-[62px] rounded-xl overflow-hidden border border-white/5 shadow-2xl"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.5,
                    shadowRadius: 16,
                    elevation: 16,
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
                                        colors={["#1c1c1f", "#000000"]}
                                        className="absolute inset-0"
                                    />
                                    <Icon as={Music} size={18} className='text-muted-foreground' />

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
                                disabled={status === 'loading'}
                            >
                                {status === 'loading' ? (
                                    <PlaybackLoadingIndicator color="white" size={22} />
                                ) : isPlaying ? (
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