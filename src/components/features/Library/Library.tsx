import { useBottomSheet } from '@/src/hooks/useDrawer';
import { useConfirm } from '@/src/hooks/useConfirm';
import { useToast } from '@/src/hooks/useToast';
import { useMusic } from '@/src/hooks/useMusic';
import { useAuth } from '@/src/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from "expo-haptics";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import AnimatedPressable from '../../ui/AnimatedPressable';
import { MusicOptionsDrawer } from '../../ui/MusicOptionsDrawer';
import { PlaylistCard } from '../Playlist/PlaylistCard';
import AddPlaylistModal from './AddPlaylistModal';
import { styles } from './Library.styles';


const { width: SCREEN_WIDTH } = Dimensions.get('window');









export const Library = () => {
  const router = useRouter()
  const { user } = useAuth();
  const { 
    userPlaylist, 
    createPlaylist, 
    isCreatingPlaylist, 
    deletePlaylist,
    isLoadingUserPlaylists 
  } = useMusic();

  const [playListLayout, setPlaylistLayout] = useState<'grid' | 'list'>('grid');
  const [openModal, setOpenModal] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const favorites = userPlaylist.find(p => p.isSystem);
  const normalPlaylists = userPlaylist.filter(p => !p.isSystem);

  const handleCreatePlaylist = async (data: { name: string; description?: string; isPublic?: boolean }) => {
    try {
      await createPlaylist({
        name: data.name,
        description: data.description || null,
        isPublic: data.isPublic ?? false,
      });
      setOpenModal(false);
      toast.success('Playlist created');
    } catch (error) {
      toast.error('Failed to create playlist');
    }
  };

  const clickedPlaylist = (playlistId: string) => {
    router.push({
      pathname: '/(tabs)/library/[playlistId]',
      params: { playlistId },
    });
  }

  const { open, close } = useBottomSheet();


  const handleLongPress = (item: { id: string, name: string, description?: string | null, isSystem: boolean }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

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
        label: 'Download',
        icon: <Ionicons name="arrow-down-circle-outline" size={24} color={theme.colors.textPrimary} />,
        onPress: () => close(),

      },
      {
        label: 'Pin playlist',
        icon: <Ionicons name="pin-outline" size={24} color={theme.colors.textPrimary} />,
        onPress: () => close()
      },
    ];

    if (!item.isSystem) {
      actions.push({
        label: 'Delete playlist',
        icon: <Ionicons name="close-outline" size={24} color={theme.colors.error} />,
        onPress: async () => {
          close();
          const ok = await confirm({
            title: 'Delete playlist',
            message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'DELETE',
            cancelText: 'CANCEL',
          });
          if (ok) {
            try {
              await deletePlaylist(item.id);
              toast.success('Playlist deleted');
            } catch (error) {
              console.error('Delete failed:', error);
              toast.error('Failed to delete playlist');
            }
          }
        }
      });
    }

    open(
      <MusicOptionsDrawer
        title={item.name}
        subtitle={item.description || "Playlist"}
        actions={actions}
      />
    )

  }



  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <AddPlaylistModal
        visible={openModal}
        defaultName={`My playlist #${userPlaylist.length + 1}`}
        onCancel={() => setOpenModal(false)}
        onCreate={handleCreatePlaylist}
        isCreating={isCreatingPlaylist}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="library" size={24} color={theme.colors.primaryAccent} />
              <Text style={styles.sectionTitle}>Your Library</Text>
            </View>
            <View style={styles.headerIconTray}>
              <AnimatedPressable onPress={() => setOpenModal(true)} hitSlop={10} accessibilityLabel="Create playlist" accessibilityRole="button" feedback="snappy" scaleTo={0.8}>
                <Ionicons name={"add"} size={28} color="#fff" />
              </AnimatedPressable>

              <AnimatedPressable onPress={() => setPlaylistLayout(prev => prev === 'grid' ? 'list' : 'grid')} hitSlop={10} accessibilityLabel="Toggle layout" accessibilityRole="button" feedback="snappy" scaleTo={0.8}>
                <Ionicons name={playListLayout === 'grid' ? 'list' : 'grid'} size={24} color="#fff" />
              </AnimatedPressable>
            </View>
          </View>

          {isLoadingUserPlaylists ? (
            <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.textSecondary }}>Sounding the library...</Text>
            </View>
          ) : (
            <>
              {/* PINNED FAVORITES */}
              {favorites && (
                <AnimatedPressable
                  onPress={() => clickedPlaylist(favorites.id)}
                  onLongPress={() => handleLongPress(favorites)}
                  accessibilityRole="button"
                  accessibilityLabel={`Favorites, ${favorites.songCount || 0} tracks`}
                >
                  <LinearGradient 
                    colors={[theme.colors.secondaryAccent, theme.colors.primaryAccent]}
                    style={styles.likedBanner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={styles.likedLeft}>
                      <Text style={styles.likedTitle}>{favorites.name}</Text>
                      <View style={styles.likedMeta}>
                        <Text style={styles.likedCount}>{favorites.songCount || 0} tracks</Text>
                      </View>
                    </View>
                    <View style={styles.likedIconWrapper}>
                      <Ionicons name="heart" size={theme.spacing.xl} color={theme.colors.backgroundBase} />
                    </View>
                  </LinearGradient>
                </AnimatedPressable>
              )}

              {/* EMPTY STATE */}
              {normalPlaylists.length === 0 && !favorites && (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Ionicons name="musical-notes-outline" size={64} color={theme.colors.backgroundInteractive} />
                  <Text style={{ color: theme.colors.textSecondary, marginTop: 16 }}>Your library is empty.</Text>
                </View>
              )}

              {/* LISTING */}
              {playListLayout === 'grid' ? (
                <FlatList
                  data={normalPlaylists}
                  key={'grid-layout'}
                  numColumns={3}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <PlaylistCard
                      key={item.id}
                      variant="grid"
                      name={item.name}
                      isSystem={item.isSystem}
                      description={`${item.songCount || 0} tracks`}
                      thumbnailUrl={item.thumbnailUrl}
                      onPress={() => clickedPlaylist(item.id)}
                      onLongPress={() => handleLongPress(item)}
                      gridCardWidth={Math.floor((Dimensions.get('window').width - theme.spacing.md * 2 - 12 * 2) / 3)}
                    />
                  )}
                  columnWrapperStyle={{ justifyContent: 'flex-start', gap: 12 }}
                />
              ) : (
                <View style={{ gap: 4 }}>
                  {normalPlaylists.map(item => (
                    <PlaylistCard
                      key={item.id}
                      variant="list"
                      name={item.name}
                      isSystem={item.isSystem}
                      description={`Playlist • ${item.songCount || 0} tracks`}
                      thumbnailUrl={item.thumbnailUrl}
                      onPress={() => clickedPlaylist(item.id)}
                      onLongPress={() => handleLongPress(item)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
};
