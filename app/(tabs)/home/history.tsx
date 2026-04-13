import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, History as HistoryIcon, Trash2 } from 'lucide-react-native';
import { theme } from '@/src/theme';
import { PlayHistoryService, HistoryEntry } from '@/src/services/playHistoryService';
import { usePlayer } from '@/src/playbackCore/usePlayer';
import SongListCard from '@/src/components/features/Playlist/SongListCard';
import { LinearGradient } from 'expo-linear-gradient';

export default function HistoryScreen() {
    const router = useRouter();
    const { play } = usePlayer();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setIsLoading(true);
        const data = await PlayHistoryService.getHistory();
        setHistory(data);
        setIsLoading(false);
    };

    const handleClearHistory = async () => {
        await PlayHistoryService.clearHistory();
        setHistory([]);
    };

    const handleTrackPress = (entry: HistoryEntry) => {
        play({
            songId: entry.song.id,
        });
    };

    const renderItem = ({ item }: { item: HistoryEntry }) => (
        <SongListCard
            playlistSongs={{
                id: item.song.id,
                trackName: item.song.trackName || 'Unknown',
                artistName: item.song.artistName || 'Unknown',
                duration: item.song.duration || 0,
                youtubeId: item.song.youtubeId,
                image: item.song.image || null,
            } as any}
            artworkUri={item.song.image}
            onPress={() => handleTrackPress(item)}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color={theme.colors.textPrimary} size={24} />
                </TouchableOpacity>
                <View style={styles.headerTextWrapper}>
                    <Text style={styles.headerTitle}>Recently Played</Text>
                    <Text style={styles.headerSubtitle}>Songs you've listened to</Text>
                </View>
                
                {history.length > 0 && (
                    <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton}>
                        <Trash2 color={theme.colors.error} size={20} />
                    </TouchableOpacity>
                )}
            </View>

            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primaryAccent} />
                </View>
            ) : history.length === 0 ? (
                <View style={styles.centered}>
                    <HistoryIcon color={theme.colors.textMuted} size={64} style={{ marginBottom: 16 }} />
                    <Text style={styles.emptyTitle}>No history yet</Text>
                    <Text style={styles.emptySub}>Songs you play will appear here</Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    renderItem={renderItem}
                    keyExtractor={(item) => `${item.song.id}-${item.playedAt}`}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={styles.listHeaderGradientPlaceholder} />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundBase,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
        gap: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: theme.colors.backgroundCard,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    headerTextWrapper: {
        flex: 1,
    },
    headerTitle: {
        ...theme.typography.headline,
        color: theme.colors.textPrimary,
        fontSize: 22,
    },
    headerSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        fontSize: 14,
        opacity: 0.7,
    },
    clearButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "rgba(244, 63, 94, 0.05)",
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "rgba(244, 63, 94, 0.1)",
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 120, 
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        ...theme.typography.headline,
        color: theme.colors.textPrimary,
        fontSize: 18,
        marginTop: 16,
    },
    emptySub: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        fontSize: 14,
        opacity: 0.6,
    },
    listHeaderGradientPlaceholder: {
        height: 10,
    }
});

