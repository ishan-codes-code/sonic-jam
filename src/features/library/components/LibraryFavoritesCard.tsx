import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { GradientText } from '@/components/GradientText';
import AnimatedPressable from '@/components/AnimatedPressable';
import { Playlist } from '../types';

interface LibraryFavoritesCardProps {
  favorites: Playlist;
  onPress: () => void;
  onLongPress: () => void;
}

export const LibraryFavoritesCard = ({
  favorites,
  onPress,
  onLongPress,
}: LibraryFavoritesCardProps) => {
  return (
    <View className="mb-4">
      <AnimatedPressable
        onPress={onPress}
        onLongPress={onLongPress}
        scaleTo={0.98}
        className="overflow-hidden rounded-2xl border border-white/10"
      >
        <LinearGradient
          colors={['#f59e0b', '#f97316', '#ef4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-6 flex-row items-start justify-between"
        >
          <View className="flex-1">
            <GradientText
              text={favorites.name}
              className="text-3xl font-display tracking-tight"
              colors={['#ffffff', '#f3f4f6']}
            />
            <GradientText
              text={`${favorites.songCount || 0} liked tracks`}
              className="text-sm font-heading-medium mt-1"
              colors={['#ffffff', '#e2e8f0']}
            />
          </View>
          <View className="bg-white/20 p-3 rounded-full backdrop-blur-md border border-white/10">
            <Icon as={Heart} size={28} className="fill-white text-white" />
          </View>
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
};
