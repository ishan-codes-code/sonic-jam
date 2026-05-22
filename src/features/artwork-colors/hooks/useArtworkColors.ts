import { useState, useEffect, useRef } from 'react';
import {
  extractArtworkColors,
  getCachedArtworkColors,
  type ArtworkColors,
} from '../services/artworkColorService';

export type UseArtworkColorsReturn = {
  /** Full palette — null only during initial async extraction. */
  colors: ArtworkColors | null;
  /** True while the first extraction is in-flight. */
  isLoading: boolean;
};

/**
 * `useArtworkColors`
 *
 * Unified React hook for image-driven color extraction across the Sonic app.
 *
 * Features:
 * - Seeded from the module-level cache synchronously — zero flicker on re-mounts
 * - Stale-URL guard: ignores in-flight results if the URL changes mid-fetch
 * - Single extraction per URL across all mounted instances (shared service cache)
 *
 * @example
 * const { colors } = useArtworkColors(song.image);
 * // colors.primary   → miniplayer / player background (dark, saturated)
 * // colors.base      → tinted button background (raw vibrant)
 * // colors.onColor   → '#FFFFFF' | '#000000' foreground on base
 * // colors.isDark    → boolean for manual contrast decisions
 * // colors.gradient  → LinearGradient colors + locations for hero screens
 * // colors.secondary → accent / gradient companion color
 */
export function useArtworkColors(
  url: string | null | undefined,
): UseArtworkColorsReturn {
  // Seed synchronously from cache — avoids a loading flash on re-mount
  const [colors, setColors] = useState<ArtworkColors | null>(
    () => getCachedArtworkColors(url),
  );
  const [isLoading, setIsLoading] = useState(
    () => !!url && !getCachedArtworkColors(url),
  );

  // Track the active URL so stale async results are discarded
  const activeUrl = useRef(url);

  useEffect(() => {
    activeUrl.current = url;

    if (!url) {
      setColors(null);
      setIsLoading(false);
      return;
    }

    // Synchronous cache hit — settle immediately, no flash
    const cached = getCachedArtworkColors(url);
    if (cached) {
      setColors(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    extractArtworkColors(url).then((result) => {
      if (activeUrl.current !== url) return; // stale guard
      setColors(result);
      setIsLoading(false);
    });
  }, [url]);

  return { colors, isLoading };
}
