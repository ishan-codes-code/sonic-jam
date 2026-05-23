import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Radio } from 'lucide-react-native';

export const SmartQueueEmpty = React.memo(({
    isStartingRadio,
    onStartRadio,
}: {
    isStartingRadio: boolean;
    onStartRadio: () => void;
}) => (
    <View className="flex-1 items-center justify-center py-10 px-6">
        <Radio size={48} color="#facc15" opacity={0.6} className="mb-4" />
        <Text className="text-white/60 text-center text-sm mb-6 leading-5">
            Smart Queue is empty. Tap Start Radio to fetch personalized recommendations and play music.
        </Text>
        <TouchableOpacity
            className="bg-yellow-400 active:bg-yellow-500 py-3.5 px-8 rounded-full shadow-lg flex-row items-center justify-center"
            disabled={isStartingRadio}
            onPress={onStartRadio}
        >
            {isStartingRadio ? (
                <ActivityIndicator size="small" color="#000" className="mr-2" />
            ) : null}
            <Text className="text-black font-extrabold text-sm tracking-wider uppercase">
                {isStartingRadio ? 'Starting...' : 'Start Radio'}
            </Text>
        </TouchableOpacity>
    </View>
));
