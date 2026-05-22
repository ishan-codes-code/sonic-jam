import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Radio } from 'lucide-react-native';

export const RNTPQueueFooter = React.memo(({
    showTrigger,
    onPressTrigger,
}: {
    showTrigger: boolean;
    onPressTrigger: () => void;
}) => {
    if (!showTrigger) return null;

    return (
        <TouchableOpacity
            onPress={onPressTrigger}
            activeOpacity={0.7}
            className="flex-row items-center justify-between bg-white/5 border border-white/10 px-4 py-3.5 rounded-xl mt-4 active:bg-white/10"
        >
            <View className="flex-row items-center gap-2.5">
                <Radio size={16} color="#facc15" />
                <Text className="text-sm font-semibold text-yellow-400">
                    Resolving from Smart Queue
                </Text>
                <ActivityIndicator size="small" color="#facc15" className="ml-1" />
            </View>
            <Text className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                View Queue
            </Text>
        </TouchableOpacity>
    );
});
