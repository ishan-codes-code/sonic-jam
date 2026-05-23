import React from 'react';
import { View, Text } from 'react-native';
import AnimatedPressable from '@/components/AnimatedPressable';
import { PlaylistArtwork } from './PlaylistArtwork';
import type { Playlist } from '../types';

interface PlaylistListItemProps {
  playlist: Playlist;
  onPress: () => void;
  onLongPress: () => void;
}

export const PlaylistListItem = ({ playlist, onPress, onLongPress }: PlaylistListItemProps) => {
  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.98}
      feedback="snappy"
      className="flex-row items-center py-2 active:bg-white/5 rounded-xl"
    >
      <View className="w-16 h-16 overflow-hidden bg-accent/50 border border-border/50">
        <PlaylistArtwork
          thumbnailUrl={playlist.thumbnailUrl}
          isSystem={playlist.isSystem}
          size={64}
        />
      </View>
      <View className="flex-1 ml-4 justify-center gap-1">
        <Text className="text-foreground text-base font-heading-medium" numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text className="text-muted-foreground text-xs font-sans" numberOfLines={1}>
          Playlist • {playlist.songCount || 0} tracks
        </Text>
      </View>
    </AnimatedPressable>

  );
};
