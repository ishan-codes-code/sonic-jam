import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    View
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IconBadgeProps {
    icon: React.ReactNode;
    count?: number;
    loading?: boolean;
    color?: string;
}

// ─── IconBadge ────────────────────────────────────────────────────────────────

export const Spinnerbadge: React.FC<IconBadgeProps> = ({
    icon,
    count = 0,
    loading = true,   // ✅ uses the prop, not hardcoded
    color = '#333',
}) => {
    const spinAnim = useRef(new Animated.Value(0)).current;

    // Spin loop
    useEffect(() => {
        if (loading) {
            Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            spinAnim.stopAnimation();
            spinAnim.setValue(0);
        }
    }, [loading, spinAnim]);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // count = 0 and not loading → show bare icon, no badge
    if (count < 1) {
        return <View style={styles.wrapper}>{icon}</View>;
    }

    return (
        <View style={styles.wrapper}>
            {/* Icon */}
            {icon}

            {/* Badge: spinner arc + count — sitting top-right */}
            <View style={styles.badgeAnchor}>
                <View style={styles.badgeRow}>

                    {/* Spinner arc — only when loading */}
                    {loading && (
                        <Animated.View
                            style={[
                                styles.spinnerArc,
                                {
                                    borderTopColor: color,
                                    borderRightColor: `${color}44`,
                                    borderBottomColor: 'transparent',
                                    borderLeftColor: 'transparent',
                                    transform: [{ rotate: spin }],
                                },
                            ]}
                        />
                    )}

                    {/* Count — plain number, no bubble */}
                    {count > 0 && (
                        <Text style={[styles.countText, { color }]}>
                            {count > 99 ? '99+' : count}
                        </Text>
                    )}

                </View>
            </View>
        </View>
    );
};


// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({





    // Badge
    wrapper: {
        position: 'relative',
        alignSelf: 'flex-start',
    },
    badgeAnchor: {
        position: 'absolute',
        top: -8,
        right: -12,
    },
    badgeRow: {
        flexDirection: 'row',   // ✅ spinner arc LEFT, count RIGHT — side by side
        alignItems: 'center',
        gap: 3,
    },
    spinnerArc: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1.5,
    },
    countText: {
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 14,
    },







});