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
import { ArrowLeft } from 'lucide-react-native';
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
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTextWrapper}>
          <Text style={styles.headerTitle}>{genre?.charAt(0).toUpperCase() + genre?.slice(1)}</Text>
          <Text style={styles.headerSubtitle}>{tracks.length} curated tracks</Text>
        </View>
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
            <View style={styles.listHeaderGradientPlaceholder} />
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.headline,
    color: theme.colors.textPrimary,
    fontSize: 22,
  },
  headerSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 14,
    opacity: 0.7,
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
  listHeaderGradientPlaceholder: {
    height: 10,
  }
});

