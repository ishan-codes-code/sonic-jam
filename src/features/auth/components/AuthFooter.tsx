import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/text';

interface AuthFooterProps {
  prompt: string;
  actionLabel: string;
  onPress: () => void;
}

export const AuthFooter = ({ prompt, actionLabel, onPress }: AuthFooterProps) => {
  return (
    <View className="mt-6 flex-row items-center justify-center gap-1.5">
      <Text className="text-[13px] text-muted-foreground font-heading">{prompt}</Text>
      <Pressable
        onPress={onPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Text className="text-[13px] font-heading text-amber-300">{actionLabel}</Text>
      </Pressable>
    </View>
  );
};