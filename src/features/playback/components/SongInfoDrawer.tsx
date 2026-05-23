import React from 'react';
import { View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/text';
import { Calendar, Clock, Music, Globe, ExternalLink, Hash } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import type { Song } from '../types';

interface SongInfoDrawerProps {
    song: Song;
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export const SongInfoDrawer = React.memo(({ song }: SongInfoDrawerProps) => {
    const artistNames = song.artists?.map((a) => a.name).join(', ') ?? 'Unknown Artist';

    const details = [
        { icon: Calendar, label: 'Released', value: song.createdAt ? formatDate(song.createdAt) : null },
        { icon: Music, label: 'Album', value: song.albumName ?? null },
        { icon: Clock, label: 'Duration', value: formatDuration(song.duration) },
        { icon: Hash, label: 'Song ID', value: song.id },
        { icon: Globe, label: 'External ID', value: song.externalId ?? null },
    ].filter((d) => d.value !== null);

    return (
        <View className="pt-6 pb-12">
            {/* Header artwork */}
            <View className="items-center mb-8">
                <View className="w-56 h-56 rounded-2xl overflow-hidden bg-secondary/30 shadow-2xl mb-5">
                    {song.image ? (
                        <Image
                            source={{ uri: song.image }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                        />
                    ) : (
                        <View className="flex-1 items-center justify-center bg-indigo-500/20">
                            <Icon as={Music} size={48} className="text-indigo-400" />
                        </View>
                    )}
                </View>

                <Text className="text-2xl text-foreground font-display text-center px-6 mb-1">
                    {song.trackName}
                </Text>
                <Text className="text-base text-muted-foreground text-center px-6">
                    {artistNames}
                </Text>
            </View>

            {/* Divider */}
            <View className="w-full border-b border-muted mb-6" />

            {/* Details list */}
            <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
                {details.map((item, index) => (
                    <View
                        key={item.label}
                        className={`flex-row items-center py-3.5 ${index < details.length - 1 ? 'border-b border-muted/50' : ''}`}
                    >
                        <View className="w-10 h-10 rounded-full bg-secondary/40 items-center justify-center mr-4">
                            <Icon as={item.icon} size={18} className="text-amber-300" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs text-muted-foreground font-sans-medium uppercase tracking-wider">
                                {item.label}
                            </Text>
                            <Text className="text-base text-foreground font-sans-medium mt-0.5">
                                {item.value}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
});

SongInfoDrawer.displayName = 'SongInfoDrawer';