import React, { useMemo, useCallback } from "react";
import { View, SectionList, ActivityIndicator, RefreshControl } from "react-native";
import { Text } from "@/components/ui/text";
import { useHistory } from "../hooks/useHistory";
import { HistorySongCard } from "../components/HistorySongCard";
import { ListeningEvent } from "../types";
import { usePlayer } from "@/features/playback";

export default function HistoryScreen() {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useHistory();

  const { play } = usePlayer();


  const sections = useMemo(() => {
    const events = data?.pages.flatMap((page) => page) || [];
    const grouped = new Map<string, ListeningEvent[]>();


    const now = new Date();

    events.forEach(event => {
      const date = new Date(event.playedAt);

      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

      let title = "";
      if (isToday) title = "Today";
      else if (isYesterday) title = "Yesterday";
      else title = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      if (!grouped.has(title)) {
        grouped.set(title, []);
      }
      grouped.get(title)!.push(event);
    });

    return Array.from(grouped.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  }, [data]);

  const handleSongPress = useCallback((event: ListeningEvent) => {
    play({ songId: event.song.id })
  }, [play]);

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#FFD54F" />
      </View>
    );
  };

  if (isLoading && !sections.length) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#FFD54F" />
      </View>
    );
  }

  if (isError && !sections.length) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-foreground">Failed to load history</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistorySongCard
            event={item}
            onPress={handleSongPress}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View className="px-4 py-2 bg-background pt-4 pb-2 border-b border-white/5">
            <Text className="text-xl font-display text-foreground">
              {title}
            </Text>
          </View>
        )}
        stickySectionHeadersEnabled={true}
        onEndReached={() => {
          if (hasNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#6366f1"
          />
        }
        contentContainerStyle={{
          paddingBottom: 100, // accommodate bottom navigation/player
          paddingTop: 16,
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View className="py-10 items-center justify-center">
              <Text className="text-muted-foreground">
                Your listening history will appear here
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}