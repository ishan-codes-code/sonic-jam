import { Playlist } from '@/src/api/musicApi';
import { useBottomSheet } from '@/src/hooks/useDrawer';
import { useMusic } from '@/src/hooks/useMusic';
import { useToast } from '@/src/hooks/useToast';
import { theme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AnimatedPressable from '../../ui/AnimatedPressable';

type RecentSongPlaylistDrawerProps = {
  songId: string;
  songTitle: string;
};

export function RecentSongPlaylistDrawer({
  songId,
  songTitle,
}: RecentSongPlaylistDrawerProps) {
  const { close } = useBottomSheet();
  const toast = useToast();
  const {
    userPlaylist,
    isLoadingUserPlaylists,
    isAddingToPlaylist,
    addSongToPlaylist,
  } = useMusic();

  const handleAddToPlaylist = async (playlist: Playlist) => {
    try {
      await addSongToPlaylist({
        playlistId: playlist.id,
        songId,
      });
      close();
      toast.success(`Added to ${playlist.name}`);
    } catch (error: any) {
      const message =
        typeof error?.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Unable to add song to playlist';
      toast.error(message);
    }
  };

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <AnimatedPressable
      onPress={() => {
        void handleAddToPlaylist(item);
      }}
      pressableStyle={styles.playlistRow}
      scaleTo={0.985}
      feedback="snappy"
      disabled={isAddingToPlaylist}
      accessibilityLabel={`Add ${songTitle} to ${item.name}`}
    >
      <View style={styles.playlistIcon}>
        <Ionicons
          name="musical-notes-outline"
          size={18}
          color={theme.colors.textPrimary}
        />
      </View>

      <View style={styles.playlistMeta}>
        <Text numberOfLines={1} style={styles.playlistName}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={styles.playlistDescription}>
          {item.description?.trim() || 'Playlist'}
        </Text>
      </View>

      <Ionicons
        name="add-circle-outline"
        size={22}
        color={theme.colors.secondaryAccent}
      />
    </AnimatedPressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Add To Playlist</Text>
        <Text numberOfLines={2} style={styles.title}>
          {songTitle}
        </Text>
        <Text style={styles.subtitle}>
          Pick a playlist to save this song.
        </Text>
      </View>

      {isLoadingUserPlaylists ? (
        <View style={styles.stateBlock}>
          <ActivityIndicator
            color={theme.colors.secondaryAccent}
            size="small"
          />
          <Text style={styles.stateText}>Loading your playlists...</Text>
        </View>
      ) : userPlaylist.length === 0 ? (
        <View style={styles.stateBlock}>
          <Ionicons
            name="albums-outline"
            size={22}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateTitle}>No playlists yet</Text>
          <Text style={styles.stateText}>
            Create a playlist from Library, then come back to save this track.
          </Text>
        </View>
      ) : (
        <FlatList
          data={userPlaylist}
          keyExtractor={(item) => item.id}
          renderItem={renderPlaylist}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  eyebrow: {
    color: theme.colors.secondaryAccent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  playlistRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSection,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariantAlpha,
  },
  playlistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundInteractive,
  },
  playlistMeta: {
    flex: 1,
    gap: 4,
  },
  playlistName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  playlistDescription: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  stateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  stateTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  stateText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
