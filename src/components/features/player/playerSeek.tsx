import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { usePlayer } from '@/src/playbackCore';
import { theme } from '@/src/theme';
import { useProgress } from 'react-native-track-player';

/**
 * Highly optimized Seek bar.
 * Uses native useProgress hook for 60FPS fluid updates without triggering global store re-renders.
 */
function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const PlayerSeek = React.memo(() => {
    const { position, duration } = useProgress(200); // Efficient native progress tracking
    const { seek } = usePlayer();

    // Local state for immediate UI feedback during dragging to prevent "jumping"
    const [isSliding, setIsSliding] = useState(false);
    const [slidingValue, setSlidingValue] = useState(0);

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

    const displayedPosition = isSliding ? slidingValue : position;

    return (
        <View style={styles.seekContainer}>
            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration > 0 ? duration : 1}
                value={isSliding ? slidingValue : position}
                onSlidingStart={handleSlidingStart}
                onValueChange={handleValueChange}
                onSlidingComplete={handleSlidingComplete}
                minimumTrackTintColor="white"
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor="white"
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
        width: '100%',
    },
    slider: {
        width: '100%',
        height: 32, // More compact as per image
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        marginTop: -4,
    },
    timeText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '500',
        fontFamily: 'monospace', // Tabular figures for time
    },
});