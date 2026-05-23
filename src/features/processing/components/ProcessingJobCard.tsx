import PressableScale from "@/components/AnimatedPressable";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { JobItem } from "@/features/playback";
import { Image } from "expo-image";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Clock3, Disc3, Loader2, Music2 } from "lucide-react-native";
import { memo, useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { getDisplayStatus } from "../utils/progress";
import { formatDuration, getArtistsText } from "../utils/song";
import { useJobProgress } from "../hooks/useJobProgress";

type ProcessingJobCardProps = {
  job: JobItem;
  onPress?: () => void;
};

function getPayloadMeta(job: JobItem) {
  const payload = job.payload;
  const payloadSong = payload && "trackName" in payload ? payload : null;

  return {
    title: job.song?.trackName || payloadSong?.trackName || "Resolving track...",
    artist: job.song ? getArtistsText(job.song) : payloadSong?.artistName || "Preparing track metadata",
    artworkUri: job.song?.image ?? payloadSong?.image ?? null,
    duration: job.song?.duration ?? payloadSong?.duration ?? null,
    sourceId: payload && "songId" in payload ? payload.songId : payloadSong?.externalId,
  };
}

function getStatusIcon(job: JobItem) {
  if (job.status === "failed") return AlertCircle;
  if (job.status === "completed") return CheckCircle2;
  if (job.status === "active") return Loader2;

  return Clock3;
}

function getProgressCopy(job: JobItem, progress: number) {
  if (job.status === "failed") return "Needs attention";
  if (job.status === "completed") return "Ready to play";
  if (job.status === "active") return progress >= 90 ? "Finalizing audio" : "Processing audio";

  return "Queued for processing";
}

function ProcessingJobCard({ job, onPress }: ProcessingJobCardProps) {
  const progress = useJobProgress(job);
  const [showFailedReason, setShowFailedReason] = useState(false);
  const meta = useMemo(() => getPayloadMeta(job), [job]);
  const StatusIcon = getStatusIcon(job);
  const isFailed = job.status === "failed";
  const isActive = job.status === "active";
  const canOpen = Boolean(onPress);
  const durationText = meta.duration ? formatDuration(meta.duration) : null;
  const sourceLabel = meta.sourceId ? `ID ${String(meta.sourceId).slice(0, 8)}` : `Job ${job.jobId.slice(0, 8)}`;

  return (
    <Animated.View layout={LinearTransition.springify().damping(18).stiffness(180)}>
      <TouchableOpacity
        activeOpacity={0.9}
        disabled={!canOpen}
        onPress={onPress}
        className={cn(
          "w-full items-start justify-between gap-2 rounded-2xl border px-3 py-2",
          isFailed ? "border-destructive/25 bg-destructive/5" : "border-white/5 bg-card/40"
        )}
      >
        <View className="w-full flex-row items-center">
          <View className="mr-3 h-[52px] w-[52px] overflow-hidden rounded-lg bg-secondary/50">
            {meta.artworkUri ? (
              <Image
                source={{ uri: meta.artworkUri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
            ) : (
              <Icon as={Disc3} className='text-muted-foreground' size={20} />
            )}
          </View>

          <View className="min-w-0 flex-1 gap-0.5">
            <View className="flex-row items-center gap-1.5">
              <Text className="min-w-0 flex-1 text-base font-display text-foreground" numberOfLines={1}>
                {meta.title}
              </Text>
              <View
                className={cn(
                  "flex-row items-center gap-1 rounded-full px-1.5 py-0.5",
                  isFailed ? "bg-destructive/15" : isActive ? "bg-indigo-500/15" : "bg-white/10"
                )}
              >
                <Icon
                  as={StatusIcon}
                  size={12}
                  className={cn(
                    isFailed ? "text-destructive" : isActive ? "text-indigo-300" : "text-muted-foreground"
                  )}
                />
                <Text
                  className={cn(
                    "text-[10px] font-bold",
                    isFailed ? "text-destructive" : isActive ? "text-indigo-200" : "text-muted-foreground"
                  )}
                >
                  {getDisplayStatus(job.status)}
                </Text>
              </View>
            </View>

            <Text className="text-xs font-heading text-muted-foreground" numberOfLines={1}>
              {meta.artist}
            </Text>

            <View className="flex-row flex-wrap items-center gap-1">
              <View className="flex-row items-center gap-1 rounded-full bg-white/[0.06] px-1.5 py-[1px]">
                <Icon as={Music2} size={10} className="text-muted-foreground" />
                <Text className="text-[9px] font-medium text-muted-foreground">{sourceLabel}</Text>
              </View>
              {durationText && (
                <View className="rounded-full bg-white/[0.06] px-1.5 py-[1px]">
                  <Text className="text-[9px] font-medium text-muted-foreground">{durationText}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View className="w-full gap-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text
              className={cn(
                "text-[10px] font-semibold text-muted-foreground",
                isActive && "text-indigo-300",
                isFailed && "text-destructive"
              )}
            >
              {getProgressCopy(job, progress)}
            </Text>
            {isFailed ? (
              <PressableScale
                scaleTo={0.82}
                feedback="snappy"
                accessibilityLabel="Toggle error reason"
                hitSlopSize={12}
                onPress={() => setShowFailedReason((prev) => !prev)}
              >
                <Animated.View layout={LinearTransition.springify().damping(18).stiffness(180)}>
                  <Icon as={showFailedReason ? ChevronUp : ChevronDown} size={16} className="text-destructive" />
                </Animated.View>
              </PressableScale>
            ) : (
              <Text className="text-[9px] font-bold text-indigo-300">{progress}%</Text>
            )}
          </View>

          {!isFailed && (
            <Progress
              value={progress}
              className="h-1 bg-white/10"
              indicatorClassName="bg-indigo-400"
            />
          )}
        </View>

        {showFailedReason && isFailed && job.error ? (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(140)}
            layout={LinearTransition.springify().damping(18).stiffness(180)}
            className="w-full rounded-xl bg-destructive/10 px-3 py-2"
          >
            <Text className="text-[11px] leading-4 text-destructive" numberOfLines={3}>
              {job.error}
            </Text>
          </Animated.View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default memo(
  ProcessingJobCard,
  (prevProps, nextProps) =>
    prevProps.job === nextProps.job &&
    prevProps.onPress === nextProps.onPress
);
