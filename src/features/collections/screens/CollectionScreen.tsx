import React, { useCallback, useMemo, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useCollection } from '../hooks/useCollection';
import { CollectionAlbumHeader } from '../components/CollectionAlbumHeader';
import { StickyCollectionHeader } from '../components/StickyCollectionHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Collection, CollectionTrack } from '../types';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useArtworkColors, FALLBACK_ARTWORK_COLORS } from '@/features/artwork-colors';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedPressable from '@/components/AnimatedPressable';
import { AlertCircle, RefreshCw, Music2, Share2, Pencil, Trash2, Play } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { usePlaybackStore, usePlayer } from '@/features/playback';
import SongListCard from '../components/SongListCard';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/features/auth';
import { useToast } from '@/features/Toast/hooks/useToast';
import { useBottomSheet } from '@/features/drawer';
import { OptionsDrawer } from '@/features/drawer/components/OptionsDrawer';
import { useLibrary } from '@/features/library/hooks/useLibrary';
import { Playlist } from '@/features/library/types';
import { AddPlaylistModal } from '@/features/library/components/AddPlaylistModal';
import { DeletePlaylistDialog } from '@/features/library/components/DeletePlaylistDialog';
import { Share } from 'react-native';
import { MEDIA_URL } from '@/api/apiClient';

// ─── Constants ────────────────────────────────────────────────────────────────

const HEADER_THRESHOLD = 200;
const ITEM_HEIGHT = 64;

// ─── Screen ───────────────────────────────────────────────────────────────────

export const CollectionScreen = () => {
    const { id, isRemote } = useLocalSearchParams<{ id: string; isRemote: string }>();

    const insets = useSafeAreaInsets();
    const scrollY = useSharedValue(0);

    const isRemoteVal = isRemote === 'true';
    const {
        data: collection,
        rawSongs,
        playbackToken,
        isLoading,
        isError,
        refetch,
    } = useCollection(id, isRemoteVal);

    const currentSong = usePlaybackStore((s) => s.currentSong);
    const playlistMeta = usePlaybackStore((s) => s.playlistMeta);
    const isThisQueueActive = playlistMeta?.playlistId === collection?.id;

    const router = useRouter();
    const { user } = useAuth();
    const toast = useToast();
    const { open, close } = useBottomSheet();
    const { deletePlaylist, isDeleting, updatePlaylist, isUpdating } = useLibrary();

    const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
    const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);

    const handleUpdatePlaylist = async (data: { name?: string; description?: string; isPublic?: boolean }) => {
        if (!playlistToEdit) return;
        try {
            await updatePlaylist({
                playlistId: playlistToEdit.id,
                payload: data
            });
            setPlaylistToEdit(null);
            toast.success('Playlist updated');
            refetch();
        } catch (error) {
            toast.error('Failed to update playlist');
        }
    };

    const confirmDelete = async () => {
        if (!playlistToDelete) return;

        try {
            await deletePlaylist(playlistToDelete.id);
            toast.success('Playlist deleted');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/library');
        } catch (error) {
            toast.error('Failed to delete playlist');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setPlaylistToDelete(null);
        }
    };
    const shareCollection = useCallback(async () => {
        if (!collection) return;
        if (!collection.isRemote && !collection.isPublic) {
            toast.error('Only public collections can be shared');
            return;
        }
        try {
            await Share.share({
                title: 'Sonic',
                message:
                    `Listening to ${collection.title} ${collection.type} on Sonic 🎵\n${MEDIA_URL}/collections/${collection.id}?isRemote=${collection.isRemote}`,
                url: `${MEDIA_URL}/collections/${collection.id}?isRemote=${collection.isRemote}`, // mainly for iOS
            });
        } catch (error) {
            toast.error('Something went worng');
            return;
        }
    }, [collection, MEDIA_URL, toast]);

    const handleMorePress = useCallback(() => {
        if (!collection || collection.type !== 'playlist') return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const isOwner = user?.id === collection.user?.id;

        const actions = [
            {
                label: 'Share ',
                icon: <Icon as={Share2} size={20} className='text-foreground' />,
                onPress: () => {
                    close();
                    shareCollection()
                }
            }
        ];

        const mappedPlaylist: Playlist = {
            id: collection.id,
            name: collection.title,
            description: collection.description ?? null,
            thumbnailUrl: Array.isArray(collection.artwork)
                ? collection.artwork
                : (collection.artwork ? [collection.artwork] : null),
            isPublic: collection.isPublic ?? false,
            createdAt: collection.releaseDate ?? '',
            isSystem: collection.isSystem ?? false,
        };

        if (isOwner) {
            actions.push({
                label: "Edit Playlist",
                icon: <Icon as={Pencil} size={20} className='text-foreground' />,
                onPress: () => {
                    close();
                    setPlaylistToEdit(mappedPlaylist);
                }
            });

            if (!collection.isSystem) {
                actions.push({
                    label: 'Delete Playlist',
                    icon: <Icon as={Trash2} size={20} className='text-foreground' />,
                    onPress: () => {
                        close();
                        setPlaylistToDelete(mappedPlaylist);
                    }
                });
            }
        }

        open(
            <OptionsDrawer
                image={mappedPlaylist.thumbnailUrl ?? []}
                title={mappedPlaylist.name}
                subtitle={mappedPlaylist.description || "Playlist"}
                actions={actions}
            />
        );
    }, [collection, user?.id, open, close, isThisQueueActive, shareCollection]);

    const artworkUrl = useMemo(() => {
        if (!collection?.artwork) return undefined;
        if (Array.isArray(collection.artwork)) {
            return collection.artwork[0];
        }
        return collection.artwork;
    }, [collection?.artwork]);

    const { colors: artworkColors } = useArtworkColors(artworkUrl);
    const hero = artworkColors?.gradient ?? FALLBACK_ARTWORK_COLORS.gradient;
    const heroBase = artworkColors?.base ?? FALLBACK_ARTWORK_COLORS.base;

    // ── Scroll tracking ──────────────────────────────────────────────────────
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            'worklet';
            scrollY.value = event.contentOffset.y;
        },
    });

    const { play, playPlaylist, skipToIndex } = usePlayer();



    // ── Play all ─────────────────────────────────────────────────────────────
    const handlePlay = useCallback(() => {
        if (!collection || collection.tracks.length === 0) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (!collection.isRemote && rawSongs?.length) {
            // Local playlist — play the full queue at once
            playPlaylist(rawSongs, 0, collection.id, playbackToken);
        } else {
            // Remote album — kick off the first track; subsequent tracks
            // are played individually as the user taps them
            const first = collection.tracks[0];
            play({
                trackName: first.title,
                artistName: first.artist,
                image: first.artwork,
                externalId: first.id,
                duration: Number(first.duration),
            });
        }
    }, [collection, rawSongs, playbackToken, play, playPlaylist]);

    // ── Song press ───────────────────────────────────────────────────────────
    const handleSongPress = useCallback((track: CollectionTrack) => {
        const index = collection?.tracks.findIndex((t) => t.id === track.id) ?? -1;

        if (collection && !collection.isRemote && rawSongs?.length && index !== -1) {
            if (isThisQueueActive) {
                // Already playing this playlist -> skip directly to index
                skipToIndex(index);
            } else {
                // Play playlist starting from this index
                playPlaylist(rawSongs, index, collection.id, playbackToken);
            }
            return;
        }

        if (track.songId) {
            // Local playlist track fallback — use server song id
            play({ songId: track.songId });
        } else {
            // Remote iTunes track — use externalId (iTunes track id)
            play({
                trackName: track.title,
                artistName: track.artist,
                image: track.artwork,
                externalId: track.id,
                duration: Number(track.duration),
            });
        }
    }, [play, playPlaylist, skipToIndex, collection, isThisQueueActive, rawSongs, playbackToken]);

    // ── List ─────────────────────────────────────────────────────────────────
    const renderItem = useCallback(
        ({ item }: { item: CollectionTrack }) => {
            const isActive = !!currentSong && (
                (!!item.songId && item.songId === currentSong.id) ||
                item.id === currentSong.externalId ||
                item.id === currentSong.lastfmId ||
                item.id === currentSong.id
            );
            return <SongListCard track={item} onPress={handleSongPress} isActive={isActive} />
        },
        [handleSongPress, currentSong]
    );

    const keyExtractor = useCallback((item: CollectionTrack) => item.id, []);

    const getItemLayout = useCallback(
        (_: any, index: number) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
        }),
        []
    );

    // ── Header ───────────────────────────────────────────────────────────────
    const ListHeader = useMemo(
        () => (
            <View className="mb-1">
                <CollectionAlbumHeader
                    collection={collection!}
                    baseColor={heroBase}
                    onPlay={handlePlay}
                    onMorePress={handleMorePress}
                />
            </View>
        ),
        [collection, heroBase, handlePlay, handleMorePress]
    );

    // ── Empty state ──────────────────────────────────────────────────────────
    const ListEmpty = useMemo(
        () => (
            <View className="items-center justify-center py-16 px-8">
                <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-5"
                    style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                >
                    <Icon as={Music2} size={34} className="text-muted-foreground" />
                </View>
                <Text className="text-foreground text-base font-display mb-2 text-center">
                    No songs yet
                </Text>
                <Text className="text-muted-foreground text-sm text-center leading-relaxed">
                    {collection?.type === 'playlist'
                        ? 'Add songs to this playlist to get started.'
                        : 'This album has no tracks available.'}
                </Text>
            </View>
        ),
        [collection?.type]
    );

    const contentStyle = useMemo(
        () => ({ paddingTop: insets.top + 20, paddingBottom: 120 }),
        [insets.top]
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Loading
    // ─────────────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#FFD54F" />
                <Text className="text-muted-foreground mt-4 text-sm font-sans">
                    Loading collection…
                </Text>
            </View>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Error
    // ─────────────────────────────────────────────────────────────────────────
    if (isError || !collection) {
        return (
            <View className="flex-1 items-center justify-center bg-background px-8">
                <View className="bg-white/5 p-5 rounded-full mb-5">
                    <Icon as={AlertCircle} size={40} className="text-muted-foreground" />
                </View>
                <Text className="text-foreground text-lg font-display mb-2 text-center">
                    Couldn't load collection
                </Text>
                <Text className="text-muted-foreground text-sm text-center mb-8">
                    It might be unavailable or there's a connection issue.
                </Text>
                <AnimatedPressable
                    onPress={() => refetch()}
                    scaleTo={0.95}
                    feedback="snappy"
                    className="flex-row items-center gap-2 bg-amber-300 px-7 py-3 rounded-full"
                >
                    <Icon as={RefreshCw} size={16} className="text-black" />
                    <Text className="text-black font-semibold">Try Again</Text>
                </AnimatedPressable>
            </View>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Main
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <View className="flex-1 bg-background">
            <LinearGradient
                colors={hero.colors}
                locations={hero.locations}
                className="absolute inset-0"
                pointerEvents="none"
            />

            <StickyCollectionHeader
                scrollY={scrollY}
                title={collection.title}
                insets={insets}
                threshold={HEADER_THRESHOLD}
                tracksLength={collection.tracks.length}
                backRoute={collection.type === 'album' ? '/home' : '/library'}
            />

            <Animated.FlatList
                data={collection.tracks}
                extraData={currentSong?.id + '_' + isThisQueueActive}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={ListEmpty}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={contentStyle}
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                windowSize={11}
                removeClippedSubviews={Platform.OS === 'android'}
            />

            <AddPlaylistModal
                visible={!!playlistToEdit}
                isCreating={false}
                isUpdating={isUpdating}
                playlist={playlistToEdit}
                onCancel={() => setPlaylistToEdit(null)}
                onUpdate={handleUpdatePlaylist}
            />

            <DeletePlaylistDialog
                playlist={playlistToDelete}
                onClose={() => setPlaylistToDelete(null)}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
            />
        </View>
    );
};
