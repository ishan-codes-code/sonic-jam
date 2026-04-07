
import { PlaylistSongs } from '@/src/api/musicApi';
import { useBottomSheet } from '@/src/hooks/useDrawer';
import { formatPlaylistDuration } from '@/src/player/player.helpers';
import { usePlayerStore } from '@/src/player/player.store';
import { getThumbnailUrl } from '@/src/services/youtube';
import { theme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from "expo-haptics";
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from '../../ui/AnimatedPressable';
import { MusicOptionsDrawer } from '../../ui/MusicOptionsDrawer';

interface SongListCardProps {
    playlistSongs: PlaylistSongs;
    onPress: () => void;
    onLongPress?: () => void;
    onRemove?: () => void;
}

export default function SongListCard({ playlistSongs, onPress, onLongPress, onRemove }: SongListCardProps) {
    const [imageError, setImageError] = useState(false);
    const thumbnailUrl = getThumbnailUrl(playlistSongs.youtubeId);

    const { playSong } = usePlayerStore();
    const { open, close } = useBottomSheet();

    const handleOpen = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        const actions = [
            {
                label: 'Share',
                icon: <Ionicons name="share-social-outline" size={24} color={theme.colors.textPrimary} />,
                onPress: () => {
                    close();
                    // Share logic
                }
            },
            {
                label: 'Add to other playlist',
                icon: <Ionicons name="add-circle-outline" size={24} color={theme.colors.textPrimary} />,
                onPress: () => {
                    close();
                }
            },
            {
                label: 'Add to Queue',
                icon: <Ionicons name="list-outline" size={24} color={theme.colors.textPrimary} />,
                onPress: () => {
                    close();
                }
            },
            {
                label: 'Go to artist',
                icon: <Ionicons name="person-outline" size={24} color={theme.colors.textPrimary} />,
                onPress: () => {
                    close();
                }
            }
        ];

        if (onRemove) {
            actions.push({
                label: 'Remove from playlist',
                icon: <Ionicons name="trash-outline" size={24} color={theme.colors.error} />,
                onPress: () => {
                    close();
                    onRemove();
                }
            });
        }

        open(
            <MusicOptionsDrawer
                image={thumbnailUrl}
                title={playlistSongs.title}
                subtitle={`${playlistSongs.channelName ?? "Unknown"} • ${playlistSongs.duration ? formatPlaylistDuration(playlistSongs.duration) : "0:00"}`}
                actions={actions}
            />
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