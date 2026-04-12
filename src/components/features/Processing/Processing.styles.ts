import { StyleSheet, Platform } from "react-native";
import { theme } from "../../../theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBase,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  headerTitle: {
    ...theme.typography.headline,
    color: theme.colors.textPrimary,
    fontSize: 22,
  },
  headerSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 14,
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: theme.colors.primaryAccent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    ...theme.typography.label,
    color: theme.colors.backgroundBase,
    fontSize: 10,
    fontWeight: "bold",
  },
  jobList: {
    gap: 12,
  },
  jobCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    ...Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
        },
        android: {
            elevation: 4,
        }
    })
  },
  completedCard: {
    borderColor: "rgba(0, 255, 128, 0.1)",
  },
  failedCard: {
    borderColor: "rgba(255, 69, 58, 0.1)",
  },
  jobInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  artworkContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
  },
  artwork: {
    width: "100%",
    height: "100%",
  },
  artworkPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  jobDetails: {
    flex: 1,
    gap: 2,
  },
  jobTitle: {
    ...theme.typography.headline,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  jobSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statusLabel: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  statusLabelCompleted: {
    color: theme.colors.secondaryAccent,
  },
  statusLabelFailed: {
    color: theme.colors.error,
  },
  progressContainer: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.colors.primaryAccent, // Vibrant Blue
    borderRadius: 2,
    // Add a subtle glow
    shadowColor: theme.colors.primaryAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  progressText: {
    ...theme.typography.label,
    color: theme.colors.primaryAccent,
    fontSize: 10,
    fontWeight: "bold",
    minWidth: 30,
  },
  jobActions: {
    marginLeft: 12,
  },
  actionBtnPrimary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnSecondary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: 16,
  },
  emptyTitle: {
    ...theme.typography.headline,
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.6,
  },
});
