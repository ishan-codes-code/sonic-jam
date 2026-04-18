import { PlaylistSongs } from "@/src/api/musicApi";
import SongListCard from "@/src/components/features/Playlist/SongListCard";
import { RecentSongPlaylistDrawer } from "@/src/components/features/Search/RecentSongPlaylistDrawer";
import { ActionItem as DrawerActionItem } from "@/src/components/ui/MusicOptionsDrawer";
import { SongPlaceholder } from "@/src/components/ui/SongPlaceholder";
import { useBottomSheet } from "@/src/hooks/useDrawer";
import { JobItem, JobStatus, useJobStore, usePlayer } from "@/src/playbackCore";
import { theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Activity, ArrowLeft } from "lucide-react-native";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, ListRenderItem, Pressable, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedPressable from "../../ui/AnimatedPressable";
import { styles } from "./Processing.styles";

const FAKE_PROGRESS_MS = 16000;
const ACTIVE_HOLD_PERCENT = 95;
const WAITING_HOLD_PERCENT = 90;
const MAX_FAKE_PROGRESS_PERCENT = 99;
const TICK_MS = 500;
const FLATLIST_WINDOW_SIZE = 8;
const FLATLIST_INITIAL_RENDER = 8;

type SectionKey = "processing" | "completed" | "failed";

type SectionOption = {
  key: SectionKey;
  label: string;
  count: number;
};

function getDisplayStatus(status: JobStatus) {
  switch (status) {
    case "waiting":
      return "Queued";
    case "active":
      return "Processing";
    case "completed":
      return "Ready";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function getFakeProgress(job: JobItem, now: number) {
  if (job.status === "completed") return 100;
  if (job.status === "failed") return 0;

  const elapsed = Math.max(0, now - job.createdAt);
  const firstStageCap = job.status === "waiting" ? WAITING_HOLD_PERCENT : ACTIVE_HOLD_PERCENT;
  const firstStageProgress = Math.min((elapsed / FAKE_PROGRESS_MS) * firstStageCap, firstStageCap);

  if (job.status === "waiting") {
    return Math.round(firstStageProgress);
  }

  if (elapsed <= FAKE_PROGRESS_MS) {
    return Math.round(firstStageProgress);
  }

  const tailElapsed = elapsed - FAKE_PROGRESS_MS;
  const tailRange = MAX_FAKE_PROGRESS_PERCENT - ACTIVE_HOLD_PERCENT;
  const tailProgress = Math.min((tailElapsed / FAKE_PROGRESS_MS) * tailRange, tailRange);

  return Math.round(ACTIVE_HOLD_PERCENT + tailProgress);
}

function toPlaylistSong(job: JobItem): PlaylistSongs | null {
  if (!job.song) return null;

  return {
    ...job.song,
    position: 0,
  };
}

function getSectionHeading(section: SectionKey) {
  switch (section) {
    case "processing":
      return "Processing";
    case "completed":
      return "Recently Completed";
    case "failed":
      return "Failed";
  }
}

function getSectionEmptyCopy(section: SectionKey) {
  switch (section) {
    case "processing":
      return "Jobs that are queued or actively processing will appear here.";
    case "completed":
      return "Finished songs will show up here once processing completes.";
    case "failed":
      return "Any failed jobs and their error details will appear here.";
  }
}

type ProcessingJobCardProps = {
  job: JobItem;
  progress: number;
  onPress?: () => void;
};

function ProcessingJobCard({ job, progress, onPress }: ProcessingJobCardProps) {
  const artworkUri = job.song?.image ?? null;
  const title = job.song?.trackName || "Resolving track...";
  const subtitle = job.song?.artists?.map((a: any) => a.name).join(', ') || `Job ID: ${job.jobId.slice(0, 8)}`;
  const isFailed = job.status === "failed";
  const statusText = getDisplayStatus(job.status);
  const [showFailedReason, setShowFailedReason] = useState(false);

  return (
    <Animated.View layout={LinearTransition.springify().damping(18).stiffness(180)}>
      <TouchableOpacity
        activeOpacity={0.9}
        disabled={!onPress}
        onPress={onPress}
        style={styles.processingCard}
      >
        <View style={styles.processingCardLeft}>
          <View style={styles.artworkWrap}>
            {artworkUri ? (
              <Image
                source={{ uri: artworkUri }}
                style={styles.artwork}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
            ) : (
              <SongPlaceholder
                title={title}
                artist={subtitle}
                style={styles.artwork}
                borderRadius={styles.artworkWrap.borderRadius}
              />
            )}
          </View>

          <View style={styles.processingTextWrap}>
            <View style={styles.processingTopRow}>
              <Text style={styles.jobTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>

            <Text style={styles.jobSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.processingCardBottom}>
          <View style={styles.statusRow}>
            <Text
              style={[
                styles.statusLabel,
                job.status === "active" && styles.statusLabelActive,
                isFailed && styles.statusLabelFailed,
              ]}
            >
              {statusText}
            </Text>
            {isFailed ? (
              <AnimatedPressable
                scaleTo={0.82}
                feedback="snappy"
                accessibilityLabel="toggle error reason"
                hitSlopSize={12}
                onPress={() => setShowFailedReason((prev) => !prev)}
              >
                <Animated.View layout={LinearTransition.springify().damping(18).stiffness(180)}>
                  {showFailedReason ? (
                    <Ionicons name="caret-up" size={16} color={theme.colors.error} />
                  ) : (
                    <Ionicons name="caret-down" size={16} color={theme.colors.error} />
                  )}
                </Animated.View>
              </AnimatedPressable>
            ) : (
              <Text style={styles.progressText}>{progress}%</Text>
            )}
          </View>

          {!isFailed && (
            <View style={styles.progressBarTrack}>
              <LinearGradient
                colors={[theme.colors.primaryAccent, theme.colors.secondaryAccent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>
          )}
        </View>

        {showFailedReason && isFailed && job.error ? (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(140)}
            layout={LinearTransition.springify().damping(18).stiffness(180)}
          >
            <Text style={styles.errorText} numberOfLines={3}>
              {job.error}
            </Text>
          </Animated.View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

const MemoizedProcessingJobCard = memo(
  ProcessingJobCard,
  (prevProps, nextProps) =>
    prevProps.job === nextProps.job &&
    prevProps.progress === nextProps.progress &&
    prevProps.onPress === nextProps.onPress
);

type SectionTabsProps = {
  options: SectionOption[];
  selected: SectionKey;
  onSelect: (key: SectionKey) => void;
};

const SectionTabs = memo(function SectionTabs({
  options,
  selected,
  onSelect,
}: SectionTabsProps) {
  return (
    <View style={styles.tabsWrap}>
      {options.map((option) => {
        const isActive = option.key === selected;
        const isDisabled = option.count === 0;

        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, selected: isActive }}
            disabled={isDisabled}
            hitSlop={10}
            onPress={() => onSelect(option.key)}
            style={[
              styles.tabButton,
              isActive && styles.tabButtonActive,
              isDisabled && styles.tabButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
                isDisabled && styles.tabLabelDisabled,
              ]}
            >
              {option.label}
            </Text>
            <View
              style={[
                styles.tabCountPill,
                isActive && styles.tabCountPillActive,
                isDisabled && styles.tabCountPillDisabled,
              ]}
            >
              <Text
                style={[
                  styles.tabCountText,
                  isActive && styles.tabCountTextActive,
                  isDisabled && styles.tabCountTextDisabled,
                ]}
              >
                {option.count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
});

export default function Processing() {
  const router = useRouter();
  const { open, close } = useBottomSheet();
  const { play, playNext, addToQueue } = usePlayer();
  const jobsMap = useJobStore((s) => s.jobs);
  const removeJob = useJobStore((s) => s.removeJob);
  const [now, setNow] = useState(Date.now());
  const [activeSection, setActiveSection] = useState<SectionKey>("processing");

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, TICK_MS);

    return () => clearInterval(timer);
  }, []);

  const jobs = useMemo(
    () => Object.values(jobsMap).sort((a, b) => b.createdAt - a.createdAt),
    [jobsMap]
  );

  const processing = useMemo(
    () => jobs.filter((job) => job.status === "waiting" || job.status === "active"),
    [jobs]
  );
  const completed = useMemo(
    () => jobs.filter((job) => job.status === "completed" && job.song),
    [jobs]
  );
  const failed = useMemo(
    () => jobs.filter((job) => job.status === "failed"),
    [jobs]
  );

  const sectionOptions = useMemo<SectionOption[]>(
    () => [
      { key: "processing", label: "Processing", count: processing.length },
      { key: "completed", label: "Completed", count: completed.length },
      { key: "failed", label: "Failed", count: failed.length },
    ],
    [completed.length, failed.length, processing.length]
  );

  useEffect(() => {
    const activeOption = sectionOptions.find((option) => option.key === activeSection);
    if (activeOption && activeOption.count > 0) return;

    const fallbackOption = sectionOptions.find((option) => option.count > 0);
    if (fallbackOption && fallbackOption.key !== activeSection) {
      setActiveSection(fallbackOption.key);
    }
  }, [activeSection, sectionOptions]);

  const activeJobs = useMemo(() => {
    switch (activeSection) {
      case "processing":
        return processing;
      case "completed":
        return completed;
      case "failed":
        return failed;
    }
  }, [activeSection, completed, failed, processing]);

  const openAddToPlaylist = useCallback((job: JobItem) => {
    if (!job.song) return;

    open(
      <RecentSongPlaylistDrawer songId={job.song.id} songTitle={job.song.trackName} />,
      ["55%", "82%"]
    );
  }, [open]);

  const handlePlay = useCallback((job: JobItem) => {
    if (job.song) {
      void play({ songId: job.song.id });
    }
  }, [play]);

  const getCompletedActions = useCallback((job: JobItem): DrawerActionItem[] => {
    if (!job.song) return [];
    const song = job.song;

    return [
      {
        label: "Play now",
        icon: <Ionicons name="play-outline" size={theme.spacing.lg} color={theme.colors.textPrimary} />,
        onPress: () => {
          close();
          void play({ songId: song.id });
        },
      },
      {
        label: "Play Next",
        icon: <Ionicons name="play-forward-outline" size={theme.spacing.lg} color={theme.colors.textPrimary} />,
        onPress: () => {
          close();
          void playNext({ songId: song.id });
        },
      },
      {
        label: "Add to Queue",
        icon: <Ionicons name="list-outline" size={theme.spacing.lg} color={theme.colors.textPrimary} />,
        onPress: () => {
          close();
          void addToQueue({ songId: song.id });
        },
      },
      {
        label: "Add to playlist",
        icon: <Ionicons name="add-circle-outline" size={theme.spacing.lg} color={theme.colors.textPrimary} />,
        onPress: () => {
          close();
          setTimeout(() => {
            openAddToPlaylist(job);
          }, 180);
        },
      },
      {
        label: "Remove",
        icon: <Ionicons name="trash-outline" size={theme.spacing.lg} color={theme.colors.error} />,
        onPress: () => {
          close();
          removeJob(job.jobId);
        },
      },
    ];
  }, [addToQueue, close, openAddToPlaylist, play, playNext, removeJob]);

  const renderJobItem = useCallback<ListRenderItem<JobItem>>(
    ({ item }) => {
      if (activeSection === "completed") {
        const playlistSong = toPlaylistSong(item);
        if (!playlistSong) return null;

        return (
          <View style={styles.listRowCompleted}>
            <SongListCard
              playlistSongs={playlistSong}
              artworkUri={item.song?.image}
              onPress={() => handlePlay(item)}
              actions={getCompletedActions(item)}
            />
          </View>
        );
      }

      const progress = activeSection === "processing" ? getFakeProgress(item, now) : 0;

      return (
        <View style={styles.listRow}>
          <MemoizedProcessingJobCard
            job={item}
            progress={progress}
            onPress={item.song ? () => openAddToPlaylist(item) : undefined}
          />
        </View>
      );
    },
    [activeSection, getCompletedActions, handlePlay, now, openAddToPlaylist]
  );

  const keyExtractor = useCallback((item: JobItem) => item.jobId, []);

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
      <View style={styles.emptyState}>
        <Activity color={theme.colors.textMuted} size={48} />
        <Text style={styles.emptyTitle}>No jobs in this section</Text>
        <Text style={styles.emptySubtitle}>{getSectionEmptyCopy(activeSection)}</Text>
      </View>
    ),
    [activeSection]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Active Jobs</Text>
          <Text style={styles.headerSubtitle}>Real-time processing queue</Text>
        </View>
      </View>

      <FlatList
        data={activeJobs}
        key={activeSection}
        keyExtractor={keyExtractor}
        renderItem={renderJobItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyComponent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews
        windowSize={FLATLIST_WINDOW_SIZE}
        initialNumToRender={FLATLIST_INITIAL_RENDER}
        maxToRenderPerBatch={FLATLIST_INITIAL_RENDER}
        updateCellsBatchingPeriod={16}
      />
    </SafeAreaView>
  );
}
