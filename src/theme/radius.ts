/**
 * Sonic Ethereal Radius Scale
 * 
 * Soft immersive rounding scale to create a soft, organic feel.
 * Used for cards, containers and floating navigation.
 * Unit: pixels (approximate match to design rem values).
 */

export const radius = {
  sm: 4,
  md: 24, // 1.5rem for album art / small components
  lg: 32, // 2rem for large category cards
  xl: 48, // 3rem for large immersive containers (rounded-xl)
  full: 9999, // Perfect circular rounding
} as const;

export type Radius = typeof radius;
