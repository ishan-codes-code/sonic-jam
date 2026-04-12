import { theme } from '@/src/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Super simple premium dark background.
 * Removed all dynamic color logic for a cleaner, unified UI.
 */
export const PlayerBackground = () => {
    return (
        <View style={styles.root} />
    );
};

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.backgroundBase, // Very deep gray/black, classic premium dark theme
    },
});
