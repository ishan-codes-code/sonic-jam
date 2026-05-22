import React, { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import Slider from '@react-native-community/slider';
import { usePlaybackStore, usePlayer } from '@/features/playback';
import { useProgress } from '@rntp/player';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Seek bar that polls at 1s (down from 0.2s) — a 5× reduction in re-render
 * frequency. At 1s cadence the text/slider updates are imperceptible to users
 * during normal playback; only active sliding needs sub-second precision, which
 * is handled locally by isSliding state.
 */
export const PlayerSeek = React.memo(() => {
    // 1s interval: slider thumb smoothness comes from the native Slider component,
    // not from React re-renders. Labels at 1s are perfectly adequate.
    const { position, duration: nativeDuration } = useProgress(1);
    const { seek } = usePlayer();
    const storeDuration = usePlaybackStore(s => s.duration);

    // Hardened check: must be a positive finite number, not the native 'unset' sentinel
    const isValidNativeDuration =
        typeof nativeDuration === 'number' &&
        nativeDuration > 0 &&
        nativeDuration < 86400; // max 24h
    const duration = isValidNativeDuration
        ? nativeDuration
        : storeDuration > 0
        ? storeDuration
        : 0;

    const [isSliding, setIsSliding] = useState(false);
    const [slidingValue, setSlidingValue] = useState(0);
    const canSeek = duration > 0;

    const displayedPosition = isSliding ? slidingValue : position;

    // ── Callbacks ────────────────────────────────────────────────────────────

    const handleSlidingStart = useCallback(() => {
        if (!canSeek) return;
        setSlidingValue(displayedPosition);
        setIsSliding(true);
    }, [canSeek, displayedPosition]);

    const handleValueChange = useCallback((value: number) => {
        setSlidingValue(value);
    }, []);

    const handleSlidingComplete = useCallback(
        async (value: number) => {
            if (!canSeek) {
                setIsSliding(false);
                return;
            }
            const nextPosition = Math.min(Math.max(value, 0), duration);
            setSlidingValue(nextPosition);
            await seek(nextPosition);
            setIsSliding(false);
        },
        [canSeek, duration, seek]
    );

    return (
        <View className="w-full">
            <Slider
                className="h-8 w-full"
                minimumValue={0}
                maximumValue={duration > 0 ? duration : 1}
                value={displayedPosition}
                disabled={!canSeek}
                onSlidingStart={handleSlidingStart}
                onValueChange={handleValueChange}
                onSlidingComplete={handleSlidingComplete}
                minimumTrackTintColor="white"
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor="white"
            />
            <View className="flex-row justify-between px-3 -mt-1">
                <Text className="font-mono text-xs font-medium text-white/50">
                    {formatTime(displayedPosition)}
                </Text>
                <Text className="font-mono text-xs font-medium text-white/50">
                    {formatTime(duration)}
                </Text>
            </View>
        </View>
    );
});
