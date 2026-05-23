import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
    SharedValue,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ChevronLeft } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useRouter } from 'expo-router';
import AnimatedPressable from '@/components/AnimatedPressable';

// ─── PERFORMANCE NOTE ─────────────────────────────────────────────────────────
// We intentionally use a STATIC BlurView at full intensity wrapped in an
// Animated.View whose *opacity* we interpolate — NOT `animatedProps.intensity`.
//
// Why: Animating `intensity` forces the GPU to recompute the Gaussian blur
// kernel on every scroll frame (very expensive). Animating opacity of a
// pre-blurred layer only requires alpha compositing — essentially free.
// ─────────────────────────────────────────────────────────────────────────────

const BLUR_INTENSITY = Platform.OS === 'ios' ? 60 : 40;

interface StickyCollectionHeaderProps {
    scrollY: SharedValue<number>;
    title: string;
    insets: { top: number };
    threshold: number;
    tracksLength: number;
    backRoute?: '/home' | '/library';
}

export const StickyCollectionHeader = React.memo(({
    scrollY,
    title,
    insets,
    threshold,
    tracksLength,
    backRoute
}: StickyCollectionHeaderProps) => {
    const router = useRouter();

    // ── Blur container — opacity only, blur kernel is static ─────────────────
    const blurOpacityStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [threshold - 70, threshold],
            [0, 1],
            Extrapolation.CLAMP
        ),
    }));

    // ── Dark scrim ───────────────────────────────────────────────────────────
    const scrimStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [threshold - 70, threshold],
            [0, 1],
            Extrapolation.CLAMP
        ),
    }));

    // ── Title fade + subtle slide ────────────────────────────────────────────
    const titleStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [threshold - 20, threshold + 30],
            [0, 1],
            Extrapolation.CLAMP
        ),
        transform: [
            {
                translateY: interpolate(
                    scrollY.value,
                    [threshold - 20, threshold + 30],
                    [6, 0],
                    Extrapolation.CLAMP
                ),
            },
        ],
    }));

    // ── Back button spring mount ─────────────────────────────────────────────
    const backScale = useSharedValue(0.82);
    React.useEffect(() => {
        backScale.value = withSpring(1, { damping: 16, stiffness: 220 });
    }, []);

    const backStyle = useAnimatedStyle(() => ({
        transform: [{ scale: backScale.value }],
    }));

    const HEADER_HEIGHT = insets.top + 56;

    return (
        <View
            style={[styles.container, { height: HEADER_HEIGHT, paddingTop: insets.top }]}
        >
            {/* ── Static blur — computed once, shown via opacity ────────── */}
            <Animated.View style={[StyleSheet.absoluteFill, blurOpacityStyle]} pointerEvents="none">
                <BlurView
                    intensity={BLUR_INTENSITY}
                    tint="dark"
                    style={{ flex: 1 }}
                    experimentalBlurMethod="dimezisBlurView"
                />
            </Animated.View>

            {/* ── Dark scrim ─────────────────────────────────────────────── */}
            <Animated.View
                style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}
                pointerEvents="none"
            />

            {/* ── Content row ───────────────────────────────────────────── */}
            <View style={styles.row}>

                {/* Back */}
                <Animated.View style={backStyle}>
                    <AnimatedPressable
                        scaleTo={0.85}
                        feedback="snappy"
                        hitSlopSize={10}
                        onPress={() => {
                            if (backRoute) {
                                router.push(backRoute)
                            } else if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/home'); // fallback route
                            }

                        }}
                        accessibilityLabel="Go back"
                        className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
                    >
                        <Icon as={ChevronLeft} size={22} className="text-foreground" />
                    </AnimatedPressable>
                </Animated.View>

                {/* Title */}
                <Animated.View style={[styles.titleWrapper, titleStyle]}>
                    <Animated.Text
                        numberOfLines={1}
                        className="text-sm text-foreground font-display leading-tight"
                    >
                        {title}
                    </Animated.Text>
                    <Animated.Text
                        numberOfLines={1}
                        className="text-[10px] text-muted-foreground font-sans tracking-wide mt-0.5"
                    >
                        {tracksLength} tracks
                    </Animated.Text>
                </Animated.View>

                {/* Spacer to keep title centred */}
                <View style={styles.spacer} />
            </View>
        </View>
    );
});

StickyCollectionHeader.displayName = 'StickyCollectionHeader';

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        overflow: 'hidden',
    },
    scrim: {
        backgroundColor: 'rgba(0,0,0,0.32)',
    },
    row: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        justifyContent: 'space-between',
    },
    titleWrapper: {
        flex: 1,
        alignItems: 'flex-start',
        paddingHorizontal: 12,
    },
    spacer: {
        width: 40,
    },
});