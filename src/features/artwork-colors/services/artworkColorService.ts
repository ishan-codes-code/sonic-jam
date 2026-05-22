import { getColors } from 'react-native-image-colors';
import tinycolor from 'tinycolor2';
import type {
  AndroidImageColors,
  IOSImageColors,
  WebImageColors,
} from 'react-native-image-colors/build/types';
import { theme } from '@/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type RawPlatformColors = AndroidImageColors | IOSImageColors | WebImageColors;

export type ArtworkColors = {
  /** Dominant color — saturated + darkened, guaranteed readable on dark UIs. Use for player / miniplayer backgrounds. */
  primary: string;
  /** Harmonious companion: primary lightened 12%. Use for gradients or accent chips. */
  secondary: string;
  /** Best extracted color, lightly sanitised. Use for tinted buttons or hero gradients. */
  base: string;
  /** Whether `base` is perceptually dark (luminance check via tinycolor). */
  isDark: boolean;
  /** High-contrast foreground to place on top of `base`. */
  onColor: '#FFFFFF' | '#000000';
  /** Ready-to-use LinearGradient props for hero screens. */
  gradient: {
    colors: readonly [string, string, string];
    locations: readonly [0, 0.5, 1];
  };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_BASE = '#121212';
const MAX_CACHE_SIZE = 150;

// ─── Module-level LRU cache ───────────────────────────────────────────────────
// Shared across all hook instances — same URL always hits after first fetch.

const _cache = new Map<string, ArtworkColors>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _buildFallback(): ArtworkColors {
  const primary = FALLBACK_BASE;
  const secondary = tinycolor(primary).lighten(10).toHexString();
  return {
    primary,
    secondary,
    base: primary,
    isDark: true,
    onColor: '#FFFFFF',
    gradient: {
      colors: [primary + 'cc', 'rgba(0,0,0,0.30)', theme.colors.backgroundBase] as const,
      locations: [0, 0.5, 1] as const,
    },
  };
}

export const FALLBACK_ARTWORK_COLORS: ArtworkColors = _buildFallback();

function _isUsable(color: unknown): color is string {
  if (typeof color !== 'string') return false;
  const lower = color.toLowerCase();
  // Reject pure black (getColors fallback) and malformed values
  if (lower === '#000000' || lower === '#00000') return false;
  return tinycolor(color.trim()).isValid();
}

/** Platform-aware best-color picker — android prefers vibrant, iOS prefers primary. */
function _pickBestColor(raw: RawPlatformColors): string {
  switch (raw.platform) {
    case 'android':
      return [raw.vibrant, raw.dominant, raw.average].find(_isUsable) ?? FALLBACK_BASE;
    case 'ios':
      return [raw.primary, raw.background].find(_isUsable) ?? FALLBACK_BASE;
    case 'web':
      return [raw.vibrant, raw.dominant].find(_isUsable) ?? FALLBACK_BASE;
    default:
      return FALLBACK_BASE;
  }
}

/** Boost saturation + guarantee a dark, text-safe result. */
function _processColor(hex: string): string {
  let c = tinycolor(hex);
  // Near-greyscale → fallback to dark neutral to avoid muddy greys
  if (c.toHsv().s < 0.1) c = tinycolor(FALLBACK_BASE);
  c = c.saturate(30).darken(20);
  if (c.isLight()) c = c.darken(25);
  return c.toHexString();
}

function _buildPalette(base: string): ArtworkColors {
  const primary = _processColor(base);
  const secondary = tinycolor(primary).lighten(12).toHexString();
  const isDark = tinycolor(base).isDark();
  return {
    primary,
    secondary,
    base,
    isDark,
    onColor: isDark ? '#FFFFFF' : '#000000',
    gradient: {
      colors: [base + 'cc', 'rgba(0,0,0,0.30)', theme.colors.backgroundBase] as const,
      locations: [0, 0.5, 1] as const,
    },
  };
}

function _evict(): void {
  if (_cache.size >= MAX_CACHE_SIZE) {
    const oldest = _cache.keys().next().value;
    if (oldest) _cache.delete(oldest);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Asynchronously extracts, processes, and caches the full `ArtworkColors`
 * palette from an image URL. Module-level cache ensures multiple call-sites
 * sharing the same URL never trigger a second native extraction.
 */
export async function extractArtworkColors(
  url: string | null | undefined,
): Promise<ArtworkColors> {
  if (!url) return FALLBACK_ARTWORK_COLORS;

  const hit = _cache.get(url);
  if (hit) return hit;

  try {
    const raw = await getColors(url, { fallback: FALLBACK_BASE, cache: true, key: url });
    const base = _pickBestColor(raw as RawPlatformColors);
    const palette = _buildPalette(base);
    _evict();
    _cache.set(url, palette);
    return palette;
  } catch {
    return FALLBACK_ARTWORK_COLORS;
  }
}

/**
 * Synchronous cache read — returns `null` if the URL hasn't been
 * extracted yet. Use to seed React state before the async result arrives.
 */
export function getCachedArtworkColors(url: string | null | undefined): ArtworkColors | null {
  if (!url) return null;
  return _cache.get(url) ?? null;
}
