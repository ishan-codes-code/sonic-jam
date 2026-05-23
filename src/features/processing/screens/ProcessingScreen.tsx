import RemoteSongListCard from "@/components/RemoteSongListCard";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";
import { Activity, ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, ListRenderItem, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProcessingJobCard from "../components/ProcessingJobCard";
import SectionTabs from "../components/SectionTabs";
import { useProcessingJobs } from "../hooks/useProcessingJobs";
import { useJobActions } from "../hooks/useJobActions";
import type { ProcessingSectionKey } from "../types";
import { toRemoteSong } from "../utils/song";

const FLATLIST_WINDOW_SIZE = 8;
const FLATLIST_INITIAL_RENDER = 8;

function getSectionEmptyCopy(section: ProcessingSectionKey) {
  switch (section) {
    case "processing":
      return "Jobs that are queued or actively processing will appear here.";
    case "completed":
      return "Finished songs will show up here once processing completes.";
    case "failed":
      return "Any failed jobs and their error details will appear here.";
  }
}

export default function ProcessingScreen() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<ProcessingSectionKey>("processing");
  const { activeJobs, sectionOptions } = useProcessingJobs(activeSection);
  const { getCompletedActions, handlePlay, openAddToPlaylist } = useJobActions();

  useEffect(() => {
    const activeOption = sectionOptions.find((option) => option.key === activeSection);
    if (activeOption && activeOption.count > 0) return;

    const fallbackOption = sectionOptions.find((option) => option.count > 0);
    if (fallbackOption && fallbackOption.key !== activeSection) {
      setActiveSection(fallbackOption.key);
    }
  }, [activeSection, sectionOptions]);

  const renderJobItem = useCallback<ListRenderItem<any>>(
    ({ item }) => {
      if (activeSection === "completed" && item.song) {
        return (
          <View className="mb-1">
            <RemoteSongListCard
              song={toRemoteSong(item.song)}
              onPress={() => handlePlay(item)}
              menuActions={getCompletedActions(item)}
            />
          </View>
        );
      }

      return (
        <View className="mb-3">
          <ProcessingJobCard
            job={item}
            onPress={item.song ? () => openAddToPlaylist(item) : undefined}
          />
        </View>
      );
    },
    [activeSection, getCompletedActions, handlePlay, openAddToPlaylist]
  );

  const listHeader = useMemo(
    () => (
      <SectionTabs
        options={sectionOptions}
        selected={activeSection}
        onSelect={setActiveSection}
      />
    ),
    [activeSection, sectionOptions]
  );

  const emptyComponent = useMemo(
    () => (
      <View className="flex-1 items-center justify-center gap-4 px-10 pt-20">
        <Icon as={Activity} size={48} className="text-muted-foreground" />
        <Text className="text-lg font-bold text-foreground">No jobs in this section</Text>
        <Text className="text-center text-sm leading-5 text-muted-foreground/70">
          {getSectionEmptyCopy(activeSection)}
        </Text>
      </View>
    ),
    [activeSection]
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-4 px-5 pb-6 pt-3">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.8}
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-card"
        >
          <Icon as={ArrowLeft} size={24} className="text-foreground" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-display text-foreground">Active Jobs</Text>
          <Text className="text-sm font-heading text-muted-foreground/70">Real-time processing queue</Text>
        </View>
      </View>

      <FlatList
        data={activeJobs}
        key={activeSection}
        keyExtractor={(item) => item.jobId}
        renderItem={renderJobItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyComponent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 112 }}
        removeClippedSubviews
        windowSize={FLATLIST_WINDOW_SIZE}
        initialNumToRender={FLATLIST_INITIAL_RENDER}
        maxToRenderPerBatch={FLATLIST_INITIAL_RENDER}
        updateCellsBatchingPeriod={16}
      />
    </SafeAreaView>
  );
}
