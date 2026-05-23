import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Dimensions, View, TouchableOpacity, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { usePlaybackStore, usePlayer } from '@/features/playback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Smartphone, Share2, ListMusic } from 'lucide-react-native';
import { useBottomSheet } from '@/features/drawer';
import { useShallow } from 'zustand/react/shallow';

// Optimized Modular Components
import { PlayerHeader } from '../components/PlayerHeader';
import { PlayerArtwork } from '../components/PlayerArtwork';
import { PlayerControls } from '../components/PlayerControls';
import { PlayerBackground } from '../components/PlayerBackground';
import { PlayerQueueDrawer } from '../components/PlayerQueueDrawer';
import { shareSong } from '@/features/song/utils/shareSong';
import { SongInfoDrawer } from '../components/SongInfoDrawer';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Pixel-perfect Player Screen redesign utilizing NativeWind and UI UX Pro Max.
 * Decoupled from the queue list (now in Drawer) for maximum performance and 60FPS fluid motion.
 */


export const PlayerScreen = React.memo(() => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { pause, resume, skipToNext, skipToPrevious, toggleRepeatMode } = usePlayer();
    const { open } = useBottomSheet();

    // Single subscription with shallow equality — avoids 4 separate store listeners
    // that each re-subscribe on every render cycle.
    const { currentSong, repeatMode, status, pendingJobId } = usePlaybackStore(
        useShallow(s => ({
            currentSong: s.currentSong,
            repeatMode: s.repeatMode,
            status: s.status,
            pendingJobId: s.pendingJobId,
        }))
    );
    const isPlaying = status === 'playing';

    const artworkUri = useMemo(() => {
        return currentSong?.image
            ?? (currentSong?.youtubeId
                ? `https://img.youtube.com/vi/${currentSong.youtubeId}/hqdefault.jpg`
                : null);
    }, [currentSong]);

    // Include pause/resume in deps to avoid a stale closure bug
    const handleToggle = useCallback(() => {
        isPlaying ? pause() : resume();
    }, [isPlaying, pause, resume]);

    const handleOpenQueue = useCallback(() => {
        // Open the queue with Spotify-like multi-snap points
        open(<PlayerQueueDrawer />, ['25%', '60%', '90%']);
    }, [open]);

    // Stable reference so PlayerHeader never re-renders due to a new arrow on every cycle
    const handleBack = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/home'); // fallback route
        }
    }, [router]);

    const handleMorePress = useCallback(() => {
        if (!currentSong) return;
        open(<SongInfoDrawer song={currentSong} />, ['50%', '80%']);
    }, [open, currentSong]);

    if (!currentSong) return null;

    return (
        <View className="flex-1 bg-black">
            {/* Immersive background with dynamic artwork colors */}
            <PlayerBackground />

            <View className="flex-1 justify-between" style={{ paddingBottom: insets.bottom + 12 }}>
                {/* Minimalist Top Bar */}
                <PlayerHeader
                    onBack={handleBack}
                    insetsTop={insets.top}
                    onMorePress={handleMorePress}
                />

                {/* Dominant Hero Artwork Section */}
                <View className="flex-1 justify-center" style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}>
                    <PlayerArtwork
                        artworkUri={artworkUri}
                    />
                </View>

                {/* Primary Interaction Area */}
                <View className="px-7 pb-5">
                    {status === 'loading' && pendingJobId && (
                        <Animated.View
                            entering={FadeInDown.duration(400)}
                            exiting={FadeOutDown.duration(300)}
                            className="mb-4 bg-white/10 px-4 py-3 rounded-xl border border-white/10"
                        >
                            <Text className="text-white/80 text-center text-sm font-medium leading-5">
                                Oh great, another song we don't have.{"\n"}
                                Please wait while we magically steal it from the internet...
                            </Text>
                        </Animated.View>
                    )}
                    <PlayerControls
                        currentSong={currentSong}
                        isPlaying={isPlaying}
                        status={status}
                        onToggle={handleToggle}
                        onNext={skipToNext}
                        onPrev={skipToPrevious}
                        repeatMode={repeatMode}
                        onToggleRepeat={toggleRepeatMode}
                    />
                </View>

                {/* Utility Footer Bar */}
                <View className="h-12 flex-row items-center px-5">
                    <TouchableOpacity className="h-12 w-12 items-center justify-center" activeOpacity={0.6}>
                        <Smartphone size={20} color="white" opacity={0.6} />
                    </TouchableOpacity>

                    <View className="flex-1" />

                    <TouchableOpacity className="h-12 w-12 items-center justify-center" activeOpacity={0.6} onPress={() => shareSong(currentSong.id, currentSong.trackName, false)}>
                        <Share2 size={20} color="white" opacity={0.6} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="h-12 w-12 items-center justify-center"
                        activeOpacity={0.6}
                        onPress={handleOpenQueue}
                    >
                        <ListMusic size={22} color="white" opacity={0.6} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});
