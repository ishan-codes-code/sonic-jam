import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import AnimatedPressable from '@/components/AnimatedPressable';
import { PlaylistArtwork } from './PlaylistArtwork';
import type { Playlist } from '../types';

interface PlaylistGridItemProps {
  playlist: Playlist;
  onPress: () => void;
  onLongPress: () => void;
  width?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_WIDTH = (SCREEN_WIDTH - 48) / 3;

export const PlaylistGridItem = ({ playlist, onPress, onLongPress, width = DEFAULT_WIDTH }: PlaylistGridItemProps) => {
  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.95}
      feedback="spring"
      className="mb-4"
      style={{ width }}
    >
      <View
        className="w-full aspect-square overflow-hidden bg-accent/50 border border-border/50"
      >
        <PlaylistArtwork
          thumbnailUrl={playlist.thumbnailUrl}
          isSystem={playlist.isSystem}
          size={width}
        />
      </View>
      <View className="mt-2 px-1 gap-0.5">
        <Text className="text-foreground text-[13px] font-heading-medium" numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text className="text-muted-foreground text-[11px] font-sans" numberOfLines={1}>
          {playlist.songCount || 0} tracks
        </Text>
      </View>
    </AnimatedPressable>
  );
};
