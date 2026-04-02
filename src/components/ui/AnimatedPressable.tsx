/**
 * AnimatedPressable
 *
 * A wrapper component that gives any children a smooth, satisfying press
 * animation using react-native-reanimated (runs on the UI thread — no JS
 * jank). Accepts full Pressable prop pass-through plus animation tuning.
 *
 * Dependencies:
 *   react-native-reanimated   >= 3.x   (expo install react-native-reanimated)
 *
 * Usage:
 *   <AnimatedPressable onPress={() => console.log('pressed!')}>
 *     <Text>Tap me</Text>
 *   </AnimatedPressable>
 *
 *   // Custom scale + haptics variant:
 *   <AnimatedPressable
 *     onPress={handleSubmit}
 *     scaleTo={0.94}
 *     feedback="spring"
 *     style={styles.card}
 *     disabled={isLoading}
 *   >
 *     <SubmitButton />
 *   </AnimatedPressable>
 */

import React, { useCallback } from 'react';
import {
    GestureResponderEvent,
    Platform,
    Pressable,
    PressableProps,
    StyleProp,
    ViewStyle,
} from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Which feel the press animation should have. */
type FeedbackVariant =
    | 'spring'   // Bouncy, playful — great for cards, icons, FABs
    | 'snappy'   // Fast spring with low bounciness — good for list items
    | 'timing';  // Eased opacity + scale — subtle, suits text buttons

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
    /** Content to render inside the pressable. */
    children: React.ReactNode;

    /** Called when the user lifts their finger inside the hit area. */
    onPress?: (event: GestureResponderEvent) => void;

    /** Called when press begins (finger down). */
    onPressIn?: (event: GestureResponderEvent) => void;

    /** Called when press ends (finger up or cancelled). */
    onPressOut?: (event: GestureResponderEvent) => void;

    /** Called when the user holds the press for a specified duration. */
    onLongPress?: (event: GestureResponderEvent) => void;

    /**
     * Style applied to the outer Animated.View wrapper.
     * Use this for layout (flex, margin, width, borderRadius, etc.).
     */
    style?: StyleProp<ViewStyle>;

    /**
     * Additional style applied directly to the inner Pressable.
     * Useful when you need a different background or overflow on the touch target.
     */
    pressableStyle?: PressableProps['style'];

    /**
     * How far the component scales down on press.
     * @default 0.96
     */
    scaleTo?: number;

    /**
     * Opacity value at the deepest press point.
     * @default 1 (no opacity change — scale alone feels great)
     */
    pressedOpacity?: number;

    /**
     * Animation feel variant.
     * @default 'spring'
     */
    feedback?: FeedbackVariant;

    /**
     * Delay in ms before the press-in animation starts.
     * Useful to prevent accidental flashes while scrolling.
     * @default 0
     */
    delayPressIn?: number;

    /**
     * Expand the touchable hit area beyond the visible bounds (all sides equally).
     * Useful for small icons / tight layouts.
     * @default 0
     */
    hitSlopSize?: number;

    /** Disables the button and dims it visually. */
    disabled?: boolean;

    /**
     * Opacity applied when disabled is true.
     * @default 0.4
     */
    disabledOpacity?: number;

    /** Accessibility label for screen readers. */
    accessibilityLabel?: string;

    /** Accessibility hint for screen readers. */
    accessibilityHint?: string;
}

// ─── Spring / Timing presets ──────────────────────────────────────────────────

const SPRING_PRESETS: Record<
    'spring' | 'snappy',
    { damping: number; stiffness: number; mass: number }
> = {
    spring: { damping: 12, stiffness: 200, mass: 0.8 },
    snappy: { damping: 20, stiffness: 300, mass: 0.6 },
};

const TIMING_DURATION = { in: 80, out: 160 } as const;

// ─── Component ────────────────────────────────────────────────────────────────

const AnimatedPressableInner = Animated.createAnimatedComponent(Pressable);

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
    children,
    onPress,
    onPressIn,
    onPressOut,
    onLongPress,
    style,
    pressableStyle,
    scaleTo = 0.96,
    pressedOpacity = 1,
    feedback = 'spring',
    delayPressIn = 0,
    hitSlopSize = 0,
    disabled = false,
    disabledOpacity = 0.4,
    accessibilityLabel,
    accessibilityHint,
    ...rest
}) => {
    // ── Shared values (run entirely on UI thread) ────────────────────────────
    const scale = useSharedValue(1);
    const opacity = useSharedValue(disabled ? disabledOpacity : 1);

    // Keep opacity in sync when disabled prop changes
    React.useEffect(() => {
        opacity.value = withTiming(disabled ? disabledOpacity : 1, {
            duration: 200,
        });
    }, [disabled, disabledOpacity, opacity]);

    // ── Animated style ───────────────────────────────────────────────────────
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    // ── Press handlers ───────────────────────────────────────────────────────
    const handlePressIn = useCallback(
        (e: GestureResponderEvent) => {
            'worklet';
            if (disabled) return;

            if (feedback === 'timing') {
                scale.value = withTiming(scaleTo, { duration: TIMING_DURATION.in });
                if (pressedOpacity < 1) {
                    opacity.value = withTiming(pressedOpacity, {
                        duration: TIMING_DURATION.in,
                    });
                }
            } else {
                const preset = SPRING_PRESETS[feedback];
                scale.value = withSpring(scaleTo, preset);
                if (pressedOpacity < 1) {
                    opacity.value = withSpring(pressedOpacity, preset);
                }
            }

            if (onPressIn) runOnJS(onPressIn)(e);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [disabled, feedback, scaleTo, pressedOpacity, onPressIn],
    );

    const handlePressOut = useCallback(
        (e: GestureResponderEvent) => {
            'worklet';
            if (disabled) return;

            if (feedback === 'timing') {
                scale.value = withTiming(1, { duration: TIMING_DURATION.out });
                if (pressedOpacity < 1) {
                    opacity.value = withTiming(1, { duration: TIMING_DURATION.out });
                }
            } else {
                const preset = SPRING_PRESETS[feedback];
                scale.value = withSpring(1, preset);
                if (pressedOpacity < 1) {
                    opacity.value = withSpring(1, preset);
                }
            }

            if (onPressOut) runOnJS(onPressOut)(e);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [disabled, feedback, pressedOpacity, onPressOut],
    );

    const handleLongPress = useCallback(
        (e: GestureResponderEvent) => {
            if (disabled || !onLongPress) return;
            onLongPress(e);
        }, [disabled, onLongPress]
    )

    const handlePress = useCallback(
        (e: GestureResponderEvent) => {
            if (disabled || !onPress) return;
            onPress(e);
        },
        [disabled, onPress],
    );

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <Animated.View style={[animatedStyle, style]} pointerEvents="box-none">
            <AnimatedPressableInner
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onLongPress={handleLongPress}
                // delayPressIn={delayPressIn}
                disabled={disabled}
                accessible
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
                accessibilityState={{ disabled }}
                hitSlop={
                    hitSlopSize > 0
                        ? {
                            top: hitSlopSize,
                            bottom: hitSlopSize,
                            left: hitSlopSize,
                            right: hitSlopSize,
                        }
                        : undefined
                }
                android_ripple={
                    // Subtle ripple on Android as a secondary layer of feedback
                    Platform.OS === 'android'
                        ? { color: 'rgba(255,255,255,0.08)', borderless: false }
                        : undefined
                }
                style={pressableStyle}
                {...rest}
            >
                {children}
            </AnimatedPressableInner>
        </Animated.View>
    );
};

export default AnimatedPressable;

// ─── Usage examples ───────────────────────────────────────────────────────────
//
// 1. Card with default spring feel:
//    <AnimatedPressable onPress={openDetail} style={styles.card}>
//      <CardContent />
//    </AnimatedPressable>
//
// 2. Small icon button with expanded hit area:
//    <AnimatedPressable
//      onPress={toggleLike}
//      hitSlopSize={12}
//      scaleTo={0.82}
//      feedback="snappy"
//      accessibilityLabel="Like song"
//    >
//      <HeartIcon />
//    </AnimatedPressable>
//
// 3. Primary CTA with subtle opacity dip (timing feel):
//    <AnimatedPressable
//      onPress={handleSubmit}
//      feedback="timing"
//      pressedOpacity={0.75}
//      scaleTo={0.98}
//      disabled={isSubmitting}
//      style={styles.ctaWrapper}
//      pressableStyle={styles.ctaInner}
//    >
//      <Text style={styles.ctaLabel}>Continue</Text>
//    </AnimatedPressable>
//
// 4. List item (snappy, barely any scale):
//    <AnimatedPressable
//      onPress={() => navigate('Detail', { id })}
//      feedback="snappy"
//      scaleTo={0.985}
//      delayPressIn={50}
//    >
//      <ListRow item={item} />
//    </AnimatedPressable>
