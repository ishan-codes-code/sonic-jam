import { theme } from "@/src/theme";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBase,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {},

  section: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  headerIconTray: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    padding: 12,
  },

  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariantAlpha,
  },
  cardImageWrapper: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundInteractive,
  },
  cardImageCircle: {
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: theme.colors.outlineVariantAlpha,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardInfo: {
    gap: theme.spacing.xs,
  },
  cardInfoCentered: {
    alignItems: "center",
  },
  cardTitle: {
    ...theme.typography.label,
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  cardTitleCenter: {
    textAlign: "center",
  },
  cardSubtitle: {
    ...theme.typography.metadata,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  cardSubtitleCenter: {
    textAlign: "center",
  },
  cardSubtitleUppercase: {
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontSize: 11,
  },

  likedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  likedLeft: {
    gap: theme.spacing.sm,
  },
  likedTitle: {
    ...theme.typography.headline,
    lineHeight: undefined,
    fontWeight: "800",
    color: theme.colors.backgroundBase,
  },
  likedMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  likedCount: {
    ...theme.typography.label,
    color: theme.colors.backgroundCard,
    opacity: 0.85,
    lineHeight: undefined,
  },
  likedIconWrapper: {
    width: theme.spacing.xxl + 8,
    height: theme.spacing.xxl + 8,
    borderRadius: theme.radius.full,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heartIcon: {
    width: 28,
    height: 26,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 13,
    transform: [{ rotate: "45deg" }],
  },

  curatedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  curatedHeading: {
    ...theme.typography.headline,
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  cyanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.secondaryAccent,
  },
  curatedList: {
    paddingRight: theme.spacing.lg,
  },
  curatedCard: {
    height: 160,
    borderRadius: theme.radius.xl,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundCard,
    justifyContent: "flex-end",
    borderWidth: 1,
    borderColor: theme.colors.outlineVariantAlpha,
  },
  curatedGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  curatedTextWrapper: {
    padding: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  curatedTitle: {
    ...theme.typography.title,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  curatedDesc: {
    ...theme.typography.metadata,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 16,
  },

  svgIcon: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  searchCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.colors.textPrimary,
    position: "absolute",
    top: 2,
    left: 2,
  },
  searchHandle: {
    width: 2,
    height: 6,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 1,
    position: "absolute",
    bottom: 2,
    right: 2,
    transform: [{ rotate: "45deg" }],
  },
  plusH: {
    width: 16,
    height: 2,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 1,
    position: "absolute",
  },
  plusV: {
    width: 2,
    height: 16,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 1,
    position: "absolute",
  },
  gridIcon: {
    width: 18,
    height: 18,
    gap: 2,
  },
  gridRow: {
    flexDirection: "row",
    gap: 2,
  },
  gridCell: {
    width: 7,
    height: 7,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 1,
  },

  pressed: {
    opacity: 0.7,
  },
});
