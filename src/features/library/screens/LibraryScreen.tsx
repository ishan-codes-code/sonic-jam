import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  LayoutAnimation,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from "expo-haptics";

import { useLibrary } from '../hooks/useLibrary';
import { Playlist } from '../types';
import { useAuth } from '@/features/auth';
import { useToast } from '@/hooks/useToast';
import { useBottomSheet } from '@/features/drawer';

import { LibraryHeader } from '../components/LibraryHeader';
import { PlaylistGridItem } from '../components/PlaylistGridItem';
import { PlaylistListItem } from '../components/PlaylistListItem';
import { AddPlaylistModal } from '../components/AddPlaylistModal';
import { LibrarySkeleton } from '../components/LibrarySkeleton';
import { LibraryEmptyState } from '../components/LibraryEmptyState';
import { LibraryFavoritesCard } from '../components/LibraryFavoritesCard';
import { DeletePlaylistDialog } from '../components/DeletePlaylistDialog';
import { OptionsDrawer } from '@/features/drawer/components/OptionsDrawer';
import AnimatedPressable from '@/components/AnimatedPressable';
import { Icon } from '@/components/ui/icon';
import { ArrowUpDown, LayoutGrid, List, Pencil, Pin, Share2, Trash2 } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const LibraryScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { open, close } = useBottomSheet();

  const {
    playlists,
    isLoading,
    createPlaylist,
    isCreating,
    updatePlaylist,
    isUpdating,
    deletePlaylist,
    isDeleting,
  } = useLibrary();

  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);

  const favorites = playlists.find((p: Playlist) => p.id === user?.favoritesPlaylistId);
  const userPlaylists = playlists.filter((p: Playlist) => p.id !== user?.favoritesPlaylistId);

  const handleCreatePlaylist = async (data: { name: string; description?: string; isPublic: boolean }) => {
    try {
      await createPlaylist({
        name: data.name,
        description: data.description ?? null,
        isPublic: data.isPublic
      });
      setShowModal(false);
      toast.success('Playlist created');
    } catch (error) {
      toast.error('Failed to create playlist');
    }
  };

  const handleUpdatePlaylist = async (data: { name?: string; description?: string; isPublic?: boolean }) => {
    if (!playlistToEdit) return;
    try {
      await updatePlaylist({
        playlistId: playlistToEdit.id,
        payload: data
      });
      setPlaylistToEdit(null);
      toast.success('Playlist updated');
    } catch (error) {
      toast.error('Failed to update playlist');
    }
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    close();
    setPlaylistToDelete(playlist);
  };

  const confirmDelete = async () => {
    if (!playlistToDelete) return;

    try {
      await deletePlaylist(playlistToDelete.id);
      toast.success('Playlist deleted');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      toast.error('Failed to delete playlist');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPlaylistToDelete(null);
    }
  };

  const handleLongPress = (playlist: Playlist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const actions = [
      {
        label: 'Share ',
        icon: <Icon as={Share2} size={20} className='text-foreground' />,
        onPress: () => close()
      },
      {
        label: "Edit Playlist",
        icon: <Icon as={Pencil} size={20} className='text-foreground' />,
        onPress: () => {
          close();
          setPlaylistToEdit(playlist);
        }
      }
    ];

    if (!playlist.isSystem) {
      actions.push({
        label: 'Delete Playlist',
        icon: <Icon as={Trash2} size={20} className='text-foreground' />,
        onPress: () => handleDeletePlaylist(playlist)
      });
    }

    open(
      <OptionsDrawer
        image={playlist.thumbnailUrl ?? []}
        title={playlist.name}
        subtitle={playlist.description || "Playlist"}
        actions={actions}
      />
    );
  };

  const navigateToPlaylist = (id: string) => {
    router.push({
      pathname: '/(tabs)/collections/[id]',
      params: { id, isRemote: 'false' },

    });
  };

  if (isLoading && playlists.length === 0) {
    return <LibrarySkeleton />;
  }


  const toggleLayout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLayout(l => l === 'grid' ? 'list' : 'grid');
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {/* <LibrarySkeleton /> */}
      <LibraryHeader
        onAddPress={() => setShowModal(true)}
      />

      <FlatList
        data={userPlaylists}
        key={layout}
        numColumns={layout === 'grid' ? 3 : 1}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
        columnWrapperStyle={layout === 'grid' ? { gap: 12 } : undefined}
        ItemSeparatorComponent={layout === 'list' ? () => <View className="h-2" /> : null}
        ListEmptyComponent={
          <LibraryEmptyState onAddPress={() => setShowModal(true)} />
        }
        ListHeaderComponent={
          <View>
            {favorites && (
              <LibraryFavoritesCard
                favorites={favorites}
                onPress={() => navigateToPlaylist(favorites.id)}
                onLongPress={() => handleLongPress(favorites)}
              />
            )}

            {userPlaylists.length > 0 && (
              <View className="mb-4 flex-row items-center justify-between">
                <AnimatedPressable
                  hitSlopSize={12}
                  scaleTo={1}
                  feedback="timing"
                  pressedOpacity={0.5}
                  className="flex-row items-center gap-2"
                >
                  <Icon as={ArrowUpDown} size={16} className="text-foreground" />
                  <Text className="text-foreground text-sm font-heading-medium">Recents</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={toggleLayout}
                  hitSlopSize={12}
                  feedback="snappy"
                  scaleTo={0.82}
                  className="rounded-full"
                  accessibilityLabel="Toggle layout"
                >
                  <Icon
                    as={layout === 'grid' ? List : LayoutGrid}
                    size={20}
                    className="fill-foreground text-foreground"
                  />
                </AnimatedPressable>
              </View>
            )}
          </View>
        }
        renderItem={({ item }: { item: Playlist }) => (
          layout === 'grid' ? (
            <PlaylistGridItem
              playlist={item}
              onPress={() => navigateToPlaylist(item.id)}
              onLongPress={() => handleLongPress(item)}
            />
          ) : (
            <PlaylistListItem
              playlist={item}
              onPress={() => navigateToPlaylist(item.id)}
              onLongPress={() => handleLongPress(item)}
            />
          )
        )}
      />


      <AddPlaylistModal
        visible={showModal || !!playlistToEdit}
        isCreating={isCreating}
        isUpdating={isUpdating}
        playlist={playlistToEdit}
        onCancel={() => {
          setShowModal(false);
          setPlaylistToEdit(null);
        }}
        onCreate={handleCreatePlaylist}
        onUpdate={handleUpdatePlaylist}
        defaultName={`My playlist #${playlists.length + 1}`}
      />

      <DeletePlaylistDialog
        playlist={playlistToDelete}
        onClose={() => setPlaylistToDelete(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </SafeAreaView>
  );
};
