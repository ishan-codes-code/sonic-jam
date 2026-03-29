import { StyleSheet } from 'react-native';
import { theme } from '../../../theme';

export const largeStyles = StyleSheet.create({
  card: {
    width: 200,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 112,
    backgroundColor: theme.colors.backgroundSection,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    left: 0,
    right: 0,
    bottom: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: 8,
  },
  title: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
    fontSize: 12,
  },
  channel: {
    ...theme.typography.metadata,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  views: {
    ...theme.typography.metadata,
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: {
    ...theme.typography.metadata,
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});

export const compactStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 120,
    height: 72,
    backgroundColor: theme.colors.backgroundSection,
  },
  info: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  title: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  channel: {
    ...theme.typography.metadata,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  views: {
    ...theme.typography.metadata,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    ...theme.typography.metadata,
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
});
