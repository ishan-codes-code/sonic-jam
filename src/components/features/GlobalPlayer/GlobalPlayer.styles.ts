import { Platform, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

export const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 96 : 78,
        left: 10,
        right: 10,
    },
    miniPlayer: {
        height: 62,
        borderRadius: 8,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    contentWrap: {
        flex: 1,
    },
    playerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    albumArt: {
        width: 44,
        height: 44,
        borderRadius: 6,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    textStack: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        ...theme.typography.label,
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    artist: {
        ...theme.typography.metadata,
        color: '#ababab',
        fontSize: 11,
        marginTop: 1,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionBtn: {
        padding: 4,
    },
    playWrap: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    progressBg: {
        position: 'absolute',
        bottom: 0,
        left: 8,
        right: 8,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#ffffff',
    },
});