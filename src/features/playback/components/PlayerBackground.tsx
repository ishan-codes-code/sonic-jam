import { usePlaybackStore } from '@/features/playback';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View, StyleSheet } from 'react-native';

export const PlayerBackground = React.memo(() => {
    const trackColors = usePlaybackStore(s => s.trackColors);

    // Default to dark slate if colors haven't loaded yet, for a premium OLED feel
    const colors = trackColors 
        ? [trackColors.primary + '99', trackColors.secondary + '44', '#000000'] as const
        : ['#0f172a', '#000000'] as const;

    return (
        <View className="absolute inset-0 bg-black">
            <LinearGradient
                colors={colors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <View className="absolute inset-0 bg-black/50" />
        </View>
    );
});
