import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { MediaSection } from './MediaSection';
import { YouTubeVideo } from '../../../services/youtube';
import { theme } from '../../../theme';
import { DynamicSection } from '../../../types/explore';

interface SectionItemProps {
  section: DynamicSection;
  onItemPress: (item: YouTubeVideo) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
}

export function SectionItem({
  section,
  onItemPress,
  onLoadMore,
  onRefresh,
}: SectionItemProps) {
  if (section.isLoading && section.data.length === 0) {
    return (
      <MediaSection
        title={section.title}
        data={[]}
        layout={section.layout}
        variant={section.variant}
        isLoading={true}
        onItemPress={onItemPress}
      />
    );
  }

  const customTitle =
    section.id === 'default_trending'
      ? () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="logo-youtube" color="#FF0000" size={20} />
          <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
            YouTube Trending
          </Text>
        </View>
      )
      : undefined;

  return (
    <MediaSection
      title={section.title}
      data={section.data}
      layout={section.layout}
      variant={section.variant}
      hasMore={section.hasMore}
      isLoading={section.isLoading}
      isLoadingMore={section.isLoadingMore}
      onLoadMore={onLoadMore}
      onRefresh={onRefresh}
      onItemPress={onItemPress}
      renderTitle={customTitle}
    />
  );
}
