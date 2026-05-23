import React from 'react';
import { View, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Music } from 'lucide-react-native';
import Animated from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH * 0.88;

interface PlayerArtworkProps {
    artworkUri: string | null;
    animatedStyle?: any;
}

export const PlayerArtwork = React.memo(({ artworkUri, animatedStyle }: PlayerArtworkProps) => {
    return (
        <Animated.View className="self-center" style={animatedStyle}>
            <View 
                className="overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl"
                style={{ width: ARTWORK_SIZE, height: ARTWORK_SIZE }}
            >
                {artworkUri ? (
                    <Image
                        source={{ uri: artworkUri }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                    />
                ) : (
                    <View className="flex-1 items-center justify-center bg-zinc-800">
                        <Music color="rgba(255,255,255,0.4)" size={64} />
                    </View>
                )}
            </View>
        </Animated.View>
    );
});
