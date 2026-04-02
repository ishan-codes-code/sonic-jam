import SongListCard from '@/src/components/features/Playlist/SongListCard';
import AnimatedPressable from '@/src/components/ui/AnimatedPressable';
import { useMusic } from '@/src/hooks/useMusic';
import { theme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { type DimensionValue, Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const pickHeroGradient = (seed: string) => {
    const palette = [theme.colors.primaryAccentDim, theme.colors.secondaryAccent, theme.colors.actionAccent] as const;
    const base = palette[hashString(seed) % palette.length];
    return {
        base,
        colors: [base + 'cc', 'rgba(0,0,0,0.30)', theme.colors.backgroundBase] as const,
        locations: [0, 0.5, 1] as const,
    };
};

export const formatPlaylistDuration = (totalSec: number) => {
    const sec = Math.max(0, Math.floor(totalSec || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h <= 0) return `${m} min`;
    return `${h} hr ${m} min`;
};

const SkeletonBlock = ({ w, h, r }: { w: DimensionValue; h: number; r?: number }) => {
    return <View style={[styles.skeleton, { width: w, height: h, borderRadius: r ?? theme.radius.md }]} />;
};

export default function PlaylistScreen() {
    const router = useRouter();
    const { playlistId } = useLocalSearchParams();


    const insets = useSafeAreaInsets();

    const id = typeof playlistId === 'string' ? playlistId : String(playlistId ?? '');

    const {
        userPlaylist,
        isLoadingUserPlaylists,
        allSongs,
        // isLoadingAllSongs,
        playlistSongs,
        isFetchingPlaylistSongs,
        isLoadingPlaylistSongs,

    } = useMusic({ playlistId: id });

    const [isLiked, setLiked] = useState(false);

    const playlist = useMemo(() => {
        return userPlaylist.find((p) => p.id === id) ?? null;
    }, [id, userPlaylist]);

    const hero = useMemo(() => pickHeroGradient(id), [id]);




    const totalDurationSec = useMemo(
        () => playlistSongs.reduce((acc, cur) => acc + (cur.duration || 0), 0),
        [playlistSongs],
    );

    const isLoading = isLoadingUserPlaylists || isLoadingPlaylistSongs;
    const isEmpty = !isLoading && playlistSongs.length === 0;

    const scrollY = useSharedValue(0);
    const onScroll = useAnimatedScrollHandler({
        onScroll: (e) => {
            scrollY.value = e.contentOffset.y;
        },
    });

    const stickyStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [40, 160], [0, 1], Extrapolation.CLAMP);
        const translateY = interpolate(scrollY.value, [40, 160], [-10, 0], Extrapolation.CLAMP);
        return { opacity, transform: [{ translateY }] };
    });

    const cover = playlist?.thumbnailUrl?.[0] ?? null;
    const showCompactColumns = SCREEN_WIDTH < 520;

    const header = (
        <View>
            <LinearGradient colors={hero.colors} locations={hero.locations} style={styles.heroBg}>
                <View style={[styles.heroContent, { paddingTop: insets.top + 18 }]}>
                    <View style={styles.heroRow}>
                        <View style={styles.cover}>
                            {cover ? (
                                <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
                            ) : (
                                <View style={[styles.coverFallback, { backgroundColor: hero.base + '26' }]}>
                                    <Ionicons name="musical-notes" size={36} color={theme.colors.textSecondary} />
                                </View>
                            )}
                        </View>

                        <View style={styles.heroRight}>
                            <Text style={styles.label}>PLAYLIST</Text>
                            <Text style={styles.title} numberOfLines={2}>
                                {playlist?.name ?? 'Playlist'}
                            </Text>
                            {!!playlist?.description && (
                                <Text style={styles.desc} numberOfLines={2}>
                                    {playlist.description}
                                </Text>
                            )}

                            <View style={styles.metaRow}>
                                <Text style={styles.metaText}>
                                    {!playlist?.isPublic && <Text style={styles.metaStrong}>You</Text>}
                                    <Text style={styles.metaDot}> • </Text>
                                    {playlistSongs.length} songs
                                    <Text style={styles.metaDot}> • </Text>
                                    {formatPlaylistDuration(totalDurationSec)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.actionsRow}>
                        <AnimatedPressable
                            style={styles.playWrap}
                            pressableStyle={styles.playBtn}
                            feedback="snappy"
                            scaleTo={0.985}
                            pressedOpacity={0.9}
                            accessibilityLabel="Play playlist"
                        >
                            <Ionicons name="play" size={18} color={theme.colors.onPrimary} />
                            <Text style={styles.playText}>Play</Text>
                        </AnimatedPressable>

                        <AnimatedPressable
                            style={styles.secondaryWrap}
                            pressableStyle={styles.secondaryBtn}
                            feedback="snappy"
                            scaleTo={0.985}
                            pressedOpacity={0.88}
                            accessibilityLabel="Shuffle playlist"
                        >
                            <Ionicons name="shuffle" size={18} color={theme.colors.textPrimary} />
                        </AnimatedPressable>

                        <AnimatedPressable
                            style={styles.iconWrap}
                            pressableStyle={styles.iconBtn}
                            feedback="snappy"
                            scaleTo={0.9}
                            accessibilityLabel={isLiked ? 'Unlike playlist' : 'Like playlist'}
                            onPress={() => setLiked((s) => !s)}
                        >
                            <Ionicons
                                name={isLiked ? 'heart' : 'heart-outline'}
                                size={18}
                                color={isLiked ? theme.colors.actionAccent : theme.colors.textSecondary}
                            />
                        </AnimatedPressable>

                        <AnimatedPressable
                            style={styles.iconWrap}
                            pressableStyle={styles.iconBtn}
                            feedback="snappy"
                            scaleTo={0.9}
                            accessibilityLabel="More options"
                        >
                            <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.textSecondary} />
                        </AnimatedPressable>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );

    return (
        <View style={styles.root}>
            <Animated.View style={[styles.sticky, { paddingTop: insets.top }, stickyStyle]} pointerEvents="box-none">
                <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.stickyInner}>
                    <AnimatedPressable
                        onPress={() => router.back()}
                        hitSlopSize={12}
                        scaleTo={0.9}
                        feedback="snappy"
                        accessibilityLabel="Go back"
                    >
                        <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
                    </AnimatedPressable>

                    <Text style={styles.stickyTitle} numberOfLines={1}>
                        {playlist?.name ?? 'Playlist'}
                    </Text>

                    <AnimatedPressable
                        style={styles.stickyPlayWrap}
                        pressableStyle={styles.stickyPlayBtn}
                        feedback="snappy"
                        scaleTo={0.99}
                        pressedOpacity={0.92}
                        accessibilityLabel="Play"
                    >
                        <Ionicons name="play" size={14} color={theme.colors.onPrimary} />
                    </AnimatedPressable>
                </View>
                <View style={styles.stickyDivider} />
            </Animated.View>

            <Animated.FlatList
                data={playlistSongs}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (

                    <SongListCard
                        playlistSongs={item}
                        onPress={() => { }}
                        onLongPress={() => { }}

                    />
                )}
                contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
                ListHeaderComponent={isLoading ? <PlaylistSkeleton insetsTop={insets.top} /> : header}
                ListEmptyComponent={
                    isLoading ? null : isEmpty ? (
                        <EmptyState />
                    ) : null
                }
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                initialNumToRender={16}
                windowSize={12}
                maxToRenderPerBatch={18}
                updateCellsBatchingPeriod={40}
                getItemLayout={(_, index) => ({ length: showCompactColumns ? 62 : 64, offset: (showCompactColumns ? 62 : 64) * index, index })}
            />
        </View>
    );
}

function PlaylistSkeleton({ insetsTop }: { insetsTop: number }) {
    return (
        <View>
            <View style={[styles.heroBg, { paddingTop: insetsTop + 18, paddingHorizontal: theme.spacing.lg }]}>
                <View style={styles.heroRow}>
                    <SkeletonBlock w={152} h={152} r={theme.radius.lg} />
                    <View style={{ flex: 1, paddingLeft: theme.spacing.lg, gap: 12 }}>
                        <SkeletonBlock w={72} h={12} r={8} />
                        <SkeletonBlock w={'85%'} h={36} r={12} />
                        <SkeletonBlock w={'70%'} h={14} r={10} />
                        <SkeletonBlock w={'55%'} h={14} r={10} />
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
                    <SkeletonBlock w={110} h={44} r={999} />
                    <SkeletonBlock w={44} h={44} r={999} />
                    <SkeletonBlock w={44} h={44} r={999} />
                    <SkeletonBlock w={44} h={44} r={999} />
                </View>
            </View>

            <View style={styles.listSection}>
                <View style={[styles.tableHeader, styles.tableHeaderCompact]}>
                    <SkeletonBlock w={24} h={12} r={8} />
                    <SkeletonBlock w={'45%'} h={12} r={8} />
                    <View style={{ flex: 1 }} />
                    <SkeletonBlock w={30} h={12} r={8} />
                </View>
                <View style={styles.divider} />

                {Array.from({ length: 10 }).map((_, idx) => (
                    <View key={idx} style={[styles.skelRow, idx === 0 && { marginTop: theme.spacing.sm }]}>
                        <SkeletonBlock w={24} h={12} r={8} />
                        <SkeletonBlock w={42} h={42} r={theme.radius.sm} />
                        <View style={{ flex: 1, gap: 8 }}>
                            <SkeletonBlock w={'70%'} h={12} r={8} />
                            <SkeletonBlock w={'40%'} h={10} r={8} />
                        </View>
                        <SkeletonBlock w={38} h={12} r={8} />
                    </View>
                ))}
            </View>
        </View>
    );
}

function EmptyState() {
    return (
        <View style={styles.empty}>
            <Text style={styles.emptyTitle}>This playlist is empty</Text>
            <Text style={styles.emptyDesc}>Add a few songs to start the vibe. Explore and save what you love.</Text>
            <AnimatedPressable
                style={{ marginTop: 14 }}
                pressableStyle={styles.emptyCta}
                feedback="snappy"
                scaleTo={0.985}
                pressedOpacity={0.9}
                accessibilityLabel="Explore songs"
            >
                <Text style={styles.emptyCtaText}>Explore songs</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.onPrimary} />
            </AnimatedPressable>
        </View>
    );
}

const styles = StyleSheet.create({
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
    th: {
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    thIndex: {
        width: 34,
        textAlign: 'center',
        marginRight: 8,
    },
    thTitle: {
        flex: 1,
    },
    thAlbum: {
        flex: 0.38,
        paddingHorizontal: 12,
    },
    thDate: {
        flex: 0.24,
        paddingHorizontal: 12,
    },
    thDuration: {
        width: 76,
        alignItems: 'flex-end',
        paddingRight: 2,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.outlineVariantAlpha,
    },

    sticky: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 10,
    },
    stickyInner: {
        height: 52,
        paddingHorizontal: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    stickyTitle: {
        flex: 1,
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
    emptyIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.outlineVariantAlpha,
        alignItems: 'center',
        justifyContent: 'center',
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
