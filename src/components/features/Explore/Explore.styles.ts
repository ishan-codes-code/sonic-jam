import { Dimensions, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

const { width } = Dimensions.get('window');
const GENRE_ITEM_W = (width - theme.spacing.md * 2 - theme.spacing.sm) / 2;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBase,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.backgroundSection,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    ...theme.typography.body,
    paddingVertical: 0,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSection,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  listContent: {
    paddingBottom: 120,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  genreBtn: {
    width: GENRE_ITEM_W,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    opacity: 1,
  },
  genreBtnActive: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  genreGradient: {
    height: 64,
    justifyContent: 'flex-end',
    padding: 12,
  },
  genreLabel: {
    ...theme.typography.label,
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  centeredBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: theme.colors.backgroundInteractive,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.radius.full,
  },
  menuBackdrop: {
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 144,
    right: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSection,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  menuItemText: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
});
