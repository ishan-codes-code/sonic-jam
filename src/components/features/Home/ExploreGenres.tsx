import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Music, Headphones, Radio, Mic2, Zap, Disc } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const H_PAD = 16;
const SMALL_CARD_W = (width - H_PAD * 2 - CARD_GAP) / 2;

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

// ── Press-animated wrapper ─────────────────────────────────────
function PressCard({
    onPress,
    children,
    style,
}: {
    onPress: () => void;
    children: React.ReactNode;
    style?: object;
}) {
    const scale = React.useRef(new Animated.Value(1)).current;

    const onPressIn = () =>
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
    const onPressOut = () =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

    return (
        <TouchableOpacity
            onPress={onPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={1}
            style={style}
        >
            <Animated.View style={{ transform: [{ scale }] }}>
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
}

// ── Large Card (full width) ────────────────────────────────────
function LargeGenreCard({
    genre,
    onPress,
}: {
    genre: (typeof GENRES)[0];
    onPress: () => void;
}) {
    return (
        <PressCard onPress={onPress} style={styles.largeCardWrapper}>
            <LinearGradient
                colors={genre.colors}
                style={styles.largeCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative icon — top right */}
                <View style={styles.decoIconLarge}>
                    {CARD_ICON_MAP[genre.icon]}
                </View>
                {/* Label — bottom left */}
                <View style={styles.cardLabelContainer}>
                    <Text style={styles.largeCardLabel}>{genre.label}</Text>
                </View>
            </LinearGradient>
        </PressCard>
    );
}

// ── Small Card (half width) ────────────────────────────────────
function SmallGenreCard({
    genre,
    onPress,
}: {
    genre: (typeof GENRES)[0];
    onPress: () => void;
}) {
    return (
        <PressCard onPress={onPress} style={styles.smallCardWrapper}>
            <LinearGradient
                colors={genre.colors}
                style={styles.smallCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative icon — bottom right */}
                <View style={styles.decoIconSmall}>
                    {CARD_ICON_MAP[genre.icon]}
                </View>
                {/* Label — bottom left */}
                <View style={styles.cardLabelContainer}>
                    <Text style={styles.smallCardLabel}>{genre.label}</Text>
                </View>
            </LinearGradient>
        </PressCard>
    );
}

// ── Wide Card (full width, shorter) ───────────────────────────
function WideGenreCard({
    genre,
    onPress,
}: {
    genre: (typeof GENRES)[0];
    onPress: () => void;
}) {
    return (
        <PressCard onPress={onPress} style={styles.wideCardWrapper}>
            <LinearGradient
                colors={genre.colors}
                style={styles.wideCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative icon — right */}
                <View style={styles.decoIconWide}>
                    {CARD_ICON_MAP[genre.icon]}
                </View>
                {/* Label — bottom left */}
                <View style={styles.cardLabelContainer}>
                    <Text style={styles.wideCardLabel}>{genre.label}</Text>
                </View>
            </LinearGradient>
        </PressCard>
    );
}

// ── Genre Grid ────────────────────────────────────────────────
function GenreGrid({
    genres,
    onPress,
}: {
    genres: typeof GENRES;
    onPress: (name: string) => void;
}) {
    const rows: React.ReactNode[] = [];
    let i = 0;

    while (i < genres.length) {
        const genre = genres[i];

        if (genre.size === 'large') {
            rows.push(
                <LargeGenreCard key={genre.id} genre={genre} onPress={() => onPress(genre.name)} />
            );
            i++;
        } else if (genre.size === 'wide') {
            rows.push(
                <WideGenreCard key={genre.id} genre={genre} onPress={() => onPress(genre.name)} />
            );
            i++;
        } else {
            // Pair two small cards
            const next = genres[i + 1];
            rows.push(
                <View key={`row-${i}`} style={styles.smallRow}>
                    <SmallGenreCard genre={genre} onPress={() => onPress(genre.name)} />
                    {next ? (
                        <SmallGenreCard genre={next} onPress={() => onPress(next.name)} />
                    ) : (
                        <View style={styles.smallCardWrapper} />
                    )}
                </View>
            );
            i += 2;
        }
    }

    return <View style={styles.genreGrid}>{rows}</View>;
}



export default function ExploreGenres() {
    const router = useRouter();

    const handleGenrePress = (genre: string) => {
        router.push({
            pathname: '/(tabs)/home/[genre]',
            params: { genre },
        } as any);
    };


    return (

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Explore Genres</Text>
            <GenreGrid genres={GENRES} onPress={handleGenrePress} />
        </View>
    )
}



const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundBase,
    },
    scrollContent: {
        paddingTop: 24,
    },
    greetingSection: {
        paddingHorizontal: H_PAD,
        marginBottom: 32,
    },
    greetingText: {
        ...theme.typography.displayMedium,
        color: theme.colors.textPrimary,
        fontSize: 32,
        fontWeight: '700',
    },
    subGreetingText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginTop: 4,
        fontSize: 16,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        ...theme.typography.headline,
        color: theme.colors.textPrimary,
        paddingHorizontal: H_PAD,
        marginBottom: 16,
        fontSize: 22,
        fontWeight: '700',
    },

    // ── Grid layout ──────────────────────────────────────────
    genreGrid: {
        paddingHorizontal: H_PAD,
        gap: CARD_GAP,
    },
    smallRow: {
        flexDirection: 'row',
        gap: CARD_GAP,
    },

    // ── Large card ───────────────────────────────────────────
    largeCardWrapper: {
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
    },
    largeCard: {
        width: '100%',
        height: 170,
        borderRadius: 18,
        padding: 18,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },

    // ── Small card ───────────────────────────────────────────
    smallCardWrapper: {
        flex: 1,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    smallCard: {
        height: 110,
        borderRadius: 18,
        padding: 14,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },

    // ── Wide card ────────────────────────────────────────────
    wideCardWrapper: {
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 9,
    },
    wideCard: {
        width: '100%',
        height: 120,
        borderRadius: 18,
        padding: 18,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },

    // ── Decorative icons ─────────────────────────────────────
    decoIconLarge: {
        position: 'absolute',
        right: -10,
        top: -10,
        opacity: 0.15,
        transform: [{ rotate: '-15deg' }],
    },
    decoIconSmall: {
        position: 'absolute',
        right: -8,
        bottom: -8,
        opacity: 0.18,
    },
    decoIconWide: {
        position: 'absolute',
        right: -14,
        top: -14,
        opacity: 0.15,
        transform: [{ rotate: '10deg' }],
    },

    // ── Card labels ──────────────────────────────────────────
    cardLabelContainer: {
        zIndex: 2,
    },
    largeCardLabel: {
        ...theme.typography.headline,
        color: 'white',
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.25)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    smallCardLabel: {
        ...theme.typography.title,
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.25)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    wideCardLabel: {
        ...theme.typography.headline,
        color: 'white',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.25)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
});