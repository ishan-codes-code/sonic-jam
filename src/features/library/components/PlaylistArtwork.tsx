import React from 'react';
import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Icon } from '@/components/ui/icon';
import { AudioLines, Disc3 } from 'lucide-react-native';

interface PlaylistArtworkProps {
  thumbnailUrl?: string[] | null;
  size?: number;
  /** Identifies system-generated playlists (e.g. Liked Songs). Reserved for styling. */
  isSystem?: boolean;
}

export const PlaylistArtwork = ({ thumbnailUrl, size }: PlaylistArtworkProps) => {

  const hasThumbnails = (thumbnailUrl?.length ?? 0) > 0;

  if (!hasThumbnails) {
    return (
      <View className="w-full h-full items-center justify-center bg-accent/50">
        <Icon as={Disc3} size={size ? size * 0.5 : 24} color="#6b7280" />
      </View>
    );
  }

  const count = thumbnailUrl!.length;

  if (count > 1) {
    const images = thumbnailUrl!.slice(0, 4);
    return (
      <View className="flex-1 flex-row flex-wrap">
        {images.map((uri, index) => (
          <View key={`${uri}-${index}`} className="w-1/2 h-1/2">
            <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
          </View>
        ))}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: thumbnailUrl![0] }}
      className="w-full h-full"
      resizeMode="cover"
    />
  );
};
