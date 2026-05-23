import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Check, X } from 'lucide-react-native';
import type { SmartQueueTrack } from '../types';

export const SmartQueueItem = React.memo(({
    item,
    onCancel,
}: {
    item: SmartQueueTrack;
    onCancel: (id: string) => void;
}) => {
    const isFailed = item.status === 'failed';
    const artwork = item.enrichedTrack?.artwork ?? item.recommendation.image;

    const handleCancel = useCallback(() => {
        onCancel(item.id);
    }, [item.id, onCancel]);

    return (
        <View className={`flex-row items-center w-full py-2 mb-2 ${isFailed ? 'opacity-40' : ''}`}>
            <View className="w-12 h-12 bg-white/5 rounded-md overflow-hidden mr-3">
                {artwork && (
                    <Image
                        source={{ uri: artwork }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                )}
                {item.status === 'enriching' && (
                    <View className="absolute inset-0 items-center justify-center bg-black/40">
                        <ActivityIndicator size="small" color="#fff" />
                    </View>
                )}
            </View>

            <View className="flex-1 justify-center mr-2">
                <Text numberOfLines={1} className="text-base text-white font-medium">
                    {item.recommendation.title}
                </Text>
                <View className="flex-row items-center justify-between mt-0.5">
                    <Text numberOfLines={1} className="text-sm text-white/50 flex-1 mr-2">
                        {item.recommendation.artist}
                    </Text>
                    {item.status === 'resolving' && item.jobId && (
                        <Text className="text-[10px] text-yellow-400 font-semibold bg-yellow-400/10 px-2 py-0.5 rounded-full overflow-hidden">
                            Downloading
                        </Text>
                    )}
                    {(item.status === 'enriching' || (item.status === 'resolving' && !item.jobId)) && (
                        <Text className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full overflow-hidden">
                            Queued
                        </Text>
                    )}
                    {item.status === 'ready' && (
                        <Text className="text-[10px] text-[#1DB954] font-semibold bg-[#1DB954]/10 px-2 py-0.5 rounded-full overflow-hidden">
                            Ready
                        </Text>
                    )}
                    {item.status === 'failed' && (
                        <Text className="text-[10px] text-red-500 font-semibold bg-red-500/10 px-2 py-0.5 rounded-full overflow-hidden">
                            Failed
                        </Text>
                    )}
                </View>
            </View>

            <View className="flex-row items-center justify-center w-10">
                {item.status === 'ready' && <Check size={18} color="#facc15" />}
                {item.status !== 'ready' && item.status !== 'failed' && (
                    <TouchableOpacity
                        onPress={handleCancel}
                        className="w-10 h-10 items-center justify-center rounded-full bg-white/5"
                    >
                        <X size={16} color="white" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});
