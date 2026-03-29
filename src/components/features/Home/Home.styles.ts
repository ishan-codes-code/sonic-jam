import { Dimensions, Platform, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBase,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  section: {
    marginBottom: theme.spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroCard: {
    height: 200,
    width: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroContent: {
    padding: theme.spacing.lg,
  },
  badge: {
    backgroundColor: 'rgba(0, 227, 253, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: {
    color: theme.colors.secondaryAccent,
    fontSize: 10,
    fontWeight: 'bold',
  },
  heroTitle: {
    color: 'white',
    marginBottom: 16,
  },
  heroCTA: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
  },
  heroCTAText: {
    color: 'black',
    fontWeight: '700',
    fontSize: 14,
  },
  albumItem: {
    marginRight: 20,
    width: 160,
  },
  albumArt: {
    width: 160,
    height: 160,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundCard,
  },
  continueCard: {
    padding: theme.spacing.lg,
  },
  playerPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  playerArt: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  playerMeta: {
    marginLeft: 12,
    flex: 1,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    ...theme.typography.metadata,
    color: theme.colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  playBtnLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  grid: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridSquare: {
    width: (width - theme.spacing.md * 2 - 10) / 2,
    height: (width - theme.spacing.md * 2 - 10) / 2,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundCard,
    overflow: 'hidden',
  },
  moreSquare: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  generateBtn: {
    backgroundColor: theme.colors.backgroundInteractive,
    padding: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: 10,
  },
  artistItem: {
    alignItems: 'center',
    marginRight: 24,
  },
  artistAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.backgroundCard,
  },
  quickMixCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSection,
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 12,
  },
  quickMixIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickMixInfo: {
    flex: 1,
    marginLeft: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    ...theme.elevation.floating,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
