import { usePlayerStore } from "@/src/store/playerStore";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  Clock3,
  MoreVertical,
  X
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../../theme";
import MovingLine from "../../ui/MovingLine";
import { styles } from "./Processing.styles";

const FILTERS = {
  active: ["active"],
  waiting: ["waiting", "delayed"],
  failed: ["failed"],
  completed: ["completed"],
} as const;

type FilterKey = keyof typeof FILTERS;

const FILTER_ORDER: FilterKey[] = ["active", "waiting", "failed", "completed"];

const FILTER_LABELS: Record<FilterKey, string> = {
  active: "Active",
  waiting: "Waiting",
  failed: "Failed",
  completed: "Completed",
};

const matchesFilter = (filter: FilterKey, status: string) =>
  (FILTERS[filter] as readonly string[]).includes(status);

const formatStatus = (status?: string) => {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getThumbnailUrl = (youtubeId?: string) =>
  youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : undefined;

export default function Processing() {
  const router = useRouter();
  const { songJobs, dismissSongJob } = usePlayerStore();

  const [selectedFilters, setSelectedFilters] = useState<FilterKey[]>([
    "active",
    "waiting",
  ]);

  const toggleFilter = (filter: FilterKey) => {
    setSelectedFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((value) => value !== filter)
        : [...prev, filter],
    );
  };

  const filteredJobs = useMemo(
    () =>
      songJobs
        .filter((job) => {
          const status = job.status ?? "";
          return selectedFilters.some((filter) => matchesFilter(filter, status));
        })
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [selectedFilters, songJobs],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.headerIcon}
          >
            <ArrowLeft color={theme.colors.primaryAccent} size={25} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.screenTitle}>Downloads & Processing</Text>
            <Text style={styles.screenSubtitle}>Track every queued job</Text>
          </View>

          <View style={styles.headerMenu}>
            <MoreVertical color={theme.colors.textSecondary} size={26} />
          </View>
        </View>

        <View style={styles.boxCon}>
          {FILTER_ORDER.map((filter) => {
            const isSelected = selectedFilters.includes(filter);

            return (
              <TouchableOpacity
                key={filter}
                onPress={() => toggleFilter(filter)}
                activeOpacity={0.85}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.boxLabel,
                    isSelected && styles.boxLabelActive,
                  ]}
                >
                  {FILTER_LABELS[filter]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionContent}>
          {filteredJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No processing jobs</Text>
            </View>
          ) : (
            filteredJobs.map((job) => {
              const title = job.title?.trim() || "Untitled job";
              const status = job.status ?? "unknown";
              const progress = Math.max(
                0,
                Math.min(100, Number(job.progress ?? 0) || 0),
              );
              const thumbnailUrl = getThumbnailUrl(job.youtubeId);

              return (
                <View
                  key={job.jobId}
                  style={[
                    styles.card,
                    status === "failed" && styles.failedCard,
                    status === "completed" && styles.completedCard,
                  ]}
                >
                  {thumbnailUrl ? (
                    // <Image
                    //   source={{ uri: thumbnailUrl }}
                    //   style={styles.artwork}
                    //   resizeMode="cover"
                    // />
                    <View>
                      <Image
                        source={{ uri: thumbnailUrl }}
                        style={styles.artwork}
                        resizeMode="cover"
                      />
                      <Text style={styles.duration}>{job.duration}</Text>


                    </View>
                  ) : (
                    // <View style={[styles.artwork, styles.artworkFallback]}>
                    //   <Clock3 color={theme.colors.textSecondary} size={22} />
                    // </View>
                    <View style={[styles.artwork, styles.artworkFallback]}>
                      <Clock3 color={theme.colors.textSecondary} size={22} />
                      <Text style={styles.durationStatic}>{job.duration}</Text>

                    </View>
                  )}

                  <View style={styles.cardBody}>
                    <View style={styles.titleRow}>
                      <Text numberOfLines={1} style={styles.title}>
                        {title}
                      </Text>

                      {(status === "failed" || status === "completed") && (
                        <TouchableOpacity
                          onPress={() => dismissSongJob(job.jobId)}
                          activeOpacity={0.8}
                          style={styles.dismissButton}
                        >
                          <X color={theme.colors.textSecondary} size={16} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* <Text numberOfLines={1} style={styles.youtubeId}>
                      {youtubeId}
                    </Text> */}

                    <View style={styles.statusRow}>
                      <Text
                        style={[
                          styles.statusText,
                          status === "completed" && styles.statusTextDownloaded,
                          status === "failed" && styles.statusTextFailed,
                        ]}
                      >
                        {formatStatus(status)}
                      </Text>

                      {status === "completed" ? (
                        <Check
                          color={theme.colors.secondaryAccent}
                          size={18}
                          strokeWidth={3}
                        />
                      ) : status === "failed" ? (
                        <X color={theme.colors.error} size={18} strokeWidth={3} />
                      ) : null}
                    </View>

                    {progress > 0 ? (
                      <View style={styles.progressSection}>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${progress}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressValue}>{progress}%</Text>
                      </View>
                    ) : (
                      status != "completed" && status != "failed" && (
                        <MovingLine />
                      )
                    )}
                  </View>
                </View>
              );
            })
          )}


          {/* <View
            style={[
              styles.card,
            ]}
          >



            <View style={[styles.artwork, styles.artworkFallback]}>
              <Clock3 color={theme.colors.textSecondary} size={22} />
              <Text style={styles.durationStatic}>2:30</Text>

            </View>


            <View style={styles.cardBody}>
              <View style={styles.titleRow}>
                <Text numberOfLines={1} style={styles.title}>
                  Tooa asocvsiv siudhviszh
                </Text>


              </View>

              <View style={styles.statusRow}>
                <Text
                  style={[
                    styles.statusText,
                  ]}
                >
                  Waiting
                </Text>
              </View>


              <MovingLine />
            </View>
          </View> */}



          {/* 
          <View
            style={[
              styles.card,
              status === "failed" && styles.failedCard,
              status === "completed" && styles.completedCard,
            ]}
          >
            {thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                style={styles.artwork}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.artwork, styles.artworkFallback]}>
                <Clock3 color={theme.colors.textSecondary} size={22} />
              </View>
            )}

            <View style={styles.cardBody}>
              <View style={styles.titleRow}>
                <Text numberOfLines={1} style={styles.title}>
                  {title}
                </Text>

                {(status === "failed" || status === "completed") && (
                  <TouchableOpacity
                    onPress={() => dismissSongJob(job.jobId)}
                    activeOpacity={0.8}
                    style={styles.dismissButton}
                  >
                    <X color={theme.colors.textSecondary} size={16} />
                  </TouchableOpacity>
                )}
              </View>

           

              <View style={styles.statusRow}>
                <Text
                  style={[
                    styles.statusText,
                    status === "completed" && styles.statusTextDownloaded,
                    status === "failed" && styles.statusTextFailed,
                  ]}
                >
                  {formatStatus(status)}
                </Text>
              </View>

              {progress > 0 ? (
                <View style={styles.progressSection}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressValue}>{progress}%</Text>
                </View>
              ) : (
                <View style={styles.spinnerRow}>
                  {status === "completed" ? (
                    <Check
                      color={theme.colors.secondaryAccent}
                      size={18}
                      strokeWidth={3}
                    />
                  ) : status === "failed" ? (
                    <X color={theme.colors.error} size={18} strokeWidth={3} />
                  ) : (
                    <>
                      <MovingLine />
                    </>
                  )}
                </View>
              )}
            </View>
          </View> */}

          {/* <View
            style={[
              styles.card,
              status === "failed" && styles.failedCard,
              status === "completed" && styles.completedCard,
            ]}
          >
            {thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                style={styles.artwork}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.artwork, styles.artworkFallback]}>
                <Clock3 color={theme.colors.textSecondary} size={22} />
              </View>
            )}

            <View style={styles.cardBody}>
              <View style={styles.titleRow}>
                <Text numberOfLines={1} style={styles.title}>
                  {title}
                </Text>

                {(status === "failed" || status === "completed") && (
                  <TouchableOpacity
                    onPress={() => dismissSongJob(job.jobId)}
                    activeOpacity={0.8}
                    style={styles.dismissButton}
                  >
                    <X color={theme.colors.textSecondary} size={16} />
                  </TouchableOpacity>
                )}
              </View>

          

              <View style={styles.statusRow}>
                <Text
                  style={[
                    styles.statusText,
                    status === "completed" && styles.statusTextDownloaded,
                    status === "failed" && styles.statusTextFailed,
                  ]}
                >
                  {formatStatus(status)}
                </Text>
              </View>

              {progress > 0 ? (
                <View style={styles.progressSection}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressValue}>{progress}%</Text>
                </View>
              ) : (
                <View style={styles.spinnerRow}>
                  {status === "completed" ? (
                    <Check
                      color={theme.colors.secondaryAccent}
                      size={18}
                      strokeWidth={3}
                    />
                  ) : status === "failed" ? (
                    <X color={theme.colors.error} size={18} strokeWidth={3} />
                  ) : (
                    <>
                      <MovingLine />
                    </>
                  )}
                </View>
              )}
            </View>
          </View> */}


        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
