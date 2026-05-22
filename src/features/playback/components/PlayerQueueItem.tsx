import React, { useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Music, Pause, Play, X } from "lucide-react-native";
import type { PlaybackTrack, Song } from "../types";
import { usePlaybackStore } from "../store";
import { usePlayer } from "../hooks/usePlayer";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import AudioWave from "@/components/AudioWave";

const FOREGROUND_COLOR = "#ffffff";

function isTrackActive(currentSong: Song | null, item: PlaybackTrack) {
    if (!currentSong) return false;

    const song = item.song;

    return (
        currentSong.id === item.mediaId ||
        currentSong.id === song?.id ||
        (!!currentSong.externalId && currentSong.externalId === song?.externalId) ||
        (!!currentSong.lastfmId && currentSong.lastfmId === song?.lastfmId)
    );
}

function ActiveQueueControl() {
    const { pause, resume } = usePlayer();
    const status = usePlaybackStore((s) => s.status);
    const isBuffering = status === "loading";
    const isPlaying = status === "playing";

    const handlePress = useCallback(() => {
        if (isBuffering) return;
        if (isPlaying) {
            pause();
        } else {
            void resume();
        }
    }, [isBuffering, isPlaying, pause, resume]);

    return (
        <TouchableOpacity
            onPress={handlePress}
            disabled={isBuffering}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={
                isPlaying ? "Pause current track" : "Play current track"
            }
            accessibilityState={{ busy: isBuffering, disabled: isBuffering }}
            className="h-10 w-10 items-center justify-center rounded-full bg-card "
        >
            {isBuffering ? (
                <ActivityIndicator size="small" color={FOREGROUND_COLOR} />
            ) : isPlaying ? (
                <Icon
                    as={Pause}
                    size={17}
                    className="text-foreground fill-foreground"
                />
            ) : (
                <Icon
                    as={Play}
                    size={17}
                    className="text-foreground fill-foreground"
                    style={{ marginLeft: 2 }}
                />
            )}
        </TouchableOpacity>
    );
}

type RNTPQueueItemProps = {
    item: PlaybackTrack;
    onPress: () => void;
    onRemove?: () => void;
};

export const RNTPQueueItem = React.memo(function RNTPQueueItem({
    item,
    onPress,
    onRemove,
}: RNTPQueueItemProps) {
    const title = item.title;
    const artist = item.artist || item.song?.artists?.[0]?.name || "Unknown";
    const artwork = item.artworkUrl;
    const artworkSource = useMemo(
        () => (typeof artwork === "string" ? { uri: artwork } : artwork),
        [artwork],
    );

    const active = usePlaybackStore((s) => isTrackActive(s.currentSong, item));
    const isPlaying = usePlaybackStore((s) => s.status === "playing");

    return (
        <View className="w-full flex-row items-center py-2">
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Play ${title ?? "track"}`}
                className="min-w-0 flex-1 flex-row items-center py-1"
            >
                <View className="mr-3 h-12 w-12 overflow-hidden rounded-md bg-white/5">
                    {artwork ? (
                        <Image
                            source={artworkSource}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={0}
                        />
                    ) : (
                        <View className="flex-1 items-center justify-center rounded-md bg-white/5">
                            <Music size={20} color="#ffffff" opacity={0.4} />
                        </View>
                    )}
                </View>

                <View className="mr-4 min-w-0 flex-1 justify-center">
                    <View className="min-w-0 flex-row items-end gap-2">
                        {active && (
                            <AudioWave
                                isPlaying={isPlaying}
                                barColor="#FCD34D"
                                barWidth={2}
                                maxHeight={16}
                                minHeight={2}
                            />
                        )}
                        <Text
                            numberOfLines={1}
                            className={cn(
                                "min-w-0 flex-1 text-[16px] font-display leading-5",
                                active ? "text-amber-300" : "text-foreground",
                            )}
                        >
                            {title}
                        </Text>
                    </View>
                    <Text
                        numberOfLines={1}
                        className="mt-0.5 text-sm font-heading text-muted-foreground"
                    >
                        {artist}
                    </Text>
                </View>
            </TouchableOpacity>
            {active ? (
                <ActiveQueueControl />
            ) : onRemove ? (
                <TouchableOpacity
                    onPress={onRemove}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${title ?? "track"} from queue`}
                    className="h-10 w-10 items-center justify-center rounded-full bg-card"
                >
                    <X size={16} color="white" />
                </TouchableOpacity>
            ) : null}
        </View>
    );
});
