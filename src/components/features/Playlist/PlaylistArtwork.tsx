import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { theme } from "../../../theme";

interface PlaylistArtworkProps {
    thumbnailUrl?: string[] | null;
    isSystem?: boolean;
}

export const PlaylistArtwork: React.FC<PlaylistArtworkProps> = ({
    thumbnailUrl,
    isSystem = false,
}) => {
    if (isSystem) {
        return (
            <LinearGradient
                colors={['#9333ea', '#c084fc']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="heart" size={28} color="white" />
                </View>
            </LinearGradient>
        );
    }

    const hasThumbnails = (thumbnailUrl?.length ?? 0) > 0;

    if (!hasThumbnails) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.backgroundCard }}>
                <Ionicons name="musical-notes" size={28} color={theme.colors.textSecondary} />
            </View>
        );
    }

    const count = thumbnailUrl!.length;

    // Show 4x4 style (2x2 grid) if there are 4 images.
    // If > 1 but < 4, it shows 2x2 but leaves empty spaces or adjusts layout.
    // Here we handle > 1 by showing up to 4 images in a 2x2 grid.
    if (count > 1) {
        const images = thumbnailUrl!.slice(0, 4);
        return (
            <View style={{ flex: 1, flexWrap: 'wrap', flexDirection: 'row' }}>
                {images.map((uri, index) => (
                    <View
                        key={`${uri}-${index}`}
                        style={{
                            width: '50%',
                            height: '50%',
                        }}
                    >
                        <Image
                            source={{ uri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    </View>
                ))}
                {/* If there are 2 or 3 images, the empty space will just be the view background */}
            </View>
        );
    }

    // Default to a single image if exactly 1
    return (
        <Image
            source={{ uri: thumbnailUrl![0] }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            accessible={false}
        />
    );
};
