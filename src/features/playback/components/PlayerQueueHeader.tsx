import React from 'react';
import { View, Text } from 'react-native';
import type { PlaybackTrack } from '../types';
import { RNTPQueueItem } from './PlayerQueueItem';

export const RNTPQueueHeader = React.memo(({
    currentTrack,
    hasNextQueue,
    isShuffleEnabled,
}: {
    currentTrack: PlaybackTrack | null;
    hasNextQueue: boolean;
    isShuffleEnabled: boolean;
}) => {
    if (!currentTrack) {
        return <View className="pb-2" />;
    }

    return (
        <View className="pb-2">
            <View className="mb-2">
                <Text className="mb-2 text-xs font-extrabold tracking-widest text-white/40">NOW PLAYING</Text>
                <RNTPQueueItem
                    item={currentTrack}
                    onPress={() => { }}
                />
            </View>
            {hasNextQueue && (
                <View>
                    <Text
                        className={`text-xs font-extrabold tracking-widest ${isShuffleEnabled ? 'italic text-white/60' : 'text-white/40'
                            }`}
                    >
                        {isShuffleEnabled ? 'SHUFFLING FROM' : 'UP NEXT'}
                    </Text>
                </View>
            )}
        </View>
    );
});
