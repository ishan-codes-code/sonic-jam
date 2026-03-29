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
    const animations = useRef(
        Array.from({ length: count }, () => new Animated.Value(minHeight))
    ).current;

    useEffect(() => {
        if (isPlaying) {
            const loops = animations.map((anim, index) =>
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: Math.random() * (maxHeight - minHeight) + minHeight,
                            duration: 250 + index * 80,
                            useNativeDriver: false,
                        }),
                        Animated.timing(anim, {
                            toValue: minHeight,
                            duration: 250 + index * 80,
                            useNativeDriver: false,
                        }),
                    ])
                )
            );

            loops.forEach((loop) => loop.start());

            return () => loops.forEach((loop) => loop.stop());
        } else {
            animations.forEach((anim) => {
                anim.stopAnimation();
                Animated.timing(anim, { toValue: minHeight, duration: 250, useNativeDriver: false }).start();
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
                                height: anim,
                                backgroundColor: color,
                                borderRadius: barWidth / 2,
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