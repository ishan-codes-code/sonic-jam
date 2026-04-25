import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { usePlaybackStore, usePlayer } from '@/src/playbackCore';
import { theme } from '@/src/theme';
import TrackPlayer from 'react-native-track-player';
import SongListCard from '../Playlist/SongListCard';
import { useBottomSheet } from '@/src/hooks/useDrawer';
import { Shuffle, Timer, Menu } from 'lucide-react-native';

/**
 * Pixel-perfect Queue Drawer with specialized sectioning for Currently Playing and Up Next.
 * Uses a drag-handle placeholder for reordering and snap points at 50% and 100%.
 */
export const PlayerQueueDrawer = () => {
    const { close } = useBottomSheet();
    const { toggleShuffle } = usePlayer();
    const isShuffling = usePlaybackStore(s => s.isShuffling);
    const isPlaying = usePlaybackStore(s => s.status === 'playing');
    const currentSong = usePlaybackStore(s => s.currentSong);
    const queueRevision = usePlaybackStore(s => s.queueRevision);

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

    // Split the queue into "Current" and "Next"
    const nextQueue = useMemo(() => {
        return queue.slice(activeIndex + 1);
    }, [queue, activeIndex]);

    const dragHandle = useMemo(() => (
        <Menu size={20} color={theme.colors.textSecondary} opacity={0.6} />
    ), []);

    return (
        <View style={styles.container}>
            {/* 1. Header Section */}
            <View style={styles.header}>
                <Text style={styles.title}>Queue</Text>
                <Text style={styles.subtitle}>Recommended for you</Text>
            </View>

            <BottomSheetFlatList
                style={{ flex: 1 }}
                data={nextQueue}
                keyExtractor={(item, index) => `${item.id || item.songId || item.title}-${index}`}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        {/* 2. Now Playing Section */}
                        {currentSong && (
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>NOW PLAYING</Text>
                                <SongListCard
                                    playlistSongs={currentSong}
                                    isCurrent={true}
                                    isPlaying={isPlaying}
                                    onPress={() => {}} 
                                    disableLongPress={true}
                                />
                            </View>
                        )}

                        {/* 3. Up Next Header */}
                        {nextQueue.length > 0 && (
                            <View style={[styles.section, { marginTop: 12 }]}>
                                <Text style={styles.sectionLabel}>UP NEXT</Text>
                            </View>
                        )}
                    </View>
                }
                renderItem={({ item, index }) => {
                    const globalIndex = activeIndex + 1 + index;
                    
                    const playlistSong = {
                        id: item.songId || item.title,
                        trackName: item.title,
                        artists: item.song?.artists || [{ name: item.artist || 'Unknown', id: 'unknown', normalizedName: 'unknown' }],
                        image: item.artwork,
                        duration: item.duration,
                    } as any;

                    return (
                        <SongListCard
                            playlistSongs={playlistSong}
                            isCurrent={false}
                            isPlaying={false}
                            onPress={() => {
                                TrackPlayer.skip(globalIndex).then(close);
                            }}
                            disableLongPress={true}
                            rightElement={dragHandle}
                        />
                    );
                }}
            />

            {/* 4. Footer Actions */}
            {(currentSong || nextQueue.length > 0) && (
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[styles.footerBtn, isShuffling && styles.footerBtnActive]} 
                        onPress={toggleShuffle}
                    >
                        <Shuffle size={20} color={isShuffling ? theme.colors.actionAccent : 'white'} />
                        <Text style={[styles.footerBtnText, isShuffling && styles.footerBtnTextActive]}>Shuffle</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.footerBtn}>
                        <Timer size={20} color="white" />
                        <Text style={styles.footerBtnText}>Timer</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundCard,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: -0.4,
    },
    subtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 2,
        fontWeight: '500',
    },
    listHeader: {
        paddingBottom: 8,
    },
    section: {
        marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16, 
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 24, 
        gap: 12,
        backgroundColor: theme.colors.backgroundCard,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    footerBtn: {
        flex: 1,
        height: 52,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    footerBtnActive: {
        backgroundColor: 'rgba(0, 227, 253, 0.1)',
    },
    footerBtnText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    footerBtnTextActive: {
        color: theme.colors.actionAccent,
    },
});
