import React from 'react';
import { View, Text } from 'react-native';
import { ListMusic, Plus } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

interface LibraryEmptyStateProps {
  onAddPress: () => void;
}

export const LibraryEmptyState = ({ onAddPress }: LibraryEmptyStateProps) => {
  return (
    <View className="py-20 items-center justify-center px-8">
      <View className="bg-secondary/30 p-8 rounded-full mb-6 border border-border/10">
        <Icon as={ListMusic} size={48} className="text-muted-foreground/50" />
      </View>
      <Text className="text-foreground text-xl font-display text-center">
        No playlists yet
      </Text>
      <Text className="text-muted-foreground text-sm font-heading text-center mt-2 leading-relaxed">
        Create your first playlist to start organizing your music and vibes.
      </Text>
      
      <Button 
        onPress={onAddPress}
        className="mt-8 bg-foreground h-12 rounded-full px-8"
      >
        <View className="flex-row items-center gap-2">
          <Icon as={Plus} size={18} className="text-background" />
          <Text className="text-background font-display font-bold">Create Playlist</Text>
        </View>
      </Button>
    </View>
  );
};
