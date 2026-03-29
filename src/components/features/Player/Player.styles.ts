import { Dimensions, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBase,
  },
  emptyBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backLink: {
    marginTop: 16,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerLabel: {
    color: theme.colors.textSecondary,
    letterSpacing: 2,
    fontSize: 11,
  },
  artworkContainer: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    padding: 10,
    alignItems: 'center',
  },
  artwork: {
    width: width - 100,
    height: width - 100,
    borderRadius: (width - 100) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.glass.glowEffect,
  },
  artworkInner: {
    width: '100%',
    height: '100%',
    borderRadius: (width - 100) / 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowDisc: {
    width: '120%',
    height: '120%',
    transform: [{ rotate: '45deg' }],
    opacity: 0.15,
  },
  discOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  title: {
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
  },
  artist: {
    color: theme.colors.secondaryAccent,
    marginTop: 4,
    letterSpacing: 1,
  },
  progressSection: {
    paddingHorizontal: theme.spacing.md * 1.5,
    marginTop: theme.spacing.lg,
  },
  slider: {
    width: '100%',
    height: 32,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  timeText: {
    ...theme.typography.metadata,
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
    marginTop: theme.spacing.lg,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.glass.glowEffect,
  },
});
