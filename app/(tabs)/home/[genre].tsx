import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { theme } from '@/src/theme';
import { useMusic } from '@/src/hooks/useMusic';
import { Song } from '@/src/playbackCore/types';
import { usePlayer } from '@/src/playbackCore/usePlayer';
import { LinearGradient } from 'expo-linear-gradient';
import SongListCard from '@/src/components/features/Playlist/SongListCard';

export default function GenreTracksScreen() {
  const { genre } = useLocalSearchParams<{ genre: string }>();
  const router = useRouter();
  const { play } = usePlayer();
  
  const { 
    genreSongs: tracks, 
    isLoadingGenre: loading, 
    genreError: error,
    refetchGenre
  } = useMusic({ genre });

  const handleTrackPress = (track: Song) => {
    play({
      trackName: track.trackName,
      artistName: track.artistName,
    });
  };

  const renderTrackItem = ({ item }: { item: Song }) => (
    <SongListCard
      playlistSongs={{
        id: item.id,
        trackName: item.trackName || 'Unknown',
        artistName: item.artistName || 'Unknown',
        duration: item.duration || 0,
        youtubeId: '',
        image: item.image || null,
      } as any}
      artworkUri={item.image}
      onPress={() => handleTrackPress(item)}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={theme.colors.textPrimary} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{genre?.charAt(0).toUpperCase() + genre?.slice(1)}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primaryAccent} />
          <Text style={styles.loadingText}>Fetching the best of {genre}...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{(error as any)?.message || 'Failed to load tracks'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetchGenre()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : tracks.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>No tracks found for this genre.</Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderTrackItem}
          keyExtractor={(item) => item.id || item.trackName + item.artistName}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'transparent']}
              style={styles.listHeaderGradient}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    ...theme.typography.headline,
    color: theme.colors.textPrimary,
    fontSize: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    ...theme.typography.metadata,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryAccent,
  },
  retryText: {
    ...theme.typography.label,
    color: 'white',
  },
  listHeaderGradient: {
    height: 20,
    marginBottom: 10,
  }
});
