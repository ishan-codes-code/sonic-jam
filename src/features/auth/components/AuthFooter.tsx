import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/text';

interface AuthFooterProps {
  prompt: string;
  actionLabel: string;
  onPress: () => void;
}

export const AuthFooter = ({ prompt, actionLabel, onPress }: AuthFooterProps) => {
  return (
    <View className="flex-row items-center justify-center mt-6 pb-4">
      <Text className="text-muted-foreground text-sm">{prompt} </Text>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Text className="text-violet-400 text-sm font-semibold">{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};
