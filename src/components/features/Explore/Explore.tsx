import { usePlayerStore } from '@/src/store/playerStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreHorizontal, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../../../theme';
import { AppHeader } from '../../ui/AppHeader';
import { useExploreLogic } from './Explore.logic';
import { styles } from './Explore.styles';
import { SectionItem } from './SectionItem';
import { VerticalVideoCard } from './VideoCard';

const FAILED_JOB_STATUSES = new Set(['error', 'failed', 'failure']);

export function Explore() {
  const {
    query,
    setQuery,
    debouncedQuery,
    isSearchMode,
    sections,
    loading,
    error,
    searchResults,
    searchLoading,
    loadingMoreSearch,
    genreResults,
    genreLoading,
    activeGenre,
    menuVisible,
    setMenuVisible,
    loadInitial,
    refreshSection,
    loadMoreSection,
    handlePlay,
    loadMoreSearch,
    handleGenrePress,
    handleAddSection,
    GENRES,
    activeSongJob,
    playbackError,
    dismissSongJob,
  } = useExploreLogic();
  const { isPlayPending } = usePlayerStore();

  const [isFlashVisible, setIsFlashVisible] = useState(false);
  const [dismissedJobId, setDismissedJobId] = useState<string | null>(null);
  const normalizedJobStatus = activeSongJob?.status?.toLowerCase();
  const isJobFailed = normalizedJobStatus
    ? FAILED_JOB_STATUSES.has(normalizedJobStatus)
    : false;

  useEffect(() => {
    if (!activeSongJob) return;

    setDismissedJobId(null);
    setIsFlashVisible(true);
  }, [activeSongJob]);

  useEffect(() => {
    if (!activeSongJob && !isPlayPending) {
      setIsFlashVisible(false);
    }
  }, [activeSongJob, isPlayPending]);


  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
        {title}
      </Text>
    </View>
  );

  const renderContent = () => {
    const listHeader = (
      <>
        <AppHeader />
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <Search
              color={query ? theme.colors.secondaryAccent : theme.colors.textMuted}
              size={18}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Artists, songs, or podcasts..."
              placeholderTextColor={theme.colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <X color={theme.colors.textMuted} size={16} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreHorizontal size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </>
    );

    if (loading && sections.every((section: any) => section.data.length === 0)) {
      return (
        <ScrollView showsVerticalScrollIndicator={false}>
          {listHeader}
          <View style={styles.centeredBox}>
            <ActivityIndicator size="large" color={theme.colors.primaryAccent} />
            <Text
              style={[
                theme.typography.body,
                { color: theme.colors.textSecondary, marginTop: 16 },
              ]}
            >
              Loading...
            </Text>
          </View>
        </ScrollView>
      );
    }

    if (error && sections.every((section: any) => section.data.length === 0)) {
      return (
        <ScrollView showsVerticalScrollIndicator={false}>
          {listHeader}
          <View style={styles.centeredBox}>
            <Text style={[theme.typography.headline, { color: theme.colors.error }]}>
              Error
            </Text>
            <Text
              style={[
                theme.typography.body,
                {
                  color: theme.colors.textSecondary,
                  marginTop: 8,
                  textAlign: 'center',
                  paddingHorizontal: 24,
                },
              ]}
            >
              {error}
            </Text>
            <TouchableOpacity onPress={loadInitial} style={styles.retryBtn}>
              <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    if (isSearchMode) {
      return (
        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => `${item.videoId}_${index}`}
          renderItem={({ item }) => (
            <VerticalVideoCard item={item} onPress={handlePlay} />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMoreSearch}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={listHeader}
          ListFooterComponent={
            <>
              {searchLoading ? (
                <ActivityIndicator
                  color={theme.colors.primaryAccent}
                  style={{ marginVertical: 24 }}
                />
              ) : searchResults.length === 0 ? (
                <Text
                  style={[
                    theme.typography.body,
                    {
                      color: theme.colors.textSecondary,
                      textAlign: 'center',
                      marginTop: 48,
                    },
                  ]}
                >
                  No results for &quot;{debouncedQuery}&quot;
                </Text>
              ) : null}
              {loadingMoreSearch ? (
                <ActivityIndicator
                  color={theme.colors.primaryAccent}
                  style={{ marginVertical: 16 }}
                />
              ) : null}
            </>
          }
        />
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {listHeader}

        <View style={styles.section}>
          {renderSectionHeader('Explore Genres')}
          <View style={styles.genreGrid}>
            {GENRES.map((genre: any) => {
              const isActive = activeGenre === genre.query;
              return (
                <TouchableOpacity
                  key={genre.query}
                  activeOpacity={0.8}
                  onPress={() => handleGenrePress(genre)}
                  style={[styles.genreBtn, isActive && styles.genreBtnActive]}
                >
                  <LinearGradient
                    colors={genre.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.genreGradient}
                  >
                    <Text style={styles.genreLabel}>{genre.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeGenre && (
            <View style={{ marginTop: theme.spacing.md }}>
              {genreLoading ? (
                <ActivityIndicator color={theme.colors.primaryAccent} />
              ) : (
                genreResults.map((item, index) => (
                  <VerticalVideoCard
                    key={`gr_${item.videoId}_${index}`}
                    item={item}
                    onPress={handlePlay}
                  />
                ))
              )}
            </View>
          )}
        </View>

        {sections.map((section: any) => (
          <SectionItem
            key={section.id}
            section={section}
            onItemPress={handlePlay}
            onLoadMore={() => loadMoreSection(section.id)}
            onRefresh={() => refreshSection(section.id)}
          />
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}

      {menuVisible && (
        <Modal
          transparent
          animationType="fade"
          visible={menuVisible}
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable
            style={styles.menuBackdrop}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleAddSection}
              >
                <Ionicons
                  name="add-circle-outline"
                  color={theme.colors.primaryAccent}
                  size={18}
                />
                <Text style={styles.menuItemText}>Add Section</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* <FakeProgressFlashMessage
        visible={isFlashVisible && activeSongJob?.jobId !== dismissedJobId}
        error={isJobFailed}
        errorMessage={playbackError || 'Failed to process. Try again.'}
        label={
          activeSongJob
            ? `${activeSongJob.title} [${activeSongJob.status}] ${Math.round(
                activeSongJob.progress ?? 0,
              )}%`
            : undefined
        }
        progress={activeSongJob?.progress}
        onDismiss={() => {
          if (isJobFailed && activeSongJob) {
            dismissSongJob(activeSongJob.jobId);
          }

          setDismissedJobId(activeSongJob?.jobId ?? null);
          setIsFlashVisible(false);
        }}
      /> */}
    </View>
  );
}
