import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface SocialAuthButtonsProps {
  disabled?: boolean;
}

export const SocialAuthButtons = ({ disabled }: SocialAuthButtonsProps) => {
  return (
    <View className="w-full">
      {/* Divider */}
      <View className="flex-row items-center gap-3 my-5">
        <View className="flex-1 h-px bg-white/10" />
        <Text className="text-xs tracking-widest text-muted-foreground uppercase">
          Or continue with
        </Text>
        <View className="flex-1 h-px bg-white/10" />
      </View>

      {/* Social Buttons */}
      <View className="flex-row justify-center gap-4">
        <TouchableOpacity
          disabled={disabled}
          className={cn(
            'h-12 w-12 rounded-xl items-center justify-center',
            'border border-white/10 bg-white/5',
            disabled && 'opacity-50'
          )}
        >
          <Ionicons name="logo-google" color="#ffffff" size={22} />
        </TouchableOpacity>

        <TouchableOpacity
          disabled={disabled}
          className={cn(
            'h-12 w-12 rounded-xl items-center justify-center',
            'border border-white/10 bg-white/5',
            disabled && 'opacity-50'
          )}
        >
          <Ionicons name="logo-apple" color="#ffffff" size={22} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
