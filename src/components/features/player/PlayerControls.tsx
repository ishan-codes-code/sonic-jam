import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    Pause,
    Play,
    Shuffle,
    SkipBack,
    SkipForward,
    X,
    PlusCircle,
    Timer,
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

/**
 * Pixel-perfect Player Controls matching the Spotify/Premium UI.
 * Isolated logic to minimize re-renders.
 */
export const PlayerControls = memo(({
    currentSong,
    isPlaying,
    onToggle,
    onNext,
    onPrev,
    animatedStyle
}: PlayerControlsProps) => {
    const isShuffling = usePlaybackStore((s) => s.isShuffling);
    const { toggleShuffle } = usePlayer();

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            {/* 1. Meta Info & Action Row */}
            <View style={styles.infoRow}>
                <View style={styles.titleContainer}>
                    <Text style={styles.trackName} numberOfLines={1}>
                        {currentSong.trackName}
                    </Text>
                    <Text style={styles.artistName} numberOfLines={1}>
                        {currentSong.artists?.map((a: any) => a.name).join(', ')}
                    </Text>
                </View>
                
                <View style={styles.infoActions}>
                    <TouchableOpacity style={styles.infoActionBtn}>
                        <X color="white" size={30} strokeWidth={1.5} opacity={0.8} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.infoActionBtn}>
                        <PlusCircle color="white" size={30} strokeWidth={1.5} opacity={0.8} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 2. Seek Bar */}
            <View style={styles.seekSection}>
                <PlayerSeek />
            </View>

            {/* 3. Main Playback Controls */}
            <View style={styles.controlsRow}>
                <TouchableOpacity onPress={toggleShuffle} style={styles.secondaryBtn}>
                    <Shuffle 
                        color={isShuffling ? theme.colors.actionAccent : 'white'} 
                        size={22} 
                        opacity={isShuffling ? 1 : 0.7}
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={onPrev} style={styles.skipBtn}>
                    <SkipBack color="white" fill="white" size={30} />
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
                    <SkipForward color="white" fill="white" size={30} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn}>
                    <Timer color="white" size={22} opacity={0.7} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingTop: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    titleContainer: {
        flex: 1,
        paddingRight: 10,
    },
    trackName: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: -0.4,
    },
    artistName: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 15,
        fontWeight: '500',
        marginTop: 2,
    },
    infoActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    infoActionBtn: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    seekSection: {
        marginTop: 4,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    playBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipBtn: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
