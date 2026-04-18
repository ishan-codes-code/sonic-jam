import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
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
                <ChevronDown color={theme.colors.textPrimary} size={32} />
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
                <Text style={styles.headerTitle}>RECOMMENDED FOR YOU</Text>
            </View>

            <TouchableOpacity style={styles.headerBtn}>
                <MoreVertical color={theme.colors.textPrimary} size={24} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg - 4,
        height: 64, 
    },
    headerBtn: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        opacity: 0.8,
    },
});
