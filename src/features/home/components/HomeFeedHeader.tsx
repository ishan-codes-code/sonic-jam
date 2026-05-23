import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Music2 } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';

// ─── Greeting logic ───────────────────────────────────────────────────────────

const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Up late?';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
};

const getSubtitle = (): string => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Night owl jams, just for you';
    if (hour < 12) return 'Start your day with great music';
    if (hour < 17) return "India's freshest hits, right now";
    if (hour < 21) return 'Wind down with the best tracks';
    return 'The perfect playlist for tonight';
};

// ─── Component ────────────────────────────────────────────────────────────────

const HomeFeedHeader = React.memo(() => {
    const greeting = useMemo(getGreeting, []);
    const subtitle = useMemo(getSubtitle, []);

    return (
        <View className="px-4 pt-2 pb-4">

            <Text className="text-3xl text-foreground tracking-tight font-display">
                {greeting}
            </Text>
            <Text className="text-sm text-muted-foreground mt-1">{subtitle}</Text>
        </View>
    );
});

HomeFeedHeader.displayName = 'HomeFeedHeader';

export default HomeFeedHeader;
