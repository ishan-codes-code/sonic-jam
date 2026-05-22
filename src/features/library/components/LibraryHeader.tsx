import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from '@/components/AnimatedPressable';

import { GradientText } from '@/components/GradientText';
import { Text } from '@/components/ui/text';
import { ProfileAvatar } from '@/features/profile/components';

interface LibraryHeaderProps {
  onAddPress: () => void;
}

export const LibraryHeader = ({ onAddPress }: LibraryHeaderProps) => {
  return (
    <View className="flex-row items-center justify-between px-4 py-2 mb-4">
      <View className="flex-row items-center justify-start gap-2">
        <ProfileAvatar size={36} />

        <Text className="text-2xl font-display text-foreground">Your Library</Text>
      </View>
      <View className="flex-row items-center gap-3">
        <AnimatedPressable
          onPress={onAddPress}
          feedback="snappy"
          scaleTo={0.9}
          className="rounded-full"
        >
          <Ionicons name="add" size={28} color="#fff" />
        </AnimatedPressable>
      </View>
    </View>
  );
};
