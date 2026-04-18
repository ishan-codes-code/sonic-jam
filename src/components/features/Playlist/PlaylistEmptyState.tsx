import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import AnimatedPressable from '../../ui/AnimatedPressable';
import { playlistScreenStyles as styles } from './PlaylistScreen.styles';

export function PlaylistEmptyState() {
    return (
        <View style={styles.empty}>
            <Text style={styles.emptyTitle}>This playlist is empty</Text>
            <Text style={styles.emptyDesc}>Add a few songs to start the vibe. Explore and save what you love.</Text>
            <AnimatedPressable
                style={{ marginTop: 14 }}
                pressableStyle={styles.emptyCta}
                feedback="snappy"
                scaleTo={0.985}
                pressedOpacity={0.9}
                accessibilityLabel="Explore songs"
            >
                <Text style={styles.emptyCtaText}>Explore songs</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.onPrimary} />
            </AnimatedPressable>
        </View>
    );
}
