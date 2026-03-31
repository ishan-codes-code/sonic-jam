import { theme } from "@/src/theme";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export default function MovingLine() {
    const progress = useSharedValue(0);
    const pulse = useSharedValue(1);

    useEffect(() => {
        // Shimmer movement
        progress.value = withRepeat(
            withTiming(1, {
                duration: 800,
                easing: Easing.linear,
            }),
            -1,
            false
        );

        // Pulse effect (breathing)
        pulse.value = withRepeat(
            withTiming(1.15, {
                duration: 900,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            true
        );
    }, []);

    const shimmerStyle = useAnimatedStyle(() => {
        const translateX = interpolate(progress.value, [0, 1], [-200, 200]);

        return {
            transform: [{ translateX }, { scaleY: pulse.value }],
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.shimmer, shimmerStyle]}>
                <AnimatedGradient
                    colors={[
                        "transparent",
                        "rgba(124,58,237,0.8)",
                        "transparent",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 4,
        width: "100%",
        backgroundColor: theme.colors.backgroundInteractive,
        overflow: "hidden",
        borderRadius: 999,
    },
    shimmer: {
        width: "60%",
        height: "100%",
    },
    gradient: {
        flex: 1,
    },
});