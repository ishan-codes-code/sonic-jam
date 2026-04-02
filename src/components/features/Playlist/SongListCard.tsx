import { formatPlaylistDuration } from '@/app/(tabs)/library/[playlistId]';
import { PlaylistSongs } from '@/src/api/musicApi';
import { useBottomSheet } from '@/src/hooks/useDrawer';
import { usePlayerStore } from '@/src/player/player.store';
import { getThumbnailUrl } from '@/src/services/youtube';
import { theme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Button, Image, StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from '../../ui/AnimatedPressable';

interface SongListCardProps {
    playlistSongs: PlaylistSongs
    onPress: () => void;
    onLongPress: () => void;
}

export default function SongListCard({ playlistSongs, onPress, onLongPress }: SongListCardProps) {
    const [imageError, setImageError] = useState(false);
    const thumbnailUrl = getThumbnailUrl(playlistSongs.youtubeId);

    const { playSong } = usePlayerStore()

    const { open, close } = useBottomSheet();

    const handleOpen = () => {
        open(
            <View>
                <Text>Hello from Bottom Sheet 👋</Text>
                <Button title="Close" onPress={close} />
            </View>,
            ['25%', '50%'] // optional snap points
        );
    };


    return (
        <AnimatedPressable key={playlistSongs.id}
            pressableStyle={styles.wrapper}
            scaleTo={0.985}
            pressedOpacity={0.89}
            onPress={() => playSong({ ...playlistSongs, songId: playlistSongs.id })}
            onLongPress={(handleOpen)}
            feedback='snappy'>
            <View style={styles.leftSec}>

                <View style={styles.artWorkWrapper}>
                    {thumbnailUrl && !imageError ? (
                        <Image
                            source={{ uri: thumbnailUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <Ionicons
                            name="musical-notes"
                            size={30}
                            color={theme.colors.textSecondary}
                        />
                    )}


                </View>

                <View style={styles.textWrapper}>
                    <Text style={styles.title} numberOfLines={1}
                        ellipsizeMode="tail">{playlistSongs.title}</Text>
                    <View style={styles.subTitleWrapper}>
                        <Text style={styles.subTitle}>{playlistSongs.channelName ?? "Unknown"}</Text>
                        {playlistSongs.duration && <Text style={styles.subTitle}>
                            {formatPlaylistDuration(playlistSongs.duration)}
                        </Text>}

                    </View>

                </View>

            </View>
            <View>
                <AnimatedPressable
                    onPress={handleOpen}
                    hitSlopSize={12}
                    scaleTo={0.82}
                    feedback="snappy"
                    accessibilityLabel="Open song menu">
                    <Ionicons
                        name="ellipsis-vertical"
                        size={theme.spacing.lg}
                        color={theme.colors.textSecondary}
                    />

                </AnimatedPressable>
            </View>


        </AnimatedPressable>
    )
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: theme.spacing.md,
    },
    leftSec: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1, // ✅ IMPORTANT
    },

    artWorkWrapper: {
        width: theme.spacing.xxl,
        height: theme.spacing.xxl,
        borderRadius: theme.radius.sm,
        overflow: 'hidden',
        backgroundColor: theme.colors.backgroundInteractive,
        marginRight: 14,
        alignItems: "center",
        justifyContent: "center"
    },
    textWrapper: {
        gap: theme.spacing.sm,
        flex: 1,        // ✅ take remaining space
        flexShrink: 1,  // ✅ allow shrinking
    },
    subTitleWrapper: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: theme.spacing.md
    }
    ,
    title: {
        color: theme.colors.textPrimary,
        fontSize: theme.spacing.md,
        fontWeight: "bold",
        flexShrink: 1, // ✅ helps in edge cases
    },
    subTitle: {
        color: theme.colors.textSecondary,
        fontSize: theme.spacing.sm + theme.spacing.xs,
    }
})