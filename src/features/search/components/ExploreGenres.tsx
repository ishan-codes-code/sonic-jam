import React from 'react';
import {
    View,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Music, Headphones, Radio, Mic2, Zap, Disc } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const H_PAD = 16;

const GENRES = [
    {
        id: '1',
        name: 'chill',
        label: 'CHILL',
        colors: ['#8E2DE2', '#4A00E0'] as [string, string],
        icon: 'music',
        size: 'large',
    },
    {
        id: '2',
        name: 'hiphop',
        label: 'Hip Hop',
        colors: ['#00C6FF', '#0072FF'] as [string, string],
        icon: 'headphones',
        size: 'small',
    },
    {
        id: '3',
        name: 'edm',
        label: 'EDM',
        colors: ['#FF416C', '#FF4B2B'] as [string, string],
        icon: 'radio',
        size: 'small',
    },
    {
        id: '4',
        name: 'bollywood',
        label: 'BOLLYWOOD',
        colors: ['#11998E', '#38EF7D'] as [string, string],
        icon: 'disc',
        size: 'wide',
    },
    {
        id: '5',
        name: 'rock',
        label: 'Rock',
        colors: ['#F7971E', '#FFD200'] as [string, string],
        icon: 'mic',
        size: 'small',
    },
    {
        id: '6',
        name: 'jazz',
        label: 'Jazz',
        colors: ['#f093fb', '#f5576c'] as [string, string],
        icon: 'zap',
        size: 'small',
    },
];

const CARD_ICON_MAP: Record<string, React.ReactNode> = {
    music: <Music size={90} color="white" />,
    headphones: <Headphones size={90} color="white" />,
    radio: <Radio size={90} color="white" />,
    disc: <Disc size={120} color="white" />,
    mic: <Mic2 size={90} color="white" />,
    zap: <Zap size={90} color="white" />,
};

function PressCard({
    onPress,
    children,
    className,
}: {
    onPress: () => void;
    children: React.ReactNode;
    className?: string;
}) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const onPressIn = () => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    };
    const onPressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={1}
            className={className}
        >
            <Animated.View style={animatedStyle}>
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
}

function LargeGenreCard({
    genre,
    onPress,
}: {
    genre: (typeof GENRES)[0];
    onPress: () => void;
}) {
    return (
        <PressCard onPress={onPress} className="rounded-[18px] overflow-hidden shadow-lg elevation-10">
            <LinearGradient
                colors={genre.colors}
                className="w-full h-[170px] p-[18px] justify-end relative overflow-hidden"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View className="absolute -right-[10px] -top-[10px] opacity-15" style={{ transform: [{ rotate: '-15deg' }] }}>
                    {CARD_ICON_MAP[genre.icon]}
                </View>
                <View className="z-10">
                    <Text className="text-white text-[28px] font-extrabold tracking-wider" style={{ textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 }}>
                        {genre.label}
                    </Text>
                </View>
            </LinearGradient>
        </PressCard>
    );
}

function SmallGenreCard({
    genre,
    onPress,
}: {
    genre: (typeof GENRES)[0];
    onPress: () => void;
}) {
    return (
        <PressCard onPress={onPress} className="flex-1 rounded-[18px] overflow-hidden shadow-md elevation-8">
            <LinearGradient
                colors={genre.colors}
                className="h-[110px] p-[14px] justify-end relative overflow-hidden"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View className="absolute -right-[8px] -bottom-[8px] opacity-15">
                    {CARD_ICON_MAP[genre.icon]}
                </View>
                <View className="z-10">
                    <Text className="text-white text-base font-bold" style={{ textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
                        {genre.label}
                    </Text>
                </View>
            </LinearGradient>
        </PressCard>
    );
}

function WideGenreCard({
    genre,
    onPress,
}: {
    genre: (typeof GENRES)[0];
    onPress: () => void;
}) {
    return (
        <PressCard onPress={onPress} className="rounded-[18px] overflow-hidden shadow-md elevation-9">
            <LinearGradient
                colors={genre.colors}
                className="w-full h-[120px] p-[18px] justify-end relative overflow-hidden"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View className="absolute -right-[14px] -top-[14px] opacity-15" style={{ transform: [{ rotate: '10deg' }] }}>
                    {CARD_ICON_MAP[genre.icon]}
                </View>
                <View className="z-10">
                    <Text className="text-white text-[22px] font-extrabold tracking-wider" style={{ textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 }}>
                        {genre.label}
                    </Text>
                </View>
            </LinearGradient>
        </PressCard>
    );
}

export default function ExploreGenres() {
    const router = useRouter();

    const handleGenrePress = (genre: string) => {
        router.push({
            pathname: '/(tabs)/search/[genre]',
            params: { genre },
        } as any);
    };

    const renderGrid = () => {
        const rows: React.ReactNode[] = [];
        let i = 0;

        while (i < GENRES.length) {
            const genre = GENRES[i];

            if (genre.size === 'large') {
                rows.push(
                    <LargeGenreCard key={genre.id} genre={genre} onPress={() => handleGenrePress(genre.name)} />
                );
                i++;
            } else if (genre.size === 'wide') {
                rows.push(
                    <WideGenreCard key={genre.id} genre={genre} onPress={() => handleGenrePress(genre.name)} />
                );
                i++;
            } else {
                const next = GENRES[i + 1];
                rows.push(
                    <View key={`row-${i}`} className="flex-row" style={{ gap: CARD_GAP }}>
                        <SmallGenreCard genre={genre} onPress={() => handleGenrePress(genre.name)} />
                        {next ? (
                            <SmallGenreCard genre={next} onPress={() => handleGenrePress(next.name)} />
                        ) : (
                            <View className="flex-1" />
                        )}
                    </View>
                );
                i += 2;
            }
        }
        return rows;
    };

    return (
        <View className="mb-8">
            <Text variant={"h1"} className="text-xl font-bold text-foreground mb-4 text-left px-4 tracking-tight">Explore Genres</Text>

            <View className="px-4" style={{ gap: CARD_GAP }}>
                {renderGrid()}
            </View>
        </View>
    );
}
