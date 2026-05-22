import React, { useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { usePlaybackStore, usePlayer } from "@/features/playback";
import TrackPlayer, { Event } from "@rntp/player";
import { useSmartQueueStore } from "../store/useSmartQueueStore";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Shuffle, Timer, ChevronLeft } from "lucide-react-native";
import type { SmartQueueTrack, PlaybackTrack } from "../types";
import { RNTPQueueItem } from "./PlayerQueueItem";
import { SmartQueueItem } from "./SmartQueueItem";
import { RNTPQueueHeader } from "./PlayerQueueHeader";
import { RNTPQueueFooter } from "./PlayerQueueFooter";

// --- Main Drawer Component ---

export const PlayerQueueDrawer = React.memo(function PlayerQueueDrawer() {
  const currentSong = usePlaybackStore((s) => s.currentSong);
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const queueRevision = usePlaybackStore((s) => s.queueRevision);

  const {
    viewMode,
    setViewMode,
    tracks: smartTracks,
    cancelTrack,
  } = useSmartQueueStore();
  const { toggleShuffle } = usePlayer();
  const isShuffleEnabled = usePlaybackStore((state) => state.shuffleEnabled);

  const handlePressTrigger = useCallback(() => {
    setViewMode("smart");
  }, [setViewMode]);

  const handlePressTrack = useCallback(async (relativeIndex: number) => {
    try {
      const currentIdx = (await TrackPlayer.getActiveMediaItemIndex()) ?? 0;
      if (relativeIndex === 0) {
        await TrackPlayer.play();
      } else if (relativeIndex === 1) {
        await TrackPlayer.skipToNext();
        await TrackPlayer.play();
      } else {
        const sourceIndex = currentIdx + relativeIndex;
        const destinationIndex = currentIdx + 1;
        await TrackPlayer.moveMediaItem(sourceIndex, destinationIndex);
        await TrackPlayer.skipToIndex(destinationIndex);
        await TrackPlayer.play();
      }
    } catch (e) {
      console.error("[PlayerQueueDrawer] Failed to skip/move track:", e);
    }
  }, []);

  const [queue, setQueue] = React.useState<PlaybackTrack[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handleRemoveTrack = useCallback(
    async (index: number) => {
      try {
        const removeIndex = activeIndex + index + 1;
        await TrackPlayer.removeMediaItem(removeIndex);
        usePlaybackStore.getState().notifyQueueUpdate();
      } catch (e) {
        console.error("[PlayerQueueDrawer] Failed to remove track:", e);
      }
    },
    [activeIndex],
  );

  React.useEffect(() => {
    let cancelled = false;
    const fetchQueue = async () => {
      const q = await TrackPlayer.getQueue();
      const idx = (await TrackPlayer.getActiveMediaItemIndex()) ?? 0;
      if (!cancelled) {
        setActiveIndex(idx);
        setQueue(q as PlaybackTrack[]);
      }
    };
    fetchQueue();

    const sub = TrackPlayer.addEventListener(
      Event.MediaItemTransition,
      fetchQueue,
    );

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [queueRevision]);

  const nextQueue = useMemo(() => {
    return queue.slice(activeIndex);
  }, [queue, activeIndex]);

  const queueHeaderTrack = useMemo(
    () => nextQueue[0] ?? currentTrack,
    [nextQueue, currentTrack],
  );
  const upcomingQueue = useMemo(() => nextQueue.slice(1), [nextQueue]);
  const hasQueueNext = upcomingQueue.length > 0;

  const ListHeaderComponent = useMemo(
    () => (
      <RNTPQueueHeader
        currentTrack={queueHeaderTrack}
        hasNextQueue={hasQueueNext}
        isShuffleEnabled={isShuffleEnabled}
      />
    ),
    [queueHeaderTrack, hasQueueNext, isShuffleEnabled],
  );

  // --- Memoized Render Functions for FlatList ---

  const renderRNTPItem = useCallback(
    ({ item, index }: { item: PlaybackTrack; index: number }) => (
      <RNTPQueueItem
        item={item}
        onPress={() => handlePressTrack(index + 1)}
        onRemove={() => handleRemoveTrack(index)}
      />
    ),
    [handlePressTrack, handleRemoveTrack],
  );

  const renderSmartQueueItem = useCallback(
    ({ item }: { item: SmartQueueTrack }) => (
      <SmartQueueItem item={item} onCancel={cancelTrack} />
    ),
    [cancelTrack],
  );

  const smartQueueKeyExtractor = useCallback(
    (item: SmartQueueTrack) => item.id,
    [],
  );
  const rntpQueueKeyExtractor = useCallback(
    (item: PlaybackTrack, index: number) =>
      `${item.song?.id || item.title || index}-${index}`,
    [],
  );

  const hasActiveJobs = useMemo(() => {
    return smartTracks.some(
      (t) => t.status === "enriching" || t.status === "resolving",
    );
  }, [smartTracks]);

  const ListFooterComponent = useMemo(
    () => (
      <RNTPQueueFooter
        showTrigger={hasActiveJobs}
        onPressTrigger={handlePressTrigger}
      />
    ),
    [hasActiveJobs, handlePressTrigger],
  );

  return (
    <View className="flex-1 bg-[#121214]">
      <Tabs
        value={viewMode}
        onValueChange={(val) => setViewMode(val as "smart" | "rntp")}
        className="flex-1 flex-col"
      >
        {/* Header Section */}
        <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
          {viewMode === "smart" ? (
            <TouchableOpacity
              onPress={() => setViewMode("rntp")}
              activeOpacity={0.7}
              className="flex-row items-center gap-1 py-1"
            >
              <ChevronLeft size={26} color="white" />
              <Text className="text-[22px] font-bold tracking-tight text-white">
                Smart Queue
              </Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-[22px] font-bold tracking-tight text-white py-1">
              Queue
            </Text>
          )}
        </View>

        {/* Content Section */}
        <TabsContent value="rntp" className="flex-1 mt-0">
          <BottomSheetFlatList
            className="flex-1"
            data={upcomingQueue}
            keyExtractor={rntpQueueKeyExtractor}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={ListHeaderComponent}
            ListFooterComponent={ListFooterComponent}
            renderItem={renderRNTPItem}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        </TabsContent>

        <TabsContent value="smart" className="flex-1 mt-0">
          <BottomSheetFlatList
            className="flex-1"
            data={smartTracks}
            keyExtractor={smartQueueKeyExtractor}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 16,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            renderItem={renderSmartQueueItem}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        </TabsContent>
      </Tabs>

      {/* Footer Action Bar */}
      {(currentSong || nextQueue.length > 0) && (
        <View className="flex-row gap-3 border-t border-white/10 p-4 pb-6 bg-[#121214]">
          <TouchableOpacity
            onPress={toggleShuffle}
            activeOpacity={0.8}
            className={`flex-1 flex-row items-center justify-center gap-2.5 rounded-xl h-[52px] bg-white/5`}
          >
            <Shuffle size={20} color={isShuffleEnabled ? "#facc15" : "white"} />
            <Text
              className={`text-[15px] font-semibold ${isShuffleEnabled ? "text-yellow-400" : "text-white"}`}
            >
              Shuffle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-2.5 rounded-xl h-[52px] bg-white/5">
            <Timer size={20} color="white" />
            <Text className="text-[15px] font-semibold text-white">Timer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});
