import React from 'react';
import { type DimensionValue, View } from 'react-native';
import { theme } from '@/src/theme';
import { playlistScreenStyles as styles } from './PlaylistScreen.styles';

const SkeletonBlock = ({ w, h, r }: { w: DimensionValue; h: number; r?: number }) => {
    return <View style={[styles.skeleton, { width: w, height: h, borderRadius: r ?? theme.radius.md }]} />;
};

export function PlaylistSkeleton({ insetsTop }: { insetsTop: number }) {
    return (
        <View>
            <View style={[styles.heroBg, { paddingTop: insetsTop + 18, paddingHorizontal: theme.spacing.lg }]}>
                <View style={[styles.heroRow, { alignItems: "center" }]}>
                    <SkeletonBlock w={152} h={152} r={theme.radius.lg} />
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
                    <SkeletonBlock w={'45%'} h={12} r={8} />
                    <View style={{ flex: 1 }} />
                    <SkeletonBlock w={30} h={12} r={8} />
                </View>
                <View style={styles.divider} />

                {Array.from({ length: 10 }).map((_, idx) => (
                    <View key={idx} style={[styles.skelRow, idx === 0 && { marginTop: theme.spacing.sm }]}>
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
