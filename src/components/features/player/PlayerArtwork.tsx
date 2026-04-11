import React from 'react';
import { Image, StyleSheet, View, Dimensions } from 'react-native';
import { Music } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { theme } from '@/src/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Artwork fills 80% of screen width for dominance
const ARTWORK_SIZE = SCREEN_WIDTH * 0.82;

interface PlayerArtworkProps {
    artworkUri: string | null;
    animatedStyle: any;
}

export const PlayerArtwork = ({ artworkUri, animatedStyle }: PlayerArtworkProps) => {
    return (
        <Animated.View style={[styles.artworkContainer, animatedStyle]}>
            <View style={styles.artworkInner}>
                {artworkUri ? (
                    <Image source={{ uri: artworkUri }} style={styles.artworkImage} />
                ) : (
                    <View style={styles.artworkFallback}>
                        <Music color={theme.colors.textMuted} size={64} />
                    </View>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    artworkContainer: {
        // Deep ambient shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 40,
        elevation: 20,
        alignSelf: 'center',
    },
    artworkInner: {
        width: ARTWORK_SIZE,
        height: ARTWORK_SIZE,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: theme.colors.backgroundCard,
    },
    artworkImage: {
        width: '100%',
        height: '100%',
    },
    artworkFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundInteractive,
    },
});
