import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

type Props = {
    isPlaying: boolean;
    barColor?: string;
    barColors?: string[];
    count?: number;
    barWidth?: number;
    maxHeight?: number;
    minHeight?: number;
    gap?: number;
};

export default function AudioWave({
    isPlaying,
    barColor = "lime",
    barColors,
    count = 4,
    barWidth = 4,
    maxHeight = 35,
    minHeight = 5,
    gap = 2,
}: Props) {
    // We animate a value between 0 and 1, mapping it to scaleY.
    const animations = useRef(
        Array.from({ length: count }, () => new Animated.Value(minHeight / maxHeight))
    ).current;

    useEffect(() => {
        if (isPlaying) {
            const loops = animations.map((anim, index) =>
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: Math.random() * 0.5 + 0.5, // scale between 50% and 100% of maxHeight
                            duration: 250 + index * 80,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: minHeight / maxHeight,
                            duration: 250 + index * 80,
                            useNativeDriver: true,
                        }),
                    ])
                )
            );

            loops.forEach((loop) => loop.start());

            return () => loops.forEach((loop) => loop.stop());
        } else {
            animations.forEach((anim) => {
                anim.stopAnimation();
                Animated.timing(anim, { toValue: minHeight / maxHeight, duration: 250, useNativeDriver: true }).start();
            });
        }
    }, [isPlaying, maxHeight, minHeight]);

    return (
        <View style={[styles.container, { height: maxHeight, gap: gap }]}>
            {animations.map((anim, i) => {
                const color =
                    barColors?.[i % barColors.length] || barColor;

                return (
                    <Animated.View
                        key={i}
                        style={[
                            styles.bar,
                            {
                                width: barWidth,
                                height: maxHeight, // Base height is max, we scale it down visually
                                backgroundColor: color,
                                borderRadius: barWidth / 2,
                                transform: [{ scaleY: anim }],
                                transformOrigin: 'bottom', // Requires RN 0.73+ OR anchor point wrapper
                            },
                        ]}
                    />
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "flex-end",
    },
    bar: {
        opacity: 0.8,
    },
});