import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { theme } from '@/src/theme';
import SongListCard from '../Playlist/SongListCard';
import { Ionicons } from '@expo/vector-icons';

interface QueueTrack {
    title?: string;
    artist?: string;
    artwork?: string;
    duration?: number;
    songId?: string;
    url?: string;
}

interface PlayerQueueProps {
    queue: QueueTrack[];
    activeIndex: number;
}

export const PlayerQueue = ({ queue, activeIndex }: PlayerQueueProps) => {
    if (queue.length === 0) {
        return (
            <View style={styles.queueSection}>
                <View style={styles.queueHeader}>
                    <Text style={styles.queueTitle}>Up Next</Text>
                </View>
                <View style={styles.emptyQueue}>
                    <Ionicons name="musical-notes" color="rgba(255,255,255,0.25)" size={32} />
                    <Text style={styles.emptyQueueText}>Recommendations loading…</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.queueSection}>
            <View style={styles.queueHeader}>
                <Text style={styles.queueTitle}>Up Next</Text>
                <Text style={styles.queueCount}>{queue.length} tracks</Text>
            </View>

            {queue.map((item, relativeIndex) => {
                const absoluteIndex = activeIndex + 1 + relativeIndex;
                const playlistSong = {
                    id: item.songId || `${item.title}-${item.artist}-${relativeIndex}`,
                    title: item.title || 'Unknown Track',
                    channelName: item.artist,
                    duration: item.duration || 0,
                    youtubeId: item.url || '',
                    position: 0,
                    channelId: '',
                } as any;

                return (
                    <SongListCard
                        key={playlistSong.id}
                        playlistSongs={playlistSong}
                        artworkUri={item.artwork}
                        onPress={() => TrackPlayer.skip(absoluteIndex)}
                        trailingActions={[
                            {
                                icon: <Ionicons name="menu" size={20} color="rgba(255,255,255,0.4)" />,
                                onPress: () => { },
                                accessibilityLabel: "Reorder",
                            }
                        ]}
                    />
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    queueSection: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: 20,
    },
    queueHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: theme.spacing.md,
    },
    queueTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    queueCount: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyQueue: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
    },
    emptyQueueText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 14,
    },
});
