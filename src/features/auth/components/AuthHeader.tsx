import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Music2 } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export const AuthHeader = ({ title, subtitle }: AuthHeaderProps) => {
  return (
    <View className="items-center mb-8">
      {/* Logo row */}
      <View className="flex-row items-center mb-6">
        <Music2 color="#a78bfa" size={28} />
        <MaskedView
          maskElement={
            <Text
              style={{
                fontSize: 20,
                fontWeight: '900',
                letterSpacing: 4,
                marginLeft: 8,
                backgroundColor: 'transparent',
              }}
            >
              SONICJAM
            </Text>
          }
        >
          <LinearGradient colors={['#7c3aed', '#a78bfa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '900',
                letterSpacing: 4,
                marginLeft: 8,
                opacity: 0,
              }}
            >
              SONICJAM
            </Text>
          </LinearGradient>
        </MaskedView>
      </View>

      {/* Title */}
      <Text className="text-foreground text-3xl font-sans-bold tracking-tight text-center mb-2">
        {title}
      </Text>

      {/* Subtitle */}
      <Text className="text-muted-foreground text-base text-center">{subtitle}</Text>
    </View>
  );
};
