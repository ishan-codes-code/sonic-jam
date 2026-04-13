import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { usePlaybackStore, usePlayer } from '@/src/playbackCore';
import { theme } from '@/src/theme';

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const PlayerSeek = React.memo(() => {
    const position = usePlaybackStore(s => s.position);
    const duration = usePlaybackStore(s => s.duration);
    const { seek } = usePlayer();

    // Local state for immediate UI feedback during dragging
    const [isSliding, setIsSliding] = React.useState(false);
    const [slidingValue, setSlidingValue] = React.useState(0);

    const handleSlidingStart = useCallback(() => {
        setIsSliding(true);
    }, []);

    const handleValueChange = useCallback((value: number) => {
        setSlidingValue(value);
    }, []);

    const handleSlidingComplete = useCallback((value: number) => {
        setIsSliding(false);
        seek(value);
    }, [seek]);

    // Use slidingValue when user is dragging, otherwise fallback to playback position
    const displayedPosition = isSliding ? slidingValue : position;

    return (
        <View style={styles.seekContainer}>
            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration > 0 ? duration : 1}
                value={position}
                onSlidingStart={handleSlidingStart}
                onValueChange={handleValueChange}
                onSlidingComplete={handleSlidingComplete}
                minimumTrackTintColor={theme.colors.textPrimary}
                maximumTrackTintColor="rgba(255,255,255,0.15)"
                thumbTintColor={theme.colors.textPrimary}
            />
            <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(displayedPosition)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
        </View>
    );
});

export default PlayerSeek;

const styles = StyleSheet.create({
    seekContainer: {
        marginBottom: theme.spacing.lg,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -theme.spacing.xs,
    },
    timeText: {
        ...theme.typography.metadata,
        color: theme.colors.textMuted,
    },
});