import { Stack, usePathname, useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TabHeader from '@/features/home/components/TabHeader';

export default function HomeLayout() {
    const pathname = usePathname();
    const router = useRouter();

    // Derive active tab from current route
    const activeTab = pathname.endsWith('/recents') ? 'recents' : 'feed';

    const handleTabChange = (val: string) => {
        if (val === 'recents') {
            router.replace('/(tabs)/home/recents');
        } else {
            router.replace('/(tabs)/home');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1">
                {/* ── Tab Header ─────────────────────────────────────────── */}
                <View className="px-4 pt-2">
                    <TabHeader value={activeTab} setValue={handleTabChange} />
                </View>

                {/* ── Screen Content (expo-router driven) ─────────────────── */}
                <Stack
                    screenOptions={{
                        headerShown: false,
                        animation: 'fade',
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="recents" />
                </Stack>
            </View>
        </SafeAreaView>
    );
}
