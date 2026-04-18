import { usePlaybackStore } from '@/src/playbackCore';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Immersive background that uses the current track's colors to create
 * a dynamic, premium gradient effect. Optimized for performance.
 */
export const PlayerBackground = () => {
    const trackColors = usePlaybackStore(s => s.trackColors);

    // Default to deep grays if colors haven't loaded yet
    const colors = trackColors 
        ? [trackColors.primary + '99', trackColors.secondary + '44', '#000000'] as const
        : ['#2C2C2E', '#000000'] as const;

    return (
        <View style={styles.root}>
            <LinearGradient
                colors={colors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            {/* Vignette overlay for depth and text legibility */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
});
