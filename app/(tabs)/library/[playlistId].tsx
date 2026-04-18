import { usePlayer } from '@/src/playbackCore/usePlayer';
import { usePlaybackStore } from '@/src/playbackCore/usePlaybackStore';
import { PlaylistEmptyState } from '@/src/components/features/Playlist/PlaylistEmptyState';
import { PlaylistSkeleton } from '@/src/components/features/Playlist/PlaylistSkeleton';
import { playlistScreenStyles as styles } from '@/src/components/features/Playlist/PlaylistScreen.styles';
import SongListCard from '@/src/components/features/Playlist/SongListCard';
import AnimatedPressable from '@/src/components/ui/AnimatedPressable';
import { MusicOptionsDrawer } from '@/src/components/ui/MusicOptionsDrawer';
import { useConfirm } from '@/src/hooks/useConfirm';
import { useBottomSheet } from '@/src/hooks/useDrawer';
import { useMusic } from '@/src/hooks/useMusic';
import { useToast } from '@/src/hooks/useToast';
import { theme } from '@/src/theme';
import { createLibrarySongActions } from '@/src/utils/songsActions';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, ListRenderItem, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROW_HEIGHT = SCREEN_WIDTH < 520 ? 62 : 64;

const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const pickHeroGradient = (seed: string) => {
    const palette = [theme.colors.primaryAccentDim, theme.colors.secondaryAccent, theme.colors.actionAccent] as const;
    const base = palette[hashString(seed) % palette.length];
    return {
        base,
        colors: [base + 'cc', 'rgba(0,0,0,0.30)', theme.colors.backgroundBase] as const,
        locations: [0, 0.5, 1] as const,
    };
};

const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0:00";
    if (seconds > 3600) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hrs}h ${mins}m`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function PlaylistScreen() {
    const router = useRouter();
    const { playlistId } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const id = typeof playlistId === 'string' ? playlistId : String(playlistId ?? '');

    const queueType = usePlaybackStore((s) => s.queueType);
    const playlistMeta = usePlaybackStore((s) => s.playlistMeta);
    const currentSong = usePlaybackStore((s) => s.currentSong);
    const isPlaying = usePlaybackStore((s) => s.status) === 'playing';
    const isShuffling = usePlaybackStore((s) => s.isShuffling);

    const {
        userPlaylist,
        isLoadingUserPlaylists,
        playlistSongs,
        isLoadingPlaylistSongs,
        deletePlaylist,
        removeSongFromPlaylist,
    } = useMusic({ playlistId: id });

    const confirm = useConfirm();
    const { open: openSheet, close: closeSheet } = useBottomSheet();
    const toast = useToast();
    const { playPlaylist, playNext, addToQueue, shufflePlay, toggleShuffle } = usePlayer();
    const [isLiked, setLiked] = useState(false);

    const playlist = useMemo(
        () => userPlaylist.find((p) => p.id === id) ?? null,
        [id, userPlaylist]
    );
    const hero = useMemo(() => pickHeroGradient(id), [id]);
    const cover = playlist?.thumbnailUrl?.[0] ?? null;
    const totalDurationSec = useMemo(
        () => playlistSongs.reduce((acc, cur) => acc + (cur.duration || 0), 0),
        [playlistSongs]
    );

    const isLoading = isLoadingUserPlaylists || isLoadingPlaylistSongs;
    const isEmpty = !isLoading && playlistSongs.length === 0;
    const isThisPlaylistActive = queueType === 'playlist' && playlistMeta?.playlistId === id;
    const isThisPlaylistShuffling = isThisPlaylistActive && isShuffling;

    const handlePlayAll = useCallback(() => {
        if (playlistSongs.length === 0) return;
        void playPlaylist(playlistSongs, 0, id);
    }, [id, playPlaylist, playlistSongs]);

    const handleShuffleAll = useCallback(() => {
        if (playlistSongs.length === 0) return;

        if (isThisPlaylistActive) {
            void toggleShuffle();
            return;
        }

        void shufflePlay(playlistSongs, id);
    }, [id, isThisPlaylistActive, playlistSongs, shufflePlay, toggleShuffle]);

    const handleRemoveSong = useCallback(async (songId: string) => {
        try {
            await removeSongFromPlaylist({ playlistId: id, songId });
            toast.success('Removed from playlist');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            toast.error('Failed to remove song');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [id, removeSongFromPlaylist, toast]);

    const handleMoreOptions = useCallback(() => {
        openSheet(
            <MusicOptionsDrawer
                image={cover}
                title={playlist?.name ?? 'Playlist'}
                subtitle={playlist?.description || 'Playlist'}
                actions={[
                    {
                        label: 'Share',
                        icon: <Ionicons name="share-social-outline" size={24} color={theme.colors.textPrimary} />,
                        onPress: () => closeSheet(),
                    },
                    {
                        label: 'Delete playlist',
                        icon: <Ionicons name="close-outline" size={24} color={theme.colors.error} />,
                        onPress: async () => {
                            closeSheet();
                            const ok = await confirm({
                                title: 'Delete playlist',
                                message: `Are you sure you want to delete "${playlist?.name}"? This action cannot be undone.`,
                                confirmText: 'DELETE',
                                cancelText: 'CANCEL',
                            });

                            if (!ok) return;

                            try {
                                await deletePlaylist(id);
                                toast.success('Playlist deleted');
                                router.back();
                            } catch (error) {
                                console.error('Delete failed:', error);
                                toast.error('Failed to delete playlist');
                            }
                        },
                    },
                ]}
            />
        );
    }, [closeSheet, confirm, cover, deletePlaylist, id, openSheet, playlist?.description, playlist?.name, router, toast]);

    const scrollY = useSharedValue(0);
    const onScroll = useAnimatedScrollHandler({
        onScroll: (e) => {
            scrollY.value = e.contentOffset.y;
        },
    });

    const stickyStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [40, 160], [0, 1], Extrapolation.CLAMP);
        const translateY = interpolate(scrollY.value, [40, 160], [-10, 0], Extrapolation.CLAMP);
        return { opacity, transform: [{ translateY }] };
    });

    const header = useMemo(() => (
        isLoading ? (
            <PlaylistSkeleton insetsTop={insets.top} />
        ) : (
            <View>
                <LinearGradient colors={hero.colors} locations={hero.locations} style={styles.heroBg}>
                    <View style={[styles.heroContent, { paddingTop: insets.top + 18 }]}>
                        <View style={styles.heroRow}>
                            <View style={styles.cover}>
                                {cover ? (
                                    <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
                                ) : (
                                    <View style={[styles.coverFallback, { backgroundColor: hero.base + '26' }]}>
                                        <Ionicons name="musical-notes" size={36} color={theme.colors.textSecondary} />
                                    </View>
                                )}
                            </View>

                            <View style={styles.heroRight}>
                                <Text style={styles.label}>PLAYLIST</Text>
                                <Text style={styles.title} numberOfLines={2}>
                                    {playlist?.name ?? 'Playlist'}
                                </Text>
                                {!!playlist?.description && (
                                    <Text style={styles.desc} numberOfLines={2}>
                                        {playlist.description}
                                    </Text>
                                )}

                                <View style={styles.metaRow}>
                                    <Text style={styles.metaText}>
                                        {!playlist?.isPublic && <Text style={styles.metaStrong}>You</Text>}
                                        <Text style={styles.metaDot}> • </Text>
                                        {playlistSongs.length} songs
                                        <Text style={styles.metaDot}> • </Text>
                                        {formatDuration(totalDurationSec)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.actionsRow}>
                            <AnimatedPressable
                                style={styles.playWrap}
                                pressableStyle={styles.playBtn}
                                feedback="snappy"
                                scaleTo={0.985}
                                pressedOpacity={0.9}
                                accessibilityLabel="Play playlist"
                                onPress={handlePlayAll}
                            >
                                <Ionicons name="play" size={18} color={theme.colors.onPrimary} />
                                <Text style={styles.playText}>Play</Text>
                            </AnimatedPressable>

                            <AnimatedPressable
                                style={styles.secondaryWrap}
                                pressableStyle={styles.secondaryBtn}
                                feedback="snappy"
                                scaleTo={0.985}
                                pressedOpacity={0.88}
                                accessibilityLabel="Shuffle playlist"
                                onPress={handleShuffleAll}
                            >
                                <Ionicons
                                    name="shuffle"
                                    size={18}
                                    color={isThisPlaylistShuffling ? theme.colors.actionAccent : theme.colors.textPrimary}
                                />
                                {isThisPlaylistShuffling && <View style={styles.activeDot} />}
                            </AnimatedPressable>

                            <AnimatedPressable
                                style={styles.iconWrap}
                                pressableStyle={styles.iconBtn}
                                feedback="snappy"
                                scaleTo={0.9}
                                accessibilityLabel={isLiked ? 'Unlike playlist' : 'Like playlist'}
                                onPress={() => setLiked((prev) => !prev)}
                            >
                                <Ionicons
                                    name={isLiked ? 'heart' : 'heart-outline'}
                                    size={18}
                                    color={isLiked ? theme.colors.actionAccent : theme.colors.textSecondary}
                                />
                            </AnimatedPressable>

                            <AnimatedPressable
                                style={styles.iconWrap}
                                pressableStyle={styles.iconBtn}
                                feedback="snappy"
                                scaleTo={0.9}
                                accessibilityLabel="More options"
                                onPress={handleMoreOptions}
                            >
                                <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.textSecondary} />
                            </AnimatedPressable>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        )
    ), [cover, handleMoreOptions, handlePlayAll, handleShuffleAll, hero.base, hero.colors, hero.locations, insets.top, isLiked, isLoading, isThisPlaylistShuffling, playlist?.description, playlist?.isPublic, playlist?.name, playlistSongs.length, totalDurationSec]);

    const renderItem = useCallback<ListRenderItem<(typeof playlistSongs)[number]>>(
        ({ item, index }) => {
            const isCurrent = isThisPlaylistActive && currentSong?.id === item.id;

            return (
                <SongListCard
                    playlistSongs={item}
                    isCurrent={isCurrent}
                    isPlaying={isPlaying}
                    onPress={() => {
                        void playPlaylist(playlistSongs, index, id);
                    }}
                    actions={createLibrarySongActions({
                        onClose: closeSheet,
                        onRemove: () => {
                            void handleRemoveSong(item.id);
                        },
                        onPlayNext: () => {
                            void playNext({ songId: item.id });
                        },
                        onAddToQueue: () => {
                            void addToQueue({ songId: item.id });
                        },
                    })}
                />
            );
        },
        [addToQueue, closeSheet, currentSong?.id, handleRemoveSong, id, isPlaying, isThisPlaylistActive, playNext, playPlaylist, playlistSongs]
    );

    const keyExtractor = useCallback((item: (typeof playlistSongs)[number]) => item.id, []);
    const getItemLayout = useCallback((_: ArrayLike<(typeof playlistSongs)[number]> | null | undefined, index: number) => ({
        length: ROW_HEIGHT,
        offset: ROW_HEIGHT * index,
        index,
    }), []);

    return (
        <View style={styles.root}>
            <Animated.View
                style={[styles.sticky, { paddingTop: insets.top, backgroundColor: theme.colors.backgroundBase }, stickyStyle]}
                pointerEvents="box-none"
            >
                <View style={styles.stickyInner}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft color={theme.colors.textPrimary} size={24} />
                    </TouchableOpacity>

                    <View style={styles.headerTextWrapper}>
                        <Text style={styles.stickyTitle} numberOfLines={1}>
                            {playlist?.name ?? 'Playlist'}
                        </Text>
                        <Text style={styles.headerSubtitle}>{playlistSongs.length} tracks</Text>
                    </View>

                    <AnimatedPressable
                        style={styles.stickyPlayWrap}
                        pressableStyle={styles.stickyPlayBtn}
                        feedback="snappy"
                        scaleTo={0.99}
                        pressedOpacity={0.92}
                        accessibilityLabel="Play"
                        onPress={handlePlayAll}
                    >
                        <Ionicons name="play" size={14} color={theme.colors.onPrimary} />
                    </AnimatedPressable>
                </View>
                <View style={styles.stickyDivider} />
            </Animated.View>

            <Animated.FlatList
                data={playlistSongs}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: theme.spacing.md }}
                ListHeaderComponentStyle={{ marginHorizontal: -16 }}
                ListHeaderComponent={header}
                ListEmptyComponent={isLoading ? null : isEmpty ? <PlaylistEmptyState /> : null}
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                initialNumToRender={12}
                windowSize={10}
                maxToRenderPerBatch={12}
                updateCellsBatchingPeriod={32}
                getItemLayout={getItemLayout}
            />
        </View>
    );
}
