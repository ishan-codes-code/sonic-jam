import { useJobStore, usePlayer, JobStatus } from "@/src/playbackCore";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  XCircle,
  Activity,
  Music
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../../theme";
import { styles } from "./Processing.styles";

// ─── Status Mapping ──────────────────────────────────────────────────────────

function getDisplayStatus(status: JobStatus) {
    switch (status) {
        case 'waiting':
            return 'Queued';
        case 'active':
            return 'Processing';
        case 'completed':
            return 'Ready';
        case 'failed':
            return 'Failed';
        default:
            return status;
    }
}

function getStatusIcon(status: JobStatus) {
    switch (status) {
        case 'waiting':
            return <Clock color={theme.colors.textMuted} size={16} />;
        case 'active':
            return <Activity color={theme.colors.primaryAccent} size={16} />;
        case 'completed':
            return <CheckCircle2 color={theme.colors.secondaryAccent} size={16} />;
        case 'failed':
            return <XCircle color={theme.colors.error} size={16} />;
    }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Processing() {
  const router = useRouter();
  const { play } = usePlayer();
  const jobsMap = useJobStore(s => s.jobs);
  
  const jobs = useMemo(() => 
    Object.values(jobsMap).sort((a,b) => b.createdAt - a.createdAt), 
    [jobsMap]
  );

  const processing = useMemo(() => jobs.filter(j => j.status === 'waiting' || j.status === 'active'), [jobs]);
  const completed = useMemo(() => jobs.filter(j => j.status === 'completed'), [jobs]);
  const failed = useMemo(() => jobs.filter(j => j.status === 'failed'), [jobs]);

  const handlePlay = (job: any) => {
      if (job.status === 'completed' && job.song) {
          play({ songId: job.song.id });
      }
  };

  const renderJobItem = (job: any) => {
    const isCompleted = job.status === 'completed';
    const isFailed = job.status === 'failed';
    const artwork = job.song?.image;

    return (
        <View key={job.jobId} style={[
            styles.jobCard,
            isCompleted && styles.completedCard,
            isFailed && styles.failedCard
        ]}>
            <View style={styles.jobInfo}>
                <View style={styles.artworkContainer}>
                    {artwork ? (
                        <Image source={{ uri: artwork }} style={styles.artwork} />
                    ) : (
                        <View style={[styles.artwork, styles.artworkPlaceholder]}>
                            <Music color={theme.colors.textMuted} size={20} />
                        </View>
                    )}
                </View>
                
                <View style={styles.jobDetails}>
                    <Text style={styles.jobTitle} numberOfLines={1}>
                        {job.song?.trackName || 'Resolving track...'}
                    </Text>
                    <Text style={styles.jobSubtitle} numberOfLines={1}>
                        {job.song?.artistName || `Job ID: ${job.jobId.slice(0, 8)}`}
                    </Text>
                    <View style={styles.statusRow}>
                        {getStatusIcon(job.status)}
                        <Text style={[
                            styles.statusLabel,
                            isCompleted && styles.statusLabelCompleted,
                            isFailed && styles.statusLabelFailed
                        ]}>
                            {getDisplayStatus(job.status)}
                        </Text>
                    </View>

                    {/* Progress Bar for active jobs */}
                    {job.status === 'active' && job.progress !== undefined && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBarTrack}>
                                <View style={[styles.progressBarFill, { width: `${job.progress}%` }]} />
                            </View>
                            <Text style={styles.progressText}>{Math.round(job.progress)}%</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.jobActions}>
                {isCompleted ? (
                    <TouchableOpacity 
                        style={styles.actionBtnPrimary}
                        onPress={() => handlePlay(job)}
                    >
                        <Play color={theme.colors.backgroundBase} size={18} fill={theme.colors.backgroundBase} />
                    </TouchableOpacity>
                ) : isFailed ? (
                    <TouchableOpacity 
                        style={styles.actionBtnSecondary}
                        onPress={() => {
                            // Retry logic - would likely involve re-calling usePlayer.play
                            // For now maybe just clear it or let them try from search again
                        }}
                    >
                        <RotateCcw color={theme.colors.textPrimary} size={18} />
                    </TouchableOpacity>
                ) : (
                    <Clock color={theme.colors.textMuted} size={20} />
                )}
            </View>
        </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Active Jobs</Text>
          <Text style={styles.headerSubtitle}>Real-time processing queue</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Processing Section */}
        {processing.length > 0 && (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Processing</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{processing.length}</Text>
                    </View>
                </View>
                <View style={styles.jobList}>
                    {processing.map(renderJobItem)}
                </View>
            </View>
        )}

        {/* Completed Section */}
        {completed.length > 0 && (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recently Completed</Text>
                </View>
                <View style={styles.jobList}>
                    {completed.map(renderJobItem)}
                </View>
            </View>
        )}

        {/* Failed Section */}
        {failed.length > 0 && (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Failed</Text>
                </View>
                <View style={styles.jobList}>
                    {failed.map(renderJobItem)}
                </View>
            </View>
        )}

        {jobs.length === 0 && (
            <View style={styles.emptyState}>
                <Activity color={theme.colors.textMuted} size={48} />
                <Text style={styles.emptyTitle}>No active jobs</Text>
                <Text style={styles.emptySubtitle}>
                    When songs need processing, they'll appear here in real-time.
                </Text>
            </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

