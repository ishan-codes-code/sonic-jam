import { Search as SearchIcon, X } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { useBottomSheet } from '@/src/hooks/useDrawer';
import { createRecentSongActions } from '@/src/utils/songsActions';
import SongListCard from '../Playlist/SongListCard';
import { RecentSongPlaylistDrawer } from './RecentSongPlaylistDrawer';
import { useSearchLogic } from './Search.logic';
import { styles } from './Search.styles';
import { usePlayer } from '@/src/playbackCore/';
import { RecentSong } from '@/src/utils/recentSongsStorage';
import { SearchTrack } from '@/src/services/searchService';

export function Search() {
  const { open, close } = useBottomSheet();
  const {
    query,
    setQuery,
    results,
    recentSongs,
    showRecentSongs,
    isLoading,
    debouncedQuery,
    clearQuery,
    addToRecent,
    removeRecentSong,
  } = useSearchLogic();

  const listData = showRecentSongs ? recentSongs : results;

  const { play } = usePlayer();

  const handlePlay = async (item: SearchTrack) => {
    // Add basic info immediately for quick UI response
    const basicRecent: RecentSong = {
      id: item.id,
      title: item.title,
      artist: item.artist,
      image: item.image,
      youtubeId: item.id,
    };
    await addToRecent(basicRecent);

    // Trigger play which resolves full metadata from backend
    const track = await play({ trackName: item.title, artistName: item.artist });

    // If successful, update with the full song metadata in recents
    if (track?.song) {
      await addToRecent(track.song as RecentSong);
    }
  };

  const handleRecentPlay = async (item: RecentSong) => {
    // Re-play the song
    const track = await play({ songId: item.id });

    // Move to top of recents with updated metadata if available
    if (track?.song) {
      await addToRecent(track.song as RecentSong);
    } else {
      await addToRecent(item);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <FlatList<any>
        data={listData}
        keyExtractor={(item, index) => `${item.id}_${index}`}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: rawItem, index }) => {
          if (showRecentSongs) {
            const item = rawItem as RecentSong;
            const title = item.trackName || item.title || 'Unknown';
            const artist = item.artistName || item.artist || 'Unknown';

            const recentActions = createRecentSongActions({
              onClose: close,
              onOpenAddToPlaylist: () => {
                open(
                  <RecentSongPlaylistDrawer
                    songId={item.id}
                    songTitle={title}
                  />,
                  ['55%', '82%'],
                );
              },
              onRemove: () => {
                void removeRecentSong(item.id);
              },
            });

            return (
              <SongListCard
                playlistSongs={{
                  ...item,
                  trackName: title,
                  artistName: artist,
                  duration: item.duration ?? 0,
                  youtubeId: item.youtubeId ?? item.id,
                } as any}
                artworkUri={item.image}
                onPress={() => handleRecentPlay(item)}
                actions={recentActions.actions}
                trailingActions={recentActions.trailingActions}
              />
            );
          } else {
            const item = rawItem as SearchTrack;
            return (
              <SongListCard
                playlistSongs={{
                  id: item.id,
                  trackName: item.title,
                  artistName: item.artist,
                  duration: 0,
                  youtubeId: item.id,
                } as any}
                artworkUri={item.image}
                onPress={() => handlePlay(item)}
              />
            );
          }
        }}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.searchBar}>
                <SearchIcon color={theme.colors.secondaryAccent} size={18} />
                <TextInput
                  autoFocus
                  autoCorrect={false}
                  placeholder="Artists, songs, or podcasts..."
                  placeholderTextColor={theme.colors.textMuted}
                  returnKeyType="search"
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                />
                {query.length > 0 && (
                  <TouchableOpacity activeOpacity={0.8} onPress={clearQuery}>
                    <X color={theme.colors.textMuted} size={16} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {showRecentSongs && recentSongs.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recents</Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <ActivityIndicator
                color={theme.colors.primaryAccent}
                size="large"
                style={styles.loader}
              />
            ) : (
              <>
                <Text style={styles.emptyTitle}>
                  {showRecentSongs ? 'No recent songs yet' : 'No songs found'}
                </Text>
                <Text style={styles.emptyText}>
                  {showRecentSongs
                    ? 'Songs you play from search will show up here for quick replay.'
                    : query.trim().length > 0
                      ? `We couldn't find results for "${debouncedQuery}".`
                      : 'Type a song title or artist name to start exploring.'}
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
