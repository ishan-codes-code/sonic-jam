import React, { useEffect, useRef } from 'react';
import { View, Dimensions, InteractionManager } from 'react-native';
import { Text } from '@/components/ui/text';
import { Collection } from '../types';
import { Play, Share2, Shuffle, EllipsisVertical } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import AnimatedPressable from '@/components/AnimatedPressable';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { PlaylistArtwork } from '@/features/library';
import { usePlaybackStore } from '@/features/playback/store/usePlaybackStore';

const { width } = Dimensions.get('window');
const HEADER_IMAGE_SIZE = width * 0.58;

// ─── PERFORMANCE NOTE ─────────────────────────────────────────────────────────
// Entrance animations are deferred with InteractionManager.runAfterInteractions
// so they don't compete with the initial FlatList render burst.
// ─────────────────────────────────────────────────────────────────────────────

interface CollectionHeaderProps {
    collection: Collection;
    baseColor: string;
    onPlay?: () => void;
    onMorePress?: () => void;
}

export const CollectionAlbumHeader = React.memo(({ collection, baseColor, onPlay, onMorePress }: CollectionHeaderProps) => {
    const releaseYear = collection.releaseDate
        ? new Date(collection.releaseDate).getFullYear()
        : null;

    // ── Shared values (initialised to hidden) ────────────────────────────────
    const artworkOpacity = useSharedValue(0);
    const artworkScale = useSharedValue(0.9);

    const metaOpacity = useSharedValue(0);
    const metaTranslateY = useSharedValue(16);

    const controlsOpacity = useSharedValue(0);
    const controlsTranslateY = useSharedValue(16);

    // Deferred so animations start AFTER the list's initial render completes
    const taskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

    useEffect(() => {
        taskRef.current = InteractionManager.runAfterInteractions(() => {
            // Artwork
            artworkOpacity.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
            artworkScale.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });

            // Meta row — 120 ms after artwork
            metaOpacity.value = withDelay(120, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
            metaTranslateY.value = withDelay(120, withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }));

            // Controls — 220 ms after artwork
            controlsOpacity.value = withDelay(220, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
            controlsTranslateY.value = withDelay(220, withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }));
        });

        return () => taskRef.current?.cancel();
    }, []);

    // ── Animated styles ──────────────────────────────────────────────────────
    const artworkStyle = useAnimatedStyle(() => ({
        opacity: artworkOpacity.value,
        transform: [{ scale: artworkScale.value }],
    }));

    const metaStyle = useAnimatedStyle(() => ({
        opacity: metaOpacity.value,
        transform: [{ translateY: metaTranslateY.value }],
    }));

    const controlsStyle = useAnimatedStyle(() => ({
        opacity: controlsOpacity.value,
        transform: [{ translateY: controlsTranslateY.value }],
    }));

    const artworkUrl = React.useMemo(() => {
        if (!collection.artwork) return undefined;
        if (Array.isArray(collection.artwork)) {
            return collection.artwork;
        }
        return [collection.artwork];
    }, [collection.artwork]);

    // ── Playback state ───────────────────────────────────────────────────────
    // Fine-grained selectors so the header only re-renders when these two
    // values change — not on every position tick.
    const playlistMeta = usePlaybackStore(s => s.playlistMeta);
    const status       = usePlaybackStore(s => s.status);
    const isThisPlaying = playlistMeta?.playlistId === collection.id
        && (status === 'playing' || status === 'loading' || status === 'paused');


    return (
        <View className='items-center py-6 px-4'>

            {/* ── Artwork ──────────────────────────────────────────────── */}
            <Animated.View className={"rounded-xl overflow-hidden"} style={[
                {
                    width: HEADER_IMAGE_SIZE,
                    height: HEADER_IMAGE_SIZE,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 14 },
                    shadowOpacity: 0.6,
                    shadowRadius: 22,
                    elevation: 20,
                }, artworkStyle]}>
                <PlaylistArtwork thumbnailUrl={artworkUrl} />
            </Animated.View>

            {/* ── Meta ─────────────────────────────────────────────────── */}
            <Animated.View className={"mt-7 w-full items-start"} style={metaStyle}>
                <Text className='text-[10px] tracking-[2px] text-muted-foreground mb-1'>
                    {collection.type === 'playlist' ? 'PLAYLIST' : 'ALBUM'}
                </Text>
                <Text
                    className="text-2xl text-foreground font-display leading-tight"
                    numberOfLines={3}
                >
                    {collection.title}
                </Text>

                <View className="flex-row items-center mt-2 gap-1.5">
                    <Text className="text-muted-foreground text-xs font-semibold">
                        {collection.artist}
                    </Text>
                    <View className="w-1 h-1 bg-muted-foreground rounded-full" />
                    <Text className="text-muted-foreground text-xs">
                        {collection.tracks.length} songs
                    </Text>
                    {releaseYear ? (
                        <>
                            <View className="w-1 h-1 bg-muted-foreground rounded-full" />
                            <Text className="text-muted-foreground text-xs">
                                {releaseYear}
                            </Text>
                        </>
                    ) : null}
                </View>
            </Animated.View>

            {/* ── Controls (playlist only) ──────────────────────────────── */}
            {collection.type === 'playlist' && (
                <Animated.View className={"flex-row items-center gap-5 mt-6 w-full"} style={controlsStyle}>

                    {/* Primary play / now-playing pill */}
                    {isThisPlaying ? (
                        <View
                            className='flex-row items-center gap-2 px-5 py-2'
                            style={{ backgroundColor: baseColor, borderRadius: 50, opacity: 0.9 }}
                        >
                            <Text className='text-white font-display text-sm'>Now Playing</Text>
                        </View>
                    ) : (
                        <AnimatedPressable
                            className={'flex-row items-center gap-2 px-5 py-2'}
                            style={{ backgroundColor: baseColor, borderRadius: 50 }}
                            feedback="timing"
                            pressedOpacity={0.75}
                            scaleTo={0.96}
                            disabled={collection.tracks.length === 0}
                            onPress={onPlay}
                        >
                            <Icon as={Play} size={17} className="fill-white text-white" />
                            <Text className='text-white font-display text-sm'>Play</Text>
                        </AnimatedPressable>
                    )}

                    {/* Icon row */}
                    <AnimatedPressable
                        disabled={collection.tracks.length === 0} hitSlopSize={14} scaleTo={0.78} feedback="snappy" onPress={() => { }}>
                        <Icon as={Shuffle} size={20} className="text-foreground" />
                    </AnimatedPressable>

                    {/* Icon row */}
                    <AnimatedPressable disabled={collection.tracks.length === 0} hitSlopSize={14} scaleTo={0.78} feedback="snappy" onPress={() => { }}>
                        <Icon as={Share2} size={20} className="text-foreground" />
                    </AnimatedPressable>

                    <AnimatedPressable hitSlopSize={14} scaleTo={1} feedback="snappy" pressedOpacity={0.5} onPress={onMorePress}>
                        <Icon as={EllipsisVertical} size={20} className="text-foreground" />
                    </AnimatedPressable>


                </Animated.View>
            )}

        </View>
    );
});

CollectionAlbumHeader.displayName = 'CollectionAlbumHeader';
