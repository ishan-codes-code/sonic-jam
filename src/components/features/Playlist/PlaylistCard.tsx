/**
 * PlaylistCard
 *
 * A unified card component that renders in two layout variants:
 *   - "grid"  → square cover art + title + subtitle stacked below (2-col grid)
 *   - "list"  → small thumbnail on the left, text on the right (full-width row)
 *
 * Wraps children in AnimatedPressable for smooth spring press feedback.
 *
 * Dependencies:
 *   react-native-reanimated  >= 3.x
 *   AnimatedPressable        (./AnimatedPressable)
 *
 * Usage:
 *   // Grid mode (2-col):
 *   <PlaylistCard variant="grid" item={item} onPress={handlePress} />
 *
 *   // List mode:
 *   <PlaylistCard variant="list" item={item} onPress={handlePress} />
 *
 *   // Toggle between variants:
 *   <PlaylistCard variant={isGrid ? "grid" : "list"} item={item} onPress={handlePress} />
 */

import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import {
    Dimensions,
    Image,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle
} from "react-native";
import { AnimatedPressable } from "../../ui/AnimatedPressable";

// ─── Design tokens (matches your existing theme shape) ────────────────────────
const theme = {
    colors: {
        bg: "#000000",
        backgroundCard: "#191919",
        backgroundInteractive: "#262626",
        outlineVariantAlpha: "rgba(72,72,72,0.25)",
        textPrimary: "#ffffff",
        textSecondary: "#ababab",
        textMeta: "#6b7280",
        accent: "#9333ea",
        accentLight: "#c084fc",
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
    },
    radius: {
        xs: 4,
        sm: 6,
        md: 16,
        lg: 32,
        full: 9999,
    },
    typography: {
        label: { fontSize: 14, lineHeight: 20 },
        metadata: { fontSize: 12, lineHeight: 16 },
    },
} as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PlaylistCardVariant = "grid" | "list";
export type ArtworkShape = "rect" | "circle";



export interface PlaylistCardProps {
    /** Layout variant */
    name: string;
    thumbnailUrl?: string[] | null;

    variant: PlaylistCardVariant;
    /** Data for the card */
    description?: string | null;
    /** Tap callback */
    onPress?: () => void;
    onLongPress?: () => void
    /** Override the outer wrapper style */
    style?: StyleProp<ViewStyle>;
    /** Override the inner pressable style */
    pressableStyle?: StyleProp<ViewStyle>;
    /**
     * Width of the card in grid mode.
     * Defaults to half-screen minus padding and gap.
     */
    gridCardWidth?: number;
    /**
     * Animation feel passed to AnimatedPressable.
     * @default 'spring' for grid, 'snappy' for list
     */
    feedback?: "spring" | "snappy" | "timing";
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const DEFAULT_GRID_WIDTH =
    (SCREEN_WIDTH - theme.spacing.lg * 2 - theme.spacing.md) / 2;

/** Size of the thumbnail in list mode */
const LIST_THUMB_SIZE = 56;
/** Size of the thumbnail in list mode for artist (circle) */
const LIST_THUMB_SIZE_ARTIST = 52;

// ─── Component ─────────────────────────────────────────────────────────────────


export const PlaylistCard: React.FC<PlaylistCardProps> = memo(
    ({
        name,
        variant,
        description,
        thumbnailUrl,
        onPress,
        onLongPress,
        style,
        pressableStyle,
        gridCardWidth = DEFAULT_GRID_WIDTH,
        feedback,
    }) => {
        const isGrid = variant === "grid";

        // Animation feedback
        const animFeedback = feedback ?? (isGrid ? "spring" : "snappy");
        const scaleTo = isGrid ? 0.95 : 0.97;

        // ── GRID VARIANT (2-column, cover art on top, text below) ──
        if (isGrid) {
            return (
                <AnimatedPressable
                    onPress={onPress}
                    onLongPress={onLongPress}
                    feedback={animFeedback}
                    scaleTo={scaleTo}
                    style={[{ width: gridCardWidth, marginBottom: 16 }, style]}
                    pressableStyle={[{
                        padding: 0,
                        overflow: 'hidden',
                        elevation: 2,
                    }, pressableStyle]}
                    accessibilityRole="button"
                    accessibilityLabel={name}
                >
                    {/* Cover Art */}
                    <View style={[{
                        width: '100%',
                        aspectRatio: 1,
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                    }, (thumbnailUrl?.length ?? 0) < 1 && { backgroundColor: theme.colors.backgroundCard, }]}>


                        {(thumbnailUrl?.length ?? 0) > 0 ? (
                            <Image source={{ uri: thumbnailUrl?.[0] }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                                accessible={false}
                            />
                        ) : (
                            <Ionicons name="musical-notes" size={48} color={theme.colors.textSecondary} />
                        )}


                    </View>
                    {/* Title & Subtitle */}
                    <View style={{
                        alignItems: 'flex-start',
                        paddingBottom: 12,
                        gap: 2,
                    }}>
                        <Text
                            style={{
                                color: theme.colors.textPrimary,
                                fontWeight: '700',
                                fontSize: 12,
                                textAlign: 'left',
                                width: '100%',
                            }}
                            numberOfLines={1}
                        >
                            {name}
                        </Text>
                        <Text
                            style={{
                                color: theme.colors.textSecondary,
                                fontWeight: '500',
                                fontSize: 10,
                                textAlign: 'left',
                                textTransform: 'none',
                                width: '100%',
                            }}
                            numberOfLines={1}
                        >
                            {description}
                        </Text>
                    </View>
                </AnimatedPressable>
            );
        }

        // ── LIST VARIANT (full-width row, small cover left, text right) ──
        const thumbSize = LIST_THUMB_SIZE;
        return (
            <AnimatedPressable
                onPress={onPress}
                onLongPress={onLongPress}
                feedback={animFeedback}
                scaleTo={scaleTo}
                style={[{ width: '100%' }, style]}
                pressableStyle={[{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 0,
                    backgroundColor: 'transparent',
                }, pressableStyle]}
                accessibilityRole="button"
                accessibilityLabel={name}
            >
                {/* Thumbnail */}
                <View style={{
                    width: thumbSize,
                    height: thumbSize,
                    borderRadius: theme.radius.sm,
                    overflow: 'hidden',
                    backgroundColor: theme.colors.backgroundInteractive,
                    marginRight: 14,
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    {(thumbnailUrl?.length ?? 0) > 0 ? (
                        <Image source={{ uri: thumbnailUrl?.[0] }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                            accessible={false}
                        />
                    ) : (
                        <Ionicons name="musical-notes" size={30} color={theme.colors.textSecondary} />
                    )}


                </View>
                {/* Title & Subtitle */}
                <View style={{ flex: 1, gap: 1 }}>
                    <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                        {name}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontWeight: '500', fontSize: 12 }} numberOfLines={1}>
                        {description}
                    </Text>
                </View>
            </AnimatedPressable>
        );
    }
);

PlaylistCard.displayName = "PlaylistCard";
export default PlaylistCard;

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    // ── Grid card ──────────────────────────────────────────────────────────────
    gridCard: {
        backgroundColor: theme.colors.backgroundCard,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        gap: theme.spacing.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.outlineVariantAlpha,
        // Elevation for depth on Android
        elevation: 2,
    },

    gridArtwork: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: theme.radius.sm,
        overflow: "hidden",
        backgroundColor: theme.colors.backgroundInteractive,
    },

    gridMeta: {
        gap: theme.spacing.xs,
    },

    gridMetaCentered: {
        alignItems: "center",
    },

    // ── List card ──────────────────────────────────────────────────────────────
    listCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm + 2, // 10dp vertical — comfortable list row
        // No border/background: list rows sit on the screen bg
    },

    listThumb: {
        overflow: "hidden",
        backgroundColor: theme.colors.backgroundInteractive,
        flexShrink: 0,
    },

    listMeta: {
        flex: 1,
        gap: theme.spacing.xs,
        justifyContent: "center",
    },

    // ── Shared artwork ─────────────────────────────────────────────────────────
    artworkCircle: {
        borderRadius: theme.radius.full,
        borderWidth: 2,
        borderColor: theme.colors.outlineVariantAlpha,
    },

    artworkImage: {
        width: "100%",
        height: "100%",
    },

    // ── Shared text ────────────────────────────────────────────────────────────
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.textPrimary,
        lineHeight: 22,
    },

    cardSubtitle: {
        fontSize: 12,
        fontWeight: "500",
        color: theme.colors.textSecondary,
        lineHeight: 16,
    },

    textCentered: {
        textAlign: "center",
    },

    subtitleUppercase: {
        letterSpacing: 0.6,
        textTransform: "uppercase",
        fontSize: 11,
    },
});

// ─── Usage example ─────────────────────────────────────────────────────────────
//
// const [isGrid, setIsGrid] = useState(true);
//
// // Grid (2-col):
// <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 }}>
//   {playlists.map(item => (
//     <PlaylistCard
//       key={item.id}
//       variant="grid"
//       item={item}
//       onPress={() => navigate('Detail', { id: item.id })}
//     />
//   ))}
// </View>
//
// // List:
// <FlatList
//   data={playlists}
//   keyExtractor={item => item.id}
//   renderItem={({ item }) => (
//     <PlaylistCard
//       key={item.id}
//       variant="list"
//       item={item}
//       onPress={() => navigate('Detail', { id: item.id })}
//     />
//   )}
//   ItemSeparatorComponent={() => (
//     <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(72,72,72,0.2)', marginLeft: 16 + 56 + 12 }} />
//   )}
// />
//
// // Toggle button (mirrors Spotify's grid icon):
// <Pressable onPress={() => setIsGrid(v => !v)}>
//   <GridIcon active={isGrid} />
// </Pressable>