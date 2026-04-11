import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
    Dimensions,
    StyleSheet,
    View,
    ScrollView,
    Text,
} from 'react-native';
import { usePlaybackStore, usePlayer } from '@/src/playbackCore';
import { theme } from '@/src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';

// Modular Components
import { PlayerHeader } from '@/src/components/features/player/PlayerHeader';
import { PlayerArtwork } from '@/src/components/features/player/PlayerArtwork';
import { PlayerControls } from '@/src/components/features/player/PlayerControls';
import { PlayerQueue } from '@/src/components/features/player/PlayerQueue';
import { PlayerBackground } from '@/src/components/features/player/PlayerBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PlayerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { pause, resume, skipToNext, skipToPrevious } = usePlayer();

    const currentSong = usePlaybackStore(s => s.currentSong);
    const status = usePlaybackStore(s => s.status);
    const isPlaying = status === 'playing';

    const [queue, setQueue] = React.useState<any[]>([]);
    const [activeIndex, setActiveIndex] = React.useState(0);

    React.useEffect(() => {
        let cancelled = false;
        const fetchQueue = async () => {
            const q = await TrackPlayer.getQueue();
            const idx = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
            if (!cancelled) {
                setActiveIndex(idx);
                setQueue(q.slice(idx + 1));
            }
        };
        fetchQueue();
        return () => { cancelled = true; };
    }, [currentSong]);

    const artworkUri = useMemo(() => {
        return currentSong?.image
            ?? (currentSong?.youtubeId
                ? `https://img.youtube.com/vi/${currentSong.youtubeId}/hqdefault.jpg`
                : null);
    }, [currentSong]);

    const handleToggle = useCallback(() => {
        isPlaying ? pause() : resume();
    }, [isPlaying]);

    if (!currentSong) return null;

    return (
        <View style={styles.root}>
            <PlayerBackground />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            >
                <PlayerHeader
                    onBack={() => router.back()}
                    insetsTop={insets.top}
                />

                {/* 1. Artwork */}
                <View style={styles.artworkSection}>
                    <PlayerArtwork
                        artworkUri={artworkUri}
                        animatedStyle={{}}
                    />
                </View>

                {/* 2. Controls */}
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

                {/* 3. Integrated Queue */}
                <View style={styles.queueContainer}>
                    <PlayerQueue queue={queue} activeIndex={activeIndex} />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#0A0A0C',
    },
    artworkSection: {
        alignItems: 'center',
        marginTop: 10,
    },
    controlsSection: {
        paddingHorizontal: theme.spacing.xl,
        marginTop: 10, // Tighter spacing for a better blend
    },


    queueContainer: {
        width: SCREEN_WIDTH,
        // No separate background or border radius here, so it blends perfectly
    },
});