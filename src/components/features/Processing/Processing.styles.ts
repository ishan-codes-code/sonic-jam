import { StyleSheet } from "react-native";
import { theme } from "../../../theme";

const CARD_RADIUS = 34;
const CARD_HEIGHT = 156;

const { lineHeight, ...headlineWithoutLineHeight } = theme.typography.headline;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBase,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 160,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 44,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headerCopy: {
    flex: 1,
  },
  screenTitle: {
    ...theme.typography.displayMedium,
    color: theme.colors.primaryAccent,
    fontSize: 24,
    lineHeight: 24,
    letterSpacing: -1,
  },
  screenSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontSize: 14,
    lineHeight: 24,
  },
  headerMenu: {
    width: 32,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  boxCon: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
    flexWrap: "wrap",
  },
  filterChip: {
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundCard,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryAccent,
  },
  boxLabel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  boxLabelActive: {
    color: theme.colors.backgroundBase,
  },
  sectionContent: {
    gap: 18,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "#0d0d0d",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  failedCard: {
    borderColor: "rgba(255, 110, 132, 0.2)",
    backgroundColor: "#0b090a",
  },
  completedCard: {
    borderColor: "rgba(143, 255, 191, 0.12)",
  },
  artwork: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginRight: 18,
  },
  artworkFallback: {
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    ...headlineWithoutLineHeight,
    color: theme.colors.textPrimary,
    fontSize: 15,
    flex: 1,
  },
  duration: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
    lineHeight: undefined,
    position: "absolute",
    bottom: 5,
    right: 25,
  },
  durationStatic: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    lineHeight: undefined,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusLabel: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 9999,
    backgroundColor: "#eeeeee",
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "purple",
  },
  progressValue: {
    ...theme.typography.label,
    color: theme.colors.secondaryAccent,
    fontSize: 13,
    minWidth: 38,
    textAlign: "right",
  },
  statusText: {
    ...theme.typography.label,
    color: "#b5b5b5",
    letterSpacing: 0.9,
    lineHeight: undefined,
  },
  statusTextDownloaded: {
    color: theme.colors.secondaryAccent,
  },
  statusTextFailed: {
    color: theme.colors.error,
  },
  spinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    // minHeight: 22,
  },
  emptyState: {
    minHeight: 180,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
});
