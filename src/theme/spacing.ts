/**
 * Sonic Ethereal Spacing Scale
 * 
 * Consistent spacing scale to support breathing layouts and discovery rhythm.
 * Unit: pixels.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16, // 1rem
  lg: 24, // 1.5rem
  xl: 32, // 2rem
  xxl: 48, // 3rem
  xxxl: 64, // 4rem
} as const;

export type Spacing = typeof spacing;
