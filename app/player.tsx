import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
    Dimensions,
    StyleSheet,
    View,
    FlatList,
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
import { PlayerBackground } from '@/src/components/features/player/PlayerBackground';
import SongListCard from '@/src/components/features/Playlist/SongListCard';
import { Ionicons } from '@expo/vector-icons';
import { useBottomSheet } from '@/src/hooks/useDrawer';
import { MusicOptionsDrawer } from '@/src/components/ui/MusicOptionsDrawer';
import { RecentSongPlaylistDrawer } from '@/src/components/features/Search/RecentSongPlaylistDrawer';
import { createQueueSongActions } from '@/src/utils/songsActions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PlayerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { pause, resume, skipToNext, skipToPrevious, playNext, removeFromQueue } = usePlayer();
    const { open, close } = useBottomSheet();

    const currentSong = usePlaybackStore(s => s.currentSong);
    const status = usePlaybackStore(s => s.status);
    const queueRevision = usePlaybackStore(s => s.queueRevision);
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
                setQueue(q);
            }
        };
        fetchQueue();

        const { Event } = require('react-native-track-player');
        const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, fetchQueue);

        return () => { 
            cancelled = true; 
            sub.remove();
        };
    }, [queueRevision]);

    const artworkUri = useMemo(() => {
        return currentSong?.image
            ?? (currentSong?.youtubeId
                ? `https://img.youtube.com/vi/${currentSong.youtubeId}/hqdefault.jpg`
                : null);
    }, [currentSong]);

    const displayedQueue = useMemo(() => {
        return queue.slice(activeIndex, activeIndex + 10);
    }, [queue, activeIndex]);

    const handleToggle = useCallback(() => {
        isPlaying ? pause() : resume();
    }, [isPlaying]);

    if (!currentSong) return null;

    return (
        <View style={styles.root}>
            <PlayerBackground />

            <FlatList
                data={displayedQueue}
                keyExtractor={(item, index) => `${item.songId || item.title}-${activeIndex + index}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                ListHeaderComponent={
                    <>
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

                        {/* 3. Queue Header (Moved up to ListHeader) */}
                        <View style={styles.queueContainer}>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 16,
                                paddingHorizontal: theme.spacing.lg + theme.spacing.md,
                                paddingTop: 20
                            }}>
                                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Up Next</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' }}>
                                    {Math.max(0, queue.length - activeIndex - 1)} up next
                                </Text>
                            </View>
                            {displayedQueue.length === 0 && (
                                <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Recommendations loading…</Text>
                                </View>
                            )}
                        </View>
                    </>
                }
                renderItem={({ item, index }) => {
                    const globalIndex = activeIndex + index;
                    const isCurrent = index === 0;
                    const playlistSong = {
                        id: `${item.songId || item.title}-${globalIndex}`,
                        title: item.title || 'Unknown Track',
                        channelName: item.artist,
                        duration: item.duration || 0,
                        youtubeId: item.url || '',
                        position: 0,
                        channelId: '',
                        trackName: item.title || 'Unknown Track',
                        artistName: item.artist,
                    } as any;

                    return (
                        <View style={{ paddingHorizontal: theme.spacing.lg }}>
                            <SongListCard
                                playlistSongs={playlistSong}
                                artworkUri={item.artwork}
                                isCurrent={isCurrent}
                                isPlaying={isPlaying}
                                onPress={() => TrackPlayer.skip(globalIndex)}
                                actions={createQueueSongActions({
                                    onClose: close,
                                    onPlayNext: () => {
                                        void playNext({ songId: item.songId });
                                    },
                                    onRemove: () => {
                                        void removeFromQueue(globalIndex);
                                    },
                                    onOpenAddToPlaylist: () => {
                                        open(
                                            <RecentSongPlaylistDrawer
                                                songId={item.songId}
                                                songTitle={playlistSong.title}
                                            />,
                                            ['55%', '82%']
                                        );
                                    }
                                })}
                            />
                        </View>
                    );
                }}

                extraData={activeIndex} // Ensure it rerenders the highlight when activeIndex changes
                initialNumToRender={8}
                windowSize={5}
                maxToRenderPerBatch={8}
                removeClippedSubviews={true}
            />
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