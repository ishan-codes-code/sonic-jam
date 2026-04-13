import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    Pause,
    Play,
    Repeat,
    Shuffle,
    SkipBack,
    SkipForward,
    ChevronDown,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { theme } from '@/src/theme';
import { Song } from '@/src/playbackCore/types';
import PlayerSeek from './playerSeek';
import AnimatedPressable from '../../ui/AnimatedPressable';

import { usePlaybackStore, usePlayer } from '@/src/playbackCore';

interface PlayerControlsProps {
    currentSong: Song;
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
    onPrev: () => void;
    animatedStyle: any;
}

export const PlayerControls = ({
    currentSong,
    isPlaying,
    onToggle,
    onNext,
    onPrev,
    animatedStyle
}: PlayerControlsProps) => {
    const { isShuffling, queueType } = usePlaybackStore();
    const { toggleShuffle } = usePlayer();

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            {/* Meta Info: Title and Artist Only */}
            <View style={styles.metaContainer}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.trackName} numberOfLines={1}>{currentSong.trackName}</Text>
                    <Text style={styles.artistName} numberOfLines={1}>{currentSong.artistName}</Text>
                </View>
            </View>

            {/* Seek Bar */}
            <View style={styles.seekContainer}>
                <PlayerSeek />
            </View>

            {/* Core Playback Controls */}
            <View style={styles.mainControls}>
                <TouchableOpacity 
                    onPress={toggleShuffle} 
                    style={[styles.secondaryAction, { opacity: queueType === 'playlist' ? 1 : 0.3 }]}
                    disabled={queueType !== 'playlist'}
                >
                    <Shuffle 
                        color={isShuffling ? theme.colors.actionAccent : theme.colors.textMuted} 
                        size={22} 
                    />
                    {isShuffling && <View style={styles.activeDot} />}
                </TouchableOpacity>

                <TouchableOpacity onPress={onPrev} style={styles.skipBtn}>
                    <SkipBack color="white" fill="white" size={36} />
                </TouchableOpacity>

                <AnimatedPressable
                    onPress={onToggle}
                    pressableStyle={styles.playBtn}
                    scaleTo={0.9}
                >
                    {isPlaying
                        ? <Pause color="black" fill="black" size={32} />
                        : <Play color="black" fill="black" size={32} style={{ marginLeft: 4 }} />
                    }
                </AnimatedPressable>

                <TouchableOpacity onPress={onNext} style={styles.skipBtn}>
                    <SkipForward color="white" fill="white" size={36} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryAction} disabled>
                    <Repeat color={theme.colors.textMuted} size={22} />
                </TouchableOpacity>
            </View>

            {/* Clear spacer to focus purely on "Up Next" below */}
            <View style={{ height: 30 }} />

        </Animated.View>
    );
};

const styles = StyleSheet.create({
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.actionAccent,
        position: 'absolute',
        bottom: 2,
    },
    container: {
        gap: theme.spacing.lg,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackName: {
        color: 'white',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    artistName: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 18,
        fontWeight: '500',
        marginTop: 4,
        textAlign: 'center',
    },
    seekContainer: {
        marginTop: 20,
    },
    mainControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingHorizontal: 10,
    },
    playBtn: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    skipBtn: {
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryAction: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.6,
    },
    scrollHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
        paddingVertical: 12,
    },
    scrollHintPill: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    scrollHintText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
});
