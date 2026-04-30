import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { useState, useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TabHeader from '../components/TabHeader';
import { CleanedSearchResult } from '@/features/search/types';
import HistoryScreen from '@/features/history/screens/HistoryScreen';
import HomeFeedScreen from './HomeFeedScreen';

export default function HomeScreen() {
    const [value, setValue] = useState('feed');

    const handleSongPress = useCallback((song: CleanedSearchResult) => {
        // TODO: wire up global audio player / navigation
        console.log('[HomeScreen] song pressed:', song.title, '—', song.artist);
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Tabs
                value={value}
                onValueChange={setValue}
                className="flex-1"
            >
                {/* ── Tab bar ─────────────────────────────────────────────── */}
                <View className="px-4 pt-2">
                    <TabHeader value={value} setValue={setValue} />
                </View>

                {/* ── Feed tab ─────────────────────────────────────────────── */}
                <TabsContent value="feed" className="flex-1 mt-0">
                    <HomeFeedScreen onSongPress={handleSongPress} />
                </TabsContent>

                {/* ── Recents tab ─────────────────────────────── */}
                <TabsContent value="recents" className="flex-1 mt-0">
                    <HistoryScreen />
                </TabsContent>
            </Tabs>
        </SafeAreaView>
    );
}