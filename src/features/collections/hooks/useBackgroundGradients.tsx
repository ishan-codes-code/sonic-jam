import { useEffect, useState } from "react";
import { getColors } from "react-native-image-colors";
import { theme } from "@/theme";
import {
    AndroidImageColors,
    IOSImageColors,
    WebImageColors,
} from "react-native-image-colors/build/types";

export type ImageColorsResult =
    | AndroidImageColors
    | IOSImageColors
    | WebImageColors;

export function useBackgroundGradient(url: string) {
    const [imageColors, setImageColors] = useState<ImageColorsResult | null>(null);


    useEffect(() => {
        if (url) {
            getColors(url, {
                fallback: "#000000",
                cache: true,
                key: url,
            }).then((colors) => setImageColors(colors as ImageColorsResult))
        }

    }, [url])

    return { imageColors }
}


const isUsableColor = (color?: string): color is string => {
    if (!color) return false;

    const normalized = color.toLowerCase();

    // reject pure black + invalid hex like #00000
    if (normalized === '#000000' || normalized === '#00000') {
        return false;
    }

    return true;
};

export const getBaseColor = (
    colors: ImageColorsResult
): string => {
    switch (colors.platform) {
        case 'android': {
            const candidates = [
                colors.vibrant,
                colors.dominant,
                colors.average,
            ];
            return (
                candidates.find(isUsableColor) || '#888888'
            );
        }

        case 'ios': {
            const candidates = [
                colors.primary,
                colors.background,
            ];
            return (
                candidates.find(isUsableColor) || '#888888'
            );
        }

        case 'web': {
            const candidates = [
                colors.vibrant,
                colors.dominant,
            ];
            return (
                candidates.find(isUsableColor) || '#888888'
            );
        }

        default:
            return '#888888';
    }
};

export const pickHeroGradientFromImageColors = (
    colors?: ImageColorsResult | null
) => {
    const fallbackBase = '#111111';

    const base = colors ? getBaseColor(colors) : fallbackBase;
    return {
        base,
        colors: [
            base + 'cc',                // add alpha
            'rgba(0,0,0,0.30)',
            theme.colors.backgroundBase,
        ] as const,
        locations: [0, 0.5, 1] as const,
    };
};


