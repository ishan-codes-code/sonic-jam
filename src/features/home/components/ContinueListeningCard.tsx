import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { usePlaybackStore } from '@/playbackCore/usePlaybackStore';
import { usePlayer } from '@/playbackCore/usePlayer';
import { Play, Pause } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/icon';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { fetchHistory } from '@/features/history/api/historyApi';
import { useQuery } from '@tanstack/react-query';
import { useBackgroundGradient, getBaseColor } from '@/features/collections/hooks/useBackgroundGradients';
import tinycolor from 'tinycolor2';

const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatRelativeTime = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    } catch (e) {
        return '';
    }
};

export function ContinueListeningCard() {
    const router = useRouter();
    const currentSong = usePlaybackStore(state => state.currentSong);
    const status = usePlaybackStore(state => state.status);
    const { play, pause, resume } = usePlayer();

    // Fetch the latest history item
    const { data: historyItems, isLoading: isHistoryLoading } = useQuery({
        queryKey: ['listening-history', 'latest'],
        queryFn: () => fetchHistory({ limit: 1 }),
        enabled: !currentSong,
        staleTime: 1000 * 30,
    });

    const latestEvent = historyItems?.[0];
    const activeSong = latestEvent?.song;

    // Get colors from the artwork
    const { imageColors } = useBackgroundGradient(activeSong?.image || '');
    const baseColor = imageColors ? getBaseColor(imageColors) : '#111111';
    const isBaseColorDark = tinycolor(baseColor).isDark();
    const playIconColor = isBaseColorDark ? '#FFFFFF' : '#000000';

    if (currentSong || !activeSong || isHistoryLoading) return null;

    const isPlaying = status === 'playing';

    const handleBoxPress = () => {
        router.push('/player');
    };

    const handleAction = (e: any) => {
        e.stopPropagation();
        if (isPlaying) {
            pause();
        } else {
            if (!currentSong) {
                play({ songId: activeSong.id });
            } else {
                resume();
            }
        }
    };

    const activeDuration = activeSong.duration || 0;
    const activePosition = latestEvent?.durationListenedSeconds || 0;
    const progressPercent = activeDuration > 0 ? (activePosition / activeDuration) * 100 : 0;
    const artistName = activeSong.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist';
    const timeAgo = latestEvent?.playedAt ? formatRelativeTime(latestEvent.playedAt) : '';

    return (
        <Animated.View
            entering={FadeIn.duration(600)}
            exiting={FadeOut}
            layout={Layout.springify()}
            className="px-4 mt-2 mb-6"
        >
            <TouchableOpacity activeOpacity={0.9} onPress={handleBoxPress}>
                <Card className="h-64 overflow-hidden border-0 rounded-[32px] bg-[#121212] shadow-2xl shadow-black/50">
                    {/* Background Artwork with Premium Gradient Overlay */}
                    {activeSong.image ? (
                        <Image
                            source={{ uri: activeSong.image }}
                            style={StyleSheet.absoluteFillObject}
                            contentFit="cover"
                            blurRadius={15}
                        />
                    ) : null}

                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
                        locations={[0, 0.4, 0.9]}
                        style={StyleSheet.absoluteFillObject}
                    />

                    <CardContent className="flex-1 p-6 justify-between z-10">
                        {/* Header Label Row */}
                        <View className="flex-row justify-between items-center">
                            <Text className="text-[10px] font-black tracking-[2px] text-white/50 uppercase">
                                Continue Listening
                            </Text>
                            {timeAgo && (
                                <Text className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                    {timeAgo}
                                </Text>
                            )}
                        </View>

                        {/* Middle Content: Info & Play Button */}
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1 mr-4">
                                <Text numberOfLines={1} className="text-xl font-display text-white tracking-tight leading-tight">
                                    {activeSong.trackName}
                                </Text>
                                <Text numberOfLines={1} className="text-md text-white/60 font-medium mt-0.5">
                                    {artistName}
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleAction}
                                className="w-14 h-14 rounded-full items-center justify-center shadow-xl"
                                style={{
                                    backgroundColor: baseColor,
                                    shadowColor: baseColor,
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 12,
                                    elevation: 10
                                }}
                            >
                                {isPlaying ? (
                                    <Icon as={Pause} size={24} color={playIconColor} />
                                ) : (
                                    <Icon as={Play} size={24} color={playIconColor} style={{ marginLeft: 2 }} />
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Progress Section at Bottom */}
                        <View>
                            <View className="flex-row justify-between mb-2 px-0.5">
                                <Text className="text-[11px] text-white/50 font-bold tabular-nums">
                                    {formatTime(activePosition)}
                                </Text>
                                <Text className="text-[11px] text-white/30 font-semibold tabular-nums">
                                    {formatTime(activeDuration)}
                                </Text>
                            </View>
                            <Progress
                                value={progressPercent}
                                className="h-1 bg-white/10"
                                indicatorClassName="bg-white/80"
                            />
                        </View>
                    </CardContent>
                </Card>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default ContinueListeningCard;

