import { StyleSheet } from 'react-native';
import { theme } from '../../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBase,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 0,
    paddingBottom: theme.spacing.xl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 160, // Padding for global player
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSection,
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeCard: {
    borderColor: theme.colors.outlineVariantAlpha,
    backgroundColor: theme.colors.backgroundCard,
  },
  songIconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundInteractive,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  activeOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  songMeta: {
    ...theme.typography.metadata,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
