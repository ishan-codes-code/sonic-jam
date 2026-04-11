import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ChevronDown, MoreVertical } from 'lucide-react-native';
import { theme } from '@/src/theme';

interface PlayerHeaderProps {
    onBack: () => void;
    insetsTop: number;
}

/**
 * Simple, static player header.
 */
export const PlayerHeader = ({ onBack, insetsTop }: PlayerHeaderProps) => {
    return (
        <View style={[styles.header, { paddingTop: insetsTop }]}>
            <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
                <ChevronDown color={theme.colors.textPrimary} size={28} />
            </TouchableOpacity>
            
            <View style={{ flex: 1 }} />

            <TouchableOpacity style={styles.headerBtn}>
                <MoreVertical color={theme.colors.textPrimary} size={24} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        width: '100%',
        height: 100,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    headerBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 22,
    },
});
