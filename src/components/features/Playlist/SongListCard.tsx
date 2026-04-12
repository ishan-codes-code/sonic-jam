import { PlaylistSongs } from '@/src/api/musicApi';
import { useBottomSheet } from '@/src/hooks/useDrawer';
import { theme } from '@/src/theme';
import { ActionItem, SongQuickAction } from '@/src/utils/songsActions';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from '../../ui/AnimatedPressable';
import { MusicOptionsDrawer } from '../../ui/MusicOptionsDrawer';
import { SongPlaceholder } from '../../ui/SongPlaceholder';
import AudioWave from '../../ui/AudioWave';

interface SongListCardProps {
    playlistSongs: PlaylistSongs;
    artworkUri?: string | null;
    onPress: () => void;
    actions?: ActionItem[];
    trailingActions?: SongQuickAction[];
    isCurrent?: boolean;
    isPlaying?: boolean;
}

/**
 * Minimal duration formatter for display purposes.
 */
const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function SongListCard({
    playlistSongs,
    artworkUri,
    onPress,
    actions = [],
    trailingActions = [],
    isCurrent = false,
    isPlaying = true,
}: SongListCardProps) {
    const [imageError, setImageError] = useState(false);

    const resolvedArtworkUri = artworkUri || playlistSongs.image;

    useEffect(() => {
        setImageError(false);
    }, [resolvedArtworkUri]);

    const { open } = useBottomSheet();
    const hasContextMenu = actions.length > 0;

    const handleOpen = () => {
        if (!hasContextMenu) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        open(
            <MusicOptionsDrawer
                image={resolvedArtworkUri}
                title={playlistSongs.trackName}
                subtitle={`${playlistSongs.artistName ?? "Unknown"} • ${playlistSongs.duration ? formatDuration(playlistSongs.duration) : "0:00"}`}
                actions={actions}
            />
        );
    };

    return (
        <AnimatedPressable
            key={playlistSongs.id}
            pressableStyle={styles.wrapper}
            scaleTo={0.985}
            pressedOpacity={0.89}
            onPress={onPress}
            onLongPress={hasContextMenu ? handleOpen : undefined}
            feedback='snappy'>
            <View style={styles.leftSec}>
                <View style={styles.artWorkWrapper}>
                    {resolvedArtworkUri && !imageError ? (
                        <Image
                            source={{ uri: resolvedArtworkUri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <SongPlaceholder
                            title={playlistSongs.trackName}
                            artist={playlistSongs.artistName}
                            style={{ width: '100%', height: '100%' }}
                            borderRadius={styles.artWorkWrapper.borderRadius}
                        />
                    )}
                </View>

                <View style={styles.textWrapper}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text 
                            style={[styles.title, isCurrent && { color: theme.colors.actionAccent }, { flexShrink: 1 }]} 
                            numberOfLines={1} 
                            ellipsizeMode="tail"
                        >
                            {playlistSongs.trackName}
                        </Text>
                        {isCurrent && (
                            <AudioWave 
                                isPlaying={isPlaying} 
                                barColor={theme.colors.actionAccent} 
                                count={3} 
                                barWidth={2.5} 
                                maxHeight={12} 
                                minHeight={3} 
                                gap={3} 
                            />
                        )}
                    </View>
                    <View style={styles.subTitleWrapper}>
                        <Text style={styles.subTitle} numberOfLines={1}>
                            {playlistSongs.artistName ?? "Unknown"}
                        </Text>
                        {playlistSongs.duration > 0 && (
                            <Text style={styles.subTitle}>
                                {formatDuration(playlistSongs.duration)}
                            </Text>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.actions}>
                {hasContextMenu ? (
                    <AnimatedPressable
                        onPress={handleOpen}
                        hitSlopSize={12}
                        scaleTo={0.82}
                        feedback="snappy"
                        accessibilityLabel="Open song menu"
                        style={{ marginLeft: theme.spacing.md }}>
                        <Ionicons
                            name="ellipsis-vertical"
                            size={theme.spacing.lg - 2}
                            color={theme.colors.textSecondary}
                        />
                    </AnimatedPressable>
                ) : null}

                {trailingActions.map((action, index) => (
                    <AnimatedPressable
                        key={`${playlistSongs.id}-action-${index}`}
                        onPress={action.onPress}
                        hitSlopSize={12}
                        scaleTo={0.82}
                        feedback="snappy"
                        accessibilityLabel={action.accessibilityLabel}>
                        {action.icon}
                    </AnimatedPressable>
                ))}
            </View>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: theme.spacing.md,
        position: 'relative',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    leftSec: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    artWorkWrapper: {
        width: theme.spacing.xxl,
        height: theme.spacing.xxl,
        borderRadius: theme.radius.sm,
        overflow: 'hidden',
        backgroundColor: theme.colors.backgroundInteractive,
        marginRight: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    textWrapper: {
        gap: theme.spacing.sm,
        flex: 1,
        flexShrink: 1,
    },
    subTitleWrapper: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: theme.spacing.md,
    },
    title: {
        color: theme.colors.textPrimary,
        fontSize: theme.spacing.md - 1,
        fontWeight: "bold",
        flexShrink: 1,
    },
    subTitle: {
        color: theme.colors.textSecondary,
        fontSize: theme.spacing.sm + theme.spacing.xs,
    },
});
