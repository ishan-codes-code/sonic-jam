import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/text";
import { Image } from "expo-image";
import { Mic2, MoreVertical } from "lucide-react-native";
import { ListeningEvent } from "../types";

interface HistorySongCardProps {
  event: ListeningEvent;
  onPress: (event: ListeningEvent) => void;
}

const formatPlayedAt = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isYesterday =
    date.getDate() === now.getDate() - 1 &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (isYesterday) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
};

export const HistorySongCard = React.memo(({ event, onPress }: HistorySongCardProps) => {
  const { song, playedAt } = event;
  const artistName = song.artists.map((a) => a.name).join(", ");

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(event)}
      className="flex-row items-center px-4 py-3 w-full"
    >
      <View className="w-14 h-14 bg-secondary/50 overflow-hidden mr-4 rounded-md">
        {song.image ? (
          <Image
            source={{ uri: song.image }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            recyclingKey={song.id}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Mic2 size={24} color="#9ca3af" />
          </View>
        )}
      </View>

      <View className="flex-1 justify-center mr-2">
        <Text numberOfLines={1} className="text-base text-foreground font-display mb-0.5">
          {song.trackName}
        </Text>
        <Text numberOfLines={1} className="text-[13px] text-muted-foreground">
          {`Song • ${artistName}`}
        </Text>
        <Text numberOfLines={1} className="text-[12px] text-muted-foreground/80 mt-1">
          {formatPlayedAt(playedAt)}
        </Text>
      </View>

      <TouchableOpacity className="p-2 -mr-2">
        <MoreVertical size={20} color="#9ca3af" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

HistorySongCard.displayName = "HistorySongCard";
