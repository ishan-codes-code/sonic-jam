import React, { useMemo } from "react";
import { View, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { Text } from "@/components/ui/text";
import { useHistory } from "../hooks/useHistory";
import { HistorySongCard } from "../components/HistorySongCard";
import { ListeningEvent } from "../types";

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

  const historyEvents = useMemo(() => {
    return data?.pages.flatMap((page) => page) || [];
  }, [data]);

  const handleSongPress = (event: ListeningEvent) => {
    // TODO: wire up global audio player
    console.log("Play from history:", event.song.trackName);
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#6366f1" />
      </View>
    );
  };

  if (isLoading && !historyEvents.length) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (isError && !historyEvents.length) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-foreground">Failed to load history</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={historyEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistorySongCard event={item} onPress={handleSongPress} />
        )}
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