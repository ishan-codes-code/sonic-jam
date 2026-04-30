import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
    SharedValue,
    useAnimatedStyle,
    useAnimatedProps,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ChevronLeft, Play } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useRouter } from 'expo-router';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

interface StickyCollectionHeaderProps {
    scrollY: SharedValue<number>;
    title: string;
    insets: { top: number };
    threshold: number;
    tracksLength: number;
}

export const StickyCollectionHeader = React.memo(({
    scrollY,
    title,
    insets,
    threshold,
    tracksLength
}: StickyCollectionHeaderProps) => {
    const router = useRouter();

    // ✅ Animate intensity directly on BlurView
    const animatedBlurProps = useAnimatedProps(() => ({
        intensity: interpolate(
            scrollY.value,
            [threshold - 50, threshold],
            [0, 50],
            Extrapolation.CLAMP
        ),
    }));

    // Optional: keep a subtle dark overlay that fades in alongside
    const overlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [threshold - 50, threshold],
            [0, 1],
            Extrapolation.CLAMP
        ),
    }));

    const headerTitleStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [threshold - 20, threshold + 20],
            [0, 1],
            Extrapolation.CLAMP
        ),
        transform: [
            {
                translateY: interpolate(
                    scrollY.value,
                    [threshold - 20, threshold + 20],
                    [10, 0],
                    Extrapolation.CLAMP
                ),
            },
        ],
    }));

    return (
        <View
            style={{ paddingTop: insets.top, height: insets.top + 56 }}
            className="absolute top-0 left-0 right-0 z-50 overflow-hidden"
        >
            {/* ✅ Wrapper for positioning to avoid Reanimated style/props conflict */}
            <View style={StyleSheet.absoluteFill}>
                <AnimatedBlurView
                    animatedProps={animatedBlurProps}
                    // tint="dark"
                    style={{ flex: 1 }}
                    experimentalBlurMethod="dimezisBlurView"
                />
            </View>

            {/* Optional dark overlay on top of blur */}
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: 'rgba(0,0,0,0.3)' },
                    overlayStyle,
                ]}
            />

            <View className="flex-1 flex-row items-center px-4 justify-between">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center rounded-full bg-secondary/30"
                >
                    <Icon as={ChevronLeft} size={24} className="text-foreground" />
                </TouchableOpacity>

                <View className="flex-1 items-start px-4">
                    <Animated.Text
                        numberOfLines={1}
                        style={[headerTitleStyle]}
                        className="text-base  text-foreground font-display"
                    >
                        {title}
                    </Animated.Text>
                    <Animated.Text
                        numberOfLines={1}
                        style={[headerTitleStyle]}
                        className="text-xs text-muted-foreground font-sans"
                    >
                        {tracksLength} tracks
                    </Animated.Text>


                </View>


                <View className="w-10" />
            </View>
        </View>
    );
});