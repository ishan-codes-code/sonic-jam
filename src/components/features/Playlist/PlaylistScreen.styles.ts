import { Dimensions, StyleSheet } from 'react-native';
import { theme } from '@/src/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const playlistScreenStyles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: theme.colors.backgroundBase,
    },

    heroBg: {
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
    },
    heroContent: {
        gap: 16,
    },
    heroRow: {
        flexDirection: SCREEN_WIDTH < 520 ? 'column' : 'row',
        gap: theme.spacing.lg,
        alignItems: SCREEN_WIDTH < 520 ? 'flex-start' : 'flex-end',
    },
    cover: {
        width: SCREEN_WIDTH < 520 ? 150 : 172,
        height: SCREEN_WIDTH < 520 ? 150 : 172,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.backgroundCard,
        ...theme.elevation.floatingShadow,
        alignSelf: SCREEN_WIDTH < 520 ? "center" : "auto",
    },
    coverFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroRight: {
        flex: 1,
        minWidth: 0,
    },
    label: {
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.1,
        marginBottom: 6,
    },
    title: {
        color: theme.colors.textPrimary,
        fontSize: SCREEN_WIDTH < 520 ? 34 : 44,
        fontWeight: '900',
        letterSpacing: -0.6,
        lineHeight: SCREEN_WIDTH < 520 ? 38 : 48,
    },
    desc: {
        marginTop: 10,
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
        maxWidth: 640,
    },
    metaRow: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        color: theme.colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
    },
    metaStrong: {
        color: theme.colors.textPrimary,
        fontWeight: '800',
    },
    metaDot: {
        color: theme.colors.textMuted,
    },

    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
    },
    playWrap: {},
    playBtn: {
        backgroundColor: theme.colors.actionAccent,
        paddingHorizontal: 18,
        height: 44,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        ...theme.elevation.floatingShadow,
        shadowColor: theme.colors.actionAccent,
    },
    playText: {
        color: theme.colors.onPrimary,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    secondaryWrap: {},
    secondaryBtn: {
        width: 44,
        height: 44,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.glassSurface,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariantAlpha,
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.actionAccent,
        position: 'absolute',
        bottom: 8,
    },
    iconWrap: {},
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.outlineVariantAlpha,
    },

    listSection: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        backgroundColor: theme.colors.backgroundBase,
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 10,
    },
    tableHeaderCompact: {
        paddingHorizontal: theme.spacing.sm,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.outlineVariantAlpha,
    },

    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: theme.colors.backgroundCard,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    headerTextWrapper: {
        flex: 1,
    },
    headerSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        fontSize: 12,
        opacity: 0.7,
    },
    sticky: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 10,
    },
    stickyInner: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    stickyTitle: {
        color: theme.colors.textPrimary,
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.1,
    },
    stickyPlayWrap: {},
    stickyPlayBtn: {
        width: 36,
        height: 36,
        borderRadius: 999,
        backgroundColor: theme.colors.actionAccent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stickyDivider: {
        height: 1,
        backgroundColor: theme.colors.outlineVariantAlpha,
    },

    skeleton: {
        backgroundColor: theme.colors.backgroundInteractive,
        opacity: 0.8,
    },
    skelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: theme.spacing.md,
    },

    empty: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: 28,
        alignItems: 'flex-start',
        gap: 10,
    },
    emptyTitle: {
        color: theme.colors.textPrimary,
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.2,
    },
    emptyDesc: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
        maxWidth: 560,
    },
    emptyCta: {
        height: 42,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: theme.colors.primaryAccent,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    emptyCtaText: {
        color: theme.colors.onPrimary,
        fontSize: 13,
        fontWeight: '900',
    },
});
