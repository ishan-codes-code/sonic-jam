import { useMusic } from '@/src/hooks/useMusic';
import { Ionicons } from '@expo/vector-icons';
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
import { theme } from '../../../theme';
import AnimatedPressable from '../../ui/AnimatedPressable';
import { AppHeader } from '../../ui/AppHeader';
import AddPlaylistModal from './AddPlaylistModal';
import { styles } from './Library.styles';
import { PlaylistCard } from '../Playlist/PlaylistCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ASSETS = {
  ethereal: 'https://www.figma.com/api/mcp/asset/d4a9eb07-6026-48b2-84cb-124051ef17d6',
  midnight: 'https://www.figma.com/api/mcp/asset/44878c20-0bcb-4473-b45d-32a3e4f1aa42',
  synthetix: 'https://www.figma.com/api/mcp/asset/e3f75c20-dbeb-4d58-bd1d-f5f4f29e985d',
  neonDreams: 'https://www.figma.com/api/mcp/asset/69a695d7-56b5-48ee-bfa3-6342071a3464',
  partyMix: 'https://www.figma.com/api/mcp/asset/a3970c37-6434-4796-97a5-c9950eca6941',
  chillMix: 'https://www.figma.com/api/mcp/asset/928b2b3d-93ea-4c9a-b74d-50d5d05fe91b',
  avatar: 'https://www.figma.com/api/mcp/asset/d1c5d67f-90f4-42c3-b3a8-56fb158ac68f',
} as const;


const PLAYLIST_CARDS = [
  {
    id: '1',
    title: 'Ethereal Echoes',
    subtitle: 'Playlist • 48 tracks',
    image: ASSETS.ethereal,
    shape: 'rect' as const,
  },
  {
    id: '2',
    title: 'Midnight Pulse',
    subtitle: 'Playlist • 124 tracks',
    image: ASSETS.midnight,
    shape: 'rect' as const,
  },
  {
    id: '3',
    title: 'Synthetix Core',
    subtitle: 'ARTIST',
    image: ASSETS.synthetix,
    shape: 'circle' as const,
    centered: true,
  },
  {
    id: '4',
    title: 'Neon Dreams',
    subtitle: 'Album • 2024',
    image: ASSETS.neonDreams,
    shape: 'rect' as const,
  },
] as const;

const CURATED = [
  {
    id: 'c1',
    title: 'Weekend Warmup',
    desc: 'Top energetic tracks for your Friday night.',
    image: ASSETS.partyMix,
  },
  {
    id: 'c2',
    title: 'Lo‑Fi Afternoons',
    desc: 'Focus and flow with ambient instrumentals.',
    image: ASSETS.chillMix,
  },
] as const;





function CuratedCard({ item }: { item: (typeof CURATED)[number] }) {
  const cardW = SCREEN_WIDTH * 0.74;
  return (
    <Pressable
      style={({ pressed }) => [styles.curatedCard, { width: cardW }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <Image source={{ uri: item.image }} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} resizeMode="cover" />
      <View style={styles.curatedGradient} />
      <View style={styles.curatedTextWrapper}>
        <Text style={styles.curatedTitle}>{item.title}</Text>
        <Text style={styles.curatedDesc} numberOfLines={2}>
          {item.desc}
        </Text>
      </View>
    </Pressable>
  );
}









export const Library = () => {
  const router = useRouter()
  const { userPlaylist, createPlaylist, isCreatingPlaylist } = useMusic();

  const [playListLayout, setPlaylistLayout] = useState<'grid' | 'list'>('grid');
  const [open, setOpen] = useState(false);


  const handleCreatePlaylist = async (data: { name: string; description?: string; isPublic?: boolean }) => {
    try {
      await createPlaylist({
        name: data.name,
        description: data.description || null,
        isPublic: data.isPublic ?? false,
      });
      setOpen(false);
    } catch (error) {
      console.error('Failed to create playlist:', error);
      // Optionally show error message
    }
  };

  const clickedPlaylist = (playlistId: string) => {
    router.push({
      pathname: '/(tabs)/library/[playlistId]',
      params: { playlistId },
    });
  }




  return (
    <View style={styles.root}>
      <AddPlaylistModal
        visible={open}
        defaultName="My playlist #5"
        onCancel={() => setOpen(false)}
        onCreate={handleCreatePlaylist}
        isCreating={isCreatingPlaylist}
      />



      <AppHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.section}>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="musical-notes" size={18} color={theme.colors.primaryAccent} />
              <Text style={styles.sectionTitle}>Playlist</Text>
            </View>
            <View style={styles.headerIconTray}>
              <AnimatedPressable onPress={() => setOpen(true)} hitSlop={10} accessibilityLabel="Toggle playlist layout" accessibilityRole="button" feedback="snappy" scaleTo={0.8}>

                <Ionicons name={"add"} size={theme.spacing.lg} color="#fff" />

              </AnimatedPressable>


              <AnimatedPressable onPress={() => {
                if (playListLayout === 'grid') {
                  setPlaylistLayout('list')
                } else setPlaylistLayout('grid')
              }} hitSlop={10} accessibilityLabel="Toggle playlist layout" accessibilityRole="button" feedback="snappy" scaleTo={0.8}>

                <Ionicons name={playListLayout} size={theme.spacing.md} color="#fff" />

              </AnimatedPressable>
            </View>

          </View>

          <AnimatedPressable
            // style={({ pressed }) => [styles.likedBanner, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Liked Songs, 842 tracks"

          >
            <LinearGradient colors={[theme.colors.secondaryAccent, theme.colors.primaryAccent,]}
              style={styles.likedBanner}>
              <View style={styles.likedLeft}>
                <Text style={styles.likedTitle}>Liked Songs</Text>
                <View style={styles.likedMeta}>
                  <Text style={styles.likedCount}>842 tracks</Text>
                </View>
              </View>
              <View style={styles.likedIconWrapper}>
                <Ionicons name="heart" size={theme.spacing.xl} color={theme.colors.backgroundSection} />
              </View>

            </LinearGradient>
          </AnimatedPressable>





          {playListLayout === 'grid' ? (
            <FlatList
              data={userPlaylist}
              key={'grid'}
              numColumns={3}
              renderItem={({ item }) => (
                <PlaylistCard
                  key={item.id}
                  variant="grid"
                  name={item.name}
                  description={item.description}
                  onPress={() => clickedPlaylist(item.id)}
                  gridCardWidth={
                    Math.floor((SCREEN_WIDTH - theme.spacing.md * 2 - 12 * 2) / 3)
                  }
                />
              )}
              columnWrapperStyle={{ justifyContent: 'flex-start', gap: 12, marginBottom: 0 }}
              contentContainerStyle={{ paddingHorizontal: 0, gap: 0 }}
              scrollEnabled={false}
              ListEmptyComponent={null}
            />
          ) : (
            <View style={styles.grid}>
              {userPlaylist.map(item => (
                <PlaylistCard
                  key={item.id}
                  variant="list"
                  name={item.name}
                  description={item.description}
                  onPress={() => clickedPlaylist(item.id)}

                />
              ))}
            </View>
          )}

        </View>

        <View style={styles.section}>
          <View style={styles.curatedHeader}>
            <Text style={styles.curatedHeading}>Curated for You</Text>
            <View style={styles.cyanDot} />
          </View>

          <FlatList
            data={CURATED}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.curatedList}
            renderItem={({ item }) => <CuratedCard item={item} />}
            ItemSeparatorComponent={() => <View style={{ width: theme.spacing.md }} />}
          />
        </View>

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
    </View>
  );
};

