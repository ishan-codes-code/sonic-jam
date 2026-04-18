import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MonitorSpeaker, Music, Pause, Play, Plus } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePlaybackStore, usePlayer } from '@/src/playbackCore';
import { theme } from '../../../theme';
import { styles } from './GlobalPlayer.styles';
import { useRouter } from 'expo-router';
import { usePathname } from 'expo-router';
import { useBottomSheet } from '@/src/hooks/useDrawer';
import { RecentSongPlaylistDrawer } from '../Search/RecentSongPlaylistDrawer';

export const GlobalPlayer = () => {
    const router = useRouter();
    const pathname = usePathname();
    const { pause, resume } = usePlayer();
    const { open } = useBottomSheet();
    const currentSong = usePlaybackStore((s) => s.currentSong);
    const status = usePlaybackStore((s) => s.status);
    const position = usePlaybackStore((s) => s.position);
    const duration = usePlaybackStore((s) => s.duration);

    const isVisible = currentSong !== null && status !== 'idle';
    const isPlaying = status === 'playing';

    const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

    const artworkUri = currentSong?.image
        ?? (currentSong?.youtubeId
            ? `https://img.youtube.com/vi/${currentSong.youtubeId}/hqdefault.jpg`
            : null);

    if (!isVisible || pathname === "/player") return null;

    const handleToggle = () => {
        if (isPlaying) {
            pause();
        } else {
            resume();
        }
    };


    return (
        <View style={styles.outerContainer}>
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => router.push("/player" as any)}
                style={styles.miniPlayer}
            >
                <LinearGradient
                    colors={[theme.colors.backgroundCard, theme.colors.backgroundSection]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.contentWrap}>
                    {/* Progress Line (bottom) */}
                    <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                    </View>

                    <View style={styles.playerInfo}>
                        <View style={styles.albumArt}>
                            {artworkUri ? (
                                <Image
                                    source={{ uri: artworkUri }}
                                    style={StyleSheet.absoluteFill}
                                    resizeMode="cover"
                                />
                            ) : (
                                <>
                                    <LinearGradient
                                        colors={[theme.colors.backgroundInteractive, theme.colors.backgroundCard]}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Music color={theme.colors.textMuted} size={16} />
                                </>
                            )}
                        </View>

                        <View style={styles.textStack}>
                            <Text style={styles.title} numberOfLines={1}>
                                {currentSong?.trackName}
                            </Text>
                            <Text style={styles.artist} numberOfLines={1}>
                                {currentSong?.artists?.map((a: any) => a.name).join(', ')}
                            </Text>
                        </View>

                        <View style={styles.actions}>

                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    if (currentSong) {
                                        open(
                                            <RecentSongPlaylistDrawer
                                                songId={currentSong.id}
                                                songTitle={currentSong.trackName}
                                            />,
                                            ['55%', '82%']
                                        );
                                    }
                                }}
                                style={styles.actionBtn}
                            >
                                <Plus color="white" size={24} />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleToggle} style={styles.playWrap}>
                                {status === 'playing' ? (
                                    <Pause color="white" fill="white" size={22} />
                                ) : (
                                    <Play color="white" fill="white" size={22} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};
