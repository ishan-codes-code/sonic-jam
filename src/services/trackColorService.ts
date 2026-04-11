import { getColors } from 'react-native-image-colors';
import tinycolor from 'tinycolor2';
import type { TrackColors } from '../playbackCore/types';

// ─── Fallback palette ─────────────────────────────────────────────────────────
const FALLBACK_BASE = '#121212';
const FALLBACK: TrackColors = {
    primary: FALLBACK_BASE,
    secondary: tinycolor(FALLBACK_BASE).lighten(10).toHexString(),
};

// ─── LRU-style cache (URL ➜ extracted colors) ────────────────────────────────
const colorCache = new Map<string, TrackColors>();

/**
 * Sanitise and ensure a value is a valid hex string or usable by tinycolor.
 */
function getValidHex(val: unknown): string | null {
    if (typeof val !== 'string') return null;
    const c = tinycolor(val.trim());
    return c.isValid() ? c.toHexString() : null;
}

/**
 * Extract ONE dominant color from an artwork URL, process it to guarantee
 * premium dynamic gradient aesthetics, and derive a secondary color.
 */
export async function extractTrackColors(artworkUri: string | null | undefined): Promise<TrackColors> {
    if (!artworkUri) return FALLBACK;

    // Cache hit
    if (colorCache.has(artworkUri)) {
        return colorCache.get(artworkUri)!;
    }

    try {
        const result = await getColors(artworkUri, {
            fallback: FALLBACK_BASE,
            cache: true,
            key: artworkUri,
        });

        // 1. EXTRACT RAW BASE COLOR
        let rawHex: string | null = null;
        if (result.platform === 'android') {
            rawHex = getValidHex(result.dominant);
        } else if (result.platform === 'ios') {
            rawHex = getValidHex(result.background);
        } else if (result.platform === 'web') {
            rawHex = getValidHex(result.dominant);
        }

        const baseVal = rawHex ?? FALLBACK_BASE;
        let color = tinycolor(baseVal);

        // 4. SAFETY RULE 1: If saturation is too low (< 10%), fallback to dark grey
        // This avoids dirty/muddy grey/brown gradients from uncolorful images 
        // Note: toHsv().s returns 0 to 1, so 0.1 = 10%
        if (color.toHsv().s < 0.1) {
            color = tinycolor(FALLBACK_BASE);
        }

        // 2. PROCESS COLOR: Increase saturation and darken
        // We boost saturation significantly for richness and darken it so text is readable
        color = color.saturate(30).darken(20);

        // 4. SAFETY RULE 2: If the resulting color is still too bright, darken further
        if (color.isLight()) {
            color = color.darken(25);
        }

        // 3. GENERATE SECONDARY COLOR FROM THE SAME FAMILY
        const primaryColor = color.toHexString();
        // Secondary color is guaranteed to be harmonious and slightly lighter
        const secondaryColor = color.clone().lighten(12).toHexString();

        const colors: TrackColors = {
            primary: primaryColor,
            secondary: secondaryColor,
        };

        // Cap cache
        if (colorCache.size > 100) {
            const firstKey = colorCache.keys().next().value;
            if (firstKey) colorCache.delete(firstKey);
        }
        colorCache.set(artworkUri, colors);

        return colors;
    } catch {
        return FALLBACK;
    }
}
