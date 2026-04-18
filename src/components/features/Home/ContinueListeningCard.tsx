import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, Animated } from 'react-native';
import { usePlaybackStore } from '@/src/playbackCore/usePlaybackStore';
import { usePlayer } from '@/src/playbackCore/usePlayer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/src/theme';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Song } from '@/src/playbackCore/types';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const LAST_PLAYED_KEY = 'last_played_track_';

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function ContinueListeningCard() {
    const router = useRouter();
    const currentSong = usePlaybackStore(state => state.currentSong);
    const status = usePlaybackStore(state => state.status);
    const position = usePlaybackStore(state => state.position);
    const duration = usePlaybackStore(state => state.duration);
    const { play, pause, resume, skipToNext, skipToPrevious } = usePlayer();

    const [lastPlayed, setLastPlayed] = useState<Song | null>(null);
    const [fadeAnim] = useState(new Animated.Value(0));

    // Load last played on mount
    useEffect(() => {
        const loadLastPlayed = async () => {
            try {
                const data = await AsyncStorage.getItem(LAST_PLAYED_KEY);
                if (data) {
                    const parsed = JSON.parse(data);
                    setLastPlayed(parsed);
                }
            } catch (e) {
                console.error('Error loading last played track:', e);
            }
        };
        loadLastPlayed();
    }, []);

    // Save current song to last played when it changes
    useEffect(() => {
        if (currentSong) {
            AsyncStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(currentSong));
            setLastPlayed(currentSong);
        }
    }, [currentSong]);

    // Animate in when track becomes available
    useEffect(() => {
        if (currentSong || lastPlayed) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        }
    }, [currentSong, lastPlayed]);

    const activeSong = currentSong || lastPlayed;
    if (!activeSong) return null;

    const isNowPlaying = !!currentSong;
    const isPlaying = status === 'playing';

    const handleBoxPress = () => {
        router.push('/player');
    };

    const handleAction = () => {
        if (isNowPlaying) {
            if (isPlaying) pause();
            else resume();
        } else {
            play({ songId: activeSong.id });
        }
    };

    const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={handleBoxPress}
                style={styles.card}
            >
                {/* Background Artwork with Overlay */}
                <Image 
                    source={{ uri: activeSong.image || '' }} 
                    style={styles.bgImage} 
                    blurRadius={10}
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']}
                    style={styles.overlay}
                />

                <View style={styles.content}>
                    {/* Header Label */}
                    <Text style={[styles.label, { color: isNowPlaying ? '#fff' : '#00E3FD' }]}>
                        {isNowPlaying ? 'NOW PLAYING' : 'CONTINUE LISTENING'}
                    </Text>

                    {/* Artwork & Info Row */}
                    <View style={styles.songRow}>
                        <Image source={{ uri: activeSong.image || '' }} style={styles.artwork} />
                        <View style={styles.info}>
                            <Text style={styles.title} numberOfLines={1}>{activeSong.trackName}</Text>
                            <Text style={styles.artist} numberOfLines={1}>{activeSong.artists?.map((a: any) => a.name).join(', ')}</Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressSection}>
                        <View style={styles.timeRow}>
                            <Text style={styles.time}>{formatTime(position)}</Text>
                            <Text style={styles.time}>{formatTime(duration || activeSong.duration || 0)}</Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                            <LinearGradient
                                colors={['#8E2DE2', '#00E3FD']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressBar, { width: `${progressPercent}%` }]}
                            />
                        </View>
                    </View>

                    {/* Controls Row */}
                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.subControl}>
                            <Shuffle size={20} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={skipToPrevious} style={styles.subControl}>
                            <SkipBack size={24} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleAction} style={styles.playButton}>
                            <LinearGradient
                                colors={['#fff', '#f0f0f0']}
                                style={styles.playGradient}
                            >
                                {isPlaying ? (
                                    <Pause size={28} color="#000" fill="#000" />
                                ) : (
                                    <Play size={28} color="#000" fill="#000" style={{ marginLeft: 4 }} />
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={skipToNext} style={styles.subControl}>
                            <SkipForward size={24} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.subControl}>
                            <Repeat size={20} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 24,
    },
    card: {
        borderRadius: 28,
        overflow: 'hidden',
        height: 320,
        backgroundColor: '#121212',
    },
    bgImage: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.5,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
        textAlign: 'center',
        marginBottom: 20,
    },
    songRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    artwork: {
        width: 80,
        height: 80,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    info: {
        marginLeft: 16,
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
    },
    artist: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
    },
    progressSection: {
        marginBottom: 24,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    time: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '600',
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    subControl: {
        padding: 8,
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        shadowColor: '#00E3FD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    playGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
