import { ListMusic, Music, Play } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import AudioWave from '../../ui/AudioWave';
import { useLibraryLogic } from './Library.logic';
import { styles } from './Library.styles';

export const Library = () => {
  const {
    library,
    isLoadingLibrary,
    libraryError,
    currentSong,
    status,
    handlePlay,
  } = useLibraryLogic();

  const renderItem = ({ item }: { item: any }) => {
    const isPlayingCurrent = currentSong?.songId === item.songId;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handlePlay(item)}
        style={[
          styles.songCard,
          isPlayingCurrent && styles.activeCard
        ]}
      >
        <View style={styles.songIconBox}>
          {item.youtubeId ? (
            <Image
              source={{ uri: `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg` }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <Music color={isPlayingCurrent ? theme.colors.secondaryAccent : theme.colors.textSecondary} size={20} />
          )}
        </View>

        <View style={styles.songInfo}>
          <Text
            style={[
              styles.songTitle,
              isPlayingCurrent && { color: theme.colors.secondaryAccent }
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isPlayingCurrent && status === 'playing' && (
              <AudioWave
                isPlaying={true}
                barColor={theme.colors.secondaryAccent}
                count={3}
                barWidth={2}
                maxHeight={12}
                gap={1}
              />
            )}
            <Text style={styles.songMeta}>
              {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        </View>

        <Play color={theme.colors.textMuted} size={18} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={[theme.typography.displayMedium, { color: theme.colors.textPrimary }]}>
          Your Library
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, marginTop: 4 }]}>
          {library.length} tracks saved
        </Text>
      </View>

      {isLoadingLibrary ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primaryAccent} />
        </View>
      ) : libraryError ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.error }}>Error loading library</Text>
        </View>
      ) : library.length === 0 ? (
        <View style={styles.center}>
          <ListMusic color={theme.colors.textMuted} size={48} strokeWidth={1} />
          <Text style={[theme.typography.title, { color: theme.colors.textSecondary, marginTop: 16 }]}>
            Empty Library
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.textMuted, marginTop: 8, textAlign: 'center' }]}>
            Add songs from the Explore page to see them here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={library}
          keyExtractor={(item) => item.songId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};
