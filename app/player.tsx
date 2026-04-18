import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
    Dimensions,
    StyleSheet,
    View,
    TouchableOpacity,
} from 'react-native';
import { usePlaybackStore, usePlayer } from '@/src/playbackCore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Smartphone, Share2, ListMusic } from 'lucide-react-native';
import { useBottomSheet } from '@/src/hooks/useDrawer';

// Optimized Modular Components
import { PlayerHeader } from '@/src/components/features/player/PlayerHeader';
import { PlayerArtwork } from '@/src/components/features/player/PlayerArtwork';
import { PlayerControls } from '@/src/components/features/player/PlayerControls';
import { PlayerBackground } from '@/src/components/features/player/PlayerBackground';
import { PlayerQueueDrawer } from '@/src/components/features/player/PlayerQueueDrawer';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Pixel-perfect Player Screen redesign.
 * Decoupled from the queue list (now in Drawer) for maximum performance and 60FPS fluid motion.
 */
export default function PlayerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { pause, resume, skipToNext, skipToPrevious } = usePlayer();
    const { open } = useBottomSheet();

    const currentSong = usePlaybackStore(s => s.currentSong);
    const status = usePlaybackStore(s => s.status);
    const isPlaying = status === 'playing';

    const artworkUri = useMemo(() => {
        return currentSong?.image
            ?? (currentSong?.youtubeId
                ? `https://img.youtube.com/vi/${currentSong.youtubeId}/hqdefault.jpg`
                : null);
    }, [currentSong]);

    const handleToggle = useCallback(() => {
        isPlaying ? pause() : resume();
    }, [isPlaying]);

    const handleOpenQueue = useCallback(() => {
        // Open the queue in a high-performance bottom sheet with 50% & 100% snap points
        open(<PlayerQueueDrawer />, ['50%', '100%']);
    }, [open]);

    if (!currentSong) return null;

    return (
        <View style={styles.root}>
            {/* Immersive background with dynamic artwork colors */}
            <PlayerBackground />

            <View style={[styles.content, { paddingBottom: insets.bottom + 12 }]}>
                {/* Minimalist Top Bar */}
                <PlayerHeader
                    onBack={() => router.back()}
                    insetsTop={insets.top}
                />

                {/* Dominant Hero Artwork Section */}
                <View style={styles.artworkSection}>
                    <PlayerArtwork 
                        artworkUri={artworkUri} 
                        animatedStyle={{}} 
                    />
                </View>

                {/* Primary Interaction Area */}
                <View style={styles.controlsSection}>
                    <PlayerControls
                        currentSong={currentSong}
                        isPlaying={isPlaying}
                        onToggle={handleToggle}
                        onNext={skipToNext}
                        onPrev={skipToPrevious}
                        animatedStyle={{}}
                    />
                </View>

                {/* Utility Footer Bar */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.footerBtn} activeOpacity={0.6}>
                        <Smartphone size={20} color="white" opacity={0.6} />
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />

                    <TouchableOpacity style={styles.footerBtn} activeOpacity={0.6}>
                        <Share2 size={20} color="white" opacity={0.6} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.footerBtn} 
                        activeOpacity={0.6}
                        onPress={handleOpenQueue}
                    >
                        <ListMusic size={22} color="white" opacity={0.6} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    artworkSection: {
        flex: 1,
        justifyContent: 'center',
        maxHeight: SCREEN_HEIGHT * 0.5,
    },
    controlsSection: {
        paddingHorizontal: 28,
        paddingBottom: 20,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        alignItems: 'center',
        height: 48,
    },
    footerBtn: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
});